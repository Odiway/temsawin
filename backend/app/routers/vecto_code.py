"""VECTO Code Generator API — generates 25-char VECTO variant codes from component selections."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/vecto-code", tags=["vecto-code"])

# ── Component code lookups (from VECTO v12.xlsm Component List) ──────────────

VEHICLE_MODELS = {
    "HD2": "HD 12", "HD3": "HD 13", "SF2": "SAFIR 12", "SF3": "SAFIR 13",
    "MR2": "MARATON 12", "MR3": "MARATON 13", "LD2": "LD 12", "LD3": "LD 13",
    "MD7": "MD7", "MD9": "MD9", "AVN": "AVENUE", "PRJ": "PRESTIJ", "SBE": "LD SB E",
}

SUB_MODELS = {
    "C00": "Coach", "RHD": "RHD", "LFT": "LIFT", "VIP": "VIP",
    "SB0": "Schoolbus", "IC0": "IC", "LE0": "Low Entry", "LF2": "LF12",
    "PLS": "Plus", "MID": "Midibus", "18E": "18M EV", "FCE": "Fuel Cell",
}

ENERGY_SOURCES = {
    "D": "Diesel", "E": "Electricity", "F": "Fuel-Cell", "G": "Gasoline", "H": "Hybrid",
}

ENGINES = {
    "100": "DAF-Paccar MX-11 270 kW - 1900 Nm",
    "101": "DAF-Paccar MX-11 300 kW - 2100 Nm",
    "102": "DAF-Paccar MX-11 330 kW - 2300 Nm",
    "200": "Cummins B6.7 182 kW 250hp",
    "201": "Cummins B6.7 204 kW 274hp",
    "202": "Cummins B6.7 209kW 280hp",
    "203": "Cummins B6.7 224kW 300hp",
    "300": "FPT N45 137 kW - 750 Nm",
    "301": "FPT N67 235 kW - 1100 Nm",
    "401": "TM4 HV2700", "402": "TM4 HV3400", "403": "TM4 HV3500",
    "404": "TM4 HV2100", "405": "TM4 HV2400", "406": "TM4 HV2600",
    "407": "TM4 HV3000", "408": "TM4 HV3200",
    "500": "E6 MFTBC 4P10-NAT4 110KW",
}

GEARBOXES = {
    "000": "YOK",
    "100": "ZF EcoLife 6AP1220C", "101": "ZF EcoLife 6AP1220B",
    "102": "ZF EcoLife 6AP2320B", "103": "ZF EcoLife 6AP2320C",
    "104": "ZF EcoShift 6S2111", "105": "ZF TraXon 12TX2411",
    "106": "ZF TraXon 12TX2611", "107": "ZF EcoLite 6S1110BO",
    "108": "ZF EcoShift 6S1911BO", "109": "ZF EcoLife 6AP2020C",
    "110": "ZF EcoLife 6AP2020B", "111": "ZF EcoLite 6S710BO",
    "200": "ALLISON T280R", "201": "ALLISON T325R",
    "202": "ALLISON T350R", "203": "ALLISON T2100",
    "300": "OTOM. MFTBC M038S6", "301": "MNL. MFTBC M038S5",
}

REAR_AXLES = {
    "100": "ZF A133 (i:2,76)", "101": "ZF A133 (i:3,36)",
    "102": "ZF AV133 (i:5.73)", "103": "ZF A133 (i:2,00)",
    "104": "ZF A133 (i:4.18)", "105": "ZF A133 (i:5.75)",
    "106": "ZF AV133 (6.19)",
    "200": "HANDE HDZ386 (i:3.7)", "201": "HANDE HDZ386 (i:4.11)",
    "202": "HANDE HDZ386 (i:5.125)", "203": "HANDE HDZ450 (i:4.778)",
    "204": "HANDE HDZ450 (i:4.857)", "205": "HANDE HDZ450 (i:5.125)",
    "300": "DANA 10.24R (i:3.73)", "301": "DANA 10.24R (i:5.83)",
    "400": "Albion Rigid (i:3.73)", "401": "Albion Rigid (i:4.10)",
    "402": "Albion Rigid (i:4.56)", "403": "Albion Rigid (i:5.13)",
    "500": "EGE (i:3.73)", "501": "EGE (i:4.10)",
    "600": "MFTBC 5.714",
}

FRONT_TIRES = {
    "100": "BRIDGESTONE UAP002 275/70 R22,5",
    "101": "BRIDGESTONE R247 II 295/80R22.5",
    "102": "BRIDGESTONE 295/80R22.5 EKO H-DRIVE",
    "103": "BRIDGESTONE H-STEER 295/80R22.5",
    "104": "BRIDGESTONE M788 EVO M+S 295/80R22.5",
    "105": "BRIDGESTONE R-DRIVE M+S 295/80R22.5",
    "106": "BRIDGESTONE R227 265/70R19.5",
    "107": "BRIDGESTONE 265-70R19.5 M788",
    "108": "BRIDGESTONE C-AP 295x80/R22.5 154/149M",
    "200": "CONTIURBANHA3 EU M+S 275/70R22.5",
    "201": "CONTI URBAN HA3 EU LRH 16PR",
    "202": "Continental Conti Hybrid HS3",
    "203": "295/80R22.5 CONTI COACH HA3 M+S",
    "204": "CONTI COACH HA3 M+S 315/80R22,5",
    "300": "MICHELIN 265/70R19.5 X MULTI Z",
    "301": "MICHELIN 265/70R19.5 X MULTI D",
    "302": "MICHELIN X INCITY XZU",
    "303": "MICHELIN X COACH HL Z",
    "304": "MICHELIN X MULTIWAY3D XZE M+S",
    "305": "MICHELIN 295/80 R22.5 XZA2energy",
    "306": "MICHELIN X COACH Z",
    "307": "MICHELIN X COACH XD M+S 295/80",
    "308": "MICHELIN WINTER Z",
    "309": "MICHELIN 235/75 R17,5 132M",
    "400": "MARATON HL 295/80/R22.5 154/149M",
    "500": "LASSA Maxiways 100 S 225/75R17.5",
}

REAR_TIRES = {
    "100": "BRIDGESTONE UAP002 275/70 R22,5",
    "101": "BRIDGESTONE R247 II 295/80R22.5",
    "102": "BRIDGESTONE 295/80R22.5 EKO H-DRIVE",
    "103": "BRIDGESTONE H-STEER 295/80R22.5",
    "104": "BRIDGESTONE M788 EVO M+S 295/80R22.5",
    "105": "BRIDGESTONE R-DRIVE M+S 295/80R22.5",
    "106": "BRIDGESTONE R227 265/70R19.5",
    "107": "BRIDGESTONE 265-70R19.5 M788",
    "108": "BRIDGESTONE C-AP 295x80/R22.5 154/149M",
    "200": "CONTIURBANHA3 EU M+S 275/70R22.5",
    "201": "CONTI URBAN HA3 EU LRH 16PR",
    "202": "Continental Conti Hybrid HS3",
    "203": "295/80R22.5 CONTI COACH HA3 M+S",
    "204": "CONTI COACH HA3 M+S 315/80R22,5",
    "300": "MICHELIN 265/70R19.5 X MULTI Z",
    "301": "MICHELIN 265/70R19.5 X MULTI D",
    "302": "MICHELIN X INCITY XZU",
    "303": "MICHELIN X COACH HL Z",
    "304": "MICHELIN X MULTIWAY3D XZE M+S",
    "305": "MICHELIN 295/80 R22.5 XZA2energy",
    "306": "MICHELIN X COACH Z",
    "307": "MICHELIN X COACH XD M+S 295/80",
    "308": "MICHELIN WINTER Z",
    "309": "MICHELIN 235/75 R17,5 132M",
    "400": "MARATON HL 295/80/R22.5 154/149M",
    "500": "LASSA Maxiways 100 S 225/75R17.5",
}

ADDITIONAL_AXLE_TIRES = {
    "000": "YOK",
    "100": "UAP002 275/70 R22,5",
    "101": "R247 II 295/80R22.5",
    "102": "295/80R22.5 EKO H-SURUCU",
    "103": "BRIDGESTONE H-STEER 295/80R22.5",
    "104": "BRIDGESTONE M788 EVO M+S 295/80R22.5",
    "105": "BRIDGESTONE R-DRIVE M+S 295/80R22.5",
    "106": "BRIDGESTONE R227 265/70R19.5",
    "107": "BRIDGESTONE 265-70R19.5 M788",
    "108": "BRIDGESTONE C-AP 295x80/R22.5 154/149M",
    "200": "CONTIURBANHA3 EU M+S 275/70R22.5",
    "201": "CONTI URBAN HA3 EU LRH 16PR",
    "202": "Continental Conti Hybrid HS3",
    "203": "295/80R22.5 CONTI COACH HA3 M+S",
    "204": "CONTI COACH HA3 M+S 315/80R22,5",
    "205": "CONTI CITY HA3 M+S 295/80R22,5",
    "300": "MICHELIN 265/70R19.5 X MULTI Z",
    "301": "MICHELIN 265/70R19.5 X MULTI D",
    "302": "MICHELIN X INCITY XZU",
    "303": "MICHELIN X COACH HL Z",
    "304": "MICHELIN X MULTIWAY3D XZE M+S",
    "305": "MICHELIN 295/80 R22.5 XZA2energy",
    "306": "MICHELIN X COACH Z",
    "307": "MICHELIN X COACH XD M+S 295/80",
    "308": "MICHELIN WINTER Z",
    "309": "MICHELIN 235/75 R17,5 132M",
    "400": "MARATON HL 295/80/R22.5 154/149M",
    "500": "LASSA Maxiways 100 S 225/75R17.5",
}

# ── Valid drivetrain combinations (from Variant List sheet) ──────────────────
# Each tuple: (sub_model, energy, engine, gearbox, rear_axle)
VALID_COMBOS: dict[str, list[tuple[str, str, str, str, str]]] = {
    "AVN": [
        ("LF2", "D", "202", "101", "102"),
        ("LF2", "D", "203", "101", "102"),
    ],
    "HD2": [
        ("C00", "D", "101", "103", "101"),
        ("C00", "D", "101", "104", "100"),
        ("C00", "D", "102", "105", "100"),
        ("C00", "D", "102", "106", "103"),
        ("RHD", "D", "101", "103", "101"),
    ],
    "HD3": [
        ("C00", "D", "101", "103", "101"),
        ("C00", "D", "101", "104", "100"),
        ("C00", "D", "102", "105", "100"),
        ("C00", "D", "102", "106", "103"),
        ("RHD", "D", "101", "103", "101"),
    ],
    "LD2": [
        ("C00", "D", "100", "108", "100"),
        ("C00", "D", "100", "109", "101"),
        ("SB0", "D", "100", "110", "104"),
        ("SB0", "D", "301", "107", "203"),
        ("SB0", "D", "301", "202", "205"),
    ],
    "LD3": [
        ("C00", "D", "100", "108", "100"),
        ("C00", "D", "100", "109", "101"),
        ("SB0", "D", "301", "107", "203"),
        ("SB0", "D", "301", "202", "205"),
    ],
    "MD7": [
        ("PLS", "D", "300", "111", "400"),
        ("PLS", "D", "300", "111", "401"),
        ("PLS", "D", "300", "203", "400"),
        ("PLS", "D", "300", "203", "401"),
        ("PLS", "D", "300", "203", "402"),
        ("PLS", "D", "300", "203", "403"),
    ],
    "MD9": [
        ("LE0", "D", "200", "200", "200"),
        ("LE0", "D", "200", "200", "201"),
        ("LE0", "D", "200", "200", "202"),
        ("PLS", "D", "301", "107", "102"),
        ("PLS", "D", "301", "107", "300"),
        ("PLS", "D", "301", "202", "102"),
        ("PLS", "D", "301", "202", "300"),
        ("RHD", "D", "200", "101", "300"),
    ],
    "MR2": [
        ("C00", "D", "102", "104", "100"),
        ("C00", "D", "102", "105", "100"),
        ("C00", "D", "102", "106", "103"),
    ],
    "MR3": [
        ("C00", "D", "102", "104", "100"),
        ("C00", "D", "102", "105", "100"),
        ("C00", "D", "102", "106", "103"),
    ],
    "PRJ": [
        ("MID", "D", "500", "300", "600"),
        ("MID", "D", "500", "301", "600"),
    ],
    "SF2": [
        ("C00", "D", "101", "103", "101"),
        ("C00", "D", "101", "104", "100"),
        ("C00", "D", "102", "105", "100"),
        ("C00", "D", "102", "106", "103"),
    ],
    "SF3": [
        ("C00", "D", "101", "103", "101"),
        ("C00", "D", "101", "104", "100"),
        ("C00", "D", "102", "105", "100"),
        ("C00", "D", "102", "106", "103"),
    ],
}


def _opts(lookup: dict) -> list[dict]:
    """Convert {code: name} dict to sorted list of {code, name}."""
    return sorted([{"code": k, "name": v} for k, v in lookup.items()], key=lambda x: x["code"])


@router.get("/components")
async def get_components():
    """Return all component code lookups."""
    return {
        "vehicle_models": _opts(VEHICLE_MODELS),
        "sub_models": _opts(SUB_MODELS),
        "energy_sources": _opts(ENERGY_SOURCES),
        "engines": _opts(ENGINES),
        "gearboxes": _opts(GEARBOXES),
        "rear_axles": _opts(REAR_AXLES),
        "front_tires": _opts(FRONT_TIRES),
        "rear_tires": _opts(REAR_TIRES),
        "additional_axle_tires": _opts(ADDITIONAL_AXLE_TIRES),
    }


@router.get("/options")
async def get_options(
    vehicle_model: str | None = None,
    sub_model: str | None = None,
    energy_source: str | None = None,
    engine: str | None = None,
    gearbox: str | None = None,
):
    """Return valid options for the next cascading dropdown based on current selections."""
    # If no vehicle_model, return all vehicle models
    if not vehicle_model:
        return {"vehicle_models": _opts(VEHICLE_MODELS)}

    combos = VALID_COMBOS.get(vehicle_model, [])
    if not combos:
        return {"sub_models": [], "energy_sources": [], "engines": [], "gearboxes": [], "rear_axles": []}

    # Filter combos step by step
    filtered = combos
    if sub_model:
        filtered = [c for c in filtered if c[0] == sub_model]
    if energy_source:
        filtered = [c for c in filtered if c[1] == energy_source]
    if engine:
        filtered = [c for c in filtered if c[2] == engine]
    if gearbox:
        filtered = [c for c in filtered if c[3] == gearbox]

    # Extract valid options from remaining combos
    valid_subs = sorted(set(c[0] for c in filtered if c[0]))
    valid_energy = sorted(set(c[1] for c in filtered))
    valid_engines = sorted(set(c[2] for c in filtered))
    valid_gbs = sorted(set(c[3] for c in filtered))
    valid_ras = sorted(set(c[4] for c in filtered))

    return {
        "sub_models": [{"code": c, "name": SUB_MODELS.get(c, c)} for c in valid_subs],
        "energy_sources": [{"code": c, "name": ENERGY_SOURCES.get(c, c)} for c in valid_energy],
        "engines": [{"code": c, "name": ENGINES.get(c, c)} for c in valid_engines],
        "gearboxes": [{"code": c, "name": GEARBOXES.get(c, c)} for c in valid_gbs],
        "rear_axles": [{"code": c, "name": REAR_AXLES.get(c, c)} for c in valid_ras],
    }


@router.post("/generate")
async def generate_code(body: dict):
    """Generate a 25-character VECTO code from component selections.
    
    Code structure: ModelCode(3) + SubModelCode(3) + EnergyCode(1) + EngineCode(3) +
                    GearboxCode(3) + RearAxleCode(3) + FrontTireCode(3) + RearTireCode(3) +
                    AdditionalAxleTireCode(3) = 25 chars
    """
    vehicle_model = body.get("vehicle_model", "")
    sub_model = body.get("sub_model", "")
    energy_source = body.get("energy_source", "")
    engine = body.get("engine", "")
    gearbox = body.get("gearbox", "")
    rear_axle = body.get("rear_axle", "")
    front_tire = body.get("front_tire", "")
    rear_tire = body.get("rear_tire", "")
    additional_axle_tire = body.get("additional_axle_tire", "000")

    # Validate all required fields
    parts = {
        "vehicle_model": (vehicle_model, 3, VEHICLE_MODELS),
        "sub_model": (sub_model, 3, SUB_MODELS),
        "energy_source": (energy_source, 1, ENERGY_SOURCES),
        "engine": (engine, 3, ENGINES),
        "gearbox": (gearbox, 3, GEARBOXES),
        "rear_axle": (rear_axle, 3, REAR_AXLES),
        "front_tire": (front_tire, 3, FRONT_TIRES),
        "rear_tire": (rear_tire, 3, REAR_TIRES),
        "additional_axle_tire": (additional_axle_tire, 3, ADDITIONAL_AXLE_TIRES),
    }

    errors = []
    for field, (val, expected_len, lookup) in parts.items():
        if not val:
            errors.append(f"{field} is required")
        elif val not in lookup:
            errors.append(f"{field} '{val}' is not a valid code")
        elif len(val) != expected_len:
            errors.append(f"{field} must be {expected_len} characters")

    if errors:
        return {"success": False, "errors": errors}

    code = f"{vehicle_model}{sub_model}{energy_source}{engine}{gearbox}{rear_axle}{front_tire}{rear_tire}{additional_axle_tire}"

    # Build human-readable description
    description = {
        "vehicle_model": VEHICLE_MODELS[vehicle_model],
        "sub_model": SUB_MODELS[sub_model],
        "energy_source": ENERGY_SOURCES[energy_source],
        "engine": ENGINES[engine],
        "gearbox": GEARBOXES[gearbox],
        "rear_axle": REAR_AXLES[rear_axle],
        "front_tire": FRONT_TIRES[front_tire],
        "rear_tire": REAR_TIRES[rear_tire],
        "additional_axle_tire": ADDITIONAL_AXLE_TIRES[additional_axle_tire],
    }

    return {
        "success": True,
        "vecto_code": code,
        "length": len(code),
        "description": description,
    }


@router.post("/decode")
async def decode_code(body: dict):
    """Decode a 25-character VECTO code back to component descriptions."""
    code = body.get("code", "").strip()
    if len(code) != 25:
        return {"success": False, "error": f"VECTO code must be 25 characters, got {len(code)}"}

    vm = code[0:3]
    sm = code[3:6]
    es = code[6:7]
    eng = code[7:10]
    gb = code[10:13]
    ra = code[13:16]
    ft = code[16:19]
    rt = code[19:22]
    aat = code[22:25]

    result = {
        "vecto_code": code,
        "vehicle_model": {"code": vm, "name": VEHICLE_MODELS.get(vm, "Unknown")},
        "sub_model": {"code": sm, "name": SUB_MODELS.get(sm, "Unknown")},
        "energy_source": {"code": es, "name": ENERGY_SOURCES.get(es, "Unknown")},
        "engine": {"code": eng, "name": ENGINES.get(eng, "Unknown")},
        "gearbox": {"code": gb, "name": GEARBOXES.get(gb, "Unknown")},
        "rear_axle": {"code": ra, "name": REAR_AXLES.get(ra, "Unknown")},
        "front_tire": {"code": ft, "name": FRONT_TIRES.get(ft, "Unknown")},
        "rear_tire": {"code": rt, "name": REAR_TIRES.get(rt, "Unknown")},
        "additional_axle_tire": {"code": aat, "name": ADDITIONAL_AXLE_TIRES.get(aat, "Unknown")},
    }
    return {"success": True, **result}
