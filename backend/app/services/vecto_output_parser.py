"""
VECTO Simulation Output Parser
Parses .RSLT_MANUFACTURER.xml (complete vehicle) and .vsum files
to extract real CO2/FC simulation results for correlation analysis.
"""
import xml.etree.ElementTree as ET
import csv
import io
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Namespaces for VECTO output XMLs
NS = {
    "mrf": "urn:tugraz:ivt:VectoAPI:DeclarationOutput",
    "out": "urn:tugraz:ivt:VectoAPI:DeclarationOutput:v1.0",
}


def parse_manufacturer_xml(filepath: str) -> list[dict]:
    """
    Parse RSLT_MANUFACTURER.xml (Complete vehicle version).
    Returns list of result dicts, one per mission/loading combination.
    """
    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
    except Exception as e:
        logger.error(f"Failed to parse {filepath}: {e}")
        return []

    results = []

    # Get vehicle info
    vehicle_info = _extract_vehicle_info(root)

    # Find all Result elements
    for result_elem in root.iter():
        tag = _strip_ns(result_elem.tag)
        if tag != "Result":
            continue

        status = result_elem.get("status", "")
        if status != "success":
            continue

        entry = {**vehicle_info, "source_file": str(filepath), "status": status}

        # Mission
        mission_elem = result_elem.find(".//{urn:tugraz:ivt:VectoAPI:DeclarationOutput:v1.0}Mission")
        if mission_elem is None:
            for child in result_elem:
                if _strip_ns(child.tag) == "Mission":
                    mission_elem = child
                    break
        if mission_elem is not None:
            entry["mission"] = mission_elem.text

        # Distance
        for child in result_elem:
            ct = _strip_ns(child.tag)
            if ct == "Distance":
                entry["distance_km"] = _safe_float(child.text)

        # PrimaryVehicleSubgroup
        for child in result_elem:
            ct = _strip_ns(child.tag)
            if ct == "PrimaryVehicleSubgroup":
                entry["primary_subgroup"] = child.text

        # SimulationParameters
        for sim_params in result_elem:
            if _strip_ns(sim_params.tag) != "SimulationParameters":
                continue
            for sp in sim_params:
                spt = _strip_ns(sp.tag)
                if spt == "TotalVehicleMass":
                    entry["total_vehicle_mass_kg"] = _safe_float(sp.text)
                elif spt == "Payload":
                    entry["payload_kg"] = _safe_float(sp.text)
                elif spt == "PassengerCount":
                    entry["passenger_count"] = _safe_float(sp.text)

        # Total results
        for total in result_elem:
            if _strip_ns(total.tag) != "Total":
                continue

            # VehiclePerformance
            for vp in total:
                if _strip_ns(vp.tag) == "VehiclePerformance":
                    for perf in vp:
                        pt = _strip_ns(perf.tag)
                        if pt == "AverageSpeed":
                            entry["avg_speed_kmh"] = _safe_float(perf.text)
                        elif pt == "AverageDrivingSpeed":
                            entry["avg_driving_speed_kmh"] = _safe_float(perf.text)
                        elif pt == "MaxSpeed":
                            entry["max_speed_kmh"] = _safe_float(perf.text)
                        elif pt == "AverageGearboxEfficiency":
                            entry["gearbox_efficiency_pct"] = _safe_float(perf.text)
                        elif pt == "AverageAxlegearEfficiency":
                            entry["axlegear_efficiency_pct"] = _safe_float(perf.text)
                        elif pt == "GearshiftCount":
                            entry["gearshift_count"] = _safe_int(perf.text)

                # Fuel consumption
                if _strip_ns(vp.tag) == "Fuel":
                    for fc in vp:
                        if _strip_ns(fc.tag) == "FuelConsumption":
                            unit = fc.get("unit", "")
                            val = _safe_float(fc.text)
                            if unit == "g/km":
                                entry["fc_g_per_km"] = val
                            elif unit == "l/100km":
                                entry["fc_l_per_100km"] = val
                            elif unit == "MJ/km":
                                entry["fc_mj_per_km"] = val

                # CO2
                if _strip_ns(vp.tag) == "CO2":
                    unit = vp.get("unit", "")
                    val = _safe_float(vp.text)
                    if unit == "g/km":
                        entry["co2_g_per_km"] = val
                    elif unit == "g/p-km":
                        entry["co2_g_per_pkm"] = val

        # Determine loading from payload/mass ratio
        entry["loading"] = _infer_loading(entry)

        if entry.get("co2_g_per_km"):
            results.append(entry)

    return results


def parse_vsum_file(filepath: str) -> list[dict]:
    """
    Parse VECTO .vsum CSV summary file.
    Returns list of result dicts, one per simulation run (row).
    """
    try:
        content = Path(filepath).read_text(encoding="utf-8")
    except Exception as e:
        logger.error(f"Failed to read {filepath}: {e}")
        return []

    # Skip comment lines (starting with #)
    lines = [l for l in content.splitlines() if not l.startswith("#")]
    if len(lines) < 2:
        return []

    header = lines[0]
    fields = [f.strip() for f in header.split(",")]

    results = []
    for line in lines[1:]:
        if not line.strip():
            continue
        values = line.split(",")
        if len(values) < 10:
            continue

        row = {}
        for i, field in enumerate(fields):
            if i < len(values):
                row[field] = values[i].strip()

        entry = {
            "vin": row.get("VIN number", ""),
            "vehicle_model": row.get("Vehicle model [-]", ""),
            "vehicle_group": row.get("HDV CO2 vehicle class [-]", ""),
            "mission": _extract_mission_from_cycle(row.get("Cycle [-]", "")),
            "status": row.get("Status", ""),
            "source_file": str(filepath),
        }

        # Engine info
        entry["engine_rated_power_kw"] = _safe_float(row.get("Engine rated power [kW]"))
        entry["engine_displacement_cc"] = _safe_int(row.get("Engine displacement [ccm]"))
        entry["axle_ratio"] = _safe_float(row.get("Axle gear ratio [-]"))

        # WHTC factors
        entry["whtc_urban"] = _safe_float(row.get("Engine WHTCUrban"))
        entry["whtc_rural"] = _safe_float(row.get("Engine WHTCRural"))
        entry["whtc_motorway"] = _safe_float(row.get("Engine WHTCMotorway"))
        entry["bf_cold_hot"] = _safe_float(row.get("Engine BFColdHot"))
        entry["cf_reg_per"] = _safe_float(row.get("Engine CFRegPer"))
        entry["cf_actual"] = _safe_float(row.get("Engine actual CF"))

        # Vehicle mass
        mass_str = row.get("Corrected Actual Curb Mass [kg]", "")
        entry["corrected_actual_mass_kg"] = _safe_float(mass_str)
        entry["total_vehicle_mass_kg"] = _safe_float(row.get("Total vehicle mass [kg]"))
        entry["payload_kg"] = _safe_float(row.get("Loading [kg]"))
        entry["passenger_count"] = _safe_float(row.get("Passenger count [-]"))

        # Results
        entry["co2_g_per_km"] = _safe_float(row.get("CO2 [g/km]"))
        entry["co2_g_per_pkm"] = _safe_float(row.get("CO2 [g/Pkm]"))
        entry["fc_g_per_km"] = _safe_float(row.get("FC-Final [g/km]"))
        entry["fc_l_per_100km"] = _safe_float(row.get("FC-Final [l/100km]"))

        # Performance
        entry["avg_speed_kmh"] = _safe_float(row.get("speed [km/h]"))
        entry["max_speed_kmh"] = _safe_float(row.get("max. speed [km/h]"))
        entry["gearshift_count"] = _safe_int(row.get("gear shifts [-]"))

        # Determine loading
        entry["loading"] = _infer_loading(entry)

        if entry.get("co2_g_per_km") and entry["status"].lower() == "success":
            results.append(entry)

    return results


def _extract_vehicle_info(root) -> dict:
    """Extract vehicle-level info from RSLT XML."""
    info = {}
    for elem in root.iter():
        tag = _strip_ns(elem.tag)
        if tag == "Model":
            info["vehicle_model"] = elem.text
        elif tag == "VIN":
            info["vin"] = elem.text
        elif tag == "VehicleGroup":
            info["vehicle_group"] = elem.text
        elif tag == "CorrectedActualMass":
            info["corrected_actual_mass_kg"] = _safe_float(elem.text)
        elif tag == "TechnicalPermissibleMaximumLadenMass":
            info["max_laden_mass_kg"] = _safe_float(elem.text)
    return info


def _infer_loading(entry: dict) -> str:
    """Infer loading condition from payload ratio."""
    payload = entry.get("payload_kg", 0) or 0
    total = entry.get("total_vehicle_mass_kg", 0) or 0
    corrected = entry.get("corrected_actual_mass_kg", 0) or 0

    if total and corrected:
        loading_ratio = (total - corrected) / corrected if corrected > 0 else 0
        return "ReferenceLoad" if loading_ratio > 0.2 else "LowLoading"
    return "Unknown"


def _extract_mission_from_cycle(cycle_str: str) -> str:
    """Extract mission name from cycle filename like 'Interurban.vdri'."""
    if not cycle_str:
        return "Unknown"
    return cycle_str.replace(".vdri", "").replace(".json", "").strip()


def _strip_ns(tag: str) -> str:
    """Strip XML namespace from tag."""
    if "}" in tag:
        return tag.split("}", 1)[1]
    return tag


def _safe_float(val) -> Optional[float]:
    if val is None:
        return None
    try:
        return float(str(val).strip())
    except (ValueError, TypeError):
        return None


def _safe_int(val) -> Optional[int]:
    if val is None:
        return None
    try:
        return int(float(str(val).strip()))
    except (ValueError, TypeError):
        return None
