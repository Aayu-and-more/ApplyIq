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

CRITICAL CONSTRAINTS - YOU MUST FOLLOW THESE:
1. STRICT LENGTH LIMIT: The output MUST fit on a single page. Be extremely concise.
2. BULLET LIMIT: Each experience role MUST HAVE A MAXIMUM OF 3-4 BULLET POINTS. Only include the absolute most impressive, quantifiable achievements relevant to the job description. Do not include basic responsibilities.
3. DYNAMIC CONTENT: DO NOT invent or assume any information. Extract ALL Education, Certifications, and Experience exclusively from the provided RESUME TEXT.

ATS OPTIMIZATION REQUIREMENTS:
1. Extract keywords from the job description and naturally integrate them.
2. Match job requirements with specific achievements and quantifiable results.
3. Include relevant skills, certifications, and technologies from the job description if the candidate possesses them.

HARVARD-STYLE FORMATTING RULES:
1. CANDIDATE NAME: Centered, full name only (no titles)
2. CONTACT INFORMATION: Centered below name, format as: Email | Phone | LinkedIn | Location (one line)
3. SECTION HEADERS: ALL CAPS, left-aligned, followed by a horizontal line (e.g., "EXPERIENCE" then underline)
4. EXPERIENCE SECTION:
   - Format: Job Title | Company Name | Location
   - Dates: Right-aligned (e.g., "MM/YYYY - MM/YYYY" or "MM/YYYY - Present")
   - STRICTLY 3-4 bullet points per role max, each starting with "•"
   - Use strong action verbs (Led, Developed, Implemented, Achieved, etc.)
   - Include quantifiable metrics (percentages, dollar amounts, team sizes, etc.)
5. EDUCATION SECTION:
   - Extract from base resume.
   - Format: Degree Name, Major | University Name | Location
   - Dates: Right-aligned
6. LICENSES & CERTIFICATIONS SECTION:
   - Extract from base resume (if any).
   - Format: Certification Name
   - Issuing Organization
7. SKILLS SECTION:
   - Group by category: Technical Skills, Software/Tools, Certifications
   - Use commas to separate items within categories
   - Prioritize skills mentioned in job description
8. SPACING: Single line break between sections, double line break before major sections
9. NO markdown formatting (no **bold**, no _italic_, no # headers)
10. Use consistent date format throughout

OUTPUT FORMAT EXAMPLE:
[Full Name]
[Email] | [Phone] | [LinkedIn] | [City, State]

SUMMARY
________________________________________________________________________________

[2-3 sentence highly targeted professional summary focusing on the exact value brought to the target role.]

EXPERIENCE
________________________________________________________________________________

[Job Title] | [Company Name] | [City, State]                                    [MM/YYYY - MM/YYYY]
• [Achievement-focused bullet 1]
• [Achievement-focused bullet 2]
• [Achievement-focused bullet 3]

[Previous Job Title] | [Company Name] | [City, State]                            [MM/YYYY - MM/YYYY]
• [Achievement bullet 1]
• [Achievement bullet 2]
• [Achievement bullet 3]

EDUCATION
________________________________________________________________________________

[Degree], [Major] | [University Name] | [City, State]                           [MM/YYYY]
[Relevant coursework or honors if applicable]

LICENSES & CERTIFICATIONS
________________________________________________________________________________

[Certification Name]
[Issuing Organization]

SKILLS
________________________________________________________________________________

Technical Skills: [Keyword 1], [Keyword 2]
Software/Tools: [Tool 1], [Tool 2]

Now rewrite the resume below following these exact formatting rules and ATS optimization requirements:

RESUME TEXT:
\${cleanResumeText}

JOB DESCRIPTION:
\${jobDescription}`
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

CRITICAL CONSTRAINTS - YOU MUST FOLLOW THESE:
1. STRICT LENGTH LIMIT: The output MUST fit on a single page. Be extremely concise.
2. BULLET LIMIT: Each experience role MUST HAVE A MAXIMUM OF 3-4 BULLET POINTS. Only include the absolute most impressive, quantifiable achievements relevant to the job description. Do not include basic responsibilities.
3. DYNAMIC CONTENT: DO NOT invent or assume any information. Extract ALL Education, Certifications, and Experience exclusively from the provided RESUME TEXT.

ATS OPTIMIZATION REQUIREMENTS:
1. Extract keywords from the job description and naturally integrate them.
2. Match job requirements with specific achievements and quantifiable results.
3. Include relevant skills, certifications, and technologies from the job description if the candidate possesses them.

HARVARD-STYLE FORMATTING RULES:
1. CANDIDATE NAME: Centered, full name only (no titles)
2. CONTACT INFORMATION: Centered below name, format as: Email | Phone | LinkedIn | Location (one line)
3. SECTION HEADERS: ALL CAPS, left-aligned, followed by a horizontal line (e.g., "EXPERIENCE" then underline)
4. EXPERIENCE SECTION:
   - Format: Job Title | Company Name | Location
   - Dates: Right-aligned (e.g., "MM/YYYY - MM/YYYY" or "MM/YYYY - Present")
   - STRICTLY 3-4 bullet points per role max, each starting with "•"
   - Use strong action verbs (Led, Developed, Implemented, Achieved, etc.)
   - Include quantifiable metrics (percentages, dollar amounts, team sizes, etc.)
5. EDUCATION SECTION:
   - Extract from base resume.
   - Format: Degree Name, Major | University Name | Location
   - Dates: Right-aligned
6. LICENSES & CERTIFICATIONS SECTION:
   - Extract from base resume (if any).
   - Format: Certification Name
   - Issuing Organization
7. SKILLS SECTION:
   - Group by category: Technical Skills, Software/Tools, Certifications
   - Use commas to separate items within categories
   - Prioritize skills mentioned in job description
8. SPACING: Single line break between sections, double line break before major sections
9. NO markdown formatting (no **bold**, no _italic_, no # headers)
10. Use consistent date format throughout

OUTPUT FORMAT EXAMPLE:
[Full Name]
[Email] | [Phone] | [LinkedIn] | [City, State]

SUMMARY
________________________________________________________________________________

[2-3 sentence highly targeted professional summary focusing on the exact value brought to the target role.]

EXPERIENCE
________________________________________________________________________________

[Job Title] | [Company Name] | [City, State]                                    [MM/YYYY - MM/YYYY]
• [Achievement-focused bullet 1]
• [Achievement-focused bullet 2]
• [Achievement-focused bullet 3]

[Previous Job Title] | [Company Name] | [City, State]                            [MM/YYYY - MM/YYYY]
• [Achievement bullet 1]
• [Achievement bullet 2]
• [Achievement bullet 3]

EDUCATION
________________________________________________________________________________

[Degree], [Major] | [University Name] | [City, State]                           [MM/YYYY]
[Relevant coursework or honors if applicable]

LICENSES & CERTIFICATIONS
________________________________________________________________________________

[Certification Name]
[Issuing Organization]

SKILLS
________________________________________________________________________________

Technical Skills: [Keyword 1], [Keyword 2]
Software/Tools: [Tool 1], [Tool 2]

Now rewrite the resume below following these exact formatting rules and ATS optimization requirements:

RESUME TEXT:
\${cleanResumeText}

JOB DESCRIPTION:
\${jobDescription}`
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