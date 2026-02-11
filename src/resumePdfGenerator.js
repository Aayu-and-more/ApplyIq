import jsPDF from "jspdf";

/**
 * Generates an ATS-compliant resume PDF from Claude's optimization output
 * 
 * ATS COMPLIANCE RULES:
 * - Uses standard fonts (Helvetica/Arial family only)
 * - Simple single-column layout
 * - No tables, graphics, or images
 * - Standard section headers
 * - Consistent formatting with bullet points
 * - Proper spacing and margins
 * - Black text only
 */

export function generateAtsResumePdf(claudeOutput, candidateName = "Your Name") {
  const doc = new jsPDF();
  
  // ATS-COMPLIANT SETTINGS
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20; // 0.75 inch margins (industry standard)
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;
  
  // FONT SIZES (ATS-safe: 10-12pt for body, 14-16pt for headers)
  const fontSize = {
    name: 16,
    contact: 9,
    sectionHeader: 12,
    subsectionHeader: 10.5,
    body: 10,
    small: 9,
  };
  
  // LINE HEIGHTS
  const lineHeight = {
    tight: 1.15,
    normal: 1.35,
    loose: 1.6,
  };
  
  // Helper: Add text with auto-wrap and return new Y position
  const addText = (text, x, y, options = {}) => {
    const {
      fontSize: size = fontSize.body,
      fontStyle = "normal",
      align = "left",
      maxWidth = contentWidth,
      lineSpacing = lineHeight.normal,
    } = options;
    
    doc.setFontSize(size);
    doc.setFont("helvetica", fontStyle);
    
    const lines = doc.splitTextToSize(text, maxWidth);
    
    if (align === "center") {
      lines.forEach((line, i) => {
        doc.text(line, pageWidth / 2, y + (i * size * lineSpacing / 2.5), { align: "center" });
      });
    } else {
      doc.text(lines, x, y);
    }
    
    return y + (lines.length * size * lineSpacing / 2.5);
  };
  
  // Helper: Add section header with line
  const addSectionHeader = (title, y) => {
    doc.setFontSize(fontSize.sectionHeader);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), margin, y);
    
    // Underline (ATS-safe)
    const textWidth = doc.getTextWidth(title.toUpperCase());
    doc.setLineWidth(0.5);
    doc.line(margin, y + 1, margin + textWidth, y + 1);
    
    return y + 8;
  };
  
  // Helper: Parse Claude's output into structured sections
  const parseClaudeOutput = (output) => {
    const sections = {
      summary: "",
      skills: [],
      experience: [],
      score: "",
    };
    
    // Extract Professional Summary
    const summaryMatch = output.match(/## OPTIMISED PROFESSIONAL SUMMARY\s*([\s\S]*?)(?=##|---)/);
    if (summaryMatch) {
      sections.summary = summaryMatch[1].trim();
    }
    
    // Extract Skills Section
    const skillsMatch = output.match(/## ATS SKILLS SECTION\s*([\s\S]*?)(?=##|---)/);
    if (skillsMatch) {
      const skillsText = skillsMatch[1].trim();
      const categories = skillsText.split(/\*\*(.*?)\*\*/g).filter(s => s.trim());
      
      for (let i = 0; i < categories.length; i += 2) {
        if (categories[i + 1]) {
          const categoryName = categories[i].trim();
          const skills = categories[i + 1]
            .split("\n")
            .map(s => s.replace(/^[•\-]\s*/, "").trim())
            .filter(s => s.length > 0);
          
          if (skills.length > 0) {
            sections.skills.push({ category: categoryName, items: skills });
          }
        }
      }
    }
    
    // Extract Experience
    const experienceMatch = output.match(/## EXPERIENCE BULLET REWRITES\s*([\s\S]*?)(?=##|---)/);
    if (experienceMatch) {
      const expText = experienceMatch[1].trim();
      const jobBlocks = expText.split(/\*\*(.*?)\*\*/g).filter(s => s.trim());
      
      for (let i = 0; i < jobBlocks.length; i += 2) {
        if (jobBlocks[i + 1]) {
          const titleCompany = jobBlocks[i].trim();
          const bullets = jobBlocks[i + 1]
            .split("\n")
            .map(s => s.replace(/^[•\-]\s*/, "").trim())
            .filter(s => s.length > 0 && !s.startsWith("**"));
          
          if (bullets.length > 0) {
            sections.experience.push({ titleCompany, bullets });
          }
        }
      }
    }
    
    // Extract ATS Score
    const scoreMatch = output.match(/## ATS SCORE[:\s]+([\d]+)/);
    if (scoreMatch) {
      sections.score = scoreMatch[1];
    }
    
    return sections;
  };
  
  const sections = parseClaudeOutput(claudeOutput);
  
  // ──────────────────────────────────────────────────────────────────────────
  // HEADER — Name and Contact Info
  // ──────────────────────────────────────────────────────────────────────────
  doc.setFontSize(fontSize.name);
  doc.setFont("helvetica", "bold");
  doc.text(candidateName.toUpperCase(), pageWidth / 2, yPosition, { align: "center" });
  yPosition += 6;
  
  // Contact placeholder (ATS parsers look for these)
  doc.setFontSize(fontSize.contact);
  doc.setFont("helvetica", "normal");
  const contactInfo = "Email: your.email@example.com | Phone: +353 XX XXX XXXX | LinkedIn: linkedin.com/in/yourprofile";
  doc.text(contactInfo, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 10;
  
  // ──────────────────────────────────────────────────────────────────────────
  // PROFESSIONAL SUMMARY
  // ──────────────────────────────────────────────────────────────────────────
  if (sections.summary) {
    yPosition = addSectionHeader("Professional Summary", yPosition);
    yPosition = addText(sections.summary, margin, yPosition, {
      fontSize: fontSize.body,
      lineSpacing: lineHeight.normal,
    });
    yPosition += 6;
  }
  
  // ──────────────────────────────────────────────────────────────────────────
  // CORE COMPETENCIES / SKILLS
  // ──────────────────────────────────────────────────────────────────────────
  if (sections.skills.length > 0) {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }
    
    yPosition = addSectionHeader("Core Competencies", yPosition);
    
    sections.skills.forEach(skillGroup => {
      // Category name (bold)
      doc.setFontSize(fontSize.subsectionHeader);
      doc.setFont("helvetica", "bold");
      doc.text(skillGroup.category, margin, yPosition);
      yPosition += 5;
      
      // Skills as inline text (ATS-preferred over bullets for skills)
      doc.setFontSize(fontSize.body);
      doc.setFont("helvetica", "normal");
      const skillsText = skillGroup.items.join(" • ");
      yPosition = addText(skillsText, margin, yPosition, {
        fontSize: fontSize.body,
        lineSpacing: lineHeight.tight,
      });
      yPosition += 4;
    });
    
    yPosition += 4;
  }
  
  // ──────────────────────────────────────────────────────────────────────────
  // PROFESSIONAL EXPERIENCE
  // ──────────────────────────────────────────────────────────────────────────
  if (sections.experience.length > 0) {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }
    
    yPosition = addSectionHeader("Professional Experience", yPosition);
    
    sections.experience.forEach((job, index) => {
      // Check if we need a new page for this job
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = margin;
      }
      
      // Job Title and Company (bold)
      doc.setFontSize(fontSize.subsectionHeader);
      doc.setFont("helvetica", "bold");
      doc.text(job.titleCompany, margin, yPosition);
      yPosition += 6;
      
      // Bullets
      job.bullets.forEach(bullet => {
        doc.setFontSize(fontSize.body);
        doc.setFont("helvetica", "normal");
        
        // Add bullet point
        doc.text("•", margin, yPosition);
        
        // Wrap bullet text with indent
        const bulletLines = doc.splitTextToSize(bullet, contentWidth - 6);
        bulletLines.forEach((line, i) => {
          doc.text(line, margin + 6, yPosition + (i * fontSize.body * lineHeight.tight / 2.5));
        });
        
        yPosition += bulletLines.length * fontSize.body * lineHeight.tight / 2.5 + 2;
        
        // Page break check
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin;
        }
      });
      
      yPosition += 3;
    });
  }
  
  // ──────────────────────────────────────────────────────────────────────────
  // FOOTER NOTE (if ATS score exists)
  // ──────────────────────────────────────────────────────────────────────────
  if (sections.score) {
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = margin;
    }
    
    yPosition += 6;
    doc.setFontSize(fontSize.small);
    doc.setFont("helvetica", "italic");
    doc.text(`ATS Optimization Score: ${sections.score}/100 | Generated by ApplyIQ`, margin, yPosition);
  }
  
  // ──────────────────────────────────────────────────────────────────────────
  // SAVE
  // ──────────────────────────────────────────────────────────────────────────
  const filename = `Resume_ATS_Optimized_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}