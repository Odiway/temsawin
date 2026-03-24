"""TEMSA Digital Twin — VECTO Result XML → PDF Report Generator"""

import io
import re
from datetime import datetime
from lxml import etree
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    HRFlowable, KeepTogether, Image,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import os

LOGO_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "Temsa-logo-1.png")
if not os.path.exists(LOGO_PATH):
    LOGO_PATH = "/app/public/Temsa-logo-1.png"

router = APIRouter(prefix="/api/pdf-report", tags=["PDF Report"])

# ── Namespace map for VECTO customer output XML ──
NS = {
    "cif": "urn:tugraz:ivt:VectoAPI:CustomerOutput",
    "v": "urn:tugraz:ivt:VectoAPI:CustomerOutput:v1.0",
    "ds": "http://www.w3.org/2000/09/xmldsig#",
}


def _t(el, path: str, default: str = "—") -> str:
    """Extract text from element, trying both namespaced and plain paths."""
    if el is None:
        return default
    node = el.find(path, NS)
    if node is None:
        # Try without namespace
        plain = re.sub(r'\{[^}]+\}', '', path) if '{' in path else path
        node = el.find(plain, NS)
    if node is None:
        # Try with default namespace
        parts = path.split("/")
        ns_path = "/".join(f"v:{p}" if not p.startswith(("v:", "cif:")) else p for p in parts)
        node = el.find(ns_path, NS)
    if node is not None and node.text:
        return node.text.strip()
    return default


def _ta(el, path: str, attr: str, default: str = "") -> str:
    """Extract attribute from element."""
    if el is None:
        return default
    node = el.find(path, NS)
    if node is None:
        parts = path.split("/")
        ns_path = "/".join(f"v:{p}" if not p.startswith(("v:", "cif:")) else p for p in parts)
        node = el.find(ns_path, NS)
    if node is not None:
        return node.get(attr, default)
    return default


def parse_xml(content: bytes) -> dict:
    """Parse VECTO customer result XML into structured dict."""
    root = etree.fromstring(content)

    # Find the Data element
    data = root.find("cif:Data", NS)
    if data is None:
        raise ValueError("No cif:Data element found in XML")

    vehicle = data.find("v:Vehicle", NS)
    if vehicle is None:
        vehicle = data.find("{urn:tugraz:ivt:VectoAPI:CustomerOutput:v1.0}Vehicle")

    def vt(path, default="—"):
        return _t(vehicle, path, default)

    # ── Vehicle info ──
    info = {
        "vin": vt("v:VIN"),
        "category": vt("v:VehicleCategory"),
        "axle_config": vt("v:AxleConfiguration"),
        "max_laden_mass": vt("v:TechnicalPermissibleMaximumLadenMass"),
        "max_laden_mass_unit": _ta(vehicle, "v:TechnicalPermissibleMaximumLadenMass", "unit", "kg"),
        "total_propulsion_power": vt("v:TotalPropulsionPower"),
        "total_propulsion_power_unit": _ta(vehicle, "v:TotalPropulsionPower", "unit", "kW"),
        "vehicle_group": vt("v:VehicleGroup"),
        "vehicle_group_co2": vt("v:VehicleGroupCO2"),
        "model": vt("v:Model"),
        "corrected_mass": vt("v:CorrectedActualMass"),
        "corrected_mass_unit": _ta(vehicle, "v:CorrectedActualMass", "unit", "kg"),
        "zero_emission": vt("v:ZeroEmissionVehicle"),
        "hybrid": vt("v:HybridElectricHDV"),
        "waste_heat": vt("v:WasteHeatRecovery"),
        "dual_fuel": vt("v:DualFuelVehicle"),
        "bus_class": vt("v:ClassBus"),
        "total_passengers": vt("v:TotalNumberOfPassengers"),
        "type_approval": vt("v:VehicleTypeApprovalNumber"),
        "engine_power": vt("v:EngineRatedPower"),
        "engine_power_unit": _ta(vehicle, "v:EngineRatedPower", "unit", "kW"),
        "engine_capacity": vt("v:EngineCapacity"),
        "engine_capacity_unit": _ta(vehicle, "v:EngineCapacity", "unit", "ltr"),
        "fuel_type": vt("v:FuelTypes/v:FuelType"),
        "transmission_type": vt("v:TransmissionType"),
        "transmission_values": vt("v:TransmissionValues"),
        "nr_gears": vt("v:NrOfGears"),
        "retarder": vt("v:Retarder"),
        "axle_ratio": vt("v:AxleRatio"),
        "avg_rrc": vt("v:AverageRRC"),
    }

    # ADAS
    adas_el = vehicle.find("v:ADAS", NS) if vehicle is not None else None
    info["adas"] = {
        "engine_stop_start": _t(adas_el, "v:EngineStopStart"),
        "eco_roll_no_stop": _t(adas_el, "v:EcoRollWithoutEngineStopStart"),
        "eco_roll_stop": _t(adas_el, "v:EcoRollWithEngineStopStart"),
        "predictive_cc": _t(adas_el, "v:PredictiveCruiseControl"),
    }

    # Manufacturers
    manufacturers = []
    if vehicle is not None:
        for step in vehicle.findall("v:Manufacturers/v:Step", NS):
            manufacturers.append({
                "step": step.get("stepCount", ""),
                "name": _t(step, "v:Manufacturer"),
                "address": _t(step, "v:ManufacturerAddress"),
            })
    info["manufacturers"] = manufacturers

    # Axles
    axles = []
    if vehicle is not None:
        for axle in vehicle.findall("v:Axle", NS):
            axles.append({
                "number": axle.get("axleNumber", ""),
                "tyre_dim": _t(axle, "v:TyreDimension"),
                "efficiency_class": _t(axle, "v:FuelEfficiencyClass", ""),
                "cert_number": _t(axle, "v:TyreCertificationNumber"),
            })
    info["axles"] = axles

    # Auxiliaries
    info["steering_pump"] = vt("v:SteeringPump/v:Technology")
    info["alternator"] = vt("v:ElectricSystem/v:AlternatorTechnology")
    info["smart_compression"] = vt("v:PneumaticSystem/v:SmartCompressionSystem")
    info["smart_regeneration"] = vt("v:PneumaticSystem/v:SmartRegenerationSystem")

    # HVAC
    hvac_el = vehicle.find("v:HVAC", NS) if vehicle is not None else None
    info["hvac"] = {
        "config": _t(hvac_el, "v:SystemConfiguration"),
        "heater_power": _t(hvac_el, "v:AuxiliaryHeaterPower"),
        "heater_power_unit": _ta(hvac_el, "v:AuxiliaryHeaterPower", "unit", "kW") if hvac_el is not None else "kW",
        "double_glazing": _t(hvac_el, "v:DoubleGlazing"),
    }

    # ── Results ──
    results_el = data.find("v:Results", NS)
    status = _t(results_el, "v:Status") if results_el is not None else "—"

    missions = []
    if results_el is not None:
        for res in results_el.findall("v:Result", NS):
            mission = _t(res, "v:Mission")
            sim = res.find("v:SimulationParameters", NS)
            total = res.find("v:Total", NS)

            fuel_data = {}
            fuel_type_mission = "—"
            if total is not None:
                fuel_el = total.find("v:Fuel", NS)
                if fuel_el is not None:
                    fuel_type_mission = fuel_el.get("type", "—")
                for fc in total.findall("v:Fuel/v:FuelConsumption", NS):
                    unit = fc.get("unit", "")
                    fuel_data[unit] = fc.text.strip() if fc.text else "—"

            co2_data = {}
            if total is not None:
                for co2 in total.findall("v:CO2", NS):
                    unit = co2.get("unit", "")
                    co2_data[unit] = co2.text.strip() if co2.text else "—"

            missions.append({
                "mission": mission,
                "status": res.get("status", ""),
                "fuel_type": fuel_type_mission,
                "total_mass": _t(sim, "v:TotalVehicleMass") if sim is not None else "—",
                "total_mass_unit": _ta(sim, "v:TotalVehicleMass", "unit", "kg") if sim is not None else "kg",
                "mass_passengers": _t(sim, "v:MassPassengers") if sim is not None else "—",
                "mass_passengers_unit": _ta(sim, "v:MassPassengers", "unit", "kg") if sim is not None else "kg",
                "passenger_count": _t(sim, "v:PassengerCount") if sim is not None else "—",
                "avg_speed": _t(total, "v:AverageSpeed") if total is not None else "—",
                "avg_speed_unit": _ta(total, "v:AverageSpeed", "unit", "km/h") if total is not None else "km/h",
                "fuel": fuel_data,
                "co2": co2_data,
            })

    # Summary
    summary_el = results_el.find("v:Summary", NS) if results_el is not None else None
    summary = {}
    if summary_el is not None:
        summary["vocational"] = _t(summary_el, "v:Vocational")
        summary["avg_passengers"] = _t(summary_el, "v:AveragePassengerCount")
        summary_fuel_el = summary_el.find("v:Fuel", NS)
        summary["fuel_type"] = summary_fuel_el.get("type", "—") if summary_fuel_el is not None else "—"
        summary["fuel"] = {}
        for fc in summary_el.findall("v:Fuel/v:FuelConsumption", NS):
            summary["fuel"][fc.get("unit", "")] = fc.text.strip() if fc.text else "—"
        summary["co2"] = {}
        for co2 in summary_el.findall("v:CO2", NS):
            summary["co2"][co2.get("unit", "")] = co2.text.strip() if co2.text else "—"

    # Application info
    app_info_el = data.find("v:ApplicationInformation", NS)
    app_info = {
        "tool_version": _t(app_info_el, "v:SimulationToolVersion"),
        "date": _t(app_info_el, "v:Date"),
    }

    # ── Signatures ──
    signatures = []

    sig_sections = [
        ("InputDataSignaturePrimaryVehicle", "Input Data Signature (Primary Vehicle)"),
        ("ManufacturerRecordSignaturePrimaryVehicle", "Manufacturer Record Signature (Primary Vehicle)"),
        ("InputDataSignature", "Input Data Signature"),
        ("ManufacturerRecordSignature", "Manufacturer Record Signature"),
    ]
    for tag, label in sig_sections:
        el = data.find(f"v:{tag}", NS)
        if el is not None:
            ref = el.find("ds:Reference", NS)
            if ref is not None:
                digest_val = ref.findtext("ds:DigestValue", default="—", namespaces=NS)
                digest_meth_el = ref.find("ds:DigestMethod", NS)
                digest_alg = digest_meth_el.get("Algorithm", "") if digest_meth_el is not None else ""
                transforms = []
                for t in ref.findall("ds:Transforms/ds:Transform", NS):
                    transforms.append(t.get("Algorithm", ""))
                signatures.append({
                    "label": label,
                    "uri": ref.get("URI", ""),
                    "digest_algorithm": digest_alg,
                    "digest_value": digest_val,
                    "transforms": transforms,
                })

    # CIF Signature (the outer one)
    cif_sig = root.find("cif:Signature", NS)
    if cif_sig is not None:
        ref = cif_sig.find("ds:Reference", NS)
        if ref is not None:
            digest_val = ref.findtext("ds:DigestValue", default="—", namespaces=NS)
            digest_meth_el = ref.find("ds:DigestMethod", NS)
            digest_alg = digest_meth_el.get("Algorithm", "") if digest_meth_el is not None else ""
            transforms = []
            for t in ref.findall("ds:Transforms/ds:Transform", NS):
                transforms.append(t.get("Algorithm", ""))
            signatures.append({
                "label": "CIF Document Signature",
                "uri": ref.get("URI", ""),
                "digest_algorithm": digest_alg,
                "digest_value": digest_val,
                "transforms": transforms,
            })

    return {
        "vehicle": info,
        "status": status,
        "missions": missions,
        "summary": summary,
        "app_info": app_info,
        "signatures": signatures,
    }


# ── PDF Styles ──
TEMSA_RED = colors.HexColor("#C8102E")
TEMSA_DARK = colors.HexColor("#0f1419")
HEADER_BG = colors.HexColor("#1a1f27")
ROW_ALT = colors.HexColor("#f8f9fa")
BORDER_C = colors.HexColor("#dee2e6")
LIGHT_GRAY = colors.HexColor("#f1f3f5")
TEXT_DARK = colors.HexColor("#212529")
TEXT_MED = colors.HexColor("#495057")
TEXT_LIGHT = colors.HexColor("#6c757d")


def _build_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("SectionTitle", fontName="Helvetica-Bold", fontSize=11,
                              textColor=TEMSA_RED, spaceBefore=14, spaceAfter=6))
    styles.add(ParagraphStyle("CellText", fontName="Helvetica", fontSize=7.5,
                              textColor=TEXT_DARK, leading=10))
    styles.add(ParagraphStyle("CellBold", fontName="Helvetica-Bold", fontSize=7.5,
                              textColor=TEXT_DARK, leading=10))
    styles.add(ParagraphStyle("CellLabel", fontName="Helvetica", fontSize=7,
                              textColor=TEXT_LIGHT, leading=9))
    styles.add(ParagraphStyle("SmallMono", fontName="Courier", fontSize=6.5,
                              textColor=TEXT_MED, leading=8.5, wordWrap='CJK'))
    styles.add(ParagraphStyle("FooterText", fontName="Helvetica", fontSize=7,
                              textColor=TEXT_LIGHT, alignment=TA_CENTER))
    styles.add(ParagraphStyle("ReportTitle", fontName="Helvetica-Bold", fontSize=16,
                              textColor=TEMSA_RED, alignment=TA_CENTER, spaceAfter=2))
    styles.add(ParagraphStyle("ReportSub", fontName="Helvetica", fontSize=9,
                              textColor=TEXT_LIGHT, alignment=TA_CENTER, spaceAfter=4))
    return styles


def _section(title: str, styles) -> Paragraph:
    return Paragraph(f"■ {title}", styles["SectionTitle"])


def _kv_table(rows: list, col_widths=None) -> Table:
    """Create a two-column key-value table."""
    if col_widths is None:
        col_widths = [55 * mm, 115 * mm]
    style = TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("TEXTCOLOR", (0, 0), (0, -1), TEXT_LIGHT),
        ("TEXTCOLOR", (1, 0), (1, -1), TEXT_DARK),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.3, BORDER_C),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, ROW_ALT]),
    ])
    t = Table(rows, colWidths=col_widths)
    t.setStyle(style)
    return t


def _data_table(headers: list, rows: list, col_widths=None) -> Table:
    """Create a data table with header row."""
    data = [headers] + rows
    style = TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 7.5),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 0), (-1, 0), TEMSA_RED),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 7),
        ("TEXTCOLOR", (0, 1), (-1, -1), TEXT_DARK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER_C),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ROW_ALT]),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
    ])
    t = Table(data, colWidths=col_widths)
    t.setStyle(style)
    return t


def generate_pdf(parsed: dict) -> io.BytesIO:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=15 * mm, bottomMargin=18 * mm,
    )
    styles = _build_styles()
    story = []
    v = parsed["vehicle"]
    W = 174 * mm  # usable width

    # ═══════ HEADER ═══════
    if os.path.exists(LOGO_PATH):
        logo_img = Image(LOGO_PATH, width=22 * mm, height=11 * mm, hAlign="LEFT")
        header_data = [[
            logo_img,
            Paragraph("<b>TEMSA</b> Digital Twin Platform", ParagraphStyle(
                "H1", fontName="Helvetica-Bold", fontSize=14, textColor=TEMSA_RED)),
            Paragraph("VECTO Customer Information Report", ParagraphStyle(
                "H2", fontName="Helvetica", fontSize=9, textColor=TEXT_LIGHT, alignment=TA_RIGHT)),
        ]]
        ht = Table(header_data, colWidths=[26 * mm, W * 0.50 - 6 * mm, W * 0.50 - 6 * mm])
    else:
        header_data = [[
            Paragraph("<b>TEMSA</b> Digital Twin Platform", ParagraphStyle(
                "H1", fontName="Helvetica-Bold", fontSize=14, textColor=TEMSA_RED)),
            Paragraph("VECTO Customer Information Report", ParagraphStyle(
                "H2", fontName="Helvetica", fontSize=9, textColor=TEXT_LIGHT, alignment=TA_RIGHT)),
        ]]
        ht = Table(header_data, colWidths=[W * 0.55, W * 0.45])
    ht.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(ht)
    story.append(HRFlowable(width="100%", thickness=1.5, color=TEMSA_RED, spaceAfter=4))

    # Sub-header row
    sub_data = [[
        Paragraph(f"VIN: <b>{v['vin']}</b>", styles["CellText"]),
        Paragraph(f"Model: <b>{v['model']}</b>", styles["CellText"]),
        Paragraph(f"Date: <b>{parsed['app_info']['date'][:10] if len(parsed['app_info'].get('date','')) >= 10 else parsed['app_info'].get('date','—')}</b>", styles["CellText"]),
    ]]
    st = Table(sub_data, colWidths=[W * 0.4, W * 0.3, W * 0.3])
    st.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("BOX", (0, 0), (-1, -1), 0.4, BORDER_C),
    ]))
    story.append(st)
    story.append(Spacer(1, 8))

    # ═══════ VEHICLE INFORMATION ═══════
    story.append(_section("Vehicle Information", styles))
    story.append(_kv_table([
        ["VIN", v["vin"]],
        ["Vehicle Category", v["category"]],
        ["Axle Configuration", v["axle_config"]],
        ["Max Laden Mass", f"{v['max_laden_mass']} {v['max_laden_mass_unit']}"],
        ["Total Propulsion Power", f"{v['total_propulsion_power']} {v['total_propulsion_power_unit']}"],
        ["Vehicle Group", v["vehicle_group"]],
        ["Vehicle Group CO₂", v["vehicle_group_co2"]],
        ["Model", v["model"]],
        ["Corrected Actual Mass", f"{v['corrected_mass']} {v['corrected_mass_unit']}"],
        ["Bus Class", v["bus_class"]],
        ["Total Passengers", v["total_passengers"]],
        ["Type Approval Number", v["type_approval"]],
        ["Zero Emission Vehicle", v["zero_emission"]],
        ["Hybrid Electric HDV", v["hybrid"]],
        ["Waste Heat Recovery", v["waste_heat"]],
        ["Dual Fuel Vehicle", v["dual_fuel"]],
    ]))
    story.append(Spacer(1, 6))

    # ═══════ MANUFACTURER ═══════
    if v["manufacturers"]:
        story.append(_section("Manufacturer Information", styles))
        for m in v["manufacturers"]:
            story.append(_kv_table([
                [f"Step {m['step']} — Manufacturer", m["name"]],
                [f"Step {m['step']} — Address", m["address"]],
            ]))
            story.append(Spacer(1, 2))
        story.append(Spacer(1, 4))

    # ═══════ ENGINE & TRANSMISSION ═══════
    story.append(_section("Engine & Transmission", styles))
    story.append(_kv_table([
        ["Engine Rated Power", f"{v['engine_power']} {v['engine_power_unit']}"],
        ["Engine Capacity", f"{v['engine_capacity']} {v['engine_capacity_unit']}"],
        ["Fuel Type", v["fuel_type"]],
        ["Transmission Type", v["transmission_type"]],
        ["Transmission Values", v["transmission_values"]],
        ["Number of Gears", v["nr_gears"]],
        ["Retarder", v["retarder"]],
        ["Axle Ratio", v["axle_ratio"]],
        ["Average RRC", v["avg_rrc"]],
    ]))
    story.append(Spacer(1, 6))

    # ═══════ TYRES ═══════
    if v["axles"]:
        story.append(_section("Tyre Information", styles))
        headers = ["Axle", "Dimension", "Efficiency Class", "Certification Number"]
        rows = [[a["number"], a["tyre_dim"], a["efficiency_class"] or "—", a["cert_number"]] for a in v["axles"]]
        story.append(_data_table(headers, rows, col_widths=[18 * mm, 40 * mm, 30 * mm, 86 * mm]))
        story.append(Spacer(1, 6))

    # ═══════ ADAS ═══════
    story.append(_section("Advanced Driver Assistance (ADAS)", styles))
    story.append(_kv_table([
        ["Engine Stop/Start", v["adas"]["engine_stop_start"]],
        ["Eco-Roll (no engine stop)", v["adas"]["eco_roll_no_stop"]],
        ["Eco-Roll (with engine stop)", v["adas"]["eco_roll_stop"]],
        ["Predictive Cruise Control", v["adas"]["predictive_cc"]],
    ]))
    story.append(Spacer(1, 6))

    # ═══════ AUXILIARIES ═══════
    story.append(_section("Auxiliaries & HVAC", styles))
    story.append(_kv_table([
        ["Steering Pump", v["steering_pump"]],
        ["Alternator Technology", v["alternator"]],
        ["Smart Compression System", v["smart_compression"]],
        ["Smart Regeneration System", v["smart_regeneration"]],
        ["HVAC Configuration", v["hvac"]["config"]],
        ["Auxiliary Heater Power", f"{v['hvac']['heater_power']} {v['hvac']['heater_power_unit']}"],
        ["Double Glazing", v["hvac"]["double_glazing"]],
    ]))
    story.append(Spacer(1, 8))

    # ═══════ SIMULATION RESULTS ═══════
    story.append(_section("Simulation Results", styles))
    story.append(Paragraph(f"Status: <b>{parsed['status']}</b>", styles["CellText"]))
    story.append(Spacer(1, 6))

    if parsed["missions"]:
        # Overview table (compact)
        headers = [
            "Mission", "Status", "Passengers",
            "Pass. Mass\n(kg)", "Vehicle Mass\n(kg)",
            "Avg Speed\n(km/h)", "Fuel Type",
        ]
        rows = []
        for m in parsed["missions"]:
            loading = "Low" if float(m.get("passenger_count", 0) or 0) < 30 else "High"
            rows.append([
                f"{m['mission']} ({loading})",
                m.get("status", "—"),
                m["passenger_count"],
                m.get("mass_passengers", "—"),
                m["total_mass"],
                m["avg_speed"],
                m.get("fuel_type", "—"),
            ])
        cw = [28*mm, 14*mm, 18*mm, 20*mm, 22*mm, 18*mm, 22*mm]
        story.append(Paragraph("<b>Overview</b>", styles["CellLabel"]))
        story.append(Spacer(1, 3))
        story.append(_data_table(headers, rows, col_widths=cw))
        story.append(Spacer(1, 6))

        # Detailed fuel & CO2 table
        fuel_headers = [
            "Mission", "Fuel\n(g/km)", "Fuel\n(g/p-km)",
            "Fuel\n(MJ/km)", "Fuel\n(MJ/p-km)",
            "Fuel\n(l/100km)", "Fuel\n(l/p-km)",
            "CO\u2082\n(g/km)", "CO\u2082\n(g/p-km)",
        ]
        fuel_rows = []
        for m in parsed["missions"]:
            loading = "Low" if float(m.get("passenger_count", 0) or 0) < 30 else "High"
            fuel_rows.append([
                f"{m['mission']} ({loading})",
                m["fuel"].get("g/km", "—"),
                m["fuel"].get("g/p-km", "—"),
                m["fuel"].get("MJ/km", "—"),
                m["fuel"].get("MJ/p-km", "—"),
                m["fuel"].get("l/100km", "—"),
                m["fuel"].get("l/p-km", "—"),
                m["co2"].get("g/km", "—"),
                m["co2"].get("g/p-km", "—"),
            ])
        fcw = [28*mm, 18*mm, 18*mm, 18*mm, 18*mm, 20*mm, 18*mm, 18*mm, 18*mm]
        story.append(Paragraph("<b>Fuel Consumption &amp; CO\u2082 Emissions</b>", styles["CellLabel"]))
        story.append(Spacer(1, 3))
        story.append(_data_table(fuel_headers, fuel_rows, col_widths=fcw))
        story.append(Spacer(1, 8))

    # ═══════ SUMMARY ═══════
    if parsed["summary"]:
        s = parsed["summary"]
        story.append(_section("Weighted Summary (Official Values)", styles))
        summary_rows = [
            ["Average Passenger Count", s.get("avg_passengers", "—")],
            ["Vocational", s.get("vocational", "—")],
        ]
        if s.get("fuel_type") and s["fuel_type"] != "—":
            summary_rows.append(["Fuel Type", s["fuel_type"]])
        for unit, val in s.get("fuel", {}).items():
            summary_rows.append([f"Fuel Consumption ({unit})", val])
        for unit, val in s.get("co2", {}).items():
            summary_rows.append([f"CO\u2082 ({unit})", val])
        story.append(_kv_table(summary_rows))
        story.append(Spacer(1, 6))

    # ═══════ APPLICATION INFO ═══════
    story.append(_section("Application Information", styles))
    story.append(_kv_table([
        ["VECTO Simulation Tool Version", parsed["app_info"]["tool_version"]],
        ["Simulation Date", parsed["app_info"]["date"]],
    ]))
    story.append(Spacer(1, 10))

    # ═══════ DIGITAL SIGNATURES ═══════
    if parsed["signatures"]:
        story.append(HRFlowable(width="100%", thickness=0.8, color=TEMSA_RED, spaceBefore=6, spaceAfter=6))
        story.append(_section("Digital Signatures & Verification", styles))
        story.append(Paragraph(
            "The following cryptographic signatures verify the integrity and authenticity of this VECTO customer information document.",
            styles["CellLabel"],
        ))
        story.append(Spacer(1, 6))

        for sig in parsed["signatures"]:
            sig_block = []
            sig_block.append(Paragraph(f"<b>{sig['label']}</b>", ParagraphStyle(
                "SigLabel", fontName="Helvetica-Bold", fontSize=8, textColor=TEMSA_RED, spaceBefore=4, spaceAfter=2)))

            sig_rows = [
                ["Reference URI", sig["uri"]],
                ["Digest Algorithm", sig["digest_algorithm"].split("#")[-1] if "#" in sig["digest_algorithm"] else sig["digest_algorithm"]],
                ["Digest Value", sig["digest_value"]],
            ]
            if sig["transforms"]:
                for i, t in enumerate(sig["transforms"]):
                    short_t = t.split(":")[-1] if ":" in t else t
                    sig_rows.append([f"Transform {i+1}", short_t])

            sig_table = _kv_table(sig_rows, col_widths=[40 * mm, 130 * mm])
            sig_block.append(sig_table)
            sig_block.append(Spacer(1, 4))
            story.append(KeepTogether(sig_block))

    # ═══════ FOOTER ═══════
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_C, spaceAfter=6))
    story.append(Paragraph(
        f"Generated by TEMSA Digital Twin Platform — {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        styles["FooterText"],
    ))
    story.append(Paragraph(
        "This document is auto-generated from VECTO simulation results. For official certification, refer to the original XML file.",
        styles["FooterText"],
    ))

    doc.build(story)
    buf.seek(0)
    return buf


# ═════════════════════════════════════════════════════════════════════
#  EUROPEAN COMMISSION FORMAT PDF GENERATOR
# ═════════════════════════════════════════════════════════════════════

EC_GREEN = colors.HexColor("#1f6032")
EC_GREEN_RGB = (0.122, 0.376, 0.196)
EC_BLUE_RGB = (0.0, 0.2, 0.6)
EC_YELLOW_RGB = (1.0, 0.8, 0.0)
EC_LIGHT_GREEN = colors.HexColor("#c8e6c9")
EC_GRAY = colors.HexColor("#666666")
EC_GRAY_LIGHT = colors.HexColor("#999999")
EC_RED_RGB = (0.769, 0.071, 0.188)


def _ec_draw_co2(c, x, y, font_name, font_size, prefix="CO", suffix=" Emission Report"):
    """Draw CO2 with proper subscript '2' on canvas."""
    c.setFont(font_name, font_size)
    c.drawString(x, y, prefix)
    w_co = c.stringWidth(prefix, font_name, font_size)
    # subscript 2
    sub_size = font_size * 0.65
    c.setFont(font_name, sub_size)
    c.drawString(x + w_co, y - font_size * 0.15, "2")
    w_2 = c.stringWidth("2", font_name, sub_size)
    # rest of text
    c.setFont(font_name, font_size)
    c.drawString(x + w_co + w_2, y, suffix)


def _ec_draw_page(canvas, doc, parsed):
    """Draw header, footer, and border for EC format pages."""
    from reportlab.lib.pagesizes import A4
    pw, ph = A4
    page_num = canvas.getPageNumber()
    c = canvas

    c.saveState()

    # ── Layout coordinates ──
    LEFT = 42
    RIGHT = 553.28
    BAR_W = RIGHT - LEFT  # 511.28

    # Full header area: green bar + white logo panel
    HDR_H = 90                 # header height
    H_TOP = ph - 8
    H_BOT = H_TOP - HDR_H
    H_MID = H_BOT + HDR_H / 2

    # Logo panel dimensions (white box on the right)
    LOGO_PANEL_W = 190
    LOGO_PANEL_X = RIGHT - LOGO_PANEL_W
    GREEN_W = BAR_W - LOGO_PANEL_W  # width of green portion

    # ── Green header bar (left portion) ──
    c.setFillColorRGB(*EC_GREEN_RGB)
    c.rect(LEFT, H_BOT, GREEN_W, HDR_H, fill=1, stroke=0)

    # ── White logo panel (right portion) ──
    c.setFillColor(colors.white)
    c.rect(LOGO_PANEL_X, H_BOT, LOGO_PANEL_W, HDR_H, fill=1, stroke=0)

    # ── TEMSA logo inside white panel ──
    if os.path.exists(LOGO_PATH):
        logo_h = 80
        logo_w = 170
        logo_x = LOGO_PANEL_X + (LOGO_PANEL_W - logo_w) / 2
        logo_y = H_BOT + (HDR_H - logo_h) / 2
        c.drawImage(LOGO_PATH, logo_x, logo_y, width=logo_w, height=logo_h,
                     preserveAspectRatio=True, mask='auto')
    else:
        c.setFillColorRGB(0.0, 0.318, 0.627)  # TEMSA blue
        c.setFont("Helvetica-Bold", 24)
        c.drawCentredString(LOGO_PANEL_X + LOGO_PANEL_W / 2, H_MID - 4, "TEMSA")

    # ── Green border around entire header ──
    c.setStrokeColorRGB(*EC_GREEN_RGB)
    c.setLineWidth(1.0)
    c.rect(LEFT, H_BOT, BAR_W, HDR_H, fill=0, stroke=1)

    # ── EU flag (blue rect + yellow circle stars) ──
    flag_x = LEFT + 10
    flag_y = H_MID - 11
    c.setFillColorRGB(*EC_BLUE_RGB)
    c.rect(flag_x, flag_y, 30, 22, fill=1, stroke=0)
    c.setFillColorRGB(*EC_YELLOW_RGB)
    import math
    fx, fy = flag_x + 15, flag_y + 11
    for i in range(12):
        angle = math.pi / 2 + 2 * math.pi * i / 12
        sx = fx + 8 * math.cos(angle)
        sy = fy + 8 * math.sin(angle)
        c.circle(sx, sy, 1.2, fill=1, stroke=0)

    # ── "European Commission" ──
    c.setFillColor(colors.white)
    c.setFont("Helvetica", 6.5)
    c.drawString(flag_x + 34, H_MID + 4, "European")
    c.drawString(flag_x + 34, H_MID - 6, "Commission")

    # ── "VECTO CO2 Emission Report" — centered in green area ──
    title_cx = LEFT + GREEN_W / 2 + 30  # shift right to account for flag
    c.setFillColor(colors.white)
    _ec_draw_co2(c, title_cx - 85, H_TOP - 18, "Helvetica-Bold", 13, "VECTO CO", " Emission Report")

    # ── "Regulation (EU) 2017/2400" ──
    c.setFillColor(colors.white)
    c.setFont("Helvetica", 8)
    reg_text = "Regulation (EU) 2017/2400"
    reg_w = c.stringWidth(reg_text, "Helvetica", 8)
    c.drawString(title_cx - reg_w / 2 + 10, H_TOP - 34, reg_text)

    # ── Subtitle ──
    c.setFillColor(EC_LIGHT_GREEN)
    c.setFont("Helvetica", 5.5)
    sub_text = "Temsa Homologation Team \u00b7 Digital Technologies Solutions"
    sub_w = c.stringWidth(sub_text, "Helvetica", 5.5)
    c.drawString(title_cx - sub_w / 2 + 10, H_BOT + 5, sub_text)

    # ── Date + Page line ──
    c.setStrokeColorRGB(*EC_GREEN_RGB)
    c.setLineWidth(1.5)
    c.line(LEFT, H_BOT - 3, RIGHT, H_BOT - 3)

    c.setFillColor(EC_GRAY)
    c.setFont("Helvetica", 7.5)
    c.drawString(LEFT + 6, H_BOT - 16, datetime.now().strftime("%d/%m/%Y %H:%M"))
    c.drawRightString(RIGHT, H_BOT - 16, f"Page {page_num}")

    # ── Content border ──
    c.setStrokeColorRGB(*EC_GREEN_RGB)
    c.setLineWidth(0.6)
    content_top = H_BOT - 20
    content_bot = 44
    c.rect(LEFT, content_bot, BAR_W, content_top - content_bot, fill=0, stroke=1)

    # ── Footer ──
    c.setFillColor(EC_GRAY)
    c.setFont("Helvetica", 6.5)
    c.drawString(LEFT + 6, 30, "TEMSA \u00b7 Skoda Sabanci Ulasim Araclari")
    c.setFillColor(EC_GRAY_LIGHT)
    c.drawRightString(RIGHT, 30, "Digital Technologies Solutions")

    # ── Red footer line (left half) ──
    c.setStrokeColorRGB(*EC_RED_RGB)
    c.setLineWidth(0.6)
    c.line(LEFT + 6, 40, 298, 40)

    c.restoreState()


def generate_pdf_ec(parsed: dict) -> io.BytesIO:
    """Generate European Commission format VECTO CO2 Emission Report."""
    from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate

    buf = io.BytesIO()
    pw, ph = A4

    frame = Frame(
        48, 50, 499, ph - 172,
        id="content",
        leftPadding=10, rightPadding=10,
        topPadding=14, bottomPadding=10,
    )

    def on_page(canvas, doc):
        _ec_draw_page(canvas, doc, parsed)

    doc = BaseDocTemplate(buf, pagesize=A4)
    doc.addPageTemplates([PageTemplate(id="ec", frames=[frame], onPage=on_page)])

    styles = getSampleStyleSheet()
    # EC-specific styles
    s_title = ParagraphStyle("ECTitle", fontName="Helvetica-Bold", fontSize=20,
                             textColor=EC_GREEN, spaceBefore=4, spaceAfter=14)
    s_section = ParagraphStyle("ECSection", fontName="Helvetica-Bold", fontSize=14,
                               textColor=EC_GREEN, alignment=TA_CENTER, spaceBefore=16, spaceAfter=10)
    s_subsection = ParagraphStyle("ECSubSection", fontName="Helvetica-Bold", fontSize=11,
                                   textColor=EC_GREEN, alignment=TA_CENTER, spaceBefore=10, spaceAfter=6)
    s_mission = ParagraphStyle("ECMissionName", fontName="Helvetica-Bold", fontSize=10,
                                textColor=EC_GREEN, alignment=TA_CENTER, spaceBefore=12, spaceAfter=4)
    s_kv_label = ParagraphStyle("ECLabel", fontName="Helvetica", fontSize=9,
                                 textColor=colors.black, leading=13)
    s_kv_value = ParagraphStyle("ECValue", fontName="Helvetica", fontSize=9,
                                 textColor=colors.black, leading=13)

    W = 479  # usable content width

    story = []
    v = parsed["vehicle"]

    # ═══════ PAGE 1: Vehicle Configuration ═══════
    story.append(Paragraph("VECTO - Customer Information File", s_title))
    story.append(Paragraph("Vehicle Configuration", s_section))

    # Manufacturer name
    mfr_name = "—"
    if v["manufacturers"]:
        mfr_name = v["manufacturers"][0]["name"]

    def _ec_kv_rows(rows, has_unit=False):
        """Build a table of label:value rows in EC format."""
        data = []
        for row in rows:
            if has_unit and len(row) == 3:
                data.append([
                    Paragraph(row[0], s_kv_label),
                    Paragraph(str(row[1]), s_kv_value),
                    Paragraph(str(row[2]), s_kv_value),
                ])
            else:
                data.append([
                    Paragraph(row[0], s_kv_label),
                    Paragraph(str(row[1]), s_kv_value),
                ])
        if has_unit:
            cw = [W * 0.52, W * 0.28, W * 0.20]
        else:
            cw = [W * 0.52, W * 0.48]
        t = Table(data, colWidths=cw)
        style_cmds = [
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("LINEBELOW", (0, 0), (-1, -2), 0.3, colors.HexColor("#e0e0e0")),
        ]
        t.setStyle(TableStyle(style_cmds))
        return t

    story.append(_ec_kv_rows([
        ["Manufacturer:", mfr_name],
        ["Model / Commercial name:", v["model"]],
        ["VIN:", v["vin"]],
        ["Date:", parsed["app_info"]["date"]],
        ["Legislative category:", v["category"]],
        ["Axle configuration:", v["axle_config"]],
        ["Bus class:", v["bus_class"]],
        ["Total number of passengers:", v["total_passengers"]],
        ["Type approval number:", v["type_approval"]],
        ["Zero emission vehicle:", v["zero_emission"]],
        ["Hybrid electric HDV:", v["hybrid"]],
    ]))

    # Masses
    story.append(Paragraph("Masses", s_subsection))
    story.append(_ec_kv_rows([
        ["Corrected actual mass:", v["corrected_mass"], v["corrected_mass_unit"]],
        ["Technically permissible max laden mass:", v["max_laden_mass"], v["max_laden_mass_unit"]],
    ], has_unit=True))
    story.append(_ec_kv_rows([
        ["Vehicle group (Annex I):", v["vehicle_group"]],
        [u"Vehicle group CO<sub>2</sub>:", v["vehicle_group_co2"]],
    ]))

    # Engine & Drivetrain
    story.append(Paragraph("Engine &amp; Drivetrain", s_subsection))
    story.append(_ec_kv_rows([
        ["Engine rated power:", v["engine_power"], v["engine_power_unit"]],
        ["Engine capacity:", v["engine_capacity"], v["engine_capacity_unit"]],
    ], has_unit=True))
    story.append(_ec_kv_rows([
        ["Fuel type:", v["fuel_type"]],
        ["Transmission type:", v["transmission_type"]],
        ["Number of gears:", v["nr_gears"]],
        ["Retarder:", v["retarder"]],
        ["Axle ratio:", v["axle_ratio"]],
    ]))

    # Axle and Tyre Features
    if v["axles"]:
        story.append(Paragraph("Axle and Tyre Features", s_subsection))
        for axle in v["axles"]:
            story.append(Paragraph(f"<b>Axle {axle['number']}</b>", ParagraphStyle(
                "AxleHead", fontName="Helvetica-Bold", fontSize=9, textColor=colors.black,
                spaceBefore=6, spaceAfter=2)))
            story.append(_ec_kv_rows([
                ["Tyre dimension:", axle["tyre_dim"]],
                ["Fuel efficiency class:", axle["efficiency_class"] or "-"],
                ["Tyre certification Nr.:", axle["cert_number"]],
            ]))

    # ═══════ RESULTS ═══════
    if parsed["missions"]:
        story.append(Paragraph("Results", s_section))

        for m in parsed["missions"]:
            loading = "Low" if float(m.get("passenger_count", 0) or 0) < 30 else "High"
            mission_label = f"{m['mission']} ({loading})"
            if m.get("status"):
                mission_label += f"  —  Status: {m['status']}"
            story.append(Paragraph(mission_label, s_mission))
            story.append(Paragraph("Simulation Parameters", s_subsection))

            # Build rows
            result_rows = [
                ["Passenger count:", m["passenger_count"]],
            ]
            if m.get("mass_passengers") and m["mass_passengers"] != "—":
                result_rows.append(["Mass of passengers:", m["mass_passengers"], m.get("mass_passengers_unit", "kg")])
            if m.get("total_mass") and m["total_mass"] != "—":
                result_rows.append(["Total vehicle mass:", m["total_mass"], m.get("total_mass_unit", "kg")])
            if m.get("avg_speed") and m["avg_speed"] != "—":
                result_rows.append(["Average speed:", m["avg_speed"], m.get("avg_speed_unit", "km/h")])
            if m.get("fuel_type") and m["fuel_type"] != "—":
                result_rows.append(["Fuel type:", m["fuel_type"]])

            # Fuel consumption rows (all units)
            fuel_unit_order = ["l/100km", "l/p-km", "g/km", "g/p-km", "MJ/km", "MJ/p-km"]
            for unit in fuel_unit_order:
                val = m.get("fuel", {}).get(unit)
                if val:
                    result_rows.append(["Fuel consumption:", val, unit])

            # CO2 rows
            co2_unit_order = ["g/km", "g/p-km"]
            for unit in co2_unit_order:
                val = m.get("co2", {}).get(unit)
                if val:
                    result_rows.append([u"CO<sub>2</sub> emissions:", val, unit])

            # Render: some rows have units, some don't → use 3-col for all
            data = []
            for row in result_rows:
                if len(row) == 3:
                    data.append([
                        Paragraph(row[0], s_kv_label),
                        Paragraph(str(row[1]), s_kv_value),
                        Paragraph(str(row[2]), s_kv_value),
                    ])
                else:
                    data.append([
                        Paragraph(row[0], s_kv_label),
                        Paragraph(str(row[1]), s_kv_value),
                        Paragraph("", s_kv_value),
                    ])
            cw = [W * 0.52, W * 0.28, W * 0.20]
            t = Table(data, colWidths=cw)
            t.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("LINEBELOW", (0, 0), (-1, -2), 0.2, colors.HexColor("#e0e0e0")),
            ]))
            story.append(t)

    # ═══════ WEIGHTED RESULTS ═══════
    if parsed["summary"]:
        s = parsed["summary"]
        story.append(Paragraph("Weighted Results", s_subsection))
        weighted_rows = []
        if s.get("vocational"):
            weighted_rows.append(["Vocational:", s["vocational"]])
        if s.get("avg_passengers"):
            weighted_rows.append(["Average passenger count:", s["avg_passengers"]])
        if s.get("fuel_type") and s["fuel_type"] != "—":
            weighted_rows.append(["Fuel type:", s["fuel_type"]])
        fuel_unit_order = ["l/100km", "l/p-km", "g/km", "g/p-km", "MJ/km", "MJ/p-km"]
        for unit in fuel_unit_order:
            val = s.get("fuel", {}).get(unit)
            if val:
                weighted_rows.append(["Fuel consumption:", val, unit])
        co2_unit_order = ["g/km", "g/p-km"]
        for unit in co2_unit_order:
            val = s.get("co2", {}).get(unit)
            if val:
                weighted_rows.append([u"CO<sub>2</sub> emissions:", val, unit])
        if weighted_rows:
            story.append(_ec_kv_rows(weighted_rows, has_unit=True))

    # VECTO info
    story.append(Spacer(1, 10))
    story.append(_ec_kv_rows([
        ["VECTO Simulation Tool Version:", parsed["app_info"]["tool_version"]],
        ["Date:", parsed["app_info"]["date"]],
    ]))

    # ═══════ DIGITAL SIGNATURES ═══════
    if parsed["signatures"]:
        story.append(Paragraph("Digital Signatures &amp; Verification", s_section))
        s_sig_label = ParagraphStyle("ECSigLabel", fontName="Helvetica-Bold", fontSize=8,
                                      textColor=EC_GREEN, spaceBefore=6, spaceAfter=2)
        s_sig_mono = ParagraphStyle("ECSigMono", fontName="Courier", fontSize=7,
                                     textColor=colors.black, leading=9, wordWrap='CJK')
        s_sig_text = ParagraphStyle("ECSigText", fontName="Helvetica", fontSize=8,
                                     textColor=colors.black, leading=10)

        for sig in parsed["signatures"]:
            sig_block = []
            sig_block.append(Paragraph(sig["label"], s_sig_label))

            sig_rows = [
                [Paragraph("Reference URI:", s_kv_label),
                 Paragraph(sig["uri"], s_sig_text)],
                [Paragraph("Digest Algorithm:", s_kv_label),
                 Paragraph(sig["digest_algorithm"].split("#")[-1] if "#" in sig["digest_algorithm"] else sig["digest_algorithm"], s_sig_text)],
                [Paragraph("Digest Value:", s_kv_label),
                 Paragraph(sig["digest_value"], s_sig_mono)],
            ]
            if sig.get("transforms"):
                for i, t in enumerate(sig["transforms"]):
                    short_t = t.split(":")[-1] if ":" in t else t
                    sig_rows.append([
                        Paragraph(f"Transform {i+1}:", s_kv_label),
                        Paragraph(short_t, s_sig_text),
                    ])

            st = Table(sig_rows, colWidths=[W * 0.30, W * 0.70])
            st.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("LINEBELOW", (0, 0), (-1, -2), 0.2, colors.HexColor("#e0e0e0")),
            ]))
            sig_block.append(st)
            sig_block.append(Spacer(1, 6))
            story.append(KeepTogether(sig_block))

    doc.build(story)
    buf.seek(0)
    return buf


@router.post("/generate")
async def generate_pdf_report(file: UploadFile = File(...), format: str = "temsa"):
    """Upload a VECTO result XML file, returns PDF report.
    format: 'temsa' (default) or 'ec' (European Commission)
    """
    if format not in ("temsa", "ec"):
        raise HTTPException(400, "format must be 'temsa' or 'ec'")
    if not file.filename.lower().endswith(".xml"):
        raise HTTPException(400, "Only XML files are accepted")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10 MB)")

    try:
        parsed = parse_xml(content)
    except Exception as e:
        raise HTTPException(422, f"Failed to parse XML: {e}")

    try:
        if format == "ec":
            pdf_buf = generate_pdf_ec(parsed)
        else:
            pdf_buf = generate_pdf(parsed)
    except Exception as e:
        raise HTTPException(500, f"Failed to generate PDF: {e}")

    vin = parsed["vehicle"].get("vin", "VECTO_Report")
    suffix = "EC_Report" if format == "ec" else "VECTO_Report"
    filename = f"{vin}_{suffix}.pdf"

    return StreamingResponse(
        pdf_buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/preview")
async def preview_xml(file: UploadFile = File(...)):
    """Upload XML, returns parsed JSON for frontend preview."""
    if not file.filename.lower().endswith(".xml"):
        raise HTTPException(400, "Only XML files are accepted")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10 MB)")

    try:
        return parse_xml(content)
    except Exception as e:
        raise HTTPException(422, f"Failed to parse XML: {e}")
