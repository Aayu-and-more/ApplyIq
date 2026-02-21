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
    // EDUCATION
    // ═══════════════════════════════════════════════════════════════════════
    if (parsed.education && parsed.education.length > 0) {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = margin;
      }

      y = addSection(doc, "EDUCATION", y, margin, contentWidth);
      doc.setFontSize(10);

      parsed.education.forEach((edu) => {
        // Degree, Major | University | Location
        doc.setFont("helvetica", "bold");
        const titleText = doc.splitTextToSize(edu.title, contentWidth - 40);
        doc.text(titleText, margin, y);

        // Date Right Aligned
        if (edu.date) {
          doc.setFont("helvetica", "normal");
          doc.text(edu.date, pageWidth - margin, y, { align: "right" });
        }

        y += (titleText.length * 4.5);

        // Details (e.g. GPA, Honors, Modules)
        if (edu.details && edu.details.length > 0) {
          doc.setFontSize(9.5);
          doc.setFont("helvetica", "normal");
          edu.details.forEach(detail => {
            const detailLines = doc.splitTextToSize(detail, contentWidth);
            detailLines.forEach(line => {
              doc.text(line, margin, y);
              y += 4.5;
            });
          });
        }
        y += 2;
      });
      y += 1;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EXPERIENCE
    // ═══════════════════════════════════════════════════════════════════════
    if (parsed.experience && parsed.experience.length > 0) {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = margin;
      }

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
        const titleLines = doc.splitTextToSize(job.title, contentWidth - 5);
        doc.text(titleLines, margin, y);
        y += (titleLines.length * 5); // Add space base on lines

        // Date below title (Left Aligned, Italic)
        if (job.date) {
          doc.setFontSize(9.5);
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
    // LICENSES & CERTIFICATIONS
    // ═══════════════════════════════════════════════════════════════════════
    if (parsed.certifications && parsed.certifications.length > 0) {
      if (y > pageHeight - 35) {
        doc.addPage();
        y = margin;
      }

      y = addSection(doc, "LICENSES & CERTIFICATIONS", y, margin, contentWidth);

      parsed.certifications.forEach(cert => {
        if (y > pageHeight - 15) {
          doc.addPage();
          y = margin;
        }

        doc.setFontSize(9.5);
        doc.setFont("helvetica", "bolditalic");
        doc.text(cert.name, margin, y);
        y += 4.5;

        if (cert.issuer) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "italic");
          doc.text(cert.issuer, margin, y);
          y += 5;
        }
      });
      y += 1;
    }

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

      parsed.skills.forEach(skillGroup => {
        if (y > pageHeight - 15) {
          doc.addPage();
          y = margin;
        }

        if (skillGroup.category !== 'Other') {
          doc.setFont("helvetica", "bold");
          doc.text(skillGroup.category + ": ", margin, y);
          const catWidth = doc.getTextWidth(skillGroup.category + ": ");
          doc.setFont("helvetica", "normal");

          const skillsText = skillGroup.items.join(", ");
          const skillsLines = doc.splitTextToSize(skillsText, contentWidth - catWidth - 2);
          skillsLines.forEach((line, i) => {
            if (i === 0) {
              doc.text(line, margin + catWidth, y);
            } else {
              y += 4.5;
              doc.text(line, margin + catWidth, y);
            }
          });
        } else {
          doc.setFont("helvetica", "normal");
          const skillsText = skillGroup.items.join("   •   ");
          const skillsLines = doc.splitTextToSize(skillsText, contentWidth);
          skillsLines.forEach((line, i) => {
            if (i > 0) y += 4.5;
            doc.text(line, margin, y);
          });
        }
        y += 4.5;
      });
    }

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
    experience: [],
    education: [],
    certifications: []
  };

  try {
    const text = output || "";
    const lines = text.split('\n').map(l => l.trim().replace(/[*_]/g, '')).filter(Boolean);

    let currentSection = 'UNKNOWN';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (/^_{2,}$/.test(line)) continue;
      if (line.includes('[Full Name]') || line.includes('[Email]') || line.includes('[City, State]')) continue;

      let upperLine = line.toUpperCase();

      if (upperLine === 'SUMMARY' || upperLine.includes('SUMMARY SECTION') || upperLine.includes('PROFESSIONAL SUMMARY')) { currentSection = 'SUMMARY'; continue; }
      if (upperLine === 'EXPERIENCE' || upperLine.includes('PROFESSIONAL EXPERIENCE') || upperLine.includes('WORK EXPERIENCE')) { currentSection = 'EXPERIENCE'; continue; }
      if (upperLine === 'EDUCATION' || upperLine.includes('ACADEMIC BACKGROUND')) { currentSection = 'EDUCATION'; continue; }
      if (upperLine.includes('LICENSES') || upperLine.includes('CERTIFICATIONS') || upperLine === 'CERTIFICATES') { currentSection = 'CERTIFICATIONS'; continue; }
      if (upperLine === 'SKILLS' || upperLine.includes('CORE COMPETENCIES')) { currentSection = 'SKILLS'; continue; }

      if (upperLine === 'AAYUSH MORE' || line.includes('@')) continue; // Skip header garbage

      const isBullet = /^[•\-\*]\s+/.test(line) || line.startsWith('•') || line.startsWith('-') || line.startsWith('*');
      const cleanLine = line.replace(/^[•\-\*]\s*/, '').trim();

      if (currentSection === 'SUMMARY') {
        sections.summary += (sections.summary ? " " : "") + cleanLine;
      }
      else if (currentSection === 'EXPERIENCE') {
        if (isBullet) {
          if (sections.experience.length === 0) sections.experience.push({ title: "Professional Experience", date: "", bullets: [] });
          sections.experience[sections.experience.length - 1].bullets.push(cleanLine);
        } else {
          let dateStr = "";
          const parts = line.split('|');
          if (parts.length > 1) {
            const lastPart = parts[parts.length - 1].trim();
            if (/\d{4}/.test(lastPart) || lastPart.toLowerCase().includes('present')) {
              dateStr = parts.pop().trim();
            }
            line = parts.join(' | ').trim();
          }
          line = line.replace(/\|/g, ',').replace(/\s+/g, ' ').trim();

          // Multi-line title check
          if (sections.experience.length > 0 && sections.experience[sections.experience.length - 1].bullets.length === 0 && !line.includes('|')) {
            sections.experience[sections.experience.length - 1].title += ", " + line;
            if (!sections.experience[sections.experience.length - 1].date && dateStr) {
              sections.experience[sections.experience.length - 1].date = dateStr;
            }
          } else {
            sections.experience.push({ title: line, date: dateStr, bullets: [] });
          }
        }
      }
      else if (currentSection === 'EDUCATION') {
        if (line.includes('|') || (sections.education.length === 0 && !isBullet)) {
          let dateStr = "";
          const parts = line.split('|');
          if (parts.length > 1) {
            const lastPart = parts[parts.length - 1].trim();
            if (/\d{4}/.test(lastPart) || lastPart.toLowerCase().includes('present')) {
              dateStr = parts.pop().trim();
            }
            line = parts.join(' | ').trim();
          }
          line = line.replace(/\|/g, ',').replace(/\s+/g, ' ').trim();
          sections.education.push({ title: line, date: dateStr, details: [] });
        } else if (sections.education.length > 0) {
          sections.education[sections.education.length - 1].details.push(cleanLine);
        } else {
          sections.education.push({ title: cleanLine, date: "", details: [] });
        }
      }
      else if (currentSection === 'CERTIFICATIONS') {
        if (line.includes('|')) {
          const parts = line.split('|');
          sections.certifications.push({ name: parts[0].trim(), issuer: parts.slice(1).join('|').trim() });
        } else {
          if (sections.certifications.length > 0 && !sections.certifications[sections.certifications.length - 1].issuer) {
            sections.certifications[sections.certifications.length - 1].issuer = cleanLine;
          } else {
            sections.certifications.push({ name: cleanLine, issuer: "" });
          }
        }
      }
      else if (currentSection === 'SKILLS') {
        // Handle "Technical Skills: A, B" or "Soft Skills - X, Y"
        if (line.includes(':') || line.includes('-') && !line.startsWith('-')) {
          const splitChar = line.includes(':') ? ':' : '-';
          const splitPoint = line.indexOf(splitChar);
          const category = line.substring(0, splitPoint).replace(/[*_]/g, '').trim();
          const itemsPart = line.substring(splitPoint + 1);
          const items = itemsPart.split(/[,\•\|]/).map(p => p.trim()).filter(Boolean);
          if (items.length > 0) sections.skills.push({ category, items });
        } else {
          const items = cleanLine.split(/[,\•\|]/).map(p => p.trim()).filter(Boolean);
          if (items.length > 0) {
            if (sections.skills.length > 0 && sections.skills[sections.skills.length - 1].category === 'Other') {
              sections.skills[sections.skills.length - 1].items.push(...items);
            } else {
              sections.skills.push({ category: 'Other', items });
            }
          }
        }
      }
    }

    if (!sections.summary && sections.experience.length === 0 && sections.education.length === 0) {
      sections.summary = "ATS formatting parsed incorrectly. Showing raw output:\n\n" + text.substring(0, 400) + "...";
    }
  } catch (err) {
    console.error("Resume parse error:", err);
    sections.summary = "Error parsing AI output. " + err.message;
  }
  return sections;
}
