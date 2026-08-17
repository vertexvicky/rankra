import csv
import json
from collections import defaultdict
import statistics
import os

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
merged_from_to = {str(m[0]): str(m[1]) for m in merged_pairs}

all_allotments = []
csv_files = [
    r"etl/cutoff/2025/ROUND 1.csv",
    r"etl/cutoff/2025/ROUND 2.csv",
    r"etl/cutoff/2025/ROUND 3.csv"
]

for fname in csv_files:
    if not os.path.exists(fname):
        continue
    with open(fname, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                gr = int(float(row["GENERAL RANK"]))
                cutoff = float(row["AGGREGATE MARK"])
                coc = str(row["COLLEGE CODE"]).strip()
                if coc in merged_from_to:
                    coc = merged_from_to[coc]
                all_allotments.append({"gr": gr, "cutoff": cutoff, "coc": coc})
            except (ValueError, KeyError):
                continue

college_cutoffs = defaultdict(list)
college_ranks = defaultdict(list)

for a in all_allotments:
    college_cutoffs[a["coc"]].append(a["cutoff"])
    college_ranks[a["coc"]].append(a["gr"])

college_stats = {}
for coc in college_cutoffs:
    college_stats[coc] = {
        "med_cutoff": statistics.median(college_cutoffs[coc]),
        "med_rank": statistics.median(college_ranks[coc])
    }

active_2026_cocs = set(str(r["coc"]) for r in d26_seats)

ranked_colleges = []
unranked_colleges = []

for coc in active_2026_cocs:
    if coc in removed:
        continue

    is_new = coc in added
    st = college_stats.get(coc)
    c_name = new_coc_map.get(coc, f"College {coc}")

    if is_new or st is None:
        unranked_colleges.append({"coc": int(coc), "name": c_name})
    else:
        ranked_colleges.append({
            "coc": int(coc),
            "name": c_name,
            "med_cutoff": st["med_cutoff"],
            "med_rank": st["med_rank"]
        })

ranked_colleges.sort(key=lambda x: -x["med_cutoff"])

MAX_CUTOFF_STEP = 2.0
MAX_CUTOFF_SPAN = 5.0

current_tier = 1
if ranked_colleges:
    group_start_cutoff = ranked_colleges[0]["med_cutoff"]
    prev_cutoff = ranked_colleges[0]["med_cutoff"]
    ranked_colleges[0]["tier"] = current_tier

    for i in range(1, len(ranked_colleges)):
        curr_cutoff = ranked_colleges[i]["med_cutoff"]
        step = prev_cutoff - curr_cutoff
        span = group_start_cutoff - curr_cutoff

        if step <= MAX_CUTOFF_STEP and span <= MAX_CUTOFF_SPAN:
            ranked_colleges[i]["tier"] = current_tier
        else:
            current_tier += 1
            ranked_colleges[i]["tier"] = current_tier
            group_start_cutoff = curr_cutoff
        prev_cutoff = curr_cutoff

for c in ranked_colleges:
    c["_sort_key"] = c["med_rank"]

ranked_colleges.sort(key=lambda x: x["med_rank"])

for idx, c in enumerate(ranked_colleges, start=1):
    c["overall_rank"] = idx

final_structure = defaultdict(list)

for c in ranked_colleges:
    tier_key = str(c["tier"])
    final_structure[tier_key].append([c["coc"], c["overall_rank"], c["name"]])

for tier_key in final_structure:
    final_structure[tier_key].sort(key=lambda item: item[1])

if unranked_colleges:
    final_structure["unranked"] = []
    for c in unranked_colleges:
        final_structure["unranked"].append([c["coc"], None, c["name"]])

output_file_etl = r"etl/allotment_college_groups_2026.json"
output_file_public = r"public/assets/db/tnea/college/college group.json"

with open(output_file_etl, "w", encoding="utf-8") as f:
    json.dump(final_structure, f, indent=2)

with open(output_file_public, "w", encoding="utf-8") as f:
    json.dump(final_structure, f, indent=2)

tier_summary = defaultdict(lambda: {"count": 0, "cutoffs": []})
for c in ranked_colleges:
    tier_summary[c["tier"]]["count"] += 1
    tier_summary[c["tier"]]["cutoffs"].append(c["med_cutoff"])

print(f"Dynamic hybrid tiers generated (step={MAX_CUTOFF_STEP}, span={MAX_CUTOFF_SPAN})")
print(f"{'Tier':<6} {'Colleges':<10} {'MedCutoff Range'}")
for t in sorted(tier_summary.keys()):
    cutoffs = tier_summary[t]["cutoffs"]
    print(f"  {t:<6} {tier_summary[t]['count']:<10} {min(cutoffs):.2f} - {max(cutoffs):.2f}")
print(f"\nTotal ranked: {len(ranked_colleges)}, Unranked (new): {len(unranked_colleges)}")
