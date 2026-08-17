import json
from collections import defaultdict

with open("etl/predicted_choices_2026.json", "r", encoding="utf-8") as f:
    data = json.load(f)

coc_types = defaultdict(set)
coc_types_list = defaultdict(set)
coc_records = defaultdict(list)

for item in data:
    coc = str(item.get("coc"))
    t = item.get("type")
    ts = item.get("types")
    
    coc_records[coc].append(item)
    
    if t and t.strip():
        coc_types[coc].add(t.strip())
    if ts and isinstance(ts, list) and len(ts) > 0:
        coc_types_list[coc].add(tuple(ts))

colleges_with_partial_type = []
colleges_with_no_type_at_all = []

for coc, items in coc_records.items():
    has_empty = any(not item.get("type") or not item.get("types") for item in items)
    if has_empty:
        con = items[0].get("con", "").strip().replace("\n", " ")
        all_types_in_coc = coc_types[coc]
        all_ts_in_coc = coc_types_list[coc]
        
        missing_branches = [item.get("brc") for item in items if not item.get("type") or not item.get("types")]
        present_branches = [item.get("brc") for item in items if item.get("type") and item.get("types")]
        
        if len(all_types_in_coc) > 0:
            colleges_with_partial_type.append({
                "coc": coc,
                "con": con,
                "found_type": list(all_types_in_coc),
                "found_types": [list(x) for x in all_ts_in_coc],
                "missing_branches": missing_branches,
                "present_branches": present_branches
            })
        else:
            colleges_with_no_type_at_all.append({
                "coc": coc,
                "con": con,
                "total_branches": len(items),
                "missing_branches": missing_branches
            })

print(f"Colleges where SOME branches have type (can borrow within COC): {len(colleges_with_partial_type)}")
print(f"Colleges where NO branch has type in ANY choice record: {len(colleges_with_no_type_at_all)}")

print("\n--- COLLEGES WITH PARTIAL TYPES (Borrowable from same COC) ---")
for c in colleges_with_partial_type:
    print(f"COC: {c['coc']} | Found Type: {c['found_type']} | Missing: {c['missing_branches']} | Present: {c['present_branches']} | Name: {c['con']}")

print("\n--- COLLEGES WITH NO TYPE IN ANY BRANCH ---")
for c in colleges_with_no_type_at_all:
    print(f"COC: {c['coc']} | Total Branches: {c['total_branches']} | Missing: {c['missing_branches']} | Name: {c['con']}")
