import json
from collections import defaultdict

with open(r"etl/new/2025.json", "r", encoding="utf-8") as f:
    d25 = json.load(f)

with open(r"etl/new seats.json", "r", encoding="utf-8") as f:
    d26 = json.load(f)

with open(r"public/assets/db/tnea/college/tnea_2026.json", "r", encoding="utf-8") as f:
    ch = json.load(f)

added = set(ch.get("added", []))
removed = set(ch.get("removed", []))
merged_pairs = ch.get("merged", [])

merged_from_to = {m[0]: m[1] for m in merged_pairs}

communities = ["octl", "bctl", "bcmtl", "mbctl", "sctl", "scatl", "sttl"]

t25_comm = defaultdict(int)
t26_comm = defaultdict(int)

for r in d25:
    for c in communities:
        t25_comm[c] += r.get(c, 0)

for r in d26:
    for c in communities:
        t26_comm[c] += r.get(c, 0)

print("=== COMMUNITY-WISE SEAT COMPARISON ===")
print(f"{'Community':<12} | {'2025 Seats':<12} | {'2026 Seats':<12} | {'Change':<10} | {'% Change':<10}")
print("-" * 65)

for c in communities:
    comm_label = c.replace("tl", "").upper()
    v25 = t25_comm[c]
    v26 = t26_comm[c]
    diff = v26 - v25
    pct = (diff / v25 * 100) if v25 else 0
    print(f"{comm_label:<12} | {v25:<12} | {v26:<12} | {diff:<+10} | {pct:<+10.2f}%")

t25_tot = sum(t25_comm.values())
t26_tot = sum(t26_comm.values())
diff_tot = t26_tot - t25_tot
pct_tot = (diff_tot / t25_tot * 100) if t25_tot else 0
print("-" * 65)
print(f"{'TOTAL':<12} | {t25_tot:<12} | {t26_tot:<12} | {diff_tot:<+10} | {pct_tot:<+10.2f}%\n")


t25_br = defaultdict(int)
t26_br = defaultdict(int)
br_names = {}

for r in d25:
    brc = r.get("brc")
    brn = r.get("brn", brc)
    br_names[brc] = brn
    tot = sum(r.get(c, 0) for c in communities)
    t25_br[brc] += tot

for r in d26:
    brc = r.get("brc")
    brn = r.get("brn", brc)
    br_names[brc] = brn
    tot = sum(r.get(c, 0) for c in communities)
    t26_br[brc] += tot

all_branches = sorted(set(t25_br.keys()) | set(t26_br.keys()))

print("=== TOP BRANCHES WITH BIGGEST SEAT CHANGES ===")
print(f"{'Branch':<8} | {'Branch Name':<45} | {'2025':<8} | {'2026':<8} | {'Change':<8}")
print("-" * 85)

br_diffs = []
for b in all_branches:
    v25 = t25_br[b]
    v26 = t26_br[b]
    diff = v26 - v25
    br_diffs.append((b, br_names.get(b, b)[:45], v25, v26, diff))

br_diffs.sort(key=lambda x: abs(x[4]), reverse=True)

for b, name, v25, v26, diff in br_diffs[:20]:
    print(f"{b:<8} | {name:<45} | {v25:<8} | {v26:<8} | {diff:<+8}")


print("\n=== IMPACT OF ADDED / REMOVED / MERGED COLLEGES ===")

rem_seats = defaultdict(int)
for r in d25:
    coc = str(r.get("coc"))
    if coc in removed:
        for c in communities:
            rem_seats[c] += r.get(c, 0)

print("Seats lost from 13 Removed Colleges:")
for c in communities:
    comm_label = c.replace("tl", "").upper()
    print(f"  {comm_label}: {rem_seats[c]}")
print(f"  Total Lost: {sum(rem_seats.values())}\n")

add_seats = defaultdict(int)
for r in d26:
    coc = str(r.get("coc"))
    if coc in added:
        for c in communities:
            add_seats[c] += r.get(c, 0)

print("Seats added from 6 New Colleges:")
for c in communities:
    comm_label = c.replace("tl", "").upper()
    print(f"  {comm_label}: {add_seats[c]}")
print(f"  Total Added: {sum(add_seats.values())}\n")

print("Merged Colleges Analysis:")
for m_from, m_to in merged_pairs:
    s25_from = sum(sum(r.get(c, 0) for c in communities) for r in d25 if str(r.get("coc")) == m_from)
    s25_to = sum(sum(r.get(c, 0) for c in communities) for r in d25 if str(r.get("coc")) == m_to)
    s26_to = sum(sum(r.get(c, 0) for c in communities) for r in d26 if str(r.get("coc")) == m_to)
    print(f"  {m_from} -> {m_to}: 2025 ({m_from}: {s25_from}, {m_to}: {s25_to}) -> 2026 ({m_to}: {s26_to}) | Net change for merged entity: {s26_to - (s25_from + s25_to):+d}")