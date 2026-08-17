import json
import csv
from collections import defaultdict

with open(r"etl/new/2025.json", "r", encoding="utf-8") as f:
    d25 = json.load(f)

with open(r"etl/new seats.json", "r", encoding="utf-8") as f:
    d26 = json.load(f)

seat26_map = {}
for r in d26:
    seat26_map[(str(r["coc"]), r["brc"])] = r

cr25_lookup = {}
with open(r"etl/ranklist/2025.csv", "r", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        if row["community_rank"].isdigit():
            cr25_lookup[(row["community"], int(row["general_rank"]))] = int(row["community_rank"])

cr26_cutoff_lookup = defaultdict(dict)
with open(r"etl/ranklist/2026.csv", "r", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        if row["community_rank"].isdigit():
            cr26_cutoff_lookup[row["community"]][int(row["community_rank"])] = float(row["cutoff"])

def get_cutoff_for_cr26(comm, target_cr):
    mapping = cr26_cutoff_lookup[comm]
    if not mapping:
        return None
    if target_cr in mapping:
        return mapping[target_cr]
    
    ranks = sorted(mapping.keys())
    if target_cr <= ranks[0]:
        return mapping[ranks[0]]
    if target_cr >= ranks[-1]:
        return mapping[ranks[-1]]
    
    for i in range(len(ranks)-1):
        if ranks[i] <= target_cr <= ranks[i+1]:
            r1, r2 = ranks[i], ranks[i+1]
            c1, c2 = mapping[r1], mapping[r2]
            t = (target_cr - r1) / (r2 - r1)
            return round(c1 + t * (c2 - c1), 2)
    return None

def analyze_community_cascade(comm, comm_sk, comm_rank_key, top_n=15):
    valid_choices = []
    for r in d25:
        gen_rank_str = r.get(comm_rank_key)
        if gen_rank_str and gen_rank_str.isdigit():
            gen_rank = int(gen_rank_str)
            cr25 = cr25_lookup.get((comm, gen_rank))
            if cr25 is not None:
                valid_choices.append({
                    "coc": str(r["coc"]),
                    "brc": r["brc"],
                    "con": r["con"].split("\n")[0][:35],
                    "brn": r["brn"][:25],
                    "cutoff_25": float(r.get(comm, 0) or 0),
                    "gen_rank_25": gen_rank,
                    "cr_25": cr25,
                    "seats_25": r.get(comm_sk, 0)
                })
    
    valid_choices.sort(key=lambda x: x["cr_25"])
    
    cum25 = 0
    cum26 = 0
    
    results = []
    for item in valid_choices:
        key = (item["coc"], item["brc"])
        s26_row = seat26_map.get(key)
        seats_26 = s26_row.get(comm_sk, 0) if s26_row else 0
        
        cum25 += item["seats_25"]
        cum26 += seats_26
        
        seat_delta = seats_26 - item["seats_25"]
        cum_delta = cum26 - cum25
        
        est_cr26 = max(1, item["cr_25"] + cum_delta)
        est_cutoff26 = get_cutoff_for_cr26(comm, est_cr26)
        
        results.append({
            "coc": item["coc"],
            "brc": item["brc"],
            "name": f"{item['coc']} {item['brc']} ({item['con']})",
            "cr_25": item["cr_25"],
            "cutoff_25": item["cutoff_25"],
            "seats_25": item["seats_25"],
            "seats_26": seats_26,
            "cum_delta": cum_delta,
            "est_cr26": est_cr26,
            "est_cutoff26": est_cutoff26
        })
        
    print(f"\n==================== CASCADE ANALYSIS: {comm} (Top Choice Sample) ====================")
    print(f"{'Code':<8} | {'2025 Cutoff':<11} | {'2025 CR':<9} | {'25 Seats':<8} | {'26 Seats':<8} | {'Cum Delta':<9} | {'Est 26 CR':<9} | {'Est 26 Cutoff':<13}")
    print("-" * 105)
    
    for r in results[:top_n]:
        print(f"{r['coc']+' '+r['brc']:<8} | {r['cutoff_25']:<11.2f} | {r['cr_25']:<9} | {r['seats_25']:<8} | {r['seats_26']:<8} | {r['cum_delta']:<+9} | {r['est_cr26']:<9} | {r['est_cutoff26']:<13}")

    sample_mid = len(results) // 4
    print(f"\n--- Mid Tier Sample (Around rank {results[sample_mid]['cr_25']}) ---")
    for r in results[sample_mid:sample_mid+5]:
        print(f"{r['coc']+' '+r['brc']:<8} | {r['cutoff_25']:<11.2f} | {r['cr_25']:<9} | {r['seats_25']:<8} | {r['seats_26']:<8} | {r['cum_delta']:<+9} | {r['est_cr26']:<9} | {r['est_cutoff26']:<13}")

analyze_community_cascade("BC", "bctl", "bcr")
analyze_community_cascade("MBC", "mbctl", "mbcr")
