import json
import csv
from collections import defaultdict
import os

# Define community keys for general rank from 2025.json
comm_keys_gr = {
    "oc_cr": "ocr",
    "bc_cr": "bcr",
    "bcm_cr": "bcmr",
    "mbc_cr": "mbcr",
    "sc_cr": "scr",
    "sca_cr": "scar",
    "st_cr": "str",
}

# Define mapping from JSON key to CSV community string
json_to_csv_comm = {
    "oc_cr": "OC",
    "bc_cr": "BC",
    "bcm_cr": "BCM",
    "mbc_cr": "MBC",
    "sc_cr": "SC",
    "sca_cr": "SCA",
    "st_cr": "ST",
}

print("Loading 2026 ranklist to build CR -> GR mapping...")
cr26_to_gr26 = defaultdict(dict)
with open(r"etl/ranklist/2026.csv", "r", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        if row["community_rank"].isdigit() and row["general_rank"].isdigit():
            cr = int(row["community_rank"])
            gr = int(row["general_rank"])
            comm = row["community"]
            cr26_to_gr26[comm][cr] = gr

# Sort keys for interpolation/extrapolation if needed
cr26_sorted_keys = {comm: sorted(cr26_to_gr26[comm].keys()) for comm in cr26_to_gr26}

def get_gr26_for_cr26(comm, target_cr):
    ranks = cr26_sorted_keys.get(comm, [])
    if not ranks: return None
    mapping = cr26_to_gr26[comm]
    
    if target_cr <= ranks[0]: return mapping[ranks[0]]
    if target_cr >= ranks[-1]: return mapping[ranks[-1]]
    
    # If exact match exists
    if target_cr in mapping:
        return mapping[target_cr]
        
    # Interpolation
    for i in range(len(ranks)-1):
        if ranks[i] <= target_cr <= ranks[i+1]:
            r1, r2 = ranks[i], ranks[i+1]
            g1, g2 = mapping[r1], mapping[r2]
            if r1 == r2: return g1
            t = (target_cr - r1) / (r2 - r1)
            return int(round(g1 + t * (g2 - g1)))
    return None

print("Loading 2025.json...")
with open(r"etl/new/2025.json", "r", encoding="utf-8") as f:
    d25 = json.load(f)

# Build a lookup for 2025 general ranks
gr25_lookup = {}
for r in d25:
    key = (str(r["coc"]), str(r["brc"]))
    gr25_lookup[key] = r

print("Loading pred2026.json...")
pred_file_path = r"public/assets/db/tnea/cutoff/pred2026.json"
if not os.path.exists(pred_file_path):
    pred_file_path = r"public/assets/db/tnea/pred2026.json" # Fallback

with open(pred_file_path, "r", encoding="utf-8") as f:
    predictions = json.load(f)

print("Updating predictions...")
for pred in predictions:
    coc = str(pred["coc"])
    brc = str(pred["brc"])
    key = (coc, brc)
    
    d25_entry = gr25_lookup.get(key, {})
    
    for cr_key, gr_key in comm_keys_gr.items():
        if cr_key in pred:
            val = pred[cr_key]
            # Val should be [2025_cr, 2026_cr]
            if isinstance(val, list) and len(val) >= 2:
                cr25 = val[0]
                cr26 = val[1]
                
                gr25 = d25_entry.get(gr_key)
                if gr25 is not None and str(gr25).isdigit():
                    gr25 = int(gr25)
                else:
                    gr25 = None
                    
                gr26 = None
                if cr26 is not None:
                    comm = json_to_csv_comm[cr_key]
                    if comm == "OC":
                        # For OC, community rank IS general rank
                        gr26 = cr26
                    else:
                        gr26 = get_gr26_for_cr26(comm, cr26)
                        
                # Ensure we only have [cr25, cr26, gr25, gr26]
                new_val = [cr25, cr26, gr25, gr26]
                pred[cr_key] = new_val

print(f"Saving updated predictions to {pred_file_path}...")
with open(pred_file_path, "w", encoding="utf-8") as f:
    json.dump(predictions, f, separators=(',', ':'))

print("Done!")
