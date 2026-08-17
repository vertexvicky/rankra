import json
import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#475569"))
        
        if self._pageNumber > 1:
            self.drawString(28, 814, "TNEA 2026 - Round 3 Vacancy Position (Rank-wise Sorted)")
            self.setFont("Helvetica", 7.5)
            self.drawRightString(567, 814, "Sorted by College Preference Tier / Rank")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(28, 808, 567, 808)
            
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.setFont("Helvetica", 7.5)
        self.drawRightString(567, 18, page_text)
        self.drawString(28, 18, "Source: TNEA Round 2 Allotment / Round 3 Vacancy Position - rankra.com")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(28, 27, 567, 27)
        
        self.restoreState()

def generate_pdf():
    r2_path = r"etl/cutoff/2026/round 2 vancancy.json"
    cg_path = r"etl/college_groups_2026.json"
    n2025_path = r"etl/new/2025.json"
    pdf_path = r"etl/cutoff/2026/round 3 vacancy.pdf"
    
    with open(r2_path, "r", encoding="utf-8") as f:
        r2_data = json.load(f)
        
    cnames_2025 = {}
    bnames_2025 = {}
    if os.path.exists(n2025_path):
        with open(n2025_path, "r", encoding="utf-8") as f:
            n2025_data = json.load(f)
            for item in n2025_data:
                coc_str = str(item["coc"]).strip()
                cnames_2025[coc_str] = " ".join(item["con"].split())
                brc_str = str(item["brc"]).strip()
                bnames_2025[brc_str] = " ".join(item["brn"].split())

    college_ranks = {}
    if os.path.exists(cg_path):
        with open(cg_path, "r", encoding="utf-8") as f:
            cg_data = json.load(f)
            for grp_key, grp_list in cg_data.items():
                for item in grp_list:
                    coc_code = str(item[0]).strip()
                    rank_val = item[1]
                    college_ranks[coc_code] = rank_val

    colleges_dict = {}

    for pt in r2_data.get("pageTables", []):
        tables = pt.get("tables", [])
        if not tables:
            continue
        for row in tables[1:]:
            if len(row) < 11:
                continue
            coc = row[0].strip()
            if not coc:
                continue
            r2_con = " ".join(row[1].split())
            brc = row[2].strip()
            r2_brn = " ".join(row[3].split())
            
            con = cnames_2025.get(coc, r2_con)
            brn = bnames_2025.get(brc, r2_brn)
            
            try:
                oc_vac = int(row[4].strip())
                bc_vac = int(row[5].strip())
                bcm_vac = int(row[6].strip())
                mbc_vac = int(row[7].strip())
                sc_vac = int(row[8].strip())
                sca_vac = int(row[9].strip())
                st_vac = int(row[10].strip())
            except ValueError:
                continue
                
            tot_vac = oc_vac + bc_vac + bcm_vac + mbc_vac + sc_vac + sca_vac + st_vac
            
            if tot_vac == 0:
                continue
            
            if coc not in colleges_dict:
                colleges_dict[coc] = {
                    "coc": coc,
                    "con": con,
                    "branches": []
                }
            
            colleges_dict[coc]["branches"].append({
                "brc": brc,
                "brn": brn,
                "oc": oc_vac,
                "bc": bc_vac,
                "bcm": bcm_vac,
                "mbc": mbc_vac,
                "sc": sc_vac,
                "sca": sca_vac,
                "st": st_vac,
                "tot": tot_vac
            })

    def get_sort_key(coc_code):
        r = college_ranks.get(coc_code)
        if r is not None:
            return (0, int(r), int(coc_code) if coc_code.isdigit() else 9999)
        else:
            return (1, 999999, int(coc_code) if coc_code.isdigit() else 9999)

    sorted_cocs = sorted(colleges_dict.keys(), key=get_sort_key)

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=28,
        rightMargin=28,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=colors.HexColor('#0f172a'),
        alignment=1,
        spaceAfter=3
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#475569'),
        alignment=1,
        spaceAfter=8
    )
    
    college_header_style = ParagraphStyle(
        'CollegeHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#0f2942')
    )
    
    cell_hdr_style = ParagraphStyle(
        'TableHeadCell',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7,
        leading=8.5,
        textColor=colors.HexColor('#ffffff'),
        alignment=1
    )
    
    cell_brc_style = ParagraphStyle(
        'TableBrcCell',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor('#0f172a'),
        alignment=1
    )
    
    cell_brn_style = ParagraphStyle(
        'TableBrnCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=8.5,
        textColor=colors.HexColor('#1e293b')
    )
    
    cell_num_style = ParagraphStyle(
        'TableNumCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor('#0f172a'),
        alignment=1
    )
    
    cell_tot_style = ParagraphStyle(
        'TableTotCell',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor('#b91c1c'),
        alignment=1
    )

    story = []
    
    story.append(Paragraph("TNEA 2026 - ROUND 3 VACANCY MATRIX", title_style))
    story.append(Paragraph(f"Colleges Sorted by Preference Rank (from college_groups_2026.json) | Showing Available Seats Only | Total Colleges: {len(sorted_cocs)}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0284c7"), spaceAfter=6))

    usable_width = 539.0
    col_widths = [32, 217, 36, 36, 36, 36, 36, 36, 34, 40]

    for coc in sorted_cocs:
        cdata = colleges_dict[coc]
        c_name = cdata["con"]
        branches = cdata["branches"]
        rank_val = college_ranks.get(coc)
        rank_tag = f"[Rank #{rank_val}]" if rank_val is not None else "[Unranked]"
        
        college_title_text = f"<b>{rank_tag} &nbsp; {coc} - {c_name}</b>"
        c_title_para = Paragraph(college_title_text, college_header_style)
        
        c_title_table = Table([[c_title_para]], colWidths=[usable_width])
        c_title_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#e2e8f0')),
            ('PADDING', (0,0), (-1,-1), 3.5),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
            ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#94a3b8')),
        ]))
        
        table_data = [
            [
                Paragraph("Branch", cell_hdr_style),
                Paragraph("Branch Name", cell_hdr_style),
                Paragraph("OC", cell_hdr_style),
                Paragraph("BC", cell_hdr_style),
                Paragraph("BCM", cell_hdr_style),
                Paragraph("MBC", cell_hdr_style),
                Paragraph("SC", cell_hdr_style),
                Paragraph("SCA", cell_hdr_style),
                Paragraph("ST", cell_hdr_style),
                Paragraph("Total", cell_hdr_style),
            ]
        ]
        
        for b in branches:
            table_data.append([
                Paragraph(b["brc"], cell_brc_style),
                Paragraph(b["brn"], cell_brn_style),
                Paragraph(str(b["oc"]), cell_num_style),
                Paragraph(str(b["bc"]), cell_num_style),
                Paragraph(str(b["bcm"]), cell_num_style),
                Paragraph(str(b["mbc"]), cell_num_style),
                Paragraph(str(b["sc"]), cell_num_style),
                Paragraph(str(b["sca"]), cell_num_style),
                Paragraph(str(b["st"]), cell_num_style),
                Paragraph(str(b["tot"]), cell_tot_style),
            ])
            
        t = Table(table_data, colWidths=col_widths, repeatRows=1)
        t_style = [
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#cbd5e1')),
            ('BOX', (0, 0), (-1, -1), 0.6, colors.HexColor('#94a3b8')),
        ]
        for row_idx in range(1, len(table_data)):
            bg_color = colors.HexColor('#f8fafc') if row_idx % 2 == 1 else colors.HexColor('#ffffff')
            t_style.append(('BACKGROUND', (0, row_idx), (-1, row_idx), bg_color))
            
        t.setStyle(TableStyle(t_style))
        
        college_flowables = [
            Spacer(1, 4),
            c_title_table,
            t,
            Spacer(1, 4)
        ]
        
        if len(branches) <= 5:
            story.append(KeepTogether(college_flowables))
        else:
            for item in college_flowables:
                story.append(item)
                
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated: {pdf_path}")

if __name__ == '__main__':
    generate_pdf()
