import jsPDF from "jspdf";

export const generateAtsResumePdf = (content, filename = "My_Optimised_Resume") => {
  if (!content) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  // ─── HARVARD STYLE CONFIG ──────────────────────────────────────────────────
  const margin = 50; // Standard 1-inch-ish margins
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);
  const lineHeight = 14; 
  let cursorY = 50;

  // Helper to check for page breaks
  const checkPageBreak = (add = lineHeight) => {
    if (cursorY + add > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      cursorY = margin;
    }
  };

  // 1. SPLIT CONTENT INTO LINES
  // We split by newline first to preserve the AI's structure
  const rawLines = content.split(/\r?\n/);

  // 2. PARSE AND RENDER
  // We assume:
  // - Line 1 = Name
  // - Line 2 = Contact Info
  // - ALL CAPS LINES = Section Headers
  // - Lines starting with -, *, • = Bullets

  doc.setFont("times", "normal"); // Times New Roman is standard for Harvard style

  rawLines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      cursorY += 6; // Small gap for empty lines
      return;
    }

    // A. NAME (First line)
    if (index === 0) {
      doc.setFont("times", "bold");
      doc.setFontSize(20);
      doc.text(trimmed.toUpperCase(), pageWidth / 2, cursorY, { align: "center" });
      cursorY += 24;
      return;
    }

    // B. CONTACT INFO (Second line - usually)
    // Heuristic: If it's early in the doc and contains dividers like | or • or @
    if (index === 1 || (index < 4 && (trimmed.includes("|") || trimmed.includes("@") || trimmed.includes("•")))) {
      doc.setFont("times", "normal");
      doc.setFontSize(10);
      doc.text(trimmed, pageWidth / 2, cursorY, { align: "center" });
      cursorY += 20; // Add extra space after contact info
      return;
    }

    // C. SECTION HEADERS (Detected by ALL CAPS and short length)
    // e.g., "EXPERIENCE", "EDUCATION", "SKILLS"
    const isUpperCase = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
    const isShort = trimmed.length < 40;
    
    if (isUpperCase && isShort) {
      checkPageBreak(30);
      cursorY += 10; // Space before header
      
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.text(trimmed, margin, cursorY);
      
      // Harvard Style Horizontal Line
      const textWidth = doc.getTextWidth(trimmed);
      doc.setLineWidth(0.5);
      doc.line(margin, cursorY + 3, pageWidth - margin, cursorY + 3);
      
      cursorY += 18; // Space after header
      return;
    }

    // D. BULLET POINTS
    if (trimmed.startsWith("-") || trimmed.startsWith("•") || trimmed.startsWith("*")) {
      checkPageBreak();
      doc.setFont("times", "normal");
      doc.setFontSize(10.5);
      
      const cleanLine = trimmed.replace(/^[-•*]\s?/, ""); // Remove the bullet char
      const bulletIndent = 12;
      
      doc.text("•", margin + 5, cursorY); // Draw a nice bullet
      
      // Wrap text
      const splitText = doc.splitTextToSize(cleanLine, contentWidth - bulletIndent);
      doc.text(splitText, margin + bulletIndent, cursorY);
      
      cursorY += (splitText.length * lineHeight);
      return;
    }

    // E. STANDARD TEXT (Job Titles, Dates, Summaries)
    checkPageBreak();
    doc.setFont("times", "normal");
    doc.setFontSize(10.5);
    
    // Heuristic: If line has a date/location on the right? 
    // For simplicity in this version, we wrap standard text.
    // If you want Bold Company Names, you'd need the AI to mark them (e.g. **Name**)
    // Here we just render cleanly.
    
    const splitBody = doc.splitTextToSize(trimmed, contentWidth);
    doc.text(splitBody, margin, cursorY);
    cursorY += (splitBody.length * lineHeight);
  });

  doc.save(`${filename}.pdf`);
};