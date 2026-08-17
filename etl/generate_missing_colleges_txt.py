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

partial_colleges = []
no_type_colleges = []

for coc, items in coc_records.items():
    missing_items = [item for item in items if not item.get("type") or not item.get("types")]
    if len(missing_items) > 0:
        con = items[0].get("con", "").strip().replace("\n", " ")
        all_types = coc_types[coc]
        all_ts = coc_types_list[coc]
        
        missing_brcs = [item.get("brc") for item in missing_items]
        present_brcs = [item.get("brc") for item in items if item.get("type") and item.get("types")]
        
        if len(all_types) > 0:
            partial_colleges.append({
                "coc": coc,
                "con": con,
                "found_type": list(all_types),
                "found_types": [list(x) for x in all_ts],
                "missing_records_count": len(missing_items),
                "missing_branches": missing_brcs,
                "present_branches": present_brcs
            })
        else:
            no_type_colleges.append({
                "coc": coc,
                "con": con,
                "total_branches": len(items),
                "missing_branches": missing_brcs
            })

lines = []
lines.append("=" * 80)
lines.append("COLLEGE TYPE ANALYSIS REPORT FOR etl/predicted_choices_2026.json")
lines.append("=" * 80)
lines.append(f"Colleges where OTHER branches HAVE type (Can borrow within COC): {len(partial_colleges)} colleges ({sum(c['missing_records_count'] for c in partial_colleges)} choice records)")
lines.append(f"Colleges with NO type in ANY branch: {len(no_type_colleges)} colleges ({sum(len(c['missing_branches']) for c in no_type_colleges)} choice records)")
lines.append("=" * 80)
lines.append("")

lines.append("SECTION 1: COLLEGES THAT DO NOT HAVE 'type' IN ANY BRANCH (25 COLLEGES)")
lines.append("-" * 80)
idx = 1
for c in no_type_colleges:
    lines.append(f"{idx}. COC: {c['coc']} | Total Branches: {c['total_branches']} | All Branches Missing Type: {', '.join(c['missing_branches'])}")
    lines.append(f"   Name: {c['con']}")
    lines.append("")
    idx += 1

lines.append("")
lines.append("SECTION 2: COLLEGES WHERE SOME BRANCHES HAVE TYPE (CAN BORROW FROM SAME COC)")
lines.append("-" * 80)
idx = 1
for c in partial_colleges:
    lines.append(f"{idx}. COC: {c['coc']} | Missing Branches ({len(c['missing_branches'])}): {', '.join(c['missing_branches'])} | Existing Branches: {', '.join(c['present_branches'])}")
    lines.append(f"   Name: {c['con']}")
    lines.append(f"   Type in existing branches: {c['found_type']}")
    lines.append(f"   Types in existing branches: {c['found_types']}")
    lines.append("")
    idx += 1

output_text = "\n".join(lines)

with open("etl/missing_colleges.txt", "w", encoding="utf-8") as f:
    f.write(output_text)

print(f"Report updated in etl/missing_colleges.txt: {len(no_type_colleges)} colleges have NO type in any branch; {len(partial_colleges)} colleges can borrow from existing branches in same COC.")
