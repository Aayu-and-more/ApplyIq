// api/generate-resume.js
// Vercel serverless function — runs on Vercel's servers, not in the browser.
// Your API key lives here as an environment variable, never exposed to users.

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
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
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
                text: `You are an expert ATS resume consultant specialising in finance and fintech.
  
  Optimise the attached CV for this job description to maximise ATS compatibility.
  
  JOB DESCRIPTION:
  ${jobDescription}
  
  Provide:
  1. ATS KEYWORD ANALYSIS — top 10-15 keywords from JD, which are present/missing, current match %
  2. OPTIMISED PROFESSIONAL SUMMARY — 3-4 sentences using JD keywords naturally
  3. ATS SKILLS SECTION — mirror exact JD terminology, grouped by category
  4. EXPERIENCE BULLET REWRITES — 4-6 bullets using JD keywords + quantified impact
  5. ATS SCORE — score out of 100, 2-3 remaining gaps and specific fixes
  6. FORMATTING TIPS — anything that could hurt ATS parsing
  
  Be specific and use the actual content from the CV provided.`,
              },
            ],
          }],
        }),
      });
  
      const data = await response.json();
  
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