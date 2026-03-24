"""AI-powered analysis, rankings, and insights engine."""
import math
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import (
    Vehicle, VehicleVariant, FuelConsumptionMap,
    FullLoadDragCurve, GearRatio, AxleLossMap,
)

router = APIRouter(prefix="/api/v1/analysis", tags=["Analysis & Insights"])


def _power_kw(w):
    return round(w / 1000, 1) if w else None


def _power_hp(w):
    return round(w / 745.7, 1) if w else None


def _specific_power(power_w, mass_kg):
    if power_w and mass_kg and mass_kg > 0:
        return round(power_w / mass_kg, 2)
    return None


def _specific_torque(torque_nm, displacement_cc):
    if torque_nm and displacement_cc and displacement_cc > 0:
        return round(float(torque_nm) / (displacement_cc / 1000), 2)
    return None


def _efficiency_score(avg_fc, rated_power_w):
    """Lower fuel consumption per kW = better efficiency."""
    if avg_fc and rated_power_w and rated_power_w > 0:
        return round(avg_fc / (rated_power_w / 1000), 4)
    return None


def _variant_tags(v, vehicle):
    """Generate distinctive tags for a variant based on what makes it unique."""
    tags = []
    # Vehicle model
    if vehicle:
        tags.append({"key": "model", "value": vehicle.model_name, "color": "blue"})
        tags.append({"key": "category", "value": str(vehicle.category), "color": _cat_color(str(vehicle.category))})

    # Engine class
    if v.rated_power_w:
        pw = v.rated_power_w / 1000
        if pw < 150:
            tags.append({"key": "power_class", "value": "Light", "color": "green"})
        elif pw < 250:
            tags.append({"key": "power_class", "value": "Medium", "color": "yellow"})
        elif pw < 350:
            tags.append({"key": "power_class", "value": "Heavy", "color": "orange"})
        else:
            tags.append({"key": "power_class", "value": "Ultra", "color": "red"})

    # Gearbox type
    if v.gearbox_model:
        gb = v.gearbox_model.lower()
        if "allison" in gb or "zf" in gb.lower():
            brand = "Allison" if "allison" in gb else "ZF"
            tags.append({"key": "gearbox", "value": brand, "color": "purple"})
        if "auto" in gb or "series" in gb.lower() or "torque" in gb.lower():
            tags.append({"key": "transmission", "value": "AT", "color": "cyan"})
        else:
            tags.append({"key": "transmission", "value": "MT", "color": "slate"})

    # Tyre size
    if v.tyre_dimension:
        tags.append({"key": "tyre", "value": v.tyre_dimension, "color": "slate"})

    # Axle config
    if v.axle_ratio:
        ar = float(v.axle_ratio)
        if ar < 3.5:
            tags.append({"key": "axle_class", "value": "Highway", "color": "teal"})
        elif ar < 5.0:
            tags.append({"key": "axle_class", "value": "Mixed", "color": "amber"})
        else:
            tags.append({"key": "axle_class", "value": "Urban", "color": "rose"})

    # ADAS
    adas_count = sum([
        bool(v.engine_stop_start),
        bool(v.eco_roll),
        v.predictive_cruise not in (None, "none", ""),
    ])
    if adas_count >= 2:
        tags.append({"key": "adas", "value": "Advanced ADAS", "color": "emerald"})
    elif adas_count == 1:
        tags.append({"key": "adas", "value": "Basic ADAS", "color": "lime"})

    # RHD
    if vehicle and "rhd" in vehicle.model_name.lower():
        tags.append({"key": "steering", "value": "RHD", "color": "pink"})

    # Zero emission
    if v.zero_emission_vehicle:
        tags.append({"key": "emission", "value": "Zero Emission", "color": "emerald"})

    # Engine type
    tags.append({"key": "engine_type", "value": str(v.engine_type).upper(), "color": "amber" if str(v.engine_type) == "diesel" else "emerald"})

    return tags


def _cat_color(cat):
    return {"coach": "indigo", "city": "teal", "ev": "emerald", "diesel": "amber"}.get(cat, "slate")


def _variant_fingerprint(v, vehicle):
    """Create a short human-readable fingerprint to quickly identify what's different."""
    parts = []
    if vehicle:
        parts.append(vehicle.model_name)
    if v.rated_power_w:
        parts.append(f"{round(v.rated_power_w/1000)}kW")
    if v.gearbox_model:
        gb = v.gearbox_model
        if len(gb) > 20:
            gb = gb[:18] + ".."
        parts.append(gb)
    if v.axle_ratio:
        parts.append(f"AR:{float(v.axle_ratio):.2f}")
    if v.max_laden_mass_kg:
        parts.append(f"{v.max_laden_mass_kg}kg")
    return " · ".join(parts)


@router.get("/rankings")
async def get_variant_rankings(
    category: str = Query(None),
    metric: str = Query("power_to_weight", description="power_to_weight|torque_density|efficiency|overall"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Rank variants by performance metrics."""
    query = select(VehicleVariant, Vehicle).join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id)
    if category:
        query = query.where(Vehicle.category == category)
    result = await db.execute(query)
    rows = result.all()

    ranked = []
    for v, veh in rows:
        # Calculate fuel consumption stats
        fc_result = await db.execute(
            select(
                func.avg(FuelConsumptionMap.fuel_consumption),
                func.min(FuelConsumptionMap.fuel_consumption),
                func.max(FuelConsumptionMap.fuel_consumption),
            ).where(FuelConsumptionMap.variant_id == v.id)
        )
        fc_row = fc_result.one()
        avg_fc = float(fc_row[0]) if fc_row[0] else None
        min_fc = float(fc_row[1]) if fc_row[1] else None
        max_fc = float(fc_row[2]) if fc_row[2] else None

        ptw = _specific_power(v.rated_power_w, v.max_laden_mass_kg)
        td = _specific_torque(v.max_torque_nm, v.displacement_cc)
        eff = _efficiency_score(avg_fc, v.rated_power_w)

        # Overall composite score (higher = better)
        scores = []
        if ptw:
            scores.append(("power_to_weight", ptw))
        if td:
            scores.append(("torque_density", td))
        if eff and eff > 0:
            scores.append(("efficiency", 1.0 / eff))  # invert: lower fc/kw = higher score

        overall = sum(s for _, s in scores) / len(scores) if scores else 0

        ranked.append({
            "variant_id": str(v.id),
            "variant_code": v.variant_code,
            "model_name": veh.model_name,
            "category": str(veh.category),
            "fingerprint": _variant_fingerprint(v, veh),
            "tags": _variant_tags(v, veh),
            "metrics": {
                "power_kw": _power_kw(v.rated_power_w),
                "power_hp": _power_hp(v.rated_power_w),
                "torque_nm": float(v.max_torque_nm) if v.max_torque_nm else None,
                "displacement_cc": v.displacement_cc,
                "max_laden_mass_kg": v.max_laden_mass_kg,
                "gear_count": v.gear_count,
                "axle_ratio": float(v.axle_ratio) if v.axle_ratio else None,
                "tyre": v.tyre_dimension,
                "gearbox": v.gearbox_model,
                "engine": f"{v.engine_manufacturer} {v.engine_model}",
                "fuel_type": v.fuel_type,
            },
            "scores": {
                "power_to_weight": ptw,
                "torque_density": td,
                "efficiency_score": eff,
                "overall": round(overall, 2),
            },
            "fuel_stats": {
                "avg_consumption": round(avg_fc, 2) if avg_fc else None,
                "min_consumption": round(min_fc, 2) if min_fc else None,
                "max_consumption": round(max_fc, 2) if max_fc else None,
            },
        })

    # Sort by chosen metric
    if metric == "power_to_weight":
        ranked.sort(key=lambda x: x["scores"]["power_to_weight"] or 0, reverse=True)
    elif metric == "torque_density":
        ranked.sort(key=lambda x: x["scores"]["torque_density"] or 0, reverse=True)
    elif metric == "efficiency":
        ranked.sort(key=lambda x: x["scores"]["efficiency_score"] or float("inf"))
    else:
        ranked.sort(key=lambda x: x["scores"]["overall"] or 0, reverse=True)

    # Add rank
    for i, item in enumerate(ranked[:limit]):
        item["rank"] = i + 1

    return {"rankings": ranked[:limit], "total": len(ranked), "metric": metric}


@router.get("/insights")
async def get_smart_insights(db: AsyncSession = Depends(get_db)):
    """Generate AI-like insights from the data — the system's brain."""
    insights = []

    # 1. Get all variants with vehicle info
    result = await db.execute(
        select(VehicleVariant, Vehicle).join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id)
    )
    rows = result.all()
    if not rows:
        return {"insights": [{"type": "info", "title": "Veri Yok", "message": "Henüz varyant verisi yok. VECTO XML dosyalarını import edin.", "severity": "info"}]}

    variants = [(v, veh) for v, veh in rows]

    # ── Fleet overview insight ──
    categories = {}
    engine_types = {}
    manufacturers = {}
    for v, veh in variants:
        cat = str(veh.category)
        categories[cat] = categories.get(cat, 0) + 1
        et = str(v.engine_type)
        engine_types[et] = engine_types.get(et, 0) + 1
        if v.engine_manufacturer:
            manufacturers[v.engine_manufacturer] = manufacturers.get(v.engine_manufacturer, 0) + 1

    top_cat = max(categories, key=categories.get) if categories else "N/A"
    top_mfg = max(manufacturers, key=manufacturers.get) if manufacturers else "N/A"

    insights.append({
        "type": "fleet_overview",
        "icon": "fleet",
        "title": "Filo Profili",
        "message": f"Toplam {len(variants)} varyant, {len(set(veh.model_name for _, veh in variants))} farklı model. "
                   f"En yoğun segment: {top_cat} ({categories.get(top_cat, 0)} varyant). "
                   f"Baskın motor üreticisi: {top_mfg} ({manufacturers.get(top_mfg, 0)} varyant).",
        "severity": "info",
        "data": {"categories": categories, "engine_types": engine_types, "manufacturers": manufacturers},
    })

    # ── Power distribution insight ──
    powers = [(v, veh) for v, veh in variants if v.rated_power_w]
    if powers:
        avg_pw = sum(v.rated_power_w for v, _ in powers) / len(powers) / 1000
        max_pw_v = max(powers, key=lambda x: x[0].rated_power_w)
        min_pw_v = min(powers, key=lambda x: x[0].rated_power_w)

        insights.append({
            "type": "power_analysis",
            "icon": "zap",
            "title": "Güç Dağılımı Analizi",
            "message": f"Ortalama güç: {avg_pw:.0f} kW. "
                       f"En güçlü: {max_pw_v[1].model_name} ({max_pw_v[0].rated_power_w/1000:.0f} kW). "
                       f"En düşük güç: {min_pw_v[1].model_name} ({min_pw_v[0].rated_power_w/1000:.0f} kW). "
                       f"Güç aralığı: {(max_pw_v[0].rated_power_w - min_pw_v[0].rated_power_w)/1000:.0f} kW.",
            "severity": "info",
            "data": {
                "avg_kw": round(avg_pw, 1),
                "max": {"model": max_pw_v[1].model_name, "code": max_pw_v[0].variant_code, "kw": round(max_pw_v[0].rated_power_w/1000, 1)},
                "min": {"model": min_pw_v[1].model_name, "code": min_pw_v[0].variant_code, "kw": round(min_pw_v[0].rated_power_w/1000, 1)},
            },
        })

    # ── Fuel efficiency insight ──
    fc_data = []
    for v, veh in variants:
        fc_result = await db.execute(
            select(func.avg(FuelConsumptionMap.fuel_consumption))
            .where(FuelConsumptionMap.variant_id == v.id)
        )
        avg_fc = fc_result.scalar()
        if avg_fc:
            fc_data.append((v, veh, float(avg_fc)))

    if fc_data:
        fc_data.sort(key=lambda x: x[2])
        best = fc_data[0]
        worst = fc_data[-1]
        avg_all = sum(x[2] for x in fc_data) / len(fc_data)
        savings_pct = ((worst[2] - best[2]) / worst[2]) * 100

        insights.append({
            "type": "fuel_efficiency",
            "icon": "fuel",
            "title": "Yakıt Verimliliği Raporu",
            "message": f"En verimli varyant: {best[1].model_name} ({best[0].variant_code[:12]}...) — "
                       f"ort. {best[2]:.1f} g/h. En yüksek tüketim: {worst[1].model_name} — ort. {worst[2]:.1f} g/h. "
                       f"Filo ortalaması: {avg_all:.1f} g/h. En verimli ile en verimsiz arası %{savings_pct:.0f} fark.",
            "severity": "success" if savings_pct < 30 else "warning",
            "data": {
                "best": {"model": best[1].model_name, "code": best[0].variant_code, "avg_fc": round(best[2], 2), "id": str(best[0].id)},
                "worst": {"model": worst[1].model_name, "code": worst[0].variant_code, "avg_fc": round(worst[2], 2), "id": str(worst[0].id)},
                "fleet_avg": round(avg_all, 2),
                "spread_pct": round(savings_pct, 1),
            },
        })

        # Recommend best per category
        cat_best = {}
        for v, veh, fc in fc_data:
            cat = str(veh.category)
            if cat not in cat_best or fc < cat_best[cat][2]:
                cat_best[cat] = (v, veh, fc)

        recommendations = []
        for cat, (v, veh, fc) in cat_best.items():
            recommendations.append({
                "category": cat,
                "model": veh.model_name,
                "code": v.variant_code,
                "avg_fc": round(fc, 2),
                "variant_id": str(v.id),
            })

        insights.append({
            "type": "recommendation",
            "icon": "trophy",
            "title": "Kategori Bazlı En İyi Varyantlar",
            "message": "Her kategori için en düşük ortalama yakıt tüketimi bazında en iyi varyantlar belirlendi.",
            "severity": "success",
            "data": {"recommendations": recommendations},
        })

    # ── Gearbox diversity insight ──
    gearboxes = {}
    for v, veh in variants:
        gb = v.gearbox_model or "Unknown"
        if gb not in gearboxes:
            gearboxes[gb] = []
        gearboxes[gb].append({"model": veh.model_name, "code": v.variant_code})

    if len(gearboxes) > 1:
        most_common = max(gearboxes, key=lambda k: len(gearboxes[k]))
        insights.append({
            "type": "gearbox_analysis",
            "icon": "settings",
            "title": "Şanzıman Çeşitliliği",
            "message": f"{len(gearboxes)} farklı şanzıman modeli kullanılıyor. "
                       f"En yaygın: {most_common} ({len(gearboxes[most_common])} varyant). "
                       f"Standardizasyon oranı: %{len(gearboxes[most_common])/len(variants)*100:.0f}.",
            "severity": "info",
            "data": {k: len(v) for k, v in gearboxes.items()},
        })

    # ── Anomaly detection ──
    if powers:
        pw_values = [v.rated_power_w/1000 for v, _ in powers]
        mean_pw = sum(pw_values) / len(pw_values)
        std_pw = (sum((x - mean_pw)**2 for x in pw_values) / len(pw_values)) ** 0.5

        anomalies = []
        for v, veh in powers:
            pw = v.rated_power_w / 1000
            if std_pw > 0 and abs(pw - mean_pw) > 2 * std_pw:
                anomalies.append({
                    "model": veh.model_name,
                    "code": v.variant_code,
                    "power_kw": round(pw, 1),
                    "deviation": round((pw - mean_pw) / std_pw, 1),
                    "variant_id": str(v.id),
                })

        if anomalies:
            insights.append({
                "type": "anomaly",
                "icon": "alert",
                "title": "Güç Anomalileri Tespit Edildi",
                "message": f"{len(anomalies)} varyant, güç bakımından filonun 2 standart sapma dışında. "
                           f"Bu varyantları kontrol edin.",
                "severity": "warning",
                "data": {"anomalies": anomalies, "mean_kw": round(mean_pw, 1), "std_kw": round(std_pw, 1)},
            })

    # ── Axle ratio optimization insight ──
    axle_data = {}
    for v, veh in variants:
        if v.axle_ratio:
            cat = str(veh.category)
            if cat not in axle_data:
                axle_data[cat] = []
            axle_data[cat].append(float(v.axle_ratio))

    if axle_data:
        axle_insights = []
        for cat, ratios in axle_data.items():
            avg_r = sum(ratios) / len(ratios)
            spread = max(ratios) - min(ratios) if len(ratios) > 1 else 0
            axle_insights.append({
                "category": cat,
                "avg_ratio": round(avg_r, 3),
                "min_ratio": round(min(ratios), 3),
                "max_ratio": round(max(ratios), 3),
                "spread": round(spread, 3),
                "count": len(ratios),
            })

        insights.append({
            "type": "axle_optimization",
            "icon": "target",
            "title": "Aks Oranı Optimizasyonu",
            "message": "Kategori bazlı aks oranı dağılımı. Yüksek aks oranı şehir içi (tork→çekiş), "
                       "düşük aks oranı karayolu (hız→verimlilik) kullanımına işaret eder.",
            "severity": "info",
            "data": {"by_category": axle_insights},
        })

    return {"insights": insights, "total_variants": len(variants)}


@router.get("/compare-detailed")
async def detailed_comparison(
    ids: str = Query(..., description="Comma-separated variant IDs"),
    db: AsyncSession = Depends(get_db),
):
    """Deep comparison with fuel maps, load curves, and scoring."""
    variant_ids = [uid.strip() for uid in ids.split(",")]

    items = []
    for vid in variant_ids:
        result = await db.execute(
            select(VehicleVariant, Vehicle)
            .join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id)
            .where(VehicleVariant.id == vid)
        )
        row = result.one_or_none()
        if not row:
            continue
        v, veh = row

        # Fuel stats
        fc_result = await db.execute(
            select(
                func.avg(FuelConsumptionMap.fuel_consumption),
                func.min(FuelConsumptionMap.fuel_consumption),
                func.max(FuelConsumptionMap.fuel_consumption),
                func.count(FuelConsumptionMap.id),
            ).where(FuelConsumptionMap.variant_id == v.id)
        )
        fc = fc_result.one()

        # Load curve stats
        lc_result = await db.execute(
            select(
                func.max(FullLoadDragCurve.max_torque),
                func.min(FullLoadDragCurve.drag_torque),
            ).where(FullLoadDragCurve.variant_id == v.id)
        )
        lc = lc_result.one()

        # Gear ratios
        gr_result = await db.execute(
            select(GearRatio)
            .where(GearRatio.variant_id == v.id)
            .order_by(GearRatio.gear_number)
        )
        gears = [{"gear": r.gear_number, "ratio": float(r.ratio)} for r in gr_result.scalars().all()]

        # Fuel map data for overlay charts (sampled)
        fm_result = await db.execute(
            select(FuelConsumptionMap)
            .where(FuelConsumptionMap.variant_id == v.id)
            .order_by(FuelConsumptionMap.engine_speed, FuelConsumptionMap.torque)
        )
        fm_points = [
            {"rpm": float(r.engine_speed), "torque": float(r.torque), "fc": float(r.fuel_consumption)}
            for r in fm_result.scalars().all()
        ]

        # Load curve data
        ld_result = await db.execute(
            select(FullLoadDragCurve)
            .where(FullLoadDragCurve.variant_id == v.id)
            .order_by(FullLoadDragCurve.engine_speed)
        )
        ld_points = [
            {"rpm": float(r.engine_speed), "max_torque": float(r.max_torque), "drag_torque": float(r.drag_torque)}
            for r in ld_result.scalars().all()
        ]

        items.append({
            "variant_id": str(v.id),
            "variant_code": v.variant_code,
            "model_name": veh.model_name,
            "category": str(veh.category),
            "fingerprint": _variant_fingerprint(v, veh),
            "tags": _variant_tags(v, veh),
            "specs": {
                "engine": f"{v.engine_manufacturer} {v.engine_model}",
                "power_kw": _power_kw(v.rated_power_w),
                "power_hp": _power_hp(v.rated_power_w),
                "torque_nm": float(v.max_torque_nm) if v.max_torque_nm else None,
                "displacement_cc": v.displacement_cc,
                "rated_speed_rpm": v.rated_speed_rpm,
                "idling_speed_rpm": v.idling_speed_rpm,
                "max_laden_mass_kg": v.max_laden_mass_kg,
                "gearbox": v.gearbox_model,
                "gearbox_mfg": v.gearbox_manufacturer,
                "gear_count": v.gear_count,
                "axle_ratio": float(v.axle_ratio) if v.axle_ratio else None,
                "axle_type": v.axle_type,
                "tyre": v.tyre_dimension,
                "fuel_type": v.fuel_type,
                "zero_emission": v.zero_emission_vehicle,
                "adas": {
                    "stop_start": v.engine_stop_start,
                    "eco_roll": v.eco_roll,
                    "predictive_cruise": v.predictive_cruise,
                },
            },
            "fuel_stats": {
                "avg": round(float(fc[0]), 2) if fc[0] else None,
                "min": round(float(fc[1]), 2) if fc[1] else None,
                "max": round(float(fc[2]), 2) if fc[2] else None,
                "points": fc[3] or 0,
            },
            "torque_stats": {
                "peak_torque": round(float(lc[0]), 2) if lc[0] else None,
                "min_drag": round(float(lc[1]), 2) if lc[1] else None,
            },
            "gear_ratios": gears,
            "fuel_map": fm_points,
            "load_curves": ld_points,
            "scores": {
                "power_to_weight": _specific_power(v.rated_power_w, v.max_laden_mass_kg),
                "torque_density": _specific_torque(v.max_torque_nm, v.displacement_cc),
                "efficiency": _efficiency_score(float(fc[0]) if fc[0] else None, v.rated_power_w),
            },
        })

    # Generate comparison insights
    comp_insights = _generate_comparison_insights(items)

    return {"variants": items, "insights": comp_insights}


def _generate_comparison_insights(items):
    """Auto-generate comparison insights between selected variants."""
    if len(items) < 2:
        return []

    insights = []

    # Power comparison
    powered = [i for i in items if i["specs"]["power_kw"]]
    if len(powered) >= 2:
        best_pw = max(powered, key=lambda x: x["specs"]["power_kw"])
        insights.append({
            "type": "power",
            "icon": "zap",
            "message": f"En yüksek güç: {best_pw['model_name']} ({best_pw['specs']['power_kw']} kW). "
                       f"Diğerlerinden {best_pw['specs']['power_kw'] - min(i['specs']['power_kw'] for i in powered):.0f} kW fazla.",
        })

    # Fuel efficiency comparison
    fueled = [i for i in items if i["fuel_stats"]["avg"]]
    if len(fueled) >= 2:
        best_fc = min(fueled, key=lambda x: x["fuel_stats"]["avg"])
        worst_fc = max(fueled, key=lambda x: x["fuel_stats"]["avg"])
        pct = ((worst_fc["fuel_stats"]["avg"] - best_fc["fuel_stats"]["avg"]) / worst_fc["fuel_stats"]["avg"]) * 100
        insights.append({
            "type": "fuel",
            "icon": "fuel",
            "message": f"En verimli: {best_fc['model_name']} (ort. {best_fc['fuel_stats']['avg']:.1f} g/h). "
                       f"%{pct:.0f} daha az yakıt tüketiyor.",
        })

    # Weight comparison
    weighted = [i for i in items if i["specs"]["max_laden_mass_kg"]]
    if len(weighted) >= 2:
        lightest = min(weighted, key=lambda x: x["specs"]["max_laden_mass_kg"])
        heaviest = max(weighted, key=lambda x: x["specs"]["max_laden_mass_kg"])
        diff = heaviest["specs"]["max_laden_mass_kg"] - lightest["specs"]["max_laden_mass_kg"]
        if diff > 0:
            insights.append({
                "type": "weight",
                "icon": "scale",
                "message": f"Ağırlık farkı: {diff} kg. En hafif: {lightest['model_name']} "
                           f"({lightest['specs']['max_laden_mass_kg']} kg).",
            })

    # Gearbox differences
    gbs = set(i["specs"]["gearbox"] for i in items if i["specs"]["gearbox"])
    if len(gbs) > 1:
        insights.append({
            "type": "gearbox",
            "icon": "settings",
            "message": f"{len(gbs)} farklı şanzıman: {', '.join(gbs)}. Performans farkları değerlendirilmeli.",
        })

    return insights


@router.get("/fleet-summary")
async def get_fleet_summary(db: AsyncSession = Depends(get_db)):
    """High-level fleet metrics for dashboard gauges and sparklines."""
    result = await db.execute(
        select(VehicleVariant, Vehicle).join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id)
    )
    rows = result.all()

    if not rows:
        return {"gauges": [], "distributions": {}}

    # Aggregate metrics
    power_values = []
    torque_values = []
    mass_values = []
    axle_values = []
    displacement_values = []

    models = {}
    for v, veh in rows:
        mn = veh.model_name
        if mn not in models:
            models[mn] = {"category": str(veh.category), "count": 0, "powers": [], "torques": []}
        models[mn]["count"] += 1
        if v.rated_power_w:
            power_values.append(v.rated_power_w / 1000)
            models[mn]["powers"].append(v.rated_power_w / 1000)
        if v.max_torque_nm:
            torque_values.append(float(v.max_torque_nm))
            models[mn]["torques"].append(float(v.max_torque_nm))
        if v.max_laden_mass_kg:
            mass_values.append(v.max_laden_mass_kg)
        if v.axle_ratio:
            axle_values.append(float(v.axle_ratio))
        if v.displacement_cc:
            displacement_values.append(v.displacement_cc)

    gauges = []
    if power_values:
        gauges.append({
            "label": "Ortalama Güç",
            "value": round(sum(power_values) / len(power_values), 1),
            "unit": "kW",
            "min": round(min(power_values), 1),
            "max": round(max(power_values), 1),
        })
    if torque_values:
        gauges.append({
            "label": "Ortalama Tork",
            "value": round(sum(torque_values) / len(torque_values), 1),
            "unit": "Nm",
            "min": round(min(torque_values), 1),
            "max": round(max(torque_values), 1),
        })
    if mass_values:
        gauges.append({
            "label": "Ortalama GVW",
            "value": round(sum(mass_values) / len(mass_values)),
            "unit": "kg",
            "min": min(mass_values),
            "max": max(mass_values),
        })
    if displacement_values:
        gauges.append({
            "label": "Ortalama Hacim",
            "value": round(sum(displacement_values) / len(displacement_values)),
            "unit": "cc",
            "min": min(displacement_values),
            "max": max(displacement_values),
        })

    # Model distribution for treemap/sunburst
    model_dist = [
        {
            "name": mn,
            "category": d["category"],
            "variants": d["count"],
            "avg_power": round(sum(d["powers"]) / len(d["powers"]), 1) if d["powers"] else None,
            "avg_torque": round(sum(d["torques"]) / len(d["torques"]), 1) if d["torques"] else None,
        }
        for mn, d in models.items()
    ]
    model_dist.sort(key=lambda x: x["variants"], reverse=True)

    # Power histogram (buckets)
    if power_values:
        bucket_size = 50
        min_p = int(min(power_values) // bucket_size * bucket_size)
        max_p = int(max(power_values) // bucket_size * bucket_size) + bucket_size
        pw_hist = []
        for b in range(min_p, max_p + 1, bucket_size):
            count = sum(1 for p in power_values if b <= p < b + bucket_size)
            pw_hist.append({"range": f"{b}-{b+bucket_size}", "count": count})
    else:
        pw_hist = []

    return {
        "gauges": gauges,
        "model_distribution": model_dist,
        "power_histogram": pw_hist,
        "total_variants": len(rows),
        "total_models": len(models),
    }
