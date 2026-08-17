import csv
import json

cr_map = {}
comm_ranks_list = {}

with open("etl/ranklist/2025.csv", "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for r in reader:
        comm = r["community"]
        if r["community_rank"].isdigit() and r["general_rank"].isdigit():
            gr = int(r["general_rank"])
            cr = int(r["community_rank"])
            cr_map[(comm, gr)] = cr
            if comm not in comm_ranks_list:
                comm_ranks_list[comm] = []
            comm_ranks_list[comm].append((gr, cr))

for comm in comm_ranks_list:
    comm_ranks_list[comm].sort(key=lambda x: x[0])

def get_closest_cr(comm, gr):
    if (comm, gr) in cr_map:
        return cr_map[(comm, gr)]
    ranks = comm_ranks_list.get(comm, [])
    if not ranks:
        return None
    if gr <= ranks[0][0]:
        return ranks[0][1]
    if gr >= ranks[-1][0]:
        return ranks[-1][1]
    
    left = 0
    right = len(ranks) - 1
    best_cr = None
    min_diff = float("inf")
    while left <= right:
        mid = (left + right) // 2
        diff = abs(ranks[mid][0] - gr)
        if diff < min_diff:
            min_diff = diff
            best_cr = ranks[mid][1]
        if ranks[mid][0] < gr:
            left = mid + 1
        else:
            right = mid - 1
    return best_cr

with open("etl/new/2025.json", "r", encoding="utf-8") as f:
    data = json.load(f)

comm_rank_keys = {
    "OC": ("ocr", "oc_cr"),
    "BC": ("bcr", "bc_cr"),
    "BCM": ("bcmr", "bcm_cr"),
    "MBC": ("mbcr", "mbc_cr"),
    "SC": ("scr", "sc_cr"),
    "SCA": ("scar", "sca_cr"),
    "ST": ("str", "st_cr")
}

total_processed = len(data)
matched_counts = {comm_key: 0 for _, comm_key in comm_rank_keys.values()}
unresolved_counts = {comm_key: 0 for _, comm_key in comm_rank_keys.values()}

for item in data:
    for comm, (gen_key, comm_key) in comm_rank_keys.items():
        val = item.get(gen_key)
        if val and str(val).strip().isdigit():
            gr = int(str(val).strip())
            if comm == "OC":
                item[comm_key] = gr
                matched_counts[comm_key] += 1
            else:
                c_rank = get_closest_cr(comm, gr)
                item[comm_key] = c_rank
                if c_rank is not None:
                    matched_counts[comm_key] += 1
                else:
                    unresolved_counts[comm_key] += 1
        else:
            item[comm_key] = None

with open("etl/new/2025.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"Processed {total_processed} items.")
print("Matched counts:", matched_counts)
print("Unresolved counts:", unresolved_counts)
