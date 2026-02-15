export default async function handler(req, res) {
  // Block anything that isn't a POST request
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { cvBase64, jobDescription } = req.body;

  // Basic validation
  if (!cvBase64 || !jobDescription) {
    return res.status(400).json({ error: "Missing cvBase64 or jobDescription" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        // Ensure you are using a valid model ID. 
        // "claude-3-5-sonnet-20240620" is the current best for this task.
        model: "claude-3-5-sonnet-20240620", 
        max_tokens: 3000,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: cvBase64,
              },
            },
            {
              type: "text",
              text: `You are an expert Resume Writer. Your goal is to rewrite the attached CV to target the Job Description provided below.

STRICT OUTPUT FORMATTING RULES (Crucial for PDF generation):
1. Return ONLY the final resume text. Do not write "Here is your resume" or "I have optimized it".
2. NO MARKDOWN formatting (Do not use **bold** or ## headers).
3. LINE 1: Put the Candidate Name.
4. LINE 2: Put the Contact Details (Phone | Email | LinkedIn | Location).
5. SECTION HEADERS: Write section headers in ALL CAPS (e.g., PROFESSIONAL SUMMARY, EXPERIENCE, EDUCATION, SKILLS). 
6. BULLET POINTS: Start every bullet point with a "•" character.
7. CONTENT: 
   - Use keywords from the Job Description naturally.
   - Quantify results where possible (e.g., "Improved efficiency by 20%").
   - Ensure the layout is standard: Summary -> Skills -> Experience -> Education.

JOB DESCRIPTION:
${jobDescription}`,
            },
          ],
        }],
      }),
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    // Extract text from Claude's response
    const result = data.content
      ?.filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n") || "No response received.";

    res.status(200).json({ result });

  } catch (err) {
    console.error("Resume generation error:", err);
    res.status(500).json({ error: err.message });
  }
}