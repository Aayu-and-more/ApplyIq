import jsPDF from "jspdf";

export const generateAtsResumePdf = (content, filename = "resume") => {
  // Guard clause: if content is empty/null, don't crash, just return or alert
  if (!content) {
    console.error("No content provided to PDF generator");
    return;
  }

  // 1. Create the document
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  // 2. Configuration
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxLineWidth = pageWidth - margin * 2;
  const lineHeight = 14; // spacing between lines
  
  // 3. Set Font (Courier is standard for ATS readability)
  doc.setFont("courier", "normal");
  doc.setFontSize(11);

  // 4. Split text into lines that fit the page width
  // This prevents the "white screen" freeze caused by overly long lines
  const textLines = doc.splitTextToSize(content, maxLineWidth);

  // 5. Render text with pagination
  let cursorY = margin;

  textLines.forEach((line) => {
    // If we are at the bottom of the page, add a new page
    if (cursorY + lineHeight > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
    doc.text(line, margin, cursorY);
    cursorY += lineHeight;
  });

  // 6. Save
  doc.save(`${filename}.pdf`);
};