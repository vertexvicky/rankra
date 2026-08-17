import json
import csv
from collections import defaultdict

with open(r"etl/new/2025.json", "r", encoding="utf-8") as f:
    d25 = json.load(f)

with open(r"etl/new seats.json", "r", encoding="utf-8") as f:
    d26_seats = json.load(f)

with open(r"public/assets/db/tnea/college/tnea_2026.json", "r", encoding="utf-8") as f:
    changes = json.load(f)

removed = set(changes["removed"])
added = set(changes["added"])
merged_pairs = changes["merged"]
merged_from_to = {m[0]: m[1] for m in merged_pairs}
merged_to_from = {m[1]: m[0] for m in merged_pairs}

seat26_map = {}
for r in d26_seats:
    seat26_map[(str(r["coc"]), r["brc"])] = r

cr25_lookup = defaultdict(dict)
with open(r"etl/ranklist/2025.csv", "r", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        if row["community_rank"].isdigit():
            cr25_lookup[row["community"]][int(row["general_rank"])] = int(row["community_rank"])

COMM_SK = {
    "OC": ("octl", "ocr"),
    "BC": ("bctl", "bcr"),
    "BCM": ("bcmtl", "bcmr"),
    "MBC": ("mbctl", "mbcr"),
    "SC": ("sctl", "scr"),
    "SCA": ("scatl", "scar"),
    "ST": ("sttl", "str"),
}


def seat_adjust_for_community(comm):
    sk, rk = COMM_SK[comm]

    choices = []
    for r in d25:
        gen_rank_str = r.get(rk)
        if not gen_rank_str or not str(gen_rank_str).strip().isdigit():
            continue
        gen_rank = int(gen_rank_str)
        cr = cr25_lookup.get(comm, {}).get(gen_rank)
        if cr is None:
            continue

        seats_25 = r.get(sk, 0) or 0
        key = (str(r["coc"]), r["brc"])
        s26_row = seat26_map.get(key)
        seats_26 = s26_row.get(sk, 0) if s26_row else 0

        coc_str = str(r["coc"])
        status = ""
        if coc_str in removed:
            seats_26 = 0
            status = "REMOVED"
        elif coc_str in merged_from_to:
            seats_26 = 0
            status = f"MERGED->{merged_from_to[coc_str]}"

        choices.append({
            "coc": coc_str,
            "brc": r["brc"],
            "brn": r.get("brn", "")[:30],
            "con": r.get("con", "").split("\n")[0][:30],
            "cr_25": cr,
            "seats_25": seats_25,
            "seats_26": seats_26,
            "seat_delta": seats_26 - seats_25,
            "status": status,
        })

    choices.sort(key=lambda x: x["cr_25"])

    cum_25 = 0
    cum_26 = 0
    for c in choices:
        cum_25 += c["seats_25"]
        cum_26 += c["seats_26"]
        c["cum_seats_25"] = cum_25
        c["cum_seats_26"] = cum_26
        c["cum_delta"] = cum_26 - cum_25
        c["adj_cr_26"] = max(1, c["cr_25"] + (cum_26 - cum_25))

    return choices


print("=" * 120)
print("PART 1: SEAT ADJUSTMENT CASCADE (per community)")
print("=" * 120)

for comm in ["OC", "BC", "MBC", "SC", "BCM", "SCA", "ST"]:
    choices = seat_adjust_for_community(comm)

    print(f"\n{'='*20} {comm} — {len(choices)} choices {'='*20}")
    print(f"{'#':<5} {'Code':<10} {'Branch':<8} {'2025 CR':<9} {'S25':<5} {'S26':<5} {'Δ':<5} {'CumS25':<7} {'CumS26':<7} {'CumΔ':<7} {'Adj CR26':<9} {'Status'}")
    print("-" * 110)

    show_top = 10
    show_removed = [c for c in choices if c["status"]][:5]

    for i, c in enumerate(choices[:show_top]):
        print(f"{i+1:<5} {c['coc']:<10} {c['brc']:<8} {c['cr_25']:<9} {c['seats_25']:<5} {c['seats_26']:<5} {c['seat_delta']:<+5} {c['cum_seats_25']:<7} {c['cum_seats_26']:<7} {c['cum_delta']:<+7} {c['adj_cr_26']:<9} {c['status']}")

    if show_removed:
        print(f"  --- Choices with REMOVED/MERGED status ---")
        for c in show_removed:
            idx = choices.index(c)
            print(f"{idx+1:<5} {c['coc']:<10} {c['brc']:<8} {c['cr_25']:<9} {c['seats_25']:<5} {c['seats_26']:<5} {c['seat_delta']:<+5} {c['cum_seats_25']:<7} {c['cum_seats_26']:<7} {c['cum_delta']:<+7} {c['adj_cr_26']:<9} {c['status']}")

    mid = len(choices) // 4
    print(f"  --- Mid tier sample (around #{mid}) ---")
    for c in choices[mid:mid+3]:
        idx = choices.index(c)
        print(f"{idx+1:<5} {c['coc']:<10} {c['brc']:<8} {c['cr_25']:<9} {c['seats_25']:<5} {c['seats_26']:<5} {c['seat_delta']:<+5} {c['cum_seats_25']:<7} {c['cum_seats_26']:<7} {c['cum_delta']:<+7} {c['adj_cr_26']:<9} {c['status']}")

    tail = len(choices) - 3
    print(f"  --- Bottom tier (last 3, around #{tail}) ---")
    for c in choices[-3:]:
        idx = choices.index(c)
        print(f"{idx+1:<5} {c['coc']:<10} {c['brc']:<8} {c['cr_25']:<9} {c['seats_25']:<5} {c['seats_26']:<5} {c['seat_delta']:<+5} {c['cum_seats_25']:<7} {c['cum_seats_26']:<7} {c['cum_delta']:<+7} {c['adj_cr_26']:<9} {c['status']}")


print("\n\n")
print("=" * 120)
print("PART 2: COLLEGE TIER GROUPING (based on highest OC cutoff in 2025)")
print("=" * 120)

college_best_oc = {}
college_name = {}

for r in d25:
    coc = str(r["coc"])
    oc_val = r.get("OC")
    if oc_val is None or oc_val == "":
        continue
    oc_val = float(oc_val)
    con = r.get("con", "").split("\n")[0]

    if coc not in college_best_oc or oc_val > college_best_oc[coc]:
        college_best_oc[coc] = oc_val
        college_name[coc] = con

for m_from, m_to in merged_pairs:
    if m_from in college_best_oc:
        from_val = college_best_oc[m_from]
        to_val = college_best_oc.get(m_to, 0)
        college_best_oc[m_to] = max(from_val, to_val)
        if from_val > to_val:
            college_name[m_to] = college_name.get(m_from, college_name.get(m_to, ""))

active_2026 = set()
for r in d26_seats:
    active_2026.add(str(r["coc"]))

ranked_colleges = []
for coc in active_2026:
    if coc in removed:
        continue
    best_oc = college_best_oc.get(coc)
    name = college_name.get(coc, "NEW COLLEGE")
    is_new = coc in added
    if best_oc is None and not is_new:
        continue
    ranked_colleges.append({
        "coc": coc,
        "name": name,
        "best_oc": best_oc if best_oc else 0,
        "is_new": is_new,
    })

ranked_colleges.sort(key=lambda x: (-x["best_oc"], x["coc"]))

tier_boundaries = [
    (200.0, 198.0, "TIER 1 — Elite"),
    (197.5, 195.0, "TIER 2 — Top"),
    (194.5, 190.0, "TIER 3 — Very Good"),
    (189.5, 185.0, "TIER 4 — Good"),
    (184.5, 180.0, "TIER 5 — Above Avg"),
    (179.5, 175.0, "TIER 6 — Average+"),
    (174.5, 170.0, "TIER 7 — Average"),
    (169.5, 160.0, "TIER 8 — Below Avg"),
    (159.5, 140.0, "TIER 9 — Low"),
    (139.5, 0.0,   "TIER 10 — Lowest"),
]

def get_tier(oc):
    for hi, lo, label in tier_boundaries:
        if lo <= oc <= hi:
            return label
    return "TIER 10 — Lowest"

current_tier = ""
tier_count = 0
college_rank = 0

print(f"\n{'Rank':<6} {'Code':<7} {'Best OC':<9} {'Tier':<22} {'College Name':<55} {'Note'}")
print("-" * 120)

for c in ranked_colleges:
    college_rank += 1
    tier = get_tier(c["best_oc"]) if not c["is_new"] else "NEW (no 2025 data)"
    note = ""
    if c["is_new"]:
        note = "⭐ NEW 2026"
    if c["coc"] in merged_to_from:
        note = f"⬅ MERGED FROM {merged_to_from[c['coc']]}"

    if tier != current_tier:
        current_tier = tier
        tier_count = 0
        print(f"  ─── {tier} ───")
    tier_count += 1

    print(f"{college_rank:<6} {c['coc']:<7} {c['best_oc']:<9.1f} {tier:<22} {c['name'][:55]:<55} {note}")


print(f"\n\nTotal colleges ranked for 2026: {college_rank}")
print(f"  New (no 2025 data): {sum(1 for c in ranked_colleges if c['is_new'])}")
print(f"  With merged predecessor: {len(merged_pairs)}")


print("\n\n")
print("=" * 120)
print("PART 3: EXAMPLE — How a student should use tier groups for choice filling")
print("=" * 120)

tier1_colleges = [c for c in ranked_colleges if not c["is_new"] and get_tier(c["best_oc"]) == "TIER 1 — Elite"]
tier2_colleges = [c for c in ranked_colleges if not c["is_new"] and get_tier(c["best_oc"]) == "TIER 2 — Top"]

hot_courses = ["CS", "CM", "AD", "IT", "EC"]

print(f"\nTier 1 Colleges: {', '.join(c['coc'] for c in tier1_colleges[:8])}")
print(f"Tier 2 Colleges: {', '.join(c['coc'] for c in tier2_colleges[:8])}")
print(f"Hot Courses: {', '.join(hot_courses)}")
print("\nSuggested Choice Order (Tier-then-Course strategy):")
print("-" * 60)

choice_num = 0
for course in hot_courses:
    for clg in tier1_colleges[:6]:
        choice_num += 1
        print(f"  #{choice_num:>3}  {clg['coc']} {course}  ({clg['name'][:40]})")
    if choice_num >= 18:
        break

print(f"  ... then same courses across Tier 2 colleges ...")
for course in hot_courses[:2]:
    for clg in tier2_colleges[:4]:
        choice_num += 1
        print(f"  #{choice_num:>3}  {clg['coc']} {course}  ({clg['name'][:40]})")

print(f"\n  ... then remaining courses in Tier 1, then Tier 2, then Tier 3, etc.")
print(f"\nWithout grouping, a student might do: CEG CS → CEG MECH → CEG CIVIL (staying in one college)")
print(f"With tier grouping: CEG CS → MIT CS → CIT CS → CEG ECE → MIT ECE → ... (best course across peer colleges)")
