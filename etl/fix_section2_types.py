import json
from collections import defaultdict

with open("etl/predicted_choices_2026.json", "r", encoding="utf-8") as f:
    data = json.load(f)

coc_type_map = {}
coc_types_map = {}

for item in data:
    coc = str(item.get("coc"))
    t = item.get("type")
    ts = item.get("types")
    
    if t and str(t).strip() and coc not in coc_type_map:
        coc_type_map[coc] = str(t).strip()
    if ts and isinstance(ts, list) and len(ts) > 0 and coc not in coc_types_map:
        coc_types_map[coc] = ts

updated_records_count = 0
updated_cocs = set()

for item in data:
    coc = str(item.get("coc"))
    t = item.get("type")
    ts = item.get("types")
    
    t_empty = (t is None or t == "")
    ts_empty = (ts is None or ts == "" or ts == [] or (isinstance(ts, list) and len(ts) == 0))
    
    if (t_empty or ts_empty) and coc in coc_type_map and coc in coc_types_map:
        borrowed_type = coc_type_map[coc]
        borrowed_types = list(coc_types_map[coc])
        
        con_text = str(item.get("con", "")).lower()
        if "autonomous" in con_text:
            borrowed_types = [x for x in borrowed_types if x.lower() != "non-autonomous"]
            if not any(x.lower() == "autonomous" for x in borrowed_types):
                borrowed_types.append("autonomous")
            if "non-autonomous" in borrowed_type.lower():
                borrowed_type = borrowed_type.replace("non-autonomous", "autonomous")
            elif "autonomous" not in borrowed_type.lower():
                borrowed_type = f"{borrowed_type.strip()} autonomous"
                
        item["type"] = borrowed_type
        item["types"] = borrowed_types
        updated_records_count += 1
        updated_cocs.add(coc)

with open("etl/predicted_choices_2026.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"Successfully updated {updated_records_count} choice records across {len(updated_cocs)} Section 2 colleges in etl/predicted_choices_2026.json")
