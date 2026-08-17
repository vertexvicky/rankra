from os import name
import json
#j = json.load(open(r"2026 seat matrix.json","r"))
#json.dump(j,open(r"public\assets\2026 seat matrix.json","w"),indent=2)

def coc():
    t = {}
    for page in j["pageTables"]:
        for row in page["tables"]:
            try:
                t[int((row[0]).strip().replace("\n"," "))] = str(row[1]).strip()
            except ValueError:
                continue
    t = dict(sorted(t.items()))
    json.dump(t,open(r"new coc.json","w"),indent=2)

def seats():
    t = []
    for page in j["pageTables"]:
        for row in page["tables"]:
            try:
                coc = int(row[0].strip())
                brc = str(row[2].strip().replace("\n"," "))
                brn = str(row[3].strip().replace("\n"," "))
                oc = int(row[4].strip())
                bc = int(row[5].strip())
                bcm = int(row[6].strip())
                mbc = int(row[7].strip())
                sc = int(row[8].strip())
                sca = int(row[9].strip())
                st = int(row[10].strip())
                t.append({
                    "coc":coc,
                    "brc":brc,
                    "brn":brn,
                    "octl":oc,
                    "bctl":bc,
                    "bcmtl":bcm,
                    "mbctl":mbc,
                    "sctl":sc,
                    "scatl":sca,
                    "sttl":st
                })
            except ValueError:
                print(row)
    json.dump(t,open(r"new seats.json","w"),indent=2)

import csv

def rank_csv(year: int):
    with open(f"ranklist/{str(year)}.json", "r") as fi:
        d = json.load(fi)
    
    rows = []
    for page in d.get("pageTables", []):
        for row in page.get("tables", []):
            try:
                cutoff = float(row[2].strip())
                general_rank = int(row[3].strip())
                community = row[4].strip()
                community_rank = int(row[5].strip()) if len(row) > 5 and row[5].strip().isdigit() else row[5].strip() if len(row) > 5 else ""
                
                rows.append({
                    "general_rank": general_rank,
                    "cutoff": cutoff,
                    "community": community,
                    "community_rank": community_rank
                })
            except (ValueError, IndexError):
                continue
                
    with open(f"ranklist/{year}.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["general_rank", "cutoff", "community", "community_rank"])
        writer.writeheader()
        writer.writerows(rows)

        
rank_csv(2025)

#[["S NO ","APPLICATION\nNUMBER","AGGREGATE\nMARK","GENERAL\nRANK ","COMMUNITY ","COMMUNITY\nRANK"],["1 ","342026 ","200.000 ","1 ","BC ","1"],["2 ","303823 ","200.000 ","2 ","BC ","2"],["3 ","390698 ","200.000 ","3 ","BC ","3"],["4 ","435579 ","200.000 ","4 ","MBC ","1"],["5 ","295204 ","200.000 ","5 ","MBC ","2"],["6 ","271227 ","200.000 ","6 ","MBC ","3"],["7 ","291686 ","200.000 ","7 ","BC ","4