"""Extract CO2/Fuel/Energy data from all Output Files to build variant/fleet matrix."""
import xml.etree.ElementTree as ET
import os
import json

output_dir = 'Output Files'
results = {}

# Process all RSLT_MANUFACTURER files
for fname in sorted(os.listdir(output_dir)):
    if not fname.endswith('.RSLT_MANUFACTURER.xml'):
        continue
    variant_code = fname.replace('.RSLT_MANUFACTURER.xml', '')
    fpath = os.path.join(output_dir, fname)
    
    try:
        tree = ET.parse(fpath)
        root = tree.getroot()
    except Exception as e:
        print(f"ERROR parsing {fname}: {e}")
        continue
    
    # Extract vehicle info
    vehicle_info = {}
    missions = []
    
    def find_all(elem, tag_suffix):
        """Find all elements whose tag ends with given suffix."""
        found = []
        for child in elem.iter():
            if child.tag.endswith(tag_suffix):
                found.append(child)
        return found
    
    def find_first(elem, tag_suffix):
        items = find_all(elem, tag_suffix)
        return items[0] if items else None
    
    def get_text(elem, tag_suffix):
        item = find_first(elem, tag_suffix)
        return item.text.strip() if item is not None and item.text else None
    
    # Get vehicle info from Data element
    data_elem = find_first(root, 'Data')
    if data_elem is None:
        continue
    
    vehicle = find_first(data_elem, 'Vehicle')
    if vehicle:
        vehicle_info['model'] = get_text(vehicle, 'Model')
        vehicle_info['vehicle_group'] = get_text(vehicle, 'VehicleGroup')
        vehicle_info['vehicle_group_co2'] = get_text(vehicle, 'VehicleGroupCO2')
        vehicle_info['max_laden_mass'] = get_text(vehicle, 'TechnicalPermissibleMaximumLadenMass')
        vehicle_info['axle_config'] = get_text(vehicle, 'AxleConfiguration')
        
        # Engine info
        engine = find_first(vehicle, 'Engine')
        if engine:
            vehicle_info['engine_model'] = get_text(engine, 'Model')
            vehicle_info['engine_rated_power'] = get_text(engine, 'RatedPower')
        
        # Transmission
        trans = find_first(vehicle, 'Transmission')
        if trans:
            vehicle_info['transmission_model'] = get_text(trans, 'Model')
            vehicle_info['transmission_type'] = get_text(trans, 'Type')
        
        # Axlegear
        axle = find_first(vehicle, 'Axlegear')
        if axle:
            vehicle_info['axle_ratio'] = get_text(axle, 'Ratio')
    
    # Get results
    results_elem = find_first(data_elem, 'Results')
    if results_elem:
        for result in results_elem:
            tag = result.tag.split('}')[-1] if '}' in result.tag else result.tag
            if tag != 'Result':
                continue
            
            mission_data = {}
            mission_data['mission'] = get_text(result, 'Mission')
            mission_data['distance_km'] = get_text(result, 'Distance')
            
            sim = find_first(result, 'SimulationParameters')
            if sim:
                mission_data['total_mass_kg'] = get_text(sim, 'TotalVehicleMass')
                mission_data['payload_kg'] = get_text(sim, 'Payload')
                mission_data['passenger_count'] = get_text(sim, 'PassengerCount')
            
            # CO2 values
            co2_values = find_all(result, 'CO2')
            for co2 in co2_values:
                unit = co2.get('unit', '')
                val = co2.text.strip() if co2.text else None
                if 'g/km' == unit:
                    mission_data['co2_g_km'] = val
                elif 'g/p-km' == unit:
                    mission_data['co2_g_pkm'] = val
            
            # Fuel values
            fuel_elem = find_first(result, 'Fuel')
            if fuel_elem:
                mission_data['fuel_type'] = fuel_elem.get('type', '')
                fc_values = find_all(fuel_elem, 'FuelConsumption')
                for fc in fc_values:
                    unit = fc.get('unit', '')
                    val = fc.text.strip() if fc.text else None
                    if unit:
                        mission_data[f'fc_{unit.replace("/","_")}'] = val
            
            missions.append(mission_data)
    
    results[variant_code] = {
        'vehicle': vehicle_info,
        'missions': missions,
        'mission_count': len(missions)
    }

# Also process VIF files for energy consumption
vif_data = {}
for fname in sorted(os.listdir(output_dir)):
    if not fname.endswith('.RSLT_VIF.xml'):
        continue
    variant_code = fname.replace('.RSLT_VIF.xml', '')
    fpath = os.path.join(output_dir, fname)
    
    try:
        tree = ET.parse(fpath)
        root = tree.getroot()
    except:
        continue
    
    vif_missions = []
    for result in root.iter():
        tag = result.tag.split('}')[-1] if '}' in result.tag else result.tag
        if tag != 'Result':
            continue
        
        mission = {}
        mission['subgroup'] = get_text(result, 'PrimaryVehicleSubgroup')
        mission['mission'] = get_text(result, 'Mission')
        
        sim = find_first(result, 'SimulationParameters')
        if sim:
            mission['total_mass_kg'] = get_text(sim, 'TotalVehicleMass')
            mission['passenger_count'] = get_text(sim, 'PassengerCount')
        
        fuel = find_first(result, 'Fuel')
        if fuel:
            ec = find_first(fuel, 'EnergyConsumption')
            if ec is not None and ec.text:
                mission['energy_mj_km'] = ec.text.strip()
        
        if mission.get('mission'):
            vif_missions.append(mission)
    
    vif_data[variant_code] = vif_missions

# Print summary
print("=" * 100)
print("VARIANT OUTPUT SUMMARY")
print("=" * 100)

for variant in sorted(results):
    r = results[variant]
    v = r['vehicle']
    print(f"\n{'-' * 100}")
    print(f"VARIANT: {variant}")
    print(f"  Model: {v.get('model', 'N/A')} | Group: {v.get('vehicle_group', 'N/A')} | Engine: {v.get('engine_model', 'N/A')} ({v.get('engine_rated_power', 'N/A')} kW)")
    print(f"  Transmission: {v.get('transmission_model', 'N/A')} ({v.get('transmission_type', 'N/A')}) | Axle: {v.get('axle_ratio', 'N/A')}")
    print(f"  Missions: {r['mission_count']}")
    
    for m in r['missions']:
        co2 = m.get('co2_g_km', 'N/A')
        co2p = m.get('co2_g_pkm', 'N/A')
        print(f"    {m.get('mission', 'N/A'):15s} | Mass: {m.get('total_mass_kg', 'N/A'):>7s} kg | Pax: {m.get('passenger_count', 'N/A'):>6s} | CO2: {co2:>8s} g/km | {co2p:>8s} g/p-km")

# Print VIF energy data summary
print("\n" + "=" * 100)
print("VIF ENERGY CONSUMPTION SUMMARY (MJ/km)")
print("=" * 100)
for variant in sorted(vif_data):
    missions = vif_data[variant]
    if not missions:
        continue
    print(f"\n{variant}:")
    subgroups = {}
    for m in missions:
        sg = m.get('subgroup', 'N/A')
        if sg not in subgroups:
            subgroups[sg] = []
        subgroups[sg].append(m)
    
    for sg in sorted(subgroups):
        print(f"  Subgroup: {sg}")
        for m in subgroups[sg]:
            print(f"    {m.get('mission', 'N/A'):15s} | Mass: {m.get('total_mass_kg', 'N/A'):>7s} kg | Pax: {m.get('passenger_count', 'N/A'):>6s} | Energy: {m.get('energy_mj_km', 'N/A'):>8s} MJ/km")

# Summary statistics
print("\n" + "=" * 100)
print("STATISTICS")
print("=" * 100)

# Group by vehicle family
families = {}
for v in sorted(results):
    prefix = v[:2]
    if prefix not in families:
        families[prefix] = []
    families[prefix].append(v)

for fam in sorted(families):
    variants = families[fam]
    models = set(results[v]['vehicle'].get('model', 'N/A') for v in variants)
    groups = set(results[v]['vehicle'].get('vehicle_group', 'N/A') for v in variants)
    print(f"\n{fam} Family: {len(variants)} variants")
    print(f"  Models: {', '.join(sorted(models))}")
    print(f"  Vehicle Groups: {', '.join(sorted(groups))}")
    
    # Mission types
    all_missions = set()
    for v in variants:
        for m in results[v]['missions']:
            all_missions.add(m.get('mission', 'N/A'))
    print(f"  Mission Types: {', '.join(sorted(all_missions))}")
