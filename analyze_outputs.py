"""Analyze Output Files structure for fleet calculations."""
import xml.etree.ElementTree as ET
import os
import csv
import io

def print_tree(elem, indent=0, max_depth=4):
    if indent > max_depth:
        return
    tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
    text = (elem.text or '').strip()[:80]
    attrs = ' '.join(f'{k}="{v}"' for k,v in elem.attrib.items())
    line = '  ' * indent + tag
    if attrs: line += f' [{attrs}]'
    if text: line += f' = {text}'
    print(line)
    for child in elem:
        print_tree(child, indent+1, max_depth)

# 1. RSLT_VIF
print("=" * 80)
print("RSLT_VIF STRUCTURE")
print("=" * 80)
tree = ET.parse('Output Files/LD2SB0D100110104108108000.RSLT_VIF.xml')
print_tree(tree.getroot(), max_depth=6)

# 2. RSLT_MONITORING
print("\n" + "=" * 80)
print("RSLT_MONITORING STRUCTURE")
print("=" * 80)
tree = ET.parse('Output Files/LD2SB0D100110104108108000.RSLT_MONITORING.xml')
print_tree(tree.getroot(), max_depth=6)

# 3. RSLT_MANUFACTURER (sample CO2/fuel data extraction)
print("\n" + "=" * 80)
print("RSLT_MANUFACTURER - CO2/FUEL DATA")
print("=" * 80)
tree = ET.parse('Output Files/LD2SB0D100110104108108000.RSLT_MANUFACTURER.xml')
root = tree.getroot()
ns = {'v': root.tag.split('}')[0].strip('{')} if '}' in root.tag else {}
print_tree(root, max_depth=5)

# 4. VSUM sample
print("\n" + "=" * 80)
print("VSUM HEADERS")
print("=" * 80)
with open('Output Files/LD2SB0D100110104108108000.vsum', 'r') as f:
    lines = f.readlines()
    print(f"Total lines: {len(lines)}")
    print(f"Line 0: {lines[0].strip()[:100]}")
    # Find header line
    for i, line in enumerate(lines):
        if not line.startswith('#'):
            headers = line.strip().split(',')
            print(f"Header line {i}: {len(headers)} columns")
            # Print key columns
            for j, h in enumerate(headers):
                if any(kw in h.lower() for kw in ['co2', 'fuel', 'fc-final', 'mission', 'cycle', 'distance', 'speed']):
                    print(f"  [{j}] {h}")
            break
