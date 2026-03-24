import xml.etree.ElementTree as ET
import sys

def print_tree(elem, indent=0, max_children=3):
    tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
    attrs = {}
    for k, v in elem.attrib.items():
        clean_k = k.split('}')[-1] if '}' in k else k
        if clean_k != 'type':
            attrs[clean_k] = v
    text = (elem.text or '').strip()[:100]
    children = list(elem)
    
    prefix = '  ' * indent
    attr_str = ' '.join(f'{k}="{v}"' for k, v in attrs.items())
    
    if len(children) == 0:
        a = f' [{attr_str}]' if attr_str else ''
        print(f'{prefix}{tag}{a} = {text}')
    else:
        a = f' [{attr_str}]' if attr_str else ''
        # Check if all children are leaf entries (data maps)
        all_leaf = all(len(list(c)) == 0 for c in children)
        if all_leaf and len(children) > 5:
            c0 = children[0]
            c0tag = c0.tag.split('}')[-1] if '}' in c0.tag else c0.tag
            c0attrs = {k.split('}')[-1] if '}' in k else k: v for k,v in c0.attrib.items()}
            c0a = ', '.join(f'{k}' for k in c0attrs.keys())
            print(f'{prefix}{tag}{a} -> {len(children)} x <{c0tag}> entries (attrs: {c0a})')
        else:
            print(f'{prefix}{tag}{a} -> {len(children)} children')
            shown = 0
            for child in children:
                print_tree(child, indent + 1, max_children=999 if indent < 2 else max_children)
                shown += 1

fp = sys.argv[1]
tree = ET.parse(fp)
print_tree(tree.getroot())
