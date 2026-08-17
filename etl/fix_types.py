import json

with open("public/assets/db/tnea/college/type.json", "r", encoding="utf-8") as f:
    type_meta = json.load(f)

coc_to_type = {}
for type_name, coc_list in type_meta.items():
    for coc in coc_list:
        coc_to_type[str(coc)] = type_name

coc_to_type["1111"] = "private autonomous"
coc_to_type["1213"] = "private non-autonomous"
coc_to_type["2323"] = "private autonomous"
coc_to_type["3555"] = "private non-autonomous"
coc_to_type["4747"] = "private non-autonomous"
coc_to_type["4911"] = "private non-autonomous"

type_to_types_map = {
    "govt anna university (main campus)": ["govt", "university", "anna university", "main campus"],
    "govt anna university (regional campus)": ["govt", "university", "anna university", "regional campus"],
    "govt annamalai": ["govt", "university", "annamalai"],
    "govt autonomous": ["govt", "autonomous"],
    "govt non-autonomous": ["govt", "non-autonomous"],
    "govt aided autonomous": ["govt-aided", "autonomous"],
    "central govt colleges": ["govt", "central govt"],
    "private autonomous": ["private", "autonomous"],
    "private non-autonomous": ["private", "non-autonomous"],
    "autonomous": ["autonomous"]
}

with open("etl/predicted_choices_2026.json", "r", encoding="utf-8") as f:
    data = json.load(f)

updated_count = 0
for item in data:
    coc = str(item.get("coc"))
    con_text = str(item.get("con", "")).lower()
    
    expected_t = coc_to_type.get(coc)
    if not expected_t:
        if "government" in con_text or "govt" in con_text:
            expected_t = "govt autonomous" if "autonomous" in con_text else "govt non-autonomous"
        else:
            expected_t = "private autonomous" if "autonomous" in con_text else "private non-autonomous"

    expected_ts = list(type_to_types_map[expected_t])

    if "autonomous" in con_text:
        if "non-autonomous" in expected_t:
            expected_t = expected_t.replace("non-autonomous", "autonomous")
            expected_ts = [t for t in expected_ts if t != "non-autonomous"]
            if "autonomous" not in expected_ts:
                expected_ts.append("autonomous")

    if item.get("type") != expected_t or item.get("types") != expected_ts:
        updated_count += 1
        item["type"] = expected_t
        item["types"] = expected_ts

with open("etl/predicted_choices_2026.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"Successfully updated {updated_count} records in etl/predicted_choices_2026.json")
