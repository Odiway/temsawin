"""
VECTO XML Parser — Parses VECTO v5.0.7 declaration input XML files
and extracts all vehicle variant data for database storage.
"""
import os
import logging
from pathlib import Path
from lxml import etree
from typing import Optional

logger = logging.getLogger(__name__)

# Namespace map for VECTO XML
NS = {
    "tns": "urn:tugraz:ivt:VectoAPI:DeclarationInput:v3.0",
    "v2.0": "urn:tugraz:ivt:VectoAPI:DeclarationDefinitions:v2.0",
    "v2.1": "urn:tugraz:ivt:VectoAPI:DeclarationDefinitions:v2.1",
    "v2.4": "urn:tugraz:ivt:VectoAPI:DeclarationDefinitions:v2.4",
    "v2.7": "urn:tugraz:ivt:VectoAPI:DeclarationDefinitions:v2.7",
    "di": "http://www.w3.org/2000/09/xmldsig#",
    "d": "urn:tugraz:ivt:VectoAPI:DeclarationDefinitions:v2.7",
}


def _text(el, xpath: str, namespaces=None) -> Optional[str]:
    """Safe text extraction from an element by XPath."""
    if el is None:
        return None
    nodes = el.xpath(xpath, namespaces=namespaces or NS)
    if nodes:
        node = nodes[0]
        if hasattr(node, "text"):
            return (node.text or "").strip() if node.text else None
        return str(node).strip() if node else None
    return None


def _int(el, xpath: str, ns=None) -> Optional[int]:
    val = _text(el, xpath, ns)
    if val:
        try:
            return int(float(val))
        except (ValueError, TypeError):
            return None
    return None


def _float(el, xpath: str, ns=None) -> Optional[float]:
    val = _text(el, xpath, ns)
    if val:
        try:
            return float(val)
        except (ValueError, TypeError):
            return None
    return None


def _bool(el, xpath: str, ns=None) -> bool:
    val = _text(el, xpath, ns)
    return val.lower() == "true" if val else False


def _detect_model_category(model_name: str) -> str:
    """Detect vehicle category from model name."""
    name = (model_name or "").upper()
    if any(k in name for k in ["AVENUE", "AVNL", "LD", "CITY"]):
        return "city"
    if any(k in name for k in ["HD", "SAFARI", "MARATON", "COACH"]):
        return "coach"
    if any(k in name for k in ["EV", "ELECTRIC", "ZERO"]):
        return "ev"
    return "diesel"


def _detect_engine_type(fuel_type: str, zero_emission: bool) -> str:
    if zero_emission:
        return "electric"
    ft = (fuel_type or "").lower()
    if "electric" in ft:
        return "electric"
    if "hybrid" in ft:
        return "hybrid"
    return "diesel"


def parse_vecto_xml(filepath: str) -> dict:
    """
    Parse a VECTO XML declaration input file and return a structured dict.
    
    Returns dict with keys:
        vehicle: dict with vehicle-level fields
        variant: dict with variant-level fields
        fuel_map: list of {engine_speed, torque, fuel_consumption}
        load_curves: list of {engine_speed, max_torque, drag_torque}
        gear_ratios: list of {gear_number, ratio}
        torque_converter: list of {speed_ratio, torque_ratio, input_torque_ref}
        axle_losses: list of {input_speed, input_torque, torque_loss}
    """
    filepath = str(filepath)
    filename = os.path.basename(filepath)
    variant_code = Path(filepath).stem

    tree = etree.parse(filepath)
    root = tree.getroot()

    # Find Vehicle element — try multiple namespace combos
    vehicle_el = None
    for xpath in [
        ".//tns:VectoInputDeclaration/d:Vehicle",
        "./d:Vehicle",
        ".//d:Vehicle",
        ".//{urn:tugraz:ivt:VectoAPI:DeclarationDefinitions:v2.7}Vehicle",
    ]:
        try:
            nodes = root.xpath(xpath, namespaces=NS)
            if nodes:
                vehicle_el = nodes[0]
                break
        except Exception:
            pass

    # Fallback: find any element named Vehicle
    if vehicle_el is None:
        for el in root.iter():
            if el.tag.endswith("}Vehicle") or el.tag == "Vehicle":
                vehicle_el = el
                break

    if vehicle_el is None:
        raise ValueError(f"No Vehicle element found in {filename}")

    # Helper to search within Vehicle + default namespace
    def vt(xpath):
        return _text(vehicle_el, xpath, NS)

    def vi(xpath):
        return _int(vehicle_el, xpath, NS)

    def vf(xpath):
        return _float(vehicle_el, xpath, NS)

    def vb(xpath):
        return _bool(vehicle_el, xpath, NS)

    # ── Vehicle Level ──
    model_name = vt("d:Model") or vt("Model") or ""
    manufacturer = vt("d:Manufacturer") or vt("Manufacturer") or "TEMSA"
    category = _detect_model_category(model_name)

    vehicle_data = {
        "model_name": model_name,
        "manufacturer": manufacturer.strip(),
        "category": category,
        "legislative_category": vt("d:LegislativeCategory") or vt("LegislativeCategory") or "M3",
        "chassis_config": vt("d:ChassisConfiguration") or vt("ChassisConfiguration"),
        "axle_config": vt("d:AxleConfiguration") or vt("AxleConfiguration"),
    }

    # ── Variant Level ──
    fuel_type = None
    zero_emission = vb("d:ZeroEmissionVehicle") or vb("ZeroEmissionVehicle")

    # Engine data — can be in v2.0 or v2.1 namespace
    engine_el = None
    for eng_xpath in [
        ".//d:Components//d:Engine//v2.0:Data",
        ".//d:Components//d:Engine//v2.1:Data",
        ".//Components//Engine//v2.0:Data",
        ".//Components//Engine//v2.1:Data",
    ]:
        try:
            nodes = vehicle_el.xpath(eng_xpath, namespaces=NS)
            if nodes:
                engine_el = nodes[0]
                break
        except Exception:
            pass

    # Fallback engine search
    if engine_el is None:
        for el in vehicle_el.iter():
            tag = el.tag.split("}")[-1] if "}" in el.tag else el.tag
            if tag == "Data" and el.get("id", "").startswith("ENG"):
                engine_el = el
                break

    eng_mfr = eng_model = eng_cert = None
    displacement = rated_speed = rated_power = max_torque = idling_speed = None

    if engine_el is not None:
        # Search the engine element with all namespace combos
        for ns_key in ["v2.1:", "v2.0:", "d:", ""]:
            if eng_mfr is None:
                eng_mfr = _text(engine_el, f".//{ns_key}Manufacturer", NS) if ns_key else _text(engine_el, ".//Manufacturer", NS)
            if eng_model is None:
                eng_model = _text(engine_el, f".//{ns_key}Model", NS) if ns_key else _text(engine_el, ".//Model", NS)
            if eng_cert is None:
                eng_cert = _text(engine_el, f".//{ns_key}CertificationNumber", NS) if ns_key else _text(engine_el, ".//CertificationNumber", NS)

        # Try namespace-aware first
        for prefix in ["v2.1", "v2.0", "d"]:
            p = f"{prefix}:"
            if displacement is None:
                displacement = _int(engine_el, f".//{p}Displacement", NS)
            if rated_speed is None:
                rated_speed = _int(engine_el, f".//{p}RatedSpeed", NS)
            if rated_power is None:
                rated_power = _int(engine_el, f".//{p}RatedPower", NS)
            if max_torque is None:
                max_torque = _float(engine_el, f".//{p}MaxEngineTorque", NS)
            if idling_speed is None:
                idling_speed = _int(engine_el, f".//{p}IdlingSpeed", NS)
            if fuel_type is None:
                fuel_type = _text(engine_el, f".//{p}FuelType", NS)

        # Fallback: search by local name
        for child in engine_el.iter():
            local = child.tag.split("}")[-1] if "}" in child.tag else child.tag
            t = (child.text or "").strip()
            if not t:
                continue
            if local == "Displacement" and displacement is None:
                displacement = int(float(t))
            elif local == "RatedSpeed" and rated_speed is None:
                rated_speed = int(float(t))
            elif local == "RatedPower" and rated_power is None:
                rated_power = int(float(t))
            elif local == "MaxEngineTorque" and max_torque is None:
                max_torque = float(t)
            elif local == "IdlingSpeed" and idling_speed is None:
                idling_speed = int(float(t))
            elif local == "FuelType" and fuel_type is None:
                fuel_type = t
            elif local == "Manufacturer" and eng_mfr is None:
                eng_mfr = t
            elif local == "Model" and eng_model is None:
                eng_model = t
            elif local == "CertificationNumber" and eng_cert is None:
                eng_cert = t

    # ── WHTC / Correction Factors (CO2 critical) ──
    whtc_urban = whtc_rural = whtc_motorway = None
    bf_cold_hot = cf_reg_per = cf_ncv = None
    if engine_el is not None:
        for prefix in ["v2.1", "v2.0", "d"]:
            p = f"{prefix}:"
            if whtc_urban is None:
                whtc_urban = _float(engine_el, f".//{p}WHTCUrban", NS)
            if whtc_rural is None:
                whtc_rural = _float(engine_el, f".//{p}WHTCRural", NS)
            if whtc_motorway is None:
                whtc_motorway = _float(engine_el, f".//{p}WHTCMotorway", NS)
            if bf_cold_hot is None:
                bf_cold_hot = _float(engine_el, f".//{p}BFColdHot", NS)
            if cf_reg_per is None:
                cf_reg_per = _float(engine_el, f".//{p}CFRegPer", NS)
            if cf_ncv is None:
                cf_ncv = _float(engine_el, f".//{p}CFNCV", NS)
        # Fallback: iterate
        for child in engine_el.iter():
            local = child.tag.split("}")[-1] if "}" in child.tag else child.tag
            t = (child.text or "").strip()
            if not t:
                continue
            try:
                if local == "WHTCUrban" and whtc_urban is None:
                    whtc_urban = float(t)
                elif local == "WHTCRural" and whtc_rural is None:
                    whtc_rural = float(t)
                elif local == "WHTCMotorway" and whtc_motorway is None:
                    whtc_motorway = float(t)
                elif local == "BFColdHot" and bf_cold_hot is None:
                    bf_cold_hot = float(t)
                elif local == "CFRegPer" and cf_reg_per is None:
                    cf_reg_per = float(t)
                elif local == "CFNCV" and cf_ncv is None:
                    cf_ncv = float(t)
            except ValueError:
                pass

    # ── Tyre RRC (Rolling Resistance Coefficient) ──
    rrc_declared = fz_iso = None
    for el in vehicle_el.iter():
        local = el.tag.split("}")[-1] if "}" in el.tag else el.tag
        t = (el.text or "").strip()
        if not t:
            continue
        try:
            if local == "RRCDeclared" and rrc_declared is None:
                rrc_declared = float(t)
            elif local == "FzISO" and fz_iso is None:
                fz_iso = float(t)
        except ValueError:
            pass

    # Overrides from vehicle level
    veh_idling = vi("d:IdlingSpeed") or vi("IdlingSpeed")
    if veh_idling and idling_speed is None:
        idling_speed = veh_idling

    engine_type = _detect_engine_type(fuel_type, zero_emission)

    # ── Gearbox ──
    gbx_mfr = gbx_model = gbx_type = None
    gbx_el = None
    for gbx_xpath in [
        ".//d:Components//d:Gearbox//v2.0:Data",
        ".//Components//Gearbox//v2.0:Data",
    ]:
        try:
            nodes = vehicle_el.xpath(gbx_xpath, namespaces=NS)
            if nodes:
                gbx_el = nodes[0]
                break
        except Exception:
            pass

    if gbx_el is None:
        for el in vehicle_el.iter():
            tag = el.tag.split("}")[-1] if "}" in el.tag else el.tag
            if tag == "Data" and ("gbx" in el.get("id", "").lower() or "gear" in el.get("id", "").lower()):
                gbx_el = el
                break

    if gbx_el is not None:
        for child in gbx_el.iter():
            local = child.tag.split("}")[-1] if "}" in child.tag else child.tag
            t = (child.text or "").strip()
            if not t:
                continue
            if local == "Manufacturer" and gbx_mfr is None:
                gbx_mfr = t
            elif local == "Model" and gbx_model is None:
                gbx_model = t
            elif local == "TransmissionType" and gbx_type is None:
                gbx_type = t

    # ── Gear Ratios ──
    gear_ratios = []
    for gear_el in vehicle_el.iter():
        tag = gear_el.tag.split("}")[-1] if "}" in gear_el.tag else gear_el.tag
        if tag == "Gear":
            gear_num = gear_el.get("number")
            if gear_num:
                ratio_val = None
                for child in gear_el.iter():
                    cl = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                    if cl == "Ratio" and child.text:
                        try:
                            ratio_val = float(child.text.strip())
                        except ValueError:
                            pass
                if ratio_val is not None:
                    gear_ratios.append({
                        "gear_number": int(gear_num),
                        "ratio": ratio_val,
                    })

    # ── Fuel Consumption Map ──
    fuel_map = []
    for entry in vehicle_el.iter():
        tag = entry.tag.split("}")[-1] if "}" in entry.tag else entry.tag
        if tag == "Entry":
            es = entry.get("engineSpeed")
            tq = entry.get("torque")
            fc = entry.get("fuelConsumption")
            if es is not None and tq is not None and fc is not None:
                try:
                    fuel_map.append({
                        "engine_speed": float(es),
                        "torque": float(tq),
                        "fuel_consumption": float(fc),
                    })
                except ValueError:
                    pass

    # ── Full Load / Drag Curves ──
    load_curves = []
    for entry in vehicle_el.iter():
        tag = entry.tag.split("}")[-1] if "}" in entry.tag else entry.tag
        if tag == "Entry":
            es = entry.get("engineSpeed")
            mt = entry.get("maxTorque")
            dt = entry.get("dragTorque")
            if es is not None and mt is not None and dt is not None:
                try:
                    load_curves.append({
                        "engine_speed": float(es),
                        "max_torque": float(mt),
                        "drag_torque": float(dt),
                    })
                except ValueError:
                    pass

    # ── Axle ──
    axle_ratio = None
    axle_type_val = None
    axle_losses = []

    for el in vehicle_el.iter():
        local = el.tag.split("}")[-1] if "}" in el.tag else el.tag
        t = (el.text or "").strip()
        if local == "Ratio" and "AXLGEAR" in (el.getparent().get("id", "") if el.getparent() is not None else ""):
            try:
                axle_ratio = float(t)
            except (ValueError, AttributeError):
                pass
        elif local == "LineType" and axle_type_val is None and t:
            axle_type_val = t
        elif local == "Entry":
            isp = el.get("inputSpeed")
            itq = el.get("inputTorque")
            tl = el.get("torqueLoss")
            if isp is not None and itq is not None and tl is not None:
                try:
                    axle_losses.append({
                        "input_speed": float(isp),
                        "input_torque": float(itq),
                        "torque_loss": float(tl),
                    })
                except ValueError:
                    pass

    # ── Axle gear ratio fallback ──
    if axle_ratio is None:
        for el in vehicle_el.iter():
            local = el.tag.split("}")[-1] if "}" in el.tag else el.tag
            if local == "Ratio":
                parent = el.getparent()
                if parent is not None:
                    pid = parent.get("id", "")
                    ptag = parent.tag.split("}")[-1] if "}" in parent.tag else parent.tag
                    if "axl" in pid.lower() or "axle" in ptag.lower():
                        try:
                            axle_ratio = float(el.text.strip())
                            break
                        except (ValueError, AttributeError):
                            pass

    # ── Tyres (per-axle) ──
    tyre_mfr = tyre_model = tyre_dim = None
    axle_tyres = []  # list of dicts: {axle_number, axle_type, twin, manufacturer, model, dimension, rrc, fz_iso}
    for el in vehicle_el.iter():
        local = el.tag.split("}")[-1] if "}" in el.tag else el.tag
        if local == "Axle":
            axle_num = el.get("axleNumber")
            a_type = twin = None
            t_mfr = t_model = t_dim = t_rrc = t_fz = None
            for child in el.iter():
                cl = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                ct = (child.text or "").strip()
                if cl == "AxleType" and ct:
                    a_type = ct
                elif cl == "TwinTyres" and ct:
                    twin = ct.lower() == "true"
                elif cl == "Manufacturer" and ct and t_mfr is None:
                    t_mfr = ct
                elif cl == "Model" and ct and t_model is None:
                    t_model = ct
                elif cl == "Dimension" and ct and t_dim is None:
                    t_dim = ct
                elif cl == "RRCDeclared" and ct and t_rrc is None:
                    try: t_rrc = float(ct)
                    except ValueError: pass
                elif cl == "FzISO" and ct and t_fz is None:
                    try: t_fz = float(ct)
                    except ValueError: pass
            if t_dim or t_mfr:
                axle_tyres.append({
                    "axle_number": int(axle_num) if axle_num else len(axle_tyres) + 1,
                    "axle_type": a_type,
                    "twin_tyres": twin,
                    "manufacturer": t_mfr,
                    "model": t_model,
                    "dimension": t_dim,
                    "rrc": t_rrc,
                    "fz_iso": t_fz,
                })

    # Determine front (steered / axle 1) and rear (driven / axle 2+) tyres
    front_tyre = rear_tyre = None
    for at in axle_tyres:
        atype = (at.get("axle_type") or "").lower()
        if "nondriven" in atype or "steered" in atype or at["axle_number"] == 1:
            if front_tyre is None:
                front_tyre = at
        if "driven" in atype and "non" not in atype or at["axle_number"] >= 2:
            if rear_tyre is None:
                rear_tyre = at
    # Fallback: if only one tyre found, use for both
    if not front_tyre and not rear_tyre and axle_tyres:
        front_tyre = rear_tyre = axle_tyres[0]
    elif not front_tyre and axle_tyres:
        front_tyre = axle_tyres[0]
    elif not rear_tyre and len(axle_tyres) > 1:
        rear_tyre = axle_tyres[-1]
    elif not rear_tyre and axle_tyres:
        rear_tyre = axle_tyres[0]

    # Legacy single tyre (front)
    if front_tyre:
        tyre_mfr = front_tyre.get("manufacturer")
        tyre_model = front_tyre.get("model")
        tyre_dim = front_tyre.get("dimension")

    # Tyre fallback from Data id (if per-axle parsing found nothing)
    if tyre_mfr is None:
        for el in vehicle_el.iter():
            local = el.tag.split("}")[-1] if "}" in el.tag else el.tag
            data_id = el.get("id", "")
            if local == "Data" and ("BRIDGESTONE" in data_id or "MICHELIN" in data_id or "CONTINENTAL" in data_id or "R22" in data_id):
                for child in el.iter():
                    cl = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                    ct = (child.text or "").strip()
                    if not ct:
                        continue
                    if cl == "Manufacturer" and tyre_mfr is None:
                        tyre_mfr = ct
                    elif cl == "Model" and tyre_model is None:
                        tyre_model = ct
                    elif cl == "Dimension" and tyre_dim is None:
                        tyre_dim = ct
                break

    # ── ADAS ──
    ess = vb("d:ADAS/d:EngineStopStart") or vb(".//d:EngineStopStart")
    eco = vb("d:ADAS/d:EcoRollWithoutEngineStop") or vb(".//d:EcoRollWithoutEngineStop")
    pcc = vt("d:ADAS/d:PredictiveCruiseControl") or vt(".//d:PredictiveCruiseControl") or "none"

    # ── Auxiliaries ──
    fan_tech = None
    steering_tech = None
    alt_tech = None
    pneumatic = {}
    hvac = {}

    for el in vehicle_el.iter():
        local = el.tag.split("}")[-1] if "}" in el.tag else el.tag
        t = (el.text or "").strip()
        if local == "Technology" and not t:
            continue
        parent = el.getparent()
        ptag = parent.tag.split("}")[-1] if parent is not None and "}" in parent.tag else (parent.tag if parent is not None else "")

        if ptag == "Fan" and local == "Technology" and t:
            fan_tech = t
        elif ptag == "SteeringPump" and local == "Technology" and t:
            steering_tech = t
        elif local == "AlternatorTechnology" and t:
            alt_tech = t
        elif ptag == "PneumaticSystem":
            if t:
                pneumatic[local] = t
        elif ptag == "HVAC":
            if t:
                hvac[local] = t

    # ── Torque Converter (if present) ──
    torque_converter = []
    for entry in vehicle_el.iter():
        tag = entry.tag.split("}")[-1] if "}" in entry.tag else entry.tag
        if tag == "Entry":
            sr = entry.get("speedRatio")
            tr = entry.get("torqueRatio")
            itr = entry.get("inputTorqueRef") or entry.get("InputTorqueRef")
            if sr is not None and tr is not None:
                try:
                    torque_converter.append({
                        "speed_ratio": float(sr),
                        "torque_ratio": float(tr),
                        "input_torque_ref": float(itr) if itr else None,
                    })
                except ValueError:
                    pass

    # Retarder
    retarder_type = vt("d:RetarderType") or vt("RetarderType")
    retarder_ratio = vf("d:RetarderRatio") or vf("RetarderRatio")

    variant_data = {
        "variant_code": variant_code,
        "filename": filename,
        "engine_type": engine_type,
        "engine_manufacturer": eng_mfr,
        "engine_model": eng_model,
        "engine_cert_number": eng_cert,
        "displacement_cc": displacement,
        "rated_speed_rpm": rated_speed,
        "rated_power_w": rated_power,
        "max_torque_nm": max_torque,
        "idling_speed_rpm": idling_speed,
        "fuel_type": fuel_type,
        "max_laden_mass_kg": vi("d:TechnicalPermissibleMaximumLadenMass") or vi("TechnicalPermissibleMaximumLadenMass"),
        "gearbox_manufacturer": gbx_mfr,
        "gearbox_model": gbx_model,
        "gear_count": len(gear_ratios) if gear_ratios else None,
        "gearbox_type": gbx_type,
        "axle_ratio": axle_ratio,
        "axle_type": axle_type_val,
        "tyre_manufacturer": tyre_mfr,
        "tyre_model": tyre_model,
        "tyre_dimension": tyre_dim,
        "tyre_front_manufacturer": front_tyre.get("manufacturer") if front_tyre else tyre_mfr,
        "tyre_front_model": front_tyre.get("model") if front_tyre else tyre_model,
        "tyre_front_dimension": front_tyre.get("dimension") if front_tyre else tyre_dim,
        "tyre_front_rrc": front_tyre.get("rrc") if front_tyre else None,
        "tyre_front_fz_iso": front_tyre.get("fz_iso") if front_tyre else None,
        "tyre_front_twin_tyres": front_tyre.get("twin_tyres") if front_tyre else False,
        "tyre_rear_manufacturer": rear_tyre.get("manufacturer") if rear_tyre else tyre_mfr,
        "tyre_rear_model": rear_tyre.get("model") if rear_tyre else tyre_model,
        "tyre_rear_dimension": rear_tyre.get("dimension") if rear_tyre else tyre_dim,
        "tyre_rear_rrc": rear_tyre.get("rrc") if rear_tyre else None,
        "tyre_rear_fz_iso": rear_tyre.get("fz_iso") if rear_tyre else None,
        "tyre_rear_twin_tyres": rear_tyre.get("twin_tyres") if rear_tyre else False,
        "engine_stop_start": ess,
        "eco_roll": eco,
        "predictive_cruise": pcc,
        "fan_technology": fan_tech,
        "steering_pump_tech": steering_tech,
        "alternator_tech": alt_tech,
        "pneumatic_config": pneumatic,
        "hvac_config": hvac,
        "zero_emission_vehicle": zero_emission,
        "retarder_type": retarder_type,
        "retarder_ratio": retarder_ratio,
        "whtc_urban": whtc_urban,
        "whtc_rural": whtc_rural,
        "whtc_motorway": whtc_motorway,
        "bf_cold_hot": bf_cold_hot,
        "cf_reg_per": cf_reg_per,
        "cf_ncv": cf_ncv,
        "rrc_declared": rrc_declared,
        "fz_iso": fz_iso,
        "vecto_schema_version": root.get("schemaVersion"),
    }

    return {
        "vehicle": vehicle_data,
        "variant": variant_data,
        "fuel_map": fuel_map,
        "load_curves": load_curves,
        "gear_ratios": gear_ratios,
        "torque_converter": torque_converter,
        "axle_losses": axle_losses,
    }
