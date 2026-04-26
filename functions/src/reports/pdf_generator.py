#!/usr/bin/env python3
"""
Kohei PDF Report Generator
Generates professional bias research reports and fix strategies.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from typing import Any, Dict

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


# Kohei color scheme
COLOR_BACKGROUND = colors.HexColor("#1a1714")
COLOR_PRIMARY = colors.HexColor("#c0622a")
COLOR_TEXT = colors.HexColor("#f0ebe2")
COLOR_MUTED = colors.HexColor("#a09888")
COLOR_DANGER = colors.HexColor("#d45a4a")
COLOR_WARNING = colors.HexColor("#e8a02a")
COLOR_SUCCESS = colors.HexColor("#4caf7a")


def _safe(value: Any, default: str = "N/A") -> str:
    if value is None:
        return default
    return str(value)


def _page_header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(COLOR_MUTED)
    canvas.drawString(doc.leftMargin, 0.5 * inch, "Kohei Fair Lending Report")
    canvas.drawRightString(doc.pagesize[0] - doc.rightMargin, 0.5 * inch, f"Page {doc.page}")
    canvas.restoreState()


def generate_bias_report(data: Dict[str, Any], output_path: str) -> None:
    """
    Generate complete bias research report.

    Args:
        data: {
            'bank_name': str,
            'analysis_id': str,
            'analysis_date': str,
            'compliance_officer': str,
            'findings': [...],
            'overall_metrics': {...},
            'remediation_strategy': {...}
        }
        output_path: Where to save PDF
    """

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=1 * inch,
        bottomMargin=0.75 * inch,
        title="Kohei Bias Research Report",
        author="Kohei",
    )

    story = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Heading1"],
        fontSize=24,
        textColor=COLOR_PRIMARY,
        spaceAfter=30,
        alignment=TA_CENTER,
    )

    h2_style = ParagraphStyle(
        "CustomHeading2",
        parent=styles["Heading2"],
        textColor=colors.black,
        alignment=TA_LEFT,
    )

    # COVER PAGE
    story.append(Spacer(1, 2 * inch))
    story.append(Paragraph("Kohei", title_style))
    story.append(Paragraph("AI Fairness Platform", styles["Heading2"]))
    story.append(Spacer(1, 0.5 * inch))
    story.append(Paragraph("Bias Research Report", styles["Heading1"]))
    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph(f"<b>Bank:</b> {_safe(data.get('bank_name'))}", styles["Normal"]))
    story.append(Paragraph(f"<b>Analysis Date:</b> {_safe(data.get('analysis_date'))}", styles["Normal"]))
    story.append(Paragraph(f"<b>Analysis ID:</b> {_safe(data.get('analysis_id'))}", styles["Normal"]))
    story.append(Spacer(1, 1 * inch))
    story.append(Paragraph("<b>CONFIDENTIAL</b>", styles["Heading2"]))
    story.append(Paragraph("For Internal Use Only", styles["Normal"]))
    story.append(PageBreak())

    # EXECUTIVE SUMMARY
    overall_metrics = data.get("overall_metrics", {})
    findings = data.get("findings", [])

    story.append(Paragraph("Executive Summary", styles["Heading1"]))
    story.append(Spacer(1, 0.2 * inch))

    compliance_status = _safe(overall_metrics.get("compliance_status"), "AT_RISK")
    summary_data = [
        ["Metric", "Value"],
        ["Overall Status", compliance_status],
        ["Total Applicants Analyzed", f"{int(overall_metrics.get('total_applicants', 0)):,}"],
        ["Protected Attributes Tested", _safe(overall_metrics.get("groups_tested"), "0")],
        ["Confirmed Findings", str(len(findings))],
        ["Estimated Regulatory Exposure", _safe(overall_metrics.get("risk_exposure"), "N/A")],
    ]

    summary_table = Table(summary_data, colWidths=[3 * inch, 2 * inch])
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), COLOR_PRIMARY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 12),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ]
        )
    )

    story.append(summary_table)
    story.append(PageBreak())

    # FINDINGS REGISTER
    story.append(Paragraph("Bias Findings Register", styles["Heading1"]))
    story.append(Spacer(1, 0.2 * inch))

    for index, finding in enumerate(findings, 1):
        severity = _safe(finding.get("severity"), "LOW").upper()
        severity_color = COLOR_SUCCESS
        if severity == "HIGH":
            severity_color = COLOR_DANGER
        elif severity == "MEDIUM":
            severity_color = COLOR_WARNING

        story.append(
            Paragraph(
                f"Finding {index}: {_safe(finding.get('attribute'))} - {_safe(finding.get('protected_group'))}",
                h2_style,
            )
        )

        finding_data = [
            ["Metric", "Value"],
            ["Severity", severity],
            ["AIR Score", f"{float(finding.get('air_score', 0.0)):.3f}"],
            ["Twin Divergence Rate", f"{float(finding.get('twin_divergence_rate', 0.0)) * 100:.1f}%"],
            ["Affected Applicants (est.)", f"~{int(finding.get('affected_count', 0))}"],
            ["Statistical Significance", f"p < {_safe(finding.get('statistical_significance'), 'N/A')}"],
        ]

        finding_table = Table(finding_data, colWidths=[2.8 * inch, 2.2 * inch])
        finding_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), severity_color),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ]
            )
        )

        story.append(finding_table)
        story.append(Spacer(1, 0.15 * inch))

        explanation = finding.get("explanation")
        if isinstance(explanation, dict):
            what_it_means = _safe(explanation.get("what_it_means"), "Not available")
            why_it_matters = _safe(explanation.get("why_it_matters"), "Not available")
            recommended_fix = _safe(explanation.get("recommended_fix"), "Not available")

            story.append(Paragraph("<b>What It Means:</b>", styles["Heading3"]))
            story.append(Paragraph(what_it_means, styles["Normal"]))
            story.append(Spacer(1, 0.08 * inch))

            story.append(Paragraph("<b>Why It Matters:</b>", styles["Heading3"]))
            story.append(Paragraph(why_it_matters, styles["Normal"]))
            story.append(Spacer(1, 0.08 * inch))

            story.append(Paragraph("<b>Recommended Fix:</b>", styles["Heading3"]))
            story.append(Paragraph(recommended_fix, styles["Normal"]))

        story.append(Spacer(1, 0.3 * inch))

    story.append(PageBreak())

    # REMEDIATION STRATEGY
    remediation = data.get("remediation_strategy")
    if isinstance(remediation, dict):
        story.append(Paragraph("Remediation Strategy", styles["Heading1"]))
        story.append(Spacer(1, 0.2 * inch))

        story.append(Paragraph("Quick Wins (This Week):", styles["Heading2"]))
        for action in remediation.get("quick_wins", []):
            story.append(Paragraph(f"- {_safe(action.get('action'))}", styles["Normal"]))
            story.append(Paragraph(f"  Impact: {_safe(action.get('impact'))}", styles["Normal"]))

        story.append(Spacer(1, 0.2 * inch))
        story.append(Paragraph("Medium Term (1 Month):", styles["Heading2"]))
        for action in remediation.get("medium_term", []):
            story.append(Paragraph(f"- {_safe(action.get('action'))}", styles["Normal"]))

        story.append(Spacer(1, 0.2 * inch))
        story.append(Paragraph("Long Term (3 Months):", styles["Heading2"]))
        for action in remediation.get("long_term", []):
            story.append(Paragraph(f"- {_safe(action.get('action'))}", styles["Normal"]))

        story.append(PageBreak())

    # SIGNATURE PAGE
    story.append(Spacer(1, 2 * inch))
    story.append(Paragraph("Compliance Officer Sign-Off", styles["Heading2"]))
    story.append(Spacer(1, 0.5 * inch))
    story.append(Paragraph(f"Signed by: {_safe(data.get('compliance_officer'))}", styles["Normal"]))
    story.append(Paragraph(f"Date: {datetime.now().strftime('%B %d, %Y')}", styles["Normal"]))
    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph("____________________________________", styles["Normal"]))
    story.append(Paragraph("Digital Signature", styles["Normal"]))

    doc.build(story, onFirstPage=_page_header_footer, onLaterPages=_page_header_footer)
    print(f"Report generated: {output_path}")


def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: python pdf_generator.py <input_json> <output_pdf>")
        sys.exit(1)

    input_json_path = sys.argv[1]
    output_pdf_path = sys.argv[2]

    with open(input_json_path, "r", encoding="utf-8") as handle:
        payload = json.load(handle)

    generate_bias_report(payload, output_pdf_path)


if __name__ == "__main__":
    main()
