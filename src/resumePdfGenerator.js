import jsPDF from "jspdf";

export const generateAtsResumePdf = (content, filename = "resume") => {
  if (!content) {
    console.error("No content provided to PDF generator");
    return;
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const margin = 54;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxLineWidth = pageWidth - margin * 2;

  // Sizes and spacing – match app readability
  const bodySize = 11;
  const nameSize = 20;
  const sectionSize = 12;
  const lineHeight = 13;
  const bulletIndent = 18;
  const sectionTopGap = 20;
  const sectionBottomGap = 10;
  const blockGap = 8; // between role and bullets

  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  let cursorY = margin;
  let isFirstLine = true;
  let contactRendered = false;

  const drawLine = (y, thick = 0.5) => {
    doc.setLineWidth(thick);
    doc.line(margin, y, pageWidth - margin, y);
  };

  const isSectionHeader = (line) => {
    if (line.startsWith("•") || line.includes("|")) return false;
    const u = line.toUpperCase();
    return line === u && line.length > 2 && line.length < 50;
  };

  const isDateOnlyLine = (line) => {
    const t = line.trim();
    return /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s*[-–—]\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*\d{4}$/i.test(t) ||
      /^\d{4}\s*[-–—]\s*\d{4}$/.test(t) || /^Present$/i.test(t);
  };

  // Match "(April 2025 - Present)" or "(MM/YYYY - MM/YYYY)" at end of line
  const extractDateFromParens = (line) => {
    const m = line.match(/\s*\(([^)]+)\)\s*$/);
    return m ? { date: m[1].trim(), rest: line.slice(0, m.index).trim() } : null;
  };

  const checkPageBreak = (need) => {
    if (cursorY + need > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    checkPageBreak(lineHeight * 3);

    // —— 1. Name (first line)
    if (isFirstLine && !line.startsWith("•") && line.length < 70 && !line.includes("@")) {
      doc.setFontSize(nameSize);
      doc.setFont("helvetica", "bold");
      doc.text(line.toUpperCase(), pageWidth / 2, cursorY, { align: "center" });
      cursorY += lineHeight + 8;
      isFirstLine = false;
      continue;
    }

    // —— 2. Contact (once): email | phone | linkedin | location
    if (
      !contactRendered &&
      (line.includes("@") || line.includes("linkedin") || line.includes("http")) &&
      !line.startsWith("•") &&
      (line.includes("|") || line.includes("•"))
    ) {
      contactRendered = true;
      doc.setFontSize(bodySize);
      doc.setFont("helvetica", "normal");
      const contact = line.replace(/\|/g, "  |  ");
      doc.text(contact, pageWidth / 2, cursorY, { align: "center" });
      cursorY += lineHeight + 14;
      drawLine(cursorY, 0.7);
      cursorY += sectionBottomGap + 6;
      continue;
    }

    // —— 3. Section header (e.g. EXPERIENCE, EDUCATION)
    if (isSectionHeader(line)) {
      if (cursorY > margin + lineHeight) cursorY += sectionTopGap;
      checkPageBreak(lineHeight * 4);

      doc.setFontSize(sectionSize);
      doc.setFont("helvetica", "bold");
      doc.text(line, margin, cursorY);
      cursorY += lineHeight + 6;
      drawLine(cursorY);
      cursorY += lineHeight + sectionBottomGap;
      continue;
    }

    // —— 4. Underscore-only line
    if (/^_+$/.test(line)) {
      drawLine(cursorY);
      cursorY += lineHeight;
      continue;
    }

    // —— 5. Bullet
    if (line.startsWith("•")) {
      doc.setFontSize(bodySize);
      doc.setFont("helvetica", "normal");
      const text = line.slice(1).trim();
      const wrapped = doc.splitTextToSize(text, maxLineWidth - bulletIndent);
      for (const w of wrapped) {
        checkPageBreak(lineHeight);
        doc.text(w, margin + bulletIndent, cursorY);
        cursorY += lineHeight;
      }
      continue;
    }

    // —— 6. Standalone date line (right-aligned when previous was a role line)
    if (isDateOnlyLine(line)) {
      doc.setFontSize(bodySize);
      doc.setFont("helvetica", "normal");
      doc.text(line, pageWidth - margin - doc.getTextWidth(line), cursorY);
      cursorY += lineHeight + blockGap;
      continue;
    }

    // —— 7. Role line: "Title | Company | Location" or "Title | Company | Location (Date)"
    if (line.includes("|") && !line.includes("@")) {
      const withDate = extractDateFromParens(line);
      const leftText = withDate ? withDate.rest : line;
      const parts = leftText.split("|").map((p) => p.trim()).filter(Boolean);

      doc.setFontSize(bodySize);
      doc.setFont("helvetica", "bold");

      if (withDate && withDate.date) {
        // Same line has (Date) – left: role, right: date
        const roleText = parts.join(" | ");
        const dateW = doc.getTextWidth(withDate.date);
        doc.text(roleText, margin, cursorY);
        doc.setFont("helvetica", "normal");
        doc.text(withDate.date, pageWidth - margin - dateW, cursorY);
      } else if (parts.length >= 2) {
        const last = parts[parts.length - 1];
        const looksLikeDate = /\d{4}|Present/i.test(last) && last.length < 25;
        if (looksLikeDate) {
          const roleText = parts.slice(0, -1).join(" | ");
          doc.text(roleText, margin, cursorY);
          doc.setFont("helvetica", "normal");
          doc.text(last, pageWidth - margin - doc.getTextWidth(last), cursorY);
        } else {
          const wrapped = doc.splitTextToSize(leftText, maxLineWidth);
          for (const w of wrapped) {
            checkPageBreak(lineHeight);
            doc.text(w, margin, cursorY);
            cursorY += lineHeight;
          }
        }
      } else {
        const wrapped = doc.splitTextToSize(leftText, maxLineWidth);
        for (const w of wrapped) {
          checkPageBreak(lineHeight);
          doc.text(w, margin, cursorY);
          cursorY += lineHeight;
        }
      }
      doc.setFont("helvetica", "normal");
      cursorY += lineHeight + (withDate || (parts.length >= 2) ? blockGap : 4);
      continue;
    }

    // —— 8. Bold line that’s followed by a date (company, location, title style)
    if (
      line.includes(",") &&
      !line.startsWith("•") &&
      lines[i + 1] &&
      isDateOnlyLine(lines[i + 1].trim())
    ) {
      doc.setFontSize(bodySize);
      doc.setFont("helvetica", "bold");
      const wrapped = doc.splitTextToSize(line, maxLineWidth);
      for (const w of wrapped) {
        checkPageBreak(lineHeight);
        doc.text(w, margin, cursorY);
        cursorY += lineHeight;
      }
      cursorY += lineHeight; // next line will be date (handled by 6), right-aligned
      continue;
    }

    // —— 9. Plain body (summary, skills, etc.)
    doc.setFontSize(bodySize);
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(line, maxLineWidth);
    for (const w of wrapped) {
      checkPageBreak(lineHeight);
      doc.text(w, margin, cursorY);
      cursorY += lineHeight;
    }
  }

  doc.save(`${filename}.pdf`);
};
