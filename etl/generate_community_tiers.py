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

COMMUNITIES = ["OC", "BC", "BCM", "MBC", "SC", "SCA", "ST"]

comm_data = {c: defaultdict(lambda: {"cutoffs": [], "ranks": []}) for c in COMMUNITIES}

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
                comm = row["ALLOTTED COMMUNITY"].strip()
                if coc in merged_from_to:
                    coc = merged_from_to[coc]
                if comm in comm_data:
                    comm_data[comm][coc]["cutoffs"].append(cutoff)
                    comm_data[comm][coc]["ranks"].append(gr)
            except (ValueError, KeyError):
                continue

active_2026_cocs = set(str(r["coc"]) for r in d26_seats)

MAX_CUTOFF_STEP = 2.0
MAX_CUTOFF_SPAN = 5.0

os.makedirs(r"public/assets/db/tnea/college/groups", exist_ok=True)

for comm in COMMUNITIES:
    college_stats = {}
    for coc, d in comm_data[comm].items():
        if len(d["cutoffs"]) >= 2:
            college_stats[coc] = {
                "med_cutoff": statistics.median(d["cutoffs"]),
                "med_rank": statistics.median(d["ranks"])
            }

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

    current_tier = 1
    if ranked_colleges:
        group_start = ranked_colleges[0]["med_cutoff"]
        prev = ranked_colleges[0]["med_cutoff"]
        ranked_colleges[0]["tier"] = current_tier

        for i in range(1, len(ranked_colleges)):
            curr = ranked_colleges[i]["med_cutoff"]
            step = prev - curr
            span = group_start - curr

            if step <= MAX_CUTOFF_STEP and span <= MAX_CUTOFF_SPAN:
                ranked_colleges[i]["tier"] = current_tier
            else:
                current_tier += 1
                ranked_colleges[i]["tier"] = current_tier
                group_start = curr
            prev = curr

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

    out_etl = f"etl/college_groups_{comm.lower()}_2026.json"
    out_pub = f"public/assets/db/tnea/college/groups/{comm.lower()}.json"

    with open(out_etl, "w", encoding="utf-8") as f:
        json.dump(final_structure, f, indent=2)

    with open(out_pub, "w", encoding="utf-8") as f:
        json.dump(final_structure, f, indent=2)

    print(f"{comm}: {len(ranked_colleges)} ranked colleges, {current_tier} tiers -> {out_pub}")
