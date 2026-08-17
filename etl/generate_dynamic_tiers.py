import json
from collections import defaultdict

with open(r"etl/new/2025.json", "r", encoding="utf-8") as f:
    d25 = json.load(f)

with open(r"etl/new seats.json", "r", encoding="utf-8") as f:
    d26_seats = json.load(f)

with open(r"etl/new coc.json", "r", encoding="utf-8") as f:
    new_coc_raw = json.load(f)

new_coc_map = {str(k): str(v).replace("\n", " ").strip() for k, v in new_coc_raw.items()}

with open(r"public/assets/db/tnea/college/tnea_2026.json", "r", encoding="utf-8") as f:
    changes = json.load(f)

removed = set(changes.get("removed", []))
added = set(changes.get("added", []))
merged_pairs = changes.get("merged", [])

merged_from_to = {m[0]: m[1] for m in merged_pairs}
merged_to_from = {m[1]: m[0] for m in merged_pairs}

college_best_ocr = {}
college_name = {}

for row in d25:
    coc = str(row["coc"])
    ocr_str = row.get("ocr")
    if not ocr_str or not str(ocr_str).strip().isdigit():
        continue
    ocr = int(ocr_str)
    con = new_coc_map.get(coc) or row.get("con", "").split("\n")[0].strip()

    if coc not in college_best_ocr or ocr < college_best_ocr[coc]:
        college_best_ocr[coc] = ocr
        college_name[coc] = con

for m_from, m_to in merged_pairs:
    s_ocr = college_best_ocr.get(m_from)
    t_ocr = college_best_ocr.get(m_to)

    if s_ocr is not None:
        if t_ocr is None or s_ocr < t_ocr:
            college_best_ocr[m_to] = s_ocr
            s_name = new_coc_map.get(m_from) or college_name.get(m_from)
            t_name = new_coc_map.get(m_to) or college_name.get(m_to)
            college_name[m_to] = s_name if s_name else t_name

active_2026_cocs = set(str(r["coc"]) for r in d26_seats)

ranked_colleges = []
unranked_colleges = []

for coc in active_2026_cocs:
    if coc in removed:
        continue

    is_new = coc in added
    b_ocr = college_best_ocr.get(coc)
    c_name = new_coc_map.get(coc) or college_name.get(coc) or ("College " + coc)

    if is_new or b_ocr is None:
        unranked_colleges.append({
            "coc": coc,
            "overall_rank": None,
            "name": c_name
        })
    else:
        ranked_colleges.append({
            "coc": coc,
            "name": c_name,
            "best_ocr": b_ocr
        })

ranked_colleges.sort(key=lambda x: x["best_ocr"])

for idx, c in enumerate(ranked_colleges, start=1):
    c["overall_rank"] = idx

MAX_STEP_DIFF = 5000
MAX_GROUP_SPAN = 10000

current_group = 1
if ranked_colleges:
    group_start_ocr = ranked_colleges[0]["best_ocr"]
    prev_ocr = ranked_colleges[0]["best_ocr"]
    ranked_colleges[0]["tier"] = current_group

    for i in range(1, len(ranked_colleges)):
        curr_ocr = ranked_colleges[i]["best_ocr"]
        step_diff = curr_ocr - prev_ocr
        group_span = curr_ocr - group_start_ocr

        if step_diff <= MAX_STEP_DIFF and group_span <= MAX_GROUP_SPAN:
            ranked_colleges[i]["tier"] = current_group
            prev_ocr = curr_ocr
        else:
            current_group += 1
            ranked_colleges[i]["tier"] = current_group
            group_start_ocr = curr_ocr
            prev_ocr = curr_ocr

final_structure = defaultdict(list)

for c in ranked_colleges:
    tier_key = str(c["tier"])
    final_structure[tier_key].append([c["coc"], c["overall_rank"], c["name"]])

if unranked_colleges:
    final_structure["unranked"] = []
    for c in unranked_colleges:
        final_structure["unranked"].append([c["coc"], None, c["name"]])

with open(r"etl/college_groups_2026.json", "w", encoding="utf-8") as f:
    json.dump(final_structure, f, indent=2)
