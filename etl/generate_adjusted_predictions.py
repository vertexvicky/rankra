import json
import csv
from collections import defaultdict

with open(r"etl/new/2025.json", "r", encoding="utf-8") as f:
    d25 = json.load(f)

with open(r"etl/new seats.json", "r", encoding="utf-8") as f:
    d26_seats = json.load(f)

with open(r"public/assets/db/tnea/college/tnea_2026.json", "r", encoding="utf-8") as f:
    changes = json.load(f)

with open(r"etl/new coc.json", "r", encoding="utf-8") as f:
    new_coc_map = json.load(f)

removed_colleges = set(changes.get("removed", []))
for m in changes.get("merged", []):
    removed_colleges.add(m[0])

seat26_lookup = {}
for r in d26_seats:
    seat26_lookup[(str(r["coc"]), r["brc"])] = r

comm_keys = {
    "OC": ("octl", "oc_cr", "OC"),
    "BC": ("bctl", "bc_cr", "BC"),
    "BCM": ("bcmtl", "bcm_cr", "BCM"),
    "MBC": ("mbctl", "mbc_cr", "MBC"),
    "SC": ("sctl", "sc_cr", "SC"),
    "SCA": ("scatl", "sca_cr", "SCA"),
    "ST": ("sttl", "st_cr", "ST"),
}

cr26_cutoff_map = defaultdict(dict)
with open(r"etl/ranklist/2026.csv", "r", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        if row["community_rank"].isdigit():
            cr26_cutoff_map[row["community"]][int(row["community_rank"])] = float(row["cutoff"])

cr26_sorted_ranks = {comm: sorted(cr26_cutoff_map[comm].keys()) for comm in cr26_cutoff_map}

def get_cutoff_for_cr26(comm, target_cr):
    ranks = cr26_sorted_ranks.get(comm, [])
    if not ranks: return None
    mapping = cr26_cutoff_map[comm]
    
    if target_cr <= ranks[0]: return mapping[ranks[0]]
    if target_cr >= ranks[-1]: return mapping[ranks[-1]]
    
    for i in range(len(ranks)-1):
        if ranks[i] <= target_cr <= ranks[i+1]:
            r1, r2 = ranks[i], ranks[i+1]
            c1, c2 = mapping[r1], mapping[r2]
            if r1 == r2: return c1
            t = (target_cr - r1) / (r2 - r1)
            return round(c1 + t * (c2 - c1), 2)
    return None

choices_2025 = {}
for r in d25:
    coc = str(r["coc"])
    brc = r["brc"]
    key = (coc, brc)
    
    if key not in choices_2025:
        choices_2025[key] = {
            "coc": coc,
            "con": new_coc_map.get(coc, r.get("con", "")),
            "brc": brc,
            "brn": r.get("brn", ""),
            "code": f"{coc} {brc}",
            "district": r.get("district", ""),
            "types": r.get("types", []),
            "type": r.get("type", ""),
            "2025_seats": {comm: 0 for comm in comm_keys},
            "2025_cr": {comm: [] for comm in comm_keys}
        }
    
    for comm, (tl_key, cr_key, _) in comm_keys.items():
        if r.get(tl_key) is not None:
            choices_2025[key]["2025_seats"][comm] += int(r.get(tl_key) or 0)
        
        cr_val = r.get(cr_key)
        if cr_val is not None and str(cr_val).isdigit():
            choices_2025[key]["2025_cr"][comm].append(int(cr_val))

for r in d26_seats:
    coc = str(r["coc"])
    brc = r["brc"]
    key = (coc, brc)
    if key not in choices_2025:
        choices_2025[key] = {
            "coc": coc,
            "con": new_coc_map.get(coc, r.get("con", "")),
            "brc": brc,
            "brn": r.get("brn", ""),
            "code": f"{coc} {brc}",
            "district": r.get("district", ""),
            "types": [],
            "type": "",
            "2025_seats": {comm: 0 for comm in comm_keys},
            "2025_cr": {comm: [] for comm in comm_keys}
        }

active_predictions = []
for key, data in choices_2025.items():
    coc, brc = key
    s26_row = seat26_lookup.get(key)
    if coc in removed_colleges:
        s26_row = None
        
    for comm, (tl_key, cr_key, _) in comm_keys.items():
        s25 = data["2025_seats"][comm]
        s26 = s26_row.get(tl_key, 0) if s26_row else 0
        data[f"{comm}_seats"] = [s25, s26]
        
        ranks = data["2025_cr"][comm]
        best_cr25 = min(ranks) if ranks else None
        data[f"{comm}_cr"] = best_cr25

    active_predictions.append(data)

for comm, (tl_key, cr_key, _) in comm_keys.items():
    for choice in active_predictions:
        choice[f"{comm}_sort_cr"] = choice.get(f"{comm}_cr")

    valid_for_comm = [x for x in active_predictions if x.get(f"{comm}_sort_cr") is not None]
    valid_for_comm.sort(key=lambda x: x[f"{comm}_sort_cr"])
    
    cum_delta = 0
    for choice in valid_for_comm:
        s25, s26 = choice[f"{comm}_seats"]
        delta = s26 - s25
        cum_delta += delta
        
        cr25_orig = choice.get(f"{comm}_cr")
        cr25_sort = choice.get(f"{comm}_sort_cr")
        
        if s26 == 0:
            choice[f"{comm}_pred"] = [cr25_orig, None]
            choice[f"{comm}_cutoff_pred"] = None
        elif s25 == 0 or cr25_orig is None:
            choice[f"{comm}_pred"] = [None, None]
            choice[f"{comm}_cutoff_pred"] = None
        else:
            pred_cr26 = max(1, cr25_sort + cum_delta)
            choice[f"{comm}_pred"] = [cr25_orig, pred_cr26]
            choice[f"{comm}_cutoff_pred"] = get_cutoff_for_cr26(comm, pred_cr26)

final_output = []
for data in active_predictions:
    if sum(data[f"{comm}_seats"][1] for comm in comm_keys) == 0:
        continue

    out = {
        "coc": data["coc"],
        "con": data["con"],
        "brc": data["brc"],
        "brn": data["brn"],
        "code": data["code"],
        "district": data["district"]
    }
    
    for comm, (tl_key, cr_key, _) in comm_keys.items():
        out[tl_key] = data[f"{comm}_seats"]
        
        if f"{comm}_pred" in data:
            out[cr_key] = data[f"{comm}_pred"]
        else:
            out[cr_key] = [None, None]
            
    con_text = str(data.get("con", "")).lower()
    types_list = [t for t in data.get("types", [])]
    type_str = str(data.get("type", ""))
    
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
                
    out["types"] = types_list
    out["type"] = type_str
    
    final_output.append(out)

with open("etl/predicted_choices_2026.json", "w", encoding="utf-8") as f:
    json.dump(final_output, f, indent=2)

print("Successfully updated etl/predicted_choices_2026.json setting newly added colleges prediction to null!")