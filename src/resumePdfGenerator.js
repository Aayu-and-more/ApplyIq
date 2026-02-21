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
    // Extract Professional Summary
    const summaryMatch = output.match(/## OPTIMISED PROFESSIONAL SUMMARY\s*([\s\S]*?)(?=##|$)/);
    if (summaryMatch) {
      sections.summary = summaryMatch[1].trim().replace(/\*\*/g, '');
    }

    // Extract Skills
    const skillsMatch = output.match(/## ATS SKILLS SECTION\s*([\s\S]*?)(?=##|$)/);
    if (skillsMatch) {
      const skillsText = skillsMatch[1];
      const skillLines = skillsText.split('\n')
        .map(line => line.replace(/^[•\-]\s*/, '').trim())
        .filter(line => line.length > 0 && !line.startsWith('**'));

      sections.skills = skillLines.slice(0, 15); // Top 15 skills
    }

    // Extract Experience
    const experienceMatch = output.match(/## EXPERIENCE BULLET REWRITES\s*([\s\S]*?)(?=##|$)/);
    if (experienceMatch) {
      const expText = experienceMatch[1];
      const jobBlocks = expText.split(/\*\*(.*?)\*\*/g).filter(s => s.trim());

      for (let i = 0; i < jobBlocks.length; i += 2) {
        if (jobBlocks[i + 1]) {
          const titleLine = jobBlocks[i].trim();
          const bullets = jobBlocks[i + 1]
            .split('\n')
            .map(s => s.replace(/^[•\-]\s*/, '').trim())
            .filter(s => s.length > 0 && !s.startsWith('**'));

          if (bullets.length > 0) {
            // Try to extract date from title if it exists
            const dateMatch = titleLine.match(/(\d{4}[-–]\d{4}|\w+\s\d{4}\s[-–]\s\w+\s\d{4})/);
            const title = titleLine.replace(/(\d{4}[-–]\d{4}|\w+\s\d{4}\s[-–]\s\w+\s\d{4})/, '').trim();

            sections.experience.push({
              title: title || titleLine,
              date: dateMatch ? dateMatch[1] : "",
              bullets: bullets
            });
          }
        }
      }
    }

  } catch (err) {
    console.warn("Parsing error, using fallback:", err);
    // If parsing fails, at least return the raw summary
    sections.summary = output.substring(0, 500);
  }

  return sections;
}
