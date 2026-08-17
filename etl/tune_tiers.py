import json
import math
import statistics

with open(r"etl/college_groups_2026.json", "r", encoding="utf-8") as f:
    data = json.load(f)

ranked = [c for c in data if c["best_ocr"] is not None]
ranked.sort(key=lambda x: x["best_ocr"])

log_ranks = [math.log(c["best_ocr"]) for c in ranked]
gaps = [log_ranks[i+1] - log_ranks[i] for i in range(len(log_ranks)-1)]

print(f"Total Ranked Colleges: {len(ranked)}")
print(f"Sorted Best OCR range: {ranked[0]['best_ocr']} -> {ranked[-1]['best_ocr']}\n")

for window in [10, 15, 20]:
    for k_val in [1.2, 1.5, 1.8, 2.0]:
        boundaries = []
        for i in range(len(gaps)):
            lo = max(0, i - window)
            hi = min(len(gaps), i + window + 1)
            neigh = gaps[lo:hi]
            if len(neigh) < 3:
                continue
            med = statistics.median(neigh)
            sorted_neigh = sorted(neigh)
            q1 = sorted_neigh[len(sorted_neigh) // 4]
            q3 = sorted_neigh[(len(sorted_neigh) * 3) // 4]
            iqr = max(0.005, q3 - q1)

            thresh = med + (k_val * iqr)
            if gaps[i] >= thresh and gaps[i] > 0.04:
                boundaries.append(i)

        num_tiers = len(boundaries) + 1
        print(f"Window={window:2d} | K={k_val:.1f} -> Generated {num_tiers:2d} Tiers")

