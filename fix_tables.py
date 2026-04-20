"""Fix all tables with long text in generate_doc_pdf_v2.py"""
import re

filepath = 'generate_doc_pdf_v2.py'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')

def find_line(substr, start=0):
    for i in range(start, len(lines)):
        if substr in lines[i]:
            return i
    return -1

# ============================================================
# 1. Fix vv_cols (section 4.4 vehicle_variants) 
# ============================================================
vv_start = find_line('vv_cols = [')
vv_end = find_line('make_table(vv_cols[0]', vv_start)
print(f"vv_cols: lines {vv_start+1}-{vv_end+1}")

new_vv = [
    '    vv_cols = [',
    '        ["Kolon", "Tip", "A\u00e7\u0131klama"],',
    '        ["id", "UUID PK", "Benzersiz tan\u0131mlay\u0131c\u0131"],',
    '        ["vehicle_id", "UUID FK", "\u00dcst ara\u00e7 ref (CASCADE)"],',
    '        ["variant_code", "VARCHAR(50)", "VECTO varyant kodu"],',
    '        ["filename", "VARCHAR(255)", "XML dosya ad\u0131"],',
    '        ["engine_type", "ENUM", "diesel / electric / hybrid"],',
    '        ["engine_manufacturer", "VARCHAR(200)", "Motor \u00fcreticisi"],',
    '        ["engine_model", "VARCHAR(200)", "Motor modeli"],',
    '        ["engine_cert_number", "VARCHAR(200)", "AB sertifika no"],',
    '        ["displacement_cc", "INTEGER", "Motor hacmi (cm\u00b3)"],',
    '        ["rated_speed_rpm", "INTEGER", "Nominal devir"],',
    '        ["rated_power_w", "INTEGER", "Nominal g\u00fc\u00e7 (W)"],',
    '        ["max_torque_nm", "NUMERIC(8,2)", "Maks tork (Nm)"],',
    '        ["idling_speed_rpm", "INTEGER", "R\u00f6lanti devri"],',
    '        ["fuel_type", "VARCHAR(50)", "Yak\u0131t tipi"],',
    '        ["max_laden_mass_kg", "INTEGER", "Azami k\u00fctle (kg)"],',
    '        ["curb_weight_kg", "INTEGER", "Bo\u015f a\u011f\u0131rl\u0131k (kg)"],',
    '        ["aero_cd_a", "NUMERIC(6,4)", "CdA (m\u00b2)"],',
    '        ["gearbox_*", "VARCHAR(200)", "\u00dcretici, model, tip (3 kolon)"],',
    '        ["gear_count", "INTEGER", "Vites say\u0131s\u0131"],',
    '        ["axle_ratio / type", "NUMERIC / VARCHAR", "Diferansiyel (2 kolon)"],',
    '        ["tyre_*", "VARCHAR / NUMERIC", "Lastik detay\u0131 (12 kolon)"],',
    '        ["ADAS kolonlar\u0131", "BOOLEAN / VARCHAR", "stop_start, eco_roll, cruise"],',
    '        ["fan / steering / alt", "VARCHAR", "Yard\u0131mc\u0131 donan\u0131m (3 kolon)"],',
    '        ["pneumatic_config", "JSON", "Pn\u00f6matik konfig\u00fcrasyon"],',
    '        ["hvac_config", "JSON", "Klima/\u0131s\u0131tma konfig"],',
    '        ["whtc_*", "NUMERIC(8,5)", "WHTC d\u00fczeltme (3 kolon)"],',
    '        ["bf_cold_hot", "NUMERIC(8,5)", "Yak\u0131t d\u00fczeltmesi"],',
    '        ["cf_reg_per / cf_ncv", "NUMERIC(8,5)", "NCV d\u00fczeltmeleri"],',
    '        ["fleet_count", "INTEGER", "Filo adedi"],',
    '        ["zero_emission", "BOOLEAN", "S\u0131f\u0131r emisyon"],',
    '        ["raw_xml_data", "JSON", "Ham XML verisi"],',
    '        ["vecto_schema_ver", "VARCHAR(20)", "VECTO versiyonu"],',
    '        ["import_date", "TIMESTAMPTZ", "Aktarma tarihi"],',
    '        ["is_active", "BOOLEAN", "Soft delete"],',
    '        ["created/updated_at", "TIMESTAMPTZ", "Zaman damgalar\u0131"],',
    '    ]',
    '    story.append(make_table(vv_cols[0], vv_cols[1:], [32*mm, 30*mm, CONTENT_W - 62*mm]))',
]
lines[vv_start:vv_end+1] = new_vv
print(f"  -> replaced with {len(new_vv)} lines")

# ============================================================
# 2. Fix eng_tables (section 4.5) - shorten "Kolon Sayısı" column
# ============================================================
eng_start = find_line('eng_tables = [')
eng_end = find_line('make_table(eng_tables[0]', eng_start)
print(f"eng_tables: lines {eng_start+1}-{eng_end+1}")

new_eng = [
    '    eng_tables = [',
    '        ["Tablo", "Kolonlar", "Ama\u00e7", "Veri \u00d6rne\u011fi"],',
    '        ["fuel_consumption_maps", "speed, torque, fc", "Yak\u0131t haritas\u0131", "2100rpm, 800Nm \u2192 42.5g/s"],',
    '        ["full_load_drag_curves", "speed, max_torque, drag", "Y\u00fck/s\u00fcrt\u00fcnme e\u011frileri", "1800rpm \u2192 1100/-85 Nm"],',
    '        ["gear_ratios", "gear_number, ratio", "Vites oranlar\u0131", "Vites 6 \u2192 0.78"],',
    '        ["torque_converter_chars", "speed_r, torque_r, input", "Tork konvert\u00f6r", "0.8 \u2192 1.2 ratio"],',
    '        ["axle_loss_maps", "speed, torque, loss", "Aks kay\u0131p haritas\u0131", "500rpm, 2000Nm \u2192 35.5"],',
    '    ]',
    '    story.append(make_table(eng_tables[0], eng_tables[1:], [35*mm, 35*mm, 32*mm, CONTENT_W - 102*mm]))',
]
lines[eng_start:eng_end+1] = new_eng
print(f"  -> replaced with {len(new_eng)} lines")

# ============================================================
# 3. Fix sim_tables (section 4.6) - shorten "Anahtar Metrikler" 
# ============================================================
sim_start = find_line('sim_tables = [')
sim_end = find_line('make_table(sim_tables[0]', sim_start)
print(f"sim_tables: lines {sim_start+1}-{sim_end+1}")

new_sim = [
    '    sim_tables = [',
    '        ["Tablo", "Kay\u0131t Tipi", "Anahtar Metrikler"],',
    '        ["simulation_runs", "Sim\u00fclasyon \u00e7al\u0131\u015ft\u0131rma", "source, status, params"],',
    '        ["simulation_results", "Sonu\u00e7", "co2, fuel, energy metrikleri"],',
    '        ["real_test_results", "Test sonucu", "test tipi, ko\u015fullar"],',
    '        ["vecto_results_certified", "VECTO sertifika (56 kol.)", "VIN, misyon\u00d7y\u00fckleme, CO\u2082/FC"],',
    '        ["vecto_simulation_outputs", "VECTO \u00e7\u0131kt\u0131", "cf_actual, WHTC fakt\u00f6rleri"],',
    '        ["import_logs", "\u0130\u00e7e aktarma", "dosya, status, hata, say\u0131lar"],',
    '    ]',
    '    story.append(make_table(sim_tables[0], sim_tables[1:], [38*mm, 35*mm, CONTENT_W - 73*mm]))',
]
lines[sim_start:sim_end+1] = new_sim
print(f"  -> replaced with {len(new_sim)} lines")

# ============================================================
# 4. Fix vrc_cols (section 4.7) column widths - widen middle col  
# ============================================================
vrc_make = find_line('make_table(vrc_cols[0]')
if vrc_make >= 0:
    old = lines[vrc_make]
    lines[vrc_make] = old.replace('22*mm, 62*mm, CONTENT_W - 84*mm', '25*mm, 60*mm, CONTENT_W - 85*mm')
    print(f"vrc_cols widths adjusted at line {vrc_make+1}")

# ============================================================
# 5. Fix roles_data (section 4.8) - shorten permissions text
# ============================================================
roles_start = find_line('roles_data = [')
roles_end = find_line('make_table(roles_data[0]', roles_start)
if roles_start >= 0:
    print(f"roles_data: lines {roles_start+1}-{roles_end+1}")
    new_roles = [
        '    roles_data = [',
        '        ["Rol", "\u0130zinler (JSONB)", "A\u00e7\u0131klama"],',
        '        ["admin", \'["*"]\', "Tam yetki"],',
        '        ["manager", \'["view","edit","import","export"]\', "Y\u00f6netici \u2014 veri giri\u015fi ve analiz"],',
        '        ["analyst", \'["view","analyze","export"]\', "Analist \u2014 salt okunur + analiz"],',
        '        ["viewer", \'["view"]\', "\u0130zleyici \u2014 salt okunur"],',
        '        ["engineering", \'["weightcalc","simutem"]\', "M\u00fchendislik mod\u00fclleri"],',
        '        ["entegration", \'["bom","materials"]\', "Entegrasyon \u2014 BOM"],',
        '        ["design", \'["view","export","compare"]\', "Tasar\u0131m"],',
    ]
    # Find the closing bracket
    for i in range(roles_start+1, roles_end):
        if lines[i].strip() == ']':
            new_roles.append('    ]')
            break
    new_roles.append(lines[roles_end])
    lines[roles_start:roles_end+1] = new_roles
    print(f"  -> replaced with {len(new_roles)} lines")

# ============================================================
# Save
# ============================================================
content = '\n'.join(lines)
with open(filepath, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! Total lines: {len(lines)}")
