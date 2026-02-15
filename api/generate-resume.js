export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { cvBase64, jobDescription } = req.body;

  if (!cvBase64 || !jobDescription) {
    return res.status(400).json({ error: "Missing cvBase64 or jobDescription" });
  }

  // Check if API Key is missing in Vercel
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY environment variable");
    return res.status(500).json({ error: "Server Error: API Key not configured in Vercel." });
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
        // Switched to Claude 3.0 Sonnet (Standard, widely available)
        model: "claude-3-sonnet-20240229", 
        max_tokens: 3000,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: cvBase64 },
            },
            {
              type: "text",
              text: `You are an expert Resume Writer. Rewrite the attached CV to target the Job Description below.

STRICT OUTPUT RULES:
1. Return ONLY the final resume text.
2. LINE 1: Candidate Name.
3. LINE 2: Contact Details.
4. SECTION HEADERS: ALL CAPS (e.g., EXPERIENCE). 
5. BULLET POINTS: Start with "•".

JOB DESCRIPTION:
${jobDescription}`,
            },
          ],
        }],
      }),
    });

    const data = await response.json();

    // If Anthropic returns an error, throw it with the details
    if (data.error) {
      console.error("Anthropic API Error:", JSON.stringify(data.error, null, 2));
      throw new Error(data.error.message || "Unknown error from Anthropic");
    }

    const result = data.content
      ?.filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n") || "No response received.";

    res.status(200).json({ result });

  } catch (err) {
    console.error("Resume generation error:", err.message);
    res.status(500).json({ error: `Claude API Error: ${err.message}` });
  }
}