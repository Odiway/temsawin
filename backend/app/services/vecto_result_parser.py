"""
VECTO Result File Parser — RSLT_CUSTOMER and RSLT_MANUFACTURER XMLs.

This is the SOURCE OF TRUTH for CO2 data.
We do NOT calculate CO2 ourselves — it comes from official VECTO result files.
Each sold vehicle has VECTO result files with per-mission CO2/FC results.
"""
import xml.etree.ElementTree as ET
import logging
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


def parse_customer_result_xml(filepath: str) -> dict:
    """
    Parse RSLT_CUSTOMER.xml — official customer information file.
    
    Returns dict with:
      - vehicle: vehicle-level info (VIN, model, mass, power, features)
      - results: list of per-mission/loading CO2 results
      - summary: weighted average CO2 across all loadings
      - simulation_info: tool version, date
    """
    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
    except Exception as e:
        logger.error(f"Failed to parse {filepath}: {e}")
        return {"error": str(e)}

    # Strip all namespaces for easier traversal
    _strip_all_ns(root)

    data_elem = root.find(".//Data")
    if data_elem is None:
        return {"error": "No Data element found"}

    # ── Vehicle Info ──
    veh_elem = data_elem.find(".//Vehicle")
    vehicle = _parse_vehicle_info(veh_elem) if veh_elem is not None else {}

    # ── Results ──
    results_elem = data_elem.find(".//Results")
    results = []
    summary = {}

    if results_elem is not None:
        status_elem = results_elem.find("Status")
        if status_elem is not None and status_elem.text != "success":
            return {"error": f"Simulation status: {status_elem.text}", "vehicle": vehicle}

        for result_elem in results_elem.findall("Result"):
            if result_elem.get("status") != "success":
                continue
            entry = _parse_result_entry(result_elem)
            if entry:
                results.append(entry)

        # Summary element
        summary_elem = results_elem.find("Summary")
        if summary_elem is not None:
            summary = _parse_summary(summary_elem)

    # ── Simulation Info ──
    sim_info = {}
    app_elem = data_elem.find(".//ApplicationInformation")
    if app_elem is not None:
        ver = app_elem.find("SimulationToolVersion")
        date = app_elem.find("Date")
        if ver is not None:
            sim_info["tool_version"] = ver.text
        if date is not None:
            sim_info["date"] = date.text
            try:
                sim_info["date_parsed"] = datetime.fromisoformat(date.text.replace("Z", "+00:00"))
            except Exception:
                pass

    return {
        "vehicle": vehicle,
        "results": results,
        "summary": summary,
        "simulation_info": sim_info,
        "source_file": str(filepath),
        "source_type": _detect_source_type(filepath),
    }


def _parse_vehicle_info(veh_elem) -> dict:
    """Extract all vehicle-level info from Vehicle element."""
    v = {}

    # Extract Model from direct children first (to avoid Component sub-model overwrite)
    model_elem = veh_elem.find("Model")
    if model_elem is not None and model_elem.text:
        v["model"] = model_elem.text.strip()
    
    simple_fields = {
        "VIN": "vin",
        "VehicleCategory": "vehicle_category",
        "AxleConfiguration": "axle_configuration",
        "VehicleGroup": "vehicle_group",
        "VehicleGroupCO2": "vehicle_group_co2",
        "ZeroEmissionVehicle": "zero_emission_vehicle",
        "HybridElectricHDV": "hybrid_electric",
        "DualFuelVehicle": "dual_fuel",
        "ClassBus": "class_bus",
        "TransmissionType": "transmission_type",
        "Retarder": "retarder",
        "AxleRatio": "axle_ratio",
        "AverageRRC": "average_rrc",
        "VehicleTypeApprovalNumber": "type_approval_number",
        "TransmissionValues": "transmission_values",
        "NrOfGears": "nr_of_gears",
    }
    
    numeric_fields = {
        "TechnicalPermissibleMaximumLadenMass": "tech_max_laden_mass_kg",
        "TotalPropulsionPower": "total_propulsion_power_kw",
        "CorrectedActualMass": "corrected_actual_mass_kg",
        "TotalNumberOfPassengers": "total_passengers",
        "EngineRatedPower": "engine_rated_power_kw",
        "RatedPower": "engine_rated_power_kw",
        "EngineCapacity": "engine_capacity_ltr",
        "Capacity": "engine_capacity_ltr",
    }

    for elem in veh_elem.iter():
        tag = elem.tag
        if tag in simple_fields:
            val = elem.text
            if val is not None:
                val = val.strip()
                # Convert booleans
                if val.lower() in ("true", "false"):
                    val = val.lower() == "true"
                v[simple_fields[tag]] = val
        elif tag in numeric_fields:
            v[numeric_fields[tag]] = _safe_float(elem.text)

    # Fuel types
    fuel_types = []
    for ft in veh_elem.iter():
        if ft.tag == "FuelType" and ft.text:
            fuel_types.append(ft.text.strip())
    if fuel_types:
        v["fuel_type"] = fuel_types[0]  # Primary fuel
        v["fuel_types"] = fuel_types

    # Tyre dimensions
    for axle in veh_elem.iter():
        if axle.tag == "Axle":
            td = axle.find("TyreDimension")
            if td is not None and td.text:
                v["tyre_dimension"] = td.text.strip()
                break

    # ADAS
    adas = veh_elem.find(".//ADAS")
    if adas is not None:
        for child in adas:
            if child.tag == "EngineStopStart":
                v["engine_stop_start"] = child.text and child.text.strip().lower() == "true"
            elif child.tag == "EcoRollWithoutEngineStopStart":
                v["eco_roll"] = child.text and child.text.strip().lower() == "true"
            elif child.tag == "PredictiveCruiseControl":
                v["predictive_cruise_control"] = child.text and child.text.strip().lower() == "true"

    # HVAC
    hvac = veh_elem.find(".//HVAC")
    if hvac is not None:
        sc = hvac.find("SystemConfiguration")
        if sc is not None:
            v["hvac_config"] = sc.text
        dg = hvac.find("DoubleGlazing")
        if dg is not None:
            v["double_glazing"] = dg.text and dg.text.strip().lower() == "true"

    # Manufacturers
    for step in veh_elem.iter():
        if step.tag == "Step":
            sc = step.get("stepCount")
            mfr = step.find("Manufacturer")
            if mfr is not None and mfr.text and sc == "1":
                v["manufacturer"] = mfr.text.strip()

    return v


def _parse_result_entry(result_elem) -> dict:
    """Parse a single <Result> element into a dict."""
    entry = {}

    # Mission
    mission_elem = result_elem.find("Mission")
    if mission_elem is not None:
        entry["mission"] = mission_elem.text.strip()

    # SimulationParameters
    sim_params = result_elem.find("SimulationParameters")
    if sim_params is not None:
        for child in sim_params:
            if child.tag == "TotalVehicleMass":
                entry["total_vehicle_mass_kg"] = _safe_float(child.text)
            elif child.tag == "MassPassengers":
                entry["mass_passengers_kg"] = _safe_float(child.text)
            elif child.tag == "PassengerCount":
                entry["passenger_count"] = _safe_float(child.text)

    # Total results
    total = result_elem.find("Total")
    if total is not None:
        # Average speed
        avg_speed = total.find("AverageSpeed")
        if avg_speed is not None:
            entry["avg_speed_kmh"] = _safe_float(avg_speed.text)

        # Fuel consumption — multiple units
        for fuel_elem in total.iter():
            if fuel_elem.tag == "Fuel":
                entry["fuel_type_result"] = fuel_elem.get("type", "")
            if fuel_elem.tag == "FuelConsumption":
                unit = fuel_elem.get("unit", "")
                val = _safe_float(fuel_elem.text)
                if unit == "g/km":
                    entry["fc_g_per_km"] = val
                elif unit == "g/p-km":
                    entry["fc_g_per_pkm"] = val
                elif unit == "MJ/km":
                    entry["fc_mj_per_km"] = val
                elif unit == "MJ/p-km":
                    entry["fc_mj_per_pkm"] = val
                elif unit == "l/100km":
                    entry["fc_l_per_100km"] = val
                elif unit == "l/p-km":
                    entry["fc_l_per_pkm"] = val

        # CO2 — multiple units
        for co2_elem in total.findall("CO2"):
            unit = co2_elem.get("unit", "")
            val = _safe_float(co2_elem.text)
            if unit == "g/km":
                entry["co2_g_per_km"] = val
            elif unit == "g/p-km":
                entry["co2_g_per_pkm"] = val

    # Infer loading from passenger count vs vehicle total passengers
    entry["loading"] = _infer_loading_from_passengers(entry)

    return entry if entry.get("co2_g_per_km") else None


def _parse_summary(summary_elem) -> dict:
    """Parse the <Summary> element (weighted average across loadings)."""
    s = {}

    voc = summary_elem.find("Vocational")
    if voc is not None:
        s["vocational"] = voc.text and voc.text.strip().lower() == "true"

    apc = summary_elem.find("AveragePassengerCount")
    if apc is not None:
        s["avg_passenger_count"] = _safe_float(apc.text)

    for fuel_elem in summary_elem.iter():
        if fuel_elem.tag == "FuelConsumption":
            unit = fuel_elem.get("unit", "")
            val = _safe_float(fuel_elem.text)
            if unit == "g/km":
                s["fc_g_per_km"] = val
            elif unit == "g/p-km":
                s["fc_g_per_pkm"] = val
            elif unit == "MJ/km":
                s["fc_mj_per_km"] = val
            elif unit == "l/100km":
                s["fc_l_per_100km"] = val

    for co2_elem in summary_elem.findall("CO2"):
        unit = co2_elem.get("unit", "")
        val = _safe_float(co2_elem.text)
        if unit == "g/km":
            s["co2_g_per_km"] = val
        elif unit == "g/p-km":
            s["co2_g_per_pkm"] = val

    return s


def _infer_loading_from_passengers(entry: dict) -> str:
    """Infer loading condition from passenger count ratio."""
    pc = entry.get("passenger_count")
    mass_p = entry.get("mass_passengers_kg", 0) or 0
    total = entry.get("total_vehicle_mass_kg", 0) or 0

    if pc is not None and total > 0 and mass_p > 0:
        # If passenger mass is small relative to vehicle → LowLoading
        ratio = mass_p / total
        return "ReferenceLoad" if ratio > 0.15 else "LowLoading"
    return "Unknown"


def _detect_source_type(filepath: str) -> str:
    """Detect whether this is RSLT_CUSTOMER or RSLT_MANUFACTURER."""
    name = Path(filepath).name.upper()
    if "CUSTOMER" in name:
        return "RSLT_CUSTOMER"
    elif "MANUFACTURER" in name:
        return "RSLT_MANUFACTURER"
    return "UNKNOWN"


def _strip_all_ns(root):
    """Remove all namespace prefixes from element tags in place."""
    for elem in root.iter():
        if "}" in elem.tag:
            elem.tag = elem.tag.split("}", 1)[1]
        for key in list(elem.attrib):
            if "}" in key:
                new_key = key.split("}", 1)[1]
                elem.attrib[new_key] = elem.attrib.pop(key)


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        return round(float(str(val).strip()), 4)
    except (ValueError, TypeError):
        return None


# ═══════════════════════════════════════════════════════════
# RSLT_MANUFACTURER (Output Files) Parser — with VIF pairing
# ═══════════════════════════════════════════════════════════

def parse_manufacturer_output_xml(mfr_path: str, vif_path: str = None) -> dict:
    """
    Parse RSLT_MANUFACTURER.xml from Output Files.
    Optionally pair with RSLT_VIF.xml to get PrimaryVehicleSubgroup + EnergyConsumption.

    Returns dict with:
      - vehicle: vehicle-level info
      - results: list of per-mission results with CO2, FC, VehiclePerformance, subgroup
      - simulation_info: tool version, date
    """
    try:
        tree = ET.parse(mfr_path)
        root = tree.getroot()
    except Exception as e:
        logger.error(f"Failed to parse MFR {mfr_path}: {e}")
        return {"error": str(e)}

    _strip_all_ns(root)

    data_elem = root.find(".//Data")
    if data_elem is None:
        return {"error": "No Data element found"}

    # ── Vehicle Info ──
    veh_elem = data_elem.find(".//Vehicle")
    vehicle = _parse_vehicle_info(veh_elem) if veh_elem is not None else {}

    # ── Parse VIF for subgroup info ──
    vif_results = []
    if vif_path:
        vif_results = _parse_vif_results(vif_path)

    # ── Results ──
    results_elem = data_elem.find(".//Results")
    results = []

    if results_elem is not None:
        status_elem = results_elem.find("Status")
        if status_elem is not None and status_elem.text != "success":
            return {"error": f"Simulation status: {status_elem.text}", "vehicle": vehicle}

        result_idx = 0
        for result_elem in results_elem.findall("Result"):
            if result_elem.get("status") != "success":
                continue
            entry = _parse_mfr_result_entry(result_elem)
            if entry:
                # Pair with VIF result by position
                if result_idx < len(vif_results):
                    vif_r = vif_results[result_idx]
                    entry["primary_subgroup"] = vif_r.get("primary_subgroup")
                    entry["energy_mj_per_km"] = vif_r.get("energy_mj_per_km")
                results.append(entry)
                result_idx += 1

    # ── Simulation Info ──
    sim_info = {}
    app_elem = data_elem.find(".//ApplicationInformation")
    if app_elem is not None:
        ver = app_elem.find("SimulationToolVersion")
        date = app_elem.find("Date")
        if ver is not None:
            sim_info["tool_version"] = ver.text
        if date is not None:
            sim_info["date"] = date.text
            try:
                sim_info["date_parsed"] = datetime.fromisoformat(date.text.replace("Z", "+00:00"))
            except Exception:
                pass

    return {
        "vehicle": vehicle,
        "results": results,
        "simulation_info": sim_info,
        "source_file": str(mfr_path),
        "source_type": "RSLT_MANUFACTURER",
    }


def _parse_mfr_result_entry(result_elem) -> dict:
    """Parse a single <Result> from RSLT_MANUFACTURER with VehiclePerformance."""
    entry = {}

    # Mission
    mission_elem = result_elem.find("Mission")
    if mission_elem is not None:
        entry["mission"] = mission_elem.text.strip()

    # Distance
    dist_elem = result_elem.find("Distance")
    if dist_elem is not None:
        entry["distance_km"] = _safe_float(dist_elem.text)

    # SimulationParameters
    sim_params = result_elem.find("SimulationParameters")
    if sim_params is not None:
        for child in sim_params:
            if child.tag == "TotalVehicleMass":
                entry["total_vehicle_mass_kg"] = _safe_float(child.text)
            elif child.tag == "Payload":
                entry["payload_kg"] = _safe_float(child.text)
            elif child.tag == "PassengerCount":
                entry["passenger_count"] = _safe_float(child.text)

    # Total results
    total = result_elem.find("Total")
    if total is not None:
        # VehiclePerformance
        perf = total.find("VehiclePerformance")
        if perf is not None:
            avg_speed = perf.find("AverageSpeed")
            if avg_speed is not None:
                entry["avg_speed_kmh"] = _safe_float(avg_speed.text)
            avg_drv = perf.find("AverageDrivingSpeed")
            if avg_drv is not None:
                entry["avg_driving_speed_kmh"] = _safe_float(avg_drv.text)
            max_spd = perf.find("MaxSpeed")
            if max_spd is not None:
                entry["max_speed_kmh"] = _safe_float(max_spd.text)
            gsc = perf.find("GearshiftCount")
            if gsc is not None:
                entry["gearshift_count"] = int(float(gsc.text.strip())) if gsc.text else None
            gbx = perf.find("AverageGearboxEfficiency")
            if gbx is not None:
                entry["gearbox_efficiency_pct"] = _safe_float(gbx.text)
            axl = perf.find("AverageAxlegearEfficiency")
            if axl is not None:
                entry["axlegear_efficiency_pct"] = _safe_float(axl.text)

        # Fuel consumption — multiple units
        for fuel_elem in total.iter():
            if fuel_elem.tag == "Fuel":
                entry["fuel_type_result"] = fuel_elem.get("type", "")
            if fuel_elem.tag == "FuelConsumption":
                unit = fuel_elem.get("unit", "")
                val = _safe_float(fuel_elem.text)
                if unit == "g/km":
                    entry["fc_g_per_km"] = val
                elif unit == "g/p-km":
                    entry["fc_g_per_pkm"] = val
                elif unit == "MJ/km":
                    entry["fc_mj_per_km"] = val
                elif unit == "MJ/p-km":
                    entry["fc_mj_per_pkm"] = val
                elif unit == "l/100km":
                    entry["fc_l_per_100km"] = val
                elif unit == "l/p-km":
                    entry["fc_l_per_pkm"] = val

        # CO2
        for co2_elem in total.findall("CO2"):
            unit = co2_elem.get("unit", "")
            val = _safe_float(co2_elem.text)
            if unit == "g/km":
                entry["co2_g_per_km"] = val
            elif unit == "g/p-km":
                entry["co2_g_per_pkm"] = val

    # Infer loading from passenger count
    entry["loading"] = _infer_loading(entry)

    return entry if entry.get("co2_g_per_km") else None


def _infer_loading(entry: dict) -> str:
    """Infer loading from result pairs: low passenger count = LowLoading."""
    pc = entry.get("passenger_count")
    payload = entry.get("payload_kg", 0) or 0
    total = entry.get("total_vehicle_mass_kg", 0) or 0
    if total > 0 and payload > 0:
        ratio = payload / total
        return "ReferenceLoad" if ratio > 0.15 else "LowLoading"
    return "Unknown"


def _parse_vif_results(vif_path: str) -> list:
    """
    Parse RSLT_VIF.xml to extract PrimaryVehicleSubgroup + EnergyConsumption per result.
    Results are returned in the same order as in the file, for positional pairing.
    """
    try:
        tree = ET.parse(vif_path)
        root = tree.getroot()
    except Exception as e:
        logger.warning(f"Failed to parse VIF {vif_path}: {e}")
        return []

    _strip_all_ns(root)

    results = []
    for result_elem in root.iter("Result"):
        if result_elem.get("status") != "success":
            continue
        r = {}
        sg = result_elem.find("PrimaryVehicleSubgroup")
        if sg is not None and sg.text:
            r["primary_subgroup"] = sg.text.strip()
        for fuel_elem in result_elem.iter("Fuel"):
            ec = fuel_elem.find("EnergyConsumption")
            if ec is not None:
                r["energy_mj_per_km"] = _safe_float(ec.text)
        results.append(r)

    return results
