import json

with open("etl/predicted_choices_2026.json", "r", encoding="utf-8") as f:
    predicted_data = json.load(f)

with open("etl/new/2025.json", "r", encoding="utf-8") as f:
    d25 = json.load(f)

types_map = {}
for r in d25:
    key = (str(r["coc"]), r["brc"])
    if key not in types_map:
        types_map[key] = {
            "types": r.get("types", []),
            "type": r.get("type", "")
        }

tl_keys = ["octl", "bctl", "bcmtl", "mbctl", "sctl", "scatl", "sttl"]

filtered_data = []
for choice in predicted_data:
    seats_2026_sum = sum(choice[k][1] for k in tl_keys if k in choice and isinstance(choice[k], list) and len(choice[k]) > 1 and choice[k][1] is not None)
    if seats_2026_sum == 0:
        continue

    key = (str(choice["coc"]), choice["brc"])
    info = types_map.get(key, {"types": [], "type": ""})
    
    types_list = [t for t in info["types"]]
    type_str = str(info["type"])
    
    con_text = str(choice.get("con", "")).lower()
    
    if "autonomous" in con_text:
        types_list = [t for t in types_list if t.lower() != "non-autonomous"]
        if not any(t.lower() == "autonomous" for t in types_list):
            types_list.append("autonomous")
            
        if "non-autonomous" in type_str.lower():
            type_str = type_str.replace("non-autonomous", "autonomous").replace("NON-AUTONOMOUS", "autonomous")
        elif "autonomous" not in type_str.lower():
            if type_str.strip():
                type_str = f"{type_str.strip()} (autonomous)"
            else:
                type_str = "autonomous"
                
    choice["types"] = types_list
    choice["type"] = type_str
    filtered_data.append(choice)

with open("etl/predicted_choices_2026.json", "w", encoding="utf-8") as f:
    json.dump(filtered_data, f, indent=2)

print("Successfully updated etl/predicted_choices_2026.json with types, refined autonomous status, and removed 0-seat 2026 branches!")
