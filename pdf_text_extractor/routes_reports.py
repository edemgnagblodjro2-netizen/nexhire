"""Export de rapports — génère PDF / Excel / Word / PowerPoint depuis une réponse agent."""
from __future__ import annotations

import io
import textwrap
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from auth import CurrentUser
from rbac import require_min_role

router = APIRouter(prefix="/api/agent", tags=["reports"])

BRAND_HEX   = "#818CF8"
NAVY_HEX    = "#0f172a"
GRAY_HEX    = "#64748b"
LIGHT_HEX   = "#f8faff"


class ExportRequest(BaseModel):
    question:   str = Field(..., min_length=1, max_length=2000)
    answer:     str = Field(..., min_length=1, max_length=20000)
    sources:    list[str] = []
    format:     Literal["pdf", "xlsx", "docx", "pptx"] = "pdf"
    title:      str | None = None
    conclusion: str | None = None


@router.post("/export")
def export_report(
    payload: ExportRequest,
    _user: CurrentUser = Depends(require_min_role("viewer")),
):
    title    = payload.title or _derive_title(payload.question)
    date_str = datetime.now().strftime("%d %B %Y à %H:%M")

    if payload.format == "pdf":
        return _export_pdf(title, date_str, payload)
    elif payload.format == "xlsx":
        return _export_excel(title, date_str, payload)
    elif payload.format == "docx":
        return _export_word(title, date_str, payload)
    elif payload.format == "pptx":
        return _export_pptx(title, date_str, payload)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _derive_title(question: str) -> str:
    q = question.strip()
    return (q[0].upper() + q[1:])[:80] if q else "Rapport"


def _filename(fmt: str) -> str:
    stamp = datetime.now().strftime("%Y%m%d-%H%M")
    return f"nexhire-rapport-{stamp}.{fmt}"


def _default_conclusion(payload: ExportRequest, date_str: str) -> str:
    srcs = ", ".join(s.upper() for s in payload.sources) if payload.sources else "—"
    return (
        f"Ce rapport a été généré automatiquement par Nexhire Enterprise Assistant "
        f"le {date_str} à partir des données extraites de : {srcs}.\n"
        "Les informations présentées sont confidentielles et destinées exclusivement "
        "aux personnes autorisées de votre organisation.\n"
        "Pour toute question ou suivi, contactez votre administrateur Nexhire."
    )


# ── PDF ───────────────────────────────────────────────────────────────────────

def _export_pdf(title: str, date_str: str, payload: ExportRequest) -> StreamingResponse:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.colors import HexColor
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2.5*cm, bottomMargin=2.5*cm,
    )

    BRAND  = HexColor(BRAND_HEX)
    NAVY   = HexColor(NAVY_HEX)
    GRAY   = HexColor(GRAY_HEX)
    LIGHT  = HexColor("#e2e8f0")

    s_brand  = ParagraphStyle("brand",  fontName="Helvetica-Bold", fontSize=24, textColor=NAVY, spaceAfter=2)
    s_title  = ParagraphStyle("title",  fontName="Helvetica-Bold", fontSize=16, textColor=NAVY, spaceAfter=6)
    s_date   = ParagraphStyle("date",   fontName="Helvetica",       fontSize=10, textColor=GRAY, spaceAfter=14)
    s_label  = ParagraphStyle("label",  fontName="Helvetica-Bold",  fontSize=9,  textColor=BRAND, spaceBefore=14, spaceAfter=4)
    s_body   = ParagraphStyle("body",   fontName="Helvetica",       fontSize=11, textColor=NAVY, leading=18, spaceAfter=4)
    s_footer = ParagraphStyle("footer", fontName="Helvetica",       fontSize=8,  textColor=GRAY, spaceBefore=16)

    conclusion = payload.conclusion or _default_conclusion(payload, date_str)
    story: list = []

    # ── EN-TÊTE ───────────────────────────────────────────────────────────────
    story.append(Paragraph(
        f'<font color="{NAVY_HEX}"><b>Nex</b></font><font color="{BRAND_HEX}"><b>hire</b></font>',
        s_brand,
    ))
    story.append(HRFlowable(color=BRAND, thickness=2, spaceAfter=6))
    story.append(Paragraph(title, s_title))
    story.append(Paragraph(f"Généré le {date_str}", s_date))
    if payload.sources:
        story.append(Paragraph("SOURCES CONSULTÉES", s_label))
        story.append(Paragraph(
            " &nbsp;·&nbsp; ".join(s.upper() for s in payload.sources),
            ParagraphStyle("src", fontName="Helvetica", fontSize=10, textColor=GRAY, spaceAfter=6),
        ))
    story.append(HRFlowable(color=LIGHT, thickness=1, spaceAfter=10))

    # ── CORPS ─────────────────────────────────────────────────────────────────
    story.append(Paragraph("QUESTION", s_label))
    story.append(Paragraph(payload.question.replace("\n", "<br/>"), s_body))
    story.append(Paragraph("RÉPONSE DE L'AGENT", s_label))
    story.append(HRFlowable(color=LIGHT, thickness=1, spaceAfter=6))
    for line in payload.answer.split("\n"):
        if line.strip():
            story.append(Paragraph(line.replace("&", "&amp;").replace("<", "&lt;"), s_body))

    # ── CONCLUSION ────────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.4*cm))
    story.append(HRFlowable(color=BRAND, thickness=1, spaceAfter=6))
    story.append(Paragraph("CONCLUSION", s_label))
    for line in conclusion.split("\n"):
        if line.strip():
            story.append(Paragraph(
                line.replace("&", "&amp;").replace("<", "&lt;"),
                ParagraphStyle("concl", fontName="Helvetica", fontSize=10, textColor=GRAY, leading=15, spaceAfter=4),
            ))
    story.append(Spacer(1, 0.4*cm))
    story.append(HRFlowable(color=LIGHT, thickness=1))
    story.append(Paragraph(
        f"Nexhire Enterprise Assistant &nbsp;·&nbsp; Confidentiel &nbsp;·&nbsp; {date_str}",
        s_footer,
    ))

    doc.build(story)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{_filename("pdf")}"'},
    )


# ── Excel ─────────────────────────────────────────────────────────────────────

def _export_excel(title: str, date_str: str, payload: ExportRequest) -> StreamingResponse:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    wb = Workbook()
    ws = wb.active
    ws.title = "Rapport"

    ws.column_dimensions["A"].width = 22
    ws.column_dimensions["B"].width = 90

    NAVY_XL  = "0F172A"
    BRAND_XL = "818CF8"
    GRAY_XL  = "64748B"
    SLATE_XL = "475569"

    def hdr(cell, text, bg, fg="FFFFFF", bold=True, sz=11):
        cell.value = text
        cell.font = Font(bold=bold, size=sz, color=fg)
        cell.fill = PatternFill(fill_type="solid", fgColor=bg)
        cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)

    def body(cell, text):
        cell.value = text
        cell.alignment = Alignment(wrap_text=True, vertical="top")
        cell.font = Font(size=10, color=NAVY_XL)

    # Row 1 — brand header
    ws.merge_cells("A1:B1")
    ws["A1"].value = "Nexhire Enterprise Assistant"
    ws["A1"].font = Font(bold=True, size=15, color="FFFFFF")
    ws["A1"].fill = PatternFill(fill_type="solid", fgColor=NAVY_XL)
    ws["A1"].alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[1].height = 36

    # Row 2 — title
    ws.merge_cells("A2:B2")
    ws["A2"].value = title
    ws["A2"].font = Font(bold=True, size=13, color=NAVY_XL)
    ws["A2"].alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[2].height = 26

    # Row 3 — date
    ws.merge_cells("A3:B3")
    ws["A3"].value = f"Généré le {date_str}"
    ws["A3"].font = Font(size=9, italic=True, color=GRAY_XL)
    ws.row_dimensions[3].height = 18

    row = 5

    # Sources
    if payload.sources:
        hdr(ws[f"A{row}"], "Sources", BRAND_XL)
        body(ws[f"B{row}"], " · ".join(s.upper() for s in payload.sources))
        ws.row_dimensions[row].height = 22
        row += 1

    # Question
    hdr(ws[f"A{row}"], "Question", SLATE_XL)
    body(ws[f"B{row}"], payload.question)
    ws.row_dimensions[row].height = max(30, 15 * (len(payload.question) // 80 + 1))
    row += 1

    # Answer — split into lines for readability
    hdr(ws[f"A{row}"], "Corps — Réponse de l'agent", SLATE_XL)
    ws.row_dimensions[row].height = 18
    answer_lines = [l for l in payload.answer.split("\n") if l.strip()]
    answer_block = "\n".join(answer_lines)
    body(ws[f"B{row}"], answer_block)
    ws.row_dimensions[row].height = max(60, min(400, 14 * len(answer_lines)))
    ws[f"A{row}"].alignment = Alignment(wrap_text=True, vertical="top")
    row += 1

    # Conclusion
    conclusion = payload.conclusion or _default_conclusion(payload, date_str)
    hdr(ws[f"A{row}"], "Conclusion", BRAND_XL)
    body(ws[f"B{row}"], conclusion)
    ws.row_dimensions[row].height = max(50, min(200, 14 * (conclusion.count("\n") + 3)))
    ws[f"A{row}"].alignment = Alignment(wrap_text=True, vertical="top")
    row += 2

    # Footer
    ws.merge_cells(f"A{row}:B{row}")
    ws[f"A{row}"].value = f"Nexhire Enterprise Assistant · Confidentiel · {date_str}"
    ws[f"A{row}"].font = Font(size=8, italic=True, color=GRAY_XL)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{_filename("xlsx")}"'},
    )


# ── Word ──────────────────────────────────────────────────────────────────────

def _export_word(title: str, date_str: str, payload: ExportRequest) -> StreamingResponse:
    from docx import Document
    from docx.shared import Pt, RGBColor, Inches, Cm
    from docx.enum.text import WD_ALIGN_PARAGRAPH

    NAVY  = RGBColor(0x0F, 0x17, 0x2A)
    BRAND = RGBColor(0x81, 0x8C, 0xF8)
    GRAY  = RGBColor(0x64, 0x74, 0x8B)

    doc = Document()
    section = doc.sections[0]
    section.left_margin  = Cm(2.5)
    section.right_margin = Cm(2.5)
    section.top_margin   = Cm(2.5)
    section.bottom_margin = Cm(2.5)

    # Brandmark
    p_brand = doc.add_paragraph()
    r1 = p_brand.add_run("Nex")
    r1.font.size = Pt(24); r1.font.bold = True; r1.font.color.rgb = NAVY
    r2 = p_brand.add_run("hire")
    r2.font.size = Pt(24); r2.font.bold = True; r2.font.color.rgb = BRAND

    # Title
    p_title = doc.add_paragraph()
    rt = p_title.add_run(title)
    rt.font.size = Pt(18); rt.font.bold = True; rt.font.color.rgb = NAVY

    # Date
    p_date = doc.add_paragraph()
    rd = p_date.add_run(f"Généré le {date_str}")
    rd.font.size = Pt(10); rd.font.color.rgb = GRAY

    doc.add_paragraph()

    def section_label(text: str):
        p = doc.add_paragraph()
        r = p.add_run(text)
        r.font.size = Pt(9); r.font.bold = True; r.font.color.rgb = BRAND

    # Sources
    if payload.sources:
        section_label("SOURCES CONSULTÉES")
        doc.add_paragraph(" · ".join(s.upper() for s in payload.sources))

    # Question
    section_label("QUESTION")
    doc.add_paragraph(payload.question)

    doc.add_paragraph()

    # Corps — Answer
    section_label("CORPS — RÉPONSE DE L'AGENT")
    for line in payload.answer.split("\n"):
        if line.strip():
            p_ans = doc.add_paragraph(line)
            p_ans.runs[0].font.size = Pt(11)

    doc.add_paragraph()

    # Conclusion
    conclusion = payload.conclusion or _default_conclusion(payload, date_str)
    section_label("CONCLUSION")
    for line in conclusion.split("\n"):
        if line.strip():
            p_c = doc.add_paragraph(line)
            p_c.runs[0].font.size = Pt(10)
            p_c.runs[0].font.color.rgb = GRAY

    doc.add_paragraph()

    # Footer
    p_foot = doc.add_paragraph()
    rf = p_foot.add_run(f"Nexhire Enterprise Assistant · Confidentiel · {date_str}")
    rf.font.size = Pt(8); rf.font.color.rgb = GRAY

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{_filename("docx")}"'},
    )


# ── PowerPoint ────────────────────────────────────────────────────────────────

def _export_pptx(title: str, date_str: str, payload: ExportRequest) -> StreamingResponse:
    from pptx import Presentation
    from pptx.util import Inches, Pt
    from pptx.dml.color import RGBColor
    from pptx.enum.text import PP_ALIGN

    NAVY  = RGBColor(0x0F, 0x17, 0x2A)
    BRAND = RGBColor(0x81, 0x8C, 0xF8)
    GRAY  = RGBColor(0x94, 0xA3, 0xB8)
    WHITE = RGBColor(0xFF, 0xFF, 0xFF)
    LIGHT = RGBColor(0xF0, 0xF4, 0xFF)

    prs = Presentation()
    prs.slide_width  = Inches(13.33)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]

    def add_tb(slide, l, t, w, h) -> object:
        tb = slide.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
        tb.text_frame.word_wrap = True
        return tb

    def run(para, text, sz, bold=False, color=None, align=PP_ALIGN.LEFT):
        para.alignment = align
        r = para.add_run()
        r.text = text
        r.font.size = Pt(sz)
        r.font.bold = bold
        if color:
            r.font.color.rgb = color
        return r

    # ── Slide 1 : Cover ──────────────────────────────────────────────────────
    s1 = prs.slides.add_slide(blank)
    bg = s1.background.fill; bg.solid(); bg.fore_color.rgb = NAVY

    # Brand name
    tb_brand = add_tb(s1, 1, 2.2, 11, 1)
    p = tb_brand.text_frame.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    run(p, "Nex", 52, bold=True, color=WHITE)
    run(p, "hire", 52, bold=True, color=BRAND)

    # Title
    tb_title = add_tb(s1, 1, 3.6, 11, 1.4)
    p2 = tb_title.text_frame.paragraphs[0]; p2.alignment = PP_ALIGN.CENTER
    run(p2, title, 26, color=WHITE)

    # Date
    tb_date = add_tb(s1, 1, 5.2, 11, 0.5)
    p3 = tb_date.text_frame.paragraphs[0]; p3.alignment = PP_ALIGN.CENTER
    run(p3, date_str, 14, color=GRAY)

    # Sources on cover
    if payload.sources:
        tb_src = add_tb(s1, 1, 5.9, 11, 0.5)
        p4 = tb_src.text_frame.paragraphs[0]; p4.alignment = PP_ALIGN.CENTER
        run(p4, " · ".join(s.upper() for s in payload.sources), 13, color=BRAND)

    # ── Slide 2 : Content ────────────────────────────────────────────────────
    s2 = prs.slides.add_slide(blank)
    bg2 = s2.background.fill; bg2.solid(); bg2.fore_color.rgb = LIGHT

    # Top bar
    bar = s2.shapes.add_shape(1, 0, 0, Inches(13.33), Inches(0.85))
    bar.fill.solid(); bar.fill.fore_color.rgb = NAVY
    bar.line.fill.background()

    # Brand in bar
    tb_h = add_tb(s2, 0.3, 0.12, 4, 0.6)
    ph = tb_h.text_frame.paragraphs[0]
    run(ph, "Nex",  18, bold=True, color=WHITE)
    run(ph, "hire", 18, bold=True, color=BRAND)

    # Slide title
    tb_st = add_tb(s2, 0.3, 1.0, 12.7, 0.7)
    pst = tb_st.text_frame.paragraphs[0]
    run(pst, title, 20, bold=True, color=NAVY)

    y = 1.85
    # Sources row
    if payload.sources:
        tb_sr = add_tb(s2, 0.3, y, 12.7, 0.4)
        psr = tb_sr.text_frame.paragraphs[0]
        run(psr, "Sources : " + " · ".join(s.upper() for s in payload.sources), 11, color=BRAND)
        y += 0.55

    # Question
    tb_q = add_tb(s2, 0.3, y, 12.7, 0.55)
    pq = tb_q.text_frame.paragraphs[0]
    run(pq, f"Q : {payload.question[:200]}", 11, color=GRAY)
    y += 0.65

    # Answer content
    lines = [l for l in payload.answer.split("\n") if l.strip()]
    max_h = 7.5 - y - 0.2
    tb_ans = add_tb(s2, 0.3, y, 12.7, max_h)
    tf = tb_ans.text_frame

    # Fit lines into available space (~18 lines at 12pt)
    for i, line in enumerate(lines[:22]):
        if i == 0:
            p_ans = tf.paragraphs[0]
        else:
            p_ans = tf.add_paragraph()
        p_ans.space_before = Pt(1)
        r = p_ans.add_run()
        r.text = line
        r.font.size = Pt(11)
        r.font.color.rgb = NAVY

    buf = io.BytesIO()
    prs.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": f'attachment; filename="{_filename("pptx")}"'},
    )
