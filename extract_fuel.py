import xml.etree.ElementTree as ET
import sys

fp = sys.argv[1]
tree = ET.parse(fp)
root = tree.getroot()

for elem in root.iter():
    tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
    if tag == "FuelConsumption":
        print(f"  FuelConsumption unit={elem.get('unit','?')} => {elem.text}")
    if tag == "CO2":
        print(f"  CO2 unit={elem.get('unit','?')} => {elem.text}")
    if tag == "Mission":
        print(f"\n--- Mission: {elem.text} ---")
    if tag == "PrimaryVehicleSubgroup":
        print(f"  PrimaryVehicleSubgroup: {elem.text}")
