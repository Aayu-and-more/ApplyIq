import { jsPDF } from "jspdf";

/**
 * Generates a professional resume PDF matching Aayush More's format
 * Uses Claude's ATS analysis to populate an industry-standard resume template
 */

export function generateAtsResumePdf(claudeOutput, candidateName = "AAYUSH MORE") {
  try {
    const doc = new jsPDF();

    // Page settings
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    // Parse Claude's output to extract structured sections
    const parsed = parseClaudeOutput(claudeOutput);

    // ═══════════════════════════════════════════════════════════════════════
    // HEADER - Name and Contact
    // ═══════════════════════════════════════════════════════════════════════
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(candidateName, pageWidth / 2, y, { align: "center" });
    y += 6;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const contact = "moreaayush2@gmail.com  •  Dublin, Ireland  •  https://www.linkedin.com/in/aayush-more-/";
    doc.text(contact, pageWidth / 2, y, { align: "center" });
    y += 10;

    // ═══════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════
    if (parsed.summary) {
      y = addSection(doc, "SUMMARY", y, margin, contentWidth);
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      const summaryLines = doc.splitTextToSize(parsed.summary, contentWidth);
      summaryLines.forEach(line => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 4.5;
      });
      y += 3;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EXPERIENCE
    // ═══════════════════════════════════════════════════════════════════════
    if (parsed.experience && parsed.experience.length > 0) {
      y = addSection(doc, "EXPERIENCE", y, margin, contentWidth);

      parsed.experience.forEach((job, idx) => {
        // Check page break
        if (y > pageHeight - 40) {
          doc.addPage();
          y = margin;
        }

        // Job title and company (bold)
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(job.title, margin, y);
        y += 5;

        // Date (if available, aligned left below title to match PDF)
        if (job.date) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "italic");
          doc.text(job.date, margin, y);
          y += 5;
        }

        // Bullets
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "normal");
        job.bullets.forEach(bullet => {
          if (y > pageHeight - 20) {
            doc.addPage();
            y = margin;
          }

          // Bullet point
          doc.text("•", margin, y);

          // Bullet text with wrapping
          const bulletLines = doc.splitTextToSize(bullet, contentWidth - 5);
          bulletLines.forEach((line, i) => {
            doc.text(line, margin + 5, y + (i * 4.5));
          });

          y += bulletLines.length * 4.5 + 1;
        });

        y += 2; // Space between jobs
      });

      y += 2;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EDUCATION
    // ═══════════════════════════════════════════════════════════════════════
    if (y > pageHeight - 30) {
      doc.addPage();
      y = margin;
    }

    y = addSection(doc, "EDUCATION", y, margin, contentWidth);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("National College of Ireland", margin, y);
    y += 5;
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.text("MSc Finance", margin, y);
    y += 8;

    // ═══════════════════════════════════════════════════════════════════════
    // LICENSES & CERTIFICATIONS
    // ═══════════════════════════════════════════════════════════════════════
    if (y > pageHeight - 35) {
      doc.addPage();
      y = margin;
    }

    y = addSection(doc, "LICENSES & CERTIFICATIONS", y, margin, contentWidth);
    const certs = [
      "Bloomberg Market Concepts (BMC)",
      "Bloomberg ESG Certification",
      "Bloomberg Finance Fundamentals",
      "Bloomberg Excel for Financial Analysis"
    ];

    certs.forEach(cert => {
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bolditalic");
      doc.text(cert, margin, y);
      y += 4.5;

      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text("Bloomberg Education  •", margin, y);
      y += 6;
    });
    y += 1;

    // ═══════════════════════════════════════════════════════════════════════
    // SKILLS
    // ═══════════════════════════════════════════════════════════════════════
    if (parsed.skills && parsed.skills.length > 0) {
      if (y > pageHeight - 25) {
        doc.addPage();
        y = margin;
      }

      y = addSection(doc, "SKILLS", y, margin, contentWidth);
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");

      const skillsText = parsed.skills.join("   •   ");
      const skillsLines = doc.splitTextToSize(skillsText, contentWidth);
      skillsLines.forEach(line => {
        if (y > pageHeight - 15) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 4.5;
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FOOTER
    // ═══════════════════════════════════════════════════════════════════════
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text(`${candidateName} - page 1 of 1`, pageWidth / 2, pageHeight - 10, { align: "center" });

    // ═══════════════════════════════════════════════════════════════════════
    // SAVE
    // ═══════════════════════════════════════════════════════════════════════
    const filename = `Resume_${candidateName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);

    return true;

  } catch (error) {
    console.error("PDF generation failed:", error);
    throw new Error("Failed to generate PDF: " + error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function addSection(doc, title, y, margin, contentWidth) {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, y);
  y += 1;

  // Underline
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  return y;
}

function parseClaudeOutput(output) {
  const sections = {
    summary: "",
    skills: [],
    experience: []
  };

  try {
    // A robust, fallback-heavy parser since LLM output formatting varies.
    const text = output || "";

    // --- 1. Extract Summary ---
    // Look for anything before EXPERIENCE or EDUCATION
    const expIndex = text.search(/\bEXPERIENCE\b/i);
    const summaryMatch = text.match(/(?:SUMMARY|PROFESSIONAL SUMMARY|OPTIMISED PROFESSIONAL SUMMARY)?\s*_{0,}\s*([\s\S]*?)(?=\bEXPERIENCE\b|\bEDUCATION\b|$)/i);

    if (summaryMatch && summaryMatch[1]) {
      // Clean up lines like "[Full Name]" or "[Email] | ..." that might be caught at the top
      let sText = summaryMatch[1]
        .split('\n')
        .filter(l => l.trim().length > 0)
        .filter(l => !l.includes("[Full Name]") && !l.includes("| ") && !l.includes("•") && !lineIsHeader(l))
        .join(' ')
        .replace(/\*\*/g, '')
        .trim();

      if (sText.length > 50) sections.summary = sText;
    }

    // --- 2. Extract Skills ---
    // Look for SKILLS section at the bottom
    const skillsMatch = text.match(/\bSKILLS\b[\s\S]*?_{0,}\s*([\s\S]*?)$/i);
    if (skillsMatch && skillsMatch[1]) {
      const sText = skillsMatch[1];
      const items = [];
      sText.split('\n').forEach(line => {
        const t = line.trim().replace(/\*\*/g, '');
        if (!t || lineIsHeader(t)) return;

        // Handle "Technical Skills: A, B, C" or just bullet points
        if (t.includes(':')) {
          const parts = t.split(':')[1].split(',');
          parts.forEach(p => items.push(p.trim()));
        } else if (t.startsWith('•') || t.startsWith('-')) {
          items.push(t.substring(1).trim());
        } else if (t.includes(',')) {
          t.split(',').forEach(p => items.push(p.trim()));
        } else {
          items.push(t);
        }
      });
      sections.skills = items.filter(Boolean).slice(0, 18);
    }

    // --- 3. Extract Experience ---
    // Extract everything between EXPERIENCE and EDUCATION or SKILLS
    const expSectionMatch = text.match(/\bEXPERIENCE\b[\s\S]*?_{0,}\s*([\s\S]*?)(?=\bEDUCATION\b|\bSKILLS\b|$)/i);

    if (expSectionMatch && expSectionMatch[1]) {
      const expLines = expSectionMatch[1].split('\n').map(l => l.trim()).filter(Boolean);
      let currentJob = null;

      for (let i = 0; i < expLines.length; i++) {
        let line = expLines[i].replace(/\*\*/g, '');

        if (lineIsHeader(line) || /^_{3,}$/.test(line)) continue;

        // If it starts with a bullet, add to current job
        if (line.startsWith('•') || line.startsWith('-')) {
          if (currentJob) {
            currentJob.bullets.push(line.substring(1).trim());
          }
          continue;
        }

        // Must be a title line. Check if it looks like: Title | Company | Location  [Date]
        if (line.includes('|') || line.length > 15) {
          // Extract date from the end of the line if it exists
          let dateStr = "";
          // Matches mm/yyyy - mm/yyyy or Date - Present at the end of the string, optionally in brackets
          const dateRegex = /(?:\[|\b| )((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-9]{1,2})\/?\s*[0-9]{4}\s*[-–]\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-9]{1,2}\/?\s*[0-9]{4}|Present))(?:\s*\])?$/i;

          const dMatch = line.match(dateRegex);
          if (dMatch) {
            dateStr = dMatch[1].trim();
            // Remove the date from the title line
            line = line.replace(dMatch[0], '').trim();
          }

          // Only start a new job if we don't already have one with no bullets, 
          // to avoid tearing apart multi-line titles
          if (currentJob && currentJob.bullets.length === 0) {
            currentJob.title += ", " + line.replace(/\|/g, ',').trim();
            if (!currentJob.date && dateStr) currentJob.date = dateStr;
          } else {
            if (currentJob) sections.experience.push(currentJob);
            currentJob = {
              title: line.replace(/\|/g, ',').trim(),
              date: dateStr,
              bullets: []
            };
          }
        }
      }
      if (currentJob && currentJob.bullets.length > 0) sections.experience.push(currentJob);
    }

    // Fallback if regex parsing completely failed but we have output
    if (!sections.summary && !sections.experience.length && text.length > 100) {
      sections.summary = "ATS formatting parsed incorrectly. Showing raw output:\n\n" + text.substring(0, 400) + "...";
    }

  } catch (err) {
    console.error("Resume parse error:", err);
    sections.summary = "Error parsing AI output. " + err.message;
  }

  return sections;
}

function lineIsHeader(line) {
  const l = line.toUpperCase().trim();
  return l === 'SUMMARY' || l === 'EXPERIENCE' || l === 'EDUCATION' || l === 'SKILLS' || l === 'LICENSES & CERTIFICATIONS';
}
