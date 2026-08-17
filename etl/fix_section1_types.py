import json

govt_non_auto_cocs = {"1516", "2369", "2709", "3464", "3465", "5009"}
private_non_auto_cocs = {
    "1102", "1203", "1213", "1237", "1339", "2378", "2777", "3477", "3555",
    "4747", "4911", "4986", "5546", "5915", "5924", "5930", "5942", "5988", "5990"
}

with open("etl/predicted_choices_2026.json", "r", encoding="utf-8") as f:
    data = json.load(f)

updated_count = 0
updated_cocs = set()

for item in data:
    coc = str(item.get("coc"))
    t = item.get("type")
    ts = item.get("types")
    
    t_empty = (t is None or t == "")
    ts_empty = (ts is None or ts == "" or ts == [] or (isinstance(ts, list) and len(ts) == 0))
    
    if t_empty or ts_empty:
        if coc in govt_non_auto_cocs:
            item["type"] = "govt non-autonomous"
            item["types"] = ["govt", "non-autonomous"]
            updated_count += 1
            updated_cocs.add(coc)
        elif coc in private_non_auto_cocs:
            item["type"] = "private non-autonomous"
            item["types"] = ["private", "non-autonomous"]
            updated_count += 1
            updated_cocs.add(coc)

with open("etl/predicted_choices_2026.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"Successfully updated {updated_count} choice records across {len(updated_cocs)} Section 1 colleges in etl/predicted_choices_2026.json")
