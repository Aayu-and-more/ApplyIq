import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const pdfParse = require('pdf-parse');

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

  // Check if API Key is configured in Vercel
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY environment variable");
    return res.status(500).json({ error: "Server Error: API Key not configured." });
  }

  try {
    // Sanitize Base64 input
    let cleanBase64 = String(cvBase64);

    // Remove data URI prefix (e.g., "data:application/pdf;base64,")
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }

    // Remove all whitespace (spaces, newlines, tabs)
    cleanBase64 = cleanBase64.replace(/\s/g, '');

    // Validate Base64 format
    if (!cleanBase64 || cleanBase64.length === 0) {
      throw new Error('Invalid Base64 string: empty after sanitization');
    }

    // Create Buffer from sanitized Base64
    const pdfBuffer = Buffer.from(cleanBase64, 'base64');

    if (pdfBuffer.length === 0) {
      throw new Error('Failed to create PDF buffer: buffer is empty');
    }

    console.log(`Processing PDF buffer (${pdfBuffer.length} bytes)...`);

    // Parse PDF using standard pdf-parse 1.1.1
    const pdfData = await pdfParse(pdfBuffer);

    if (!pdfData || !pdfData.text) {
      throw new Error('PDF parsing failed: no text extracted');
    }

    // Clean up extracted text (normalize whitespace)
    const cleanResumeText = pdfData.text
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\r/g, '\n')     // Handle old Mac line endings
      .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
      .trim();

    if (!cleanResumeText || cleanResumeText.length === 0) {
      throw new Error('PDF appears to be empty or unreadable');
    }

    console.log(`PDF parsed successfully. Extracted ${cleanResumeText.length} characters.`);



    // Send to Claude 3 Haiku API
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: [{
            type: "text",
            text: `You are an expert ATS (Applicant Tracking System) resume optimizer specializing in Harvard-style resume formatting. Your task is to rewrite the provided resume to maximize ATS compatibility while maintaining professional Harvard-style formatting.

<critical_constraints>
1. STRICT LENGTH LIMIT: The output MUST fit on a single page. Be extremely concise.
2. BULLET LIMIT: Each experience role MUST HAVE A MAXIMUM OF 3-4 BULLET POINTS. Only include the absolute most impressive, quantifiable achievements relevant to the job description. Do not include basic responsibilities.
3. NO HALLUCINATIONS: DO NOT invent, assume, or hallucinate ANY information. You MUST extract ALL Names, Contact Info, Education, Certifications, Companies, Dates, and Experience EXCLUSIVELY from the <resume_text> provided below.
4. NO PLACEHOLDERS: Do not formulate a "John Doe" or "Samantha Jones" resume. Use the EXACT name and details of the candidate from the <resume_text>. If the <resume_text> says "Aayush More", you MUST use "Aayush More".
5. NO EXTRA TEXT: Do not output conversational filler like "Here is the optimized resume:". Output ONLY the resume content itself.
6. STRICT ROLE RETENTION: You MUST keep the EXACT Company Names, Job Titles, Locations, and Dates from the <resume_text>. DO NOT modify them, DO NOT remove them, and DO NOT add fake roles (e.g. do not invent an "Intern" role).
7. ONLY OPTIMIZE BULLETS: For the EXPERIENCE section, ONLY optimize the bullet points for ATS compliance. Leave all headers and titles exactly as they were provided in the <resume_text>.
</critical_constraints>

<ats_optimization_requirements>
1. Extract keywords from the <job_description> and naturally integrate them.
2. Match job requirements with specific achievements and quantifiable results.
3. Include relevant skills, certifications, and technologies from the <job_description> if the candidate possesses them in their <resume_text>.
</ats_optimization_requirements>

<formatting_rules>
0. STRUCTURE: You MUST output the sections in this EXACT ORDER: "SUMMARY", "EDUCATION", "EXPERIENCE", "LICENSES & CERTIFICATIONS", "SKILLS".
1. CANDIDATE NAME: Centered, full name only (no titles)
2. CONTACT INFORMATION: Centered below name, format as: Email | Phone | LinkedIn | Location (one line)
3. SECTION HEADERS: ALL CAPS, left-aligned, EXACTLY matching the names in Rule 0, followed by a horizontal line (e.g., "EXPERIENCE" then underline)
4. SUMMARY SECTION: Heading "SUMMARY" followed by a 2-3 sentence highly targeted professional summary.
5. EDUCATION SECTION: Heading "EDUCATION". Format: Degree Name, Major | University Name | Location | Date. NEXT LINE: Search the <resume_text> for university modules and explicitly list the 4-6 most relevant modules tailored to the <job_description>.
6. EXPERIENCE SECTION: Heading "EXPERIENCE". List experiences in REVERSE-CHRONOLOGICAL order (most recent first). Format: Company Name - Job Title | Location | Date. STRICTLY EXACTLY 3 BULLET POINTS per role, no more, no less, each starting with "•".
7. LICENSES & CERTIFICATIONS SECTION: Heading "LICENSES & CERTIFICATIONS". Format: Certification Name on line 1, Issuing Organization on line 2.
8. SKILLS SECTION: Heading "SKILLS". Group strongly into categories (e.g., Technical Skills:, Soft Skills:, Tools/Software:). Use a colon after the category name and commas to separate items.
9. SPACING: Single line break between sections.
10. NO markdown formatting (no **bold**, no _italic_, no # headers).
</formatting_rules>

Now rewrite the resume tracking all constraints strictly.

<resume_text>
${cleanResumeText}
</resume_text>

<job_description>
${jobDescription}
</job_description>`
          }],
        }],
      }),
    };

    let response;
    let retries = 3;
    let delay = 1500;

    while (retries >= 0) {
      response = await fetch("https://api.anthropic.com/v1/messages", requestOptions);

      // Break if successful or if it's an error we shouldn't retry (like 400 or 401)
      if (response.ok || (response.status !== 429 && response.status !== 529 && response.status < 500)) {
        break;
      }

      if (retries === 0) break;

      console.warn(`Anthropic API overloaded/error (${response.status}). Retries left: ${retries}. Waiting ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
      retries--;
      delay *= 1.5; // Exponential backoff
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }

      // If model not found, try with Haiku as fallback
      if (response.status === 404 && errorData.error?.message?.includes('model')) {
        console.log('Model not found, retrying with Claude 3 Haiku...');

        const fallbackRequestOptions = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 4000,
            messages: [{
              role: "user",
              content: [{
                type: "text",
                text: `You are an expert ATS (Applicant Tracking System) resume optimizer specializing in Harvard-style resume formatting. Your task is to rewrite the provided resume to maximize ATS compatibility while maintaining professional Harvard-style formatting.

<critical_constraints>
1. STRICT LENGTH LIMIT: The output MUST fit on a single page. Be extremely concise.
2. BULLET LIMIT: Each experience role MUST HAVE A MAXIMUM OF 3-4 BULLET POINTS. Only include the absolute most impressive, quantifiable achievements relevant to the job description. Do not include basic responsibilities.
3. NO HALLUCINATIONS: DO NOT invent, assume, or hallucinate ANY information. You MUST extract ALL Names, Contact Info, Education, Certifications, Companies, Dates, and Experience EXCLUSIVELY from the <resume_text> provided below.
4. NO PLACEHOLDERS: Do not formulate a "John Doe" or "Samantha Jones" resume. Use the EXACT name and details of the candidate from the <resume_text>. If the <resume_text> says "Aayush More", you MUST use "Aayush More".
5. NO EXTRA TEXT: Do not output conversational filler like "Here is the optimized resume:". Output ONLY the resume content itself.
6. STRICT ROLE RETENTION: You MUST keep the EXACT Company Names, Job Titles, Locations, and Dates from the <resume_text>. DO NOT modify them, DO NOT remove them, and DO NOT add fake roles (e.g. do not invent an "Intern" role).
7. ONLY OPTIMIZE BULLETS: For the EXPERIENCE section, ONLY optimize the bullet points for ATS compliance. Leave all headers and titles exactly as they were provided in the <resume_text>.
</critical_constraints>

<ats_optimization_requirements>
1. Extract keywords from the <job_description> and naturally integrate them.
2. Match job requirements with specific achievements and quantifiable results.
3. Include relevant skills, certifications, and technologies from the <job_description> if the candidate possesses them in their <resume_text>.
</ats_optimization_requirements>

<formatting_rules>
0. STRUCTURE: You MUST output the sections in this EXACT ORDER: "SUMMARY", "EDUCATION", "EXPERIENCE", "LICENSES & CERTIFICATIONS", "SKILLS".
1. CANDIDATE NAME: Centered, full name only (no titles)
2. CONTACT INFORMATION: Centered below name, format as: Email | Phone | LinkedIn | Location (one line)
3. SECTION HEADERS: ALL CAPS, left-aligned, EXACTLY matching the names in Rule 0, followed by a horizontal line (e.g., "EXPERIENCE" then underline)
4. SUMMARY SECTION: Heading "SUMMARY" followed by a 2-3 sentence highly targeted professional summary.
5. EDUCATION SECTION: Heading "EDUCATION". Format: Degree Name, Major | University Name | Location | Date. NEXT LINE: Search the <resume_text> for university modules and explicitly list the 4-6 most relevant modules tailored to the <job_description>.
6. EXPERIENCE SECTION: Heading "EXPERIENCE". List experiences in REVERSE-CHRONOLOGICAL order (most recent first). Format: Company Name - Job Title | Location | Date. STRICTLY EXACTLY 3 BULLET POINTS per role, no more, no less, each starting with "•".
7. LICENSES & CERTIFICATIONS SECTION: Heading "LICENSES & CERTIFICATIONS". Format: Certification Name on line 1, Issuing Organization on line 2.
8. SKILLS SECTION: Heading "SKILLS". Group strongly into categories (e.g., Technical Skills:, Soft Skills:, Tools/Software:). Use a colon after the category name and commas to separate items.
9. SPACING: Single line break between sections.
10. NO markdown formatting (no **bold**, no _italic_, no # headers).
</formatting_rules>

Now rewrite the resume tracking all constraints strictly.

<resume_text>
${cleanResumeText}
</resume_text>

<job_description>
${jobDescription}
</job_description>`
              }],
            }],
          }),
        };

        let fallbackResponse;
        let fbRetries = 3;
        let fbDelay = 1500;

        while (fbRetries >= 0) {
          fallbackResponse = await fetch("https://api.anthropic.com/v1/messages", fallbackRequestOptions);

          if (fallbackResponse.ok || (fallbackResponse.status !== 429 && fallbackResponse.status !== 529 && fallbackResponse.status < 500)) {
            break;
          }

          if (fbRetries === 0) break;

          console.warn(`Anthropic fallback API overloaded/error (${fallbackResponse.status}). Retries left: ${fbRetries}. Waiting ${fbDelay}ms...`);
          await new Promise(res => setTimeout(res, fbDelay));
          fbRetries--;
          fbDelay *= 1.5;
        }

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (!fallbackData.error) {
            const result = fallbackData.content
              ?.filter(b => b.type === "text")
              .map(b => b.text)
              .join("\n") || "No response received.";
            return res.status(200).json({ result });
          }
        }
      }

      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
    }

    const anthropicData = await response.json();

    if (anthropicData.error) {
      console.error("Anthropic API Error:", JSON.stringify(anthropicData.error, null, 2));
      throw new Error(anthropicData.error.message || "Unknown error from Anthropic");
    }

    const result = anthropicData.content
      ?.filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n") || "No response received.";

    res.status(200).json({ result });

  } catch (err) {
    console.error("Resume generation error:", err.message);
    res.status(500).json({ error: `Claude API Error: ${err.message}` });
  }
}