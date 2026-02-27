export async function fetchRecentApplications(accessToken) {
    if (!accessToken) throw new Error("No Google Access Token found");

    // Query: ONLY fetch from LinkedIn (as requested by user)
    // We look specifically for LinkedIn application receipts or status updates
    const query = "newer_than:30d AND from:linkedin.com AND (subject:\"application\" OR subject:\"applied\" OR subject:\"passion for talent\" OR subject:\"interview\" OR subject:\"offer\" OR subject:\"viewed by\")";

    try {
        // 1. Search for matching message IDs (handle pagination up to 500 emails to capture full month)
        let messages = [];
        let pageToken = null;
        let pageCount = 0;

        do {
            const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100${pageToken ? `&pageToken=${pageToken}` : ""}`;
            const searchResponse = await fetch(url, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            if (!searchResponse.ok) {
                let errMessage = "Failed to fetch from Gmail API.";
                try {
                    const errData = await searchResponse.json();
                    if (errData.error?.message) errMessage += ` ${errData.error.message}`;
                } catch (e) { }
                throw new Error(errMessage);
            }

            const searchData = await searchResponse.json();
            if (searchData.messages) {
                messages = messages.concat(searchData.messages);
            }
            pageToken = searchData.nextPageToken;
            pageCount++;
        } while (pageToken && pageCount < 5); // Max 500 emails

        if (messages.length === 0) return [];

        // 2. Fetch the full details for each message
        const applications = [];

        // Process sequentially to be gentle on the API and avoid rate limits
        for (const msg of messages) {
            const detailsResponse = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            if (detailsResponse.ok) {
                const details = await detailsResponse.json();
                const parsedApp = parseEmailToApplication(details);
                if (parsedApp) applications.push(parsedApp);
            }
        }

        // We don't deduplicate here anymore because we need the full history 
        // in App.jsx to intelligently upgrade statuses (e.g., Applied -> Interview)
        return applications;

    } catch (error) {
        console.error("Gmail Sync Error:", error);
        throw error;
    }
}

// ─── EMAIL PARSING LOGIC ───────────────────────────────────────────────────

function extractEmailBodyText(payload) {
    if (!payload) return "";

    let plainText = "";
    let htmlText = "";

    function decodeBase64(data) {
        try {
            const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
            return decodeURIComponent(escape(window.atob(base64)));
        } catch (e) {
            return "";
        }
    }

    function traverse(node) {
        if (node.mimeType === "text/plain" && node.body && node.body.data) {
            plainText += decodeBase64(node.body.data) + " ";
        } else if (node.mimeType === "text/html" && node.body && node.body.data) {
            htmlText += decodeBase64(node.body.data) + " ";
        } else if (node.parts) {
            for (const part of node.parts) traverse(part);
        }
    }

    traverse(payload);

    // Prefer plaintext because it has no HTML junk. If not, strip HTML from htmlText.
    let body = plainText.trim() ? plainText : htmlText.replace(/<[^>]*>?/gm, ' ');

    // Strip massive tracking URLs so they don't pollute the regex logic
    body = body.replace(/https?:\/\/[^\s]+/g, '');

    // Normalize whitespace down to single spaces
    return body.replace(/\s+/g, ' ').trim();
}

function parseEmailToApplication(emailDetails) {
    if (!emailDetails || !emailDetails.payload || !emailDetails.payload.headers) return null;

    const headers = emailDetails.payload.headers;
    const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject')?.value || "";
    const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || "";
    // Grab the date string, default to empty string if missing
    const dateHeader = headers.find(h => h.name.toLowerCase() === 'date')?.value || "";
    let snippet = emailDetails.snippet || "";
    const bodyText = extractEmailBodyText(emailDetails.payload);
    const fullTextSearch = (snippet + " " + bodyText).trim();

    // 1. Extract Company Name
    let company = "Unknown Company";

    // Try to get company from sender name (e.g., "Company Name via Greenhouse")
    const fromMatch = fromHeader.match(/^"?(.*?)"?\s*?</);
    if (fromMatch && fromMatch[1]) {
        company = fromMatch[1].replace(/via|talent|careers|recruiting|team|-/gi, "").trim();
    } else {
        // Try parsing domain
        const domainMatch = fromHeader.match(/@([a-zA-Z0-9.-]+)\./);
        if (domainMatch && domainMatch[1] && !['gmail', 'yahoo', 'hotmail'].includes(domainMatch[1])) {
            company = domainMatch[1].charAt(0).toUpperCase() + domainMatch[1].slice(1);
        }
    }

    // Fallback: look for generic ATS names and try to parse subject
    if (company.toLowerCase().includes("greenhouse") || company.toLowerCase().includes("lever") || company.toLowerCase().includes("workday")) {
        company = "Unknown Company";
        // e.g. "Thank you for applying to Google!"
        const applyMatch = subjectHeader.match(/applying to|application to|role at (.*?)$/i);
        if (applyMatch && applyMatch[1]) {
            company = applyMatch[1].trim();
        }
    }

    // LinkedIn Specific Parsing
    if (company.toLowerCase().includes("linkedin") || fromHeader.toLowerCase().includes("linkedin") || subjectHeader.toLowerCase().includes("passion for talent")) {
        company = "LinkedIn (Unknown Company)";

        // 1. Sometimes linkedin puts the company in the subject: "Your application to Google was sent"
        // 2. Or: "Aayush, your application was sent to SKY Leasing"
        // 3. Or: "Your application was viewed by Selby Jennings"
        const liSubjectMatch1 = subjectHeader.match(/application to (.*?) was/i);
        const liSubjectMatch2 = subjectHeader.match(/application was sent to (.*?)$/i);
        const liSubjectMatch3 = subjectHeader.match(/application was viewed by (.*?)$/i);

        if (liSubjectMatch1 && liSubjectMatch1[1]) {
            company = liSubjectMatch1[1].trim();
        } else if (liSubjectMatch2 && liSubjectMatch2[1]) {
            company = liSubjectMatch2[1].trim();
        } else if (liSubjectMatch3 && liSubjectMatch3[1]) {
            company = liSubjectMatch3[1].trim();
        } else {
            // Try searching the full text for "application to [Company]" or "applied to [Company]"
            const snippetMatch = fullTextSearch.match(/application to (.*?)(?:has been|was)/i) || fullTextSearch.match(/applied to (.*?) for/i) || fullTextSearch.match(/your application to ([a-zA-Z0-9\s]+)/i);
            if (snippetMatch && snippetMatch[1]) {
                const possibleCompany = snippetMatch[1].trim();
                if (possibleCompany.length > 2 && possibleCompany.length < 50) {
                    company = possibleCompany;
                }
            }
        }
    }

    // 2. Extract Role
    let role = "Unknown Role";
    // Attempt to extract role from subject (e.g., "Application: Software Engineer")
    const roleKeywords = ["role", "position", "application for", "candidate for", "-", ":"];
    for (let keyword of roleKeywords) {
        if (subjectHeader.toLowerCase().includes(keyword)) {
            const parts = subjectHeader.split(new RegExp(keyword, 'i'));
            if (parts.length > 1) {
                // usually the longer part is the role, or the part not containing "company"
                role = parts[parts.length - 1].trim();
                if (role.length > 50) role = parts[0].trim(); // flip if too long
                break;
            }
        }
    }

    // Clean up role
    role = role.replace(/application|update|status|received|interview/ig, "").trim();

    // LinkedIn role parsing from snippet/body (since subject is often just "Your passion for talent" or "Application sent")
    if (company === "LinkedIn (Unknown Company)" || company.toLowerCase() === "linkedin" || company !== "Unknown Company") {
        // Look for common patterns from LinkedIn receipts in the full text
        const liRoleMatch = fullTextSearch.match(/for the (.*?) role/i) || fullTextSearch.match(/position of (.*?) at/i) || fullTextSearch.match(/applied to .*? for the (.*?) position/i);
        if (liRoleMatch && liRoleMatch[1]) {
            role = liRoleMatch[1].trim();
        }

        // If the role is still unknown, try grabbing the exact text between the header and the company repetition
        // e.g., "Your application was sent to SKY Leasing Treasury Analyst SKY Leasing · Dublin (On-site) Applied on..."
        if (!role || role.length < 3 || role === "Unknown Role") {
            // Escape company name before throwing it into a regex so it doesn't break if Company is "EUROPROP®"
            const safeCompany = company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Build a regex that looks specifically for the text between "sent to [Company]" and the next occurrence of "[Company]"
            // Or "viewed by [Company]" and the next occurrence of "[Company]"
            const roleRegexBlock = new RegExp(`(?:sent to|viewed by)\\s+${safeCompany}\\s+(.*?)\\s+${safeCompany}`, 'i');

            // Use bodyText to avoid the Snippet duplicating the "sent to" string at the start
            const searchTarget = bodyText || fullTextSearch;
            const blockMatch = searchTarget.match(roleRegexBlock);

            if (blockMatch && blockMatch[1] && blockMatch[1].length < 100) {
                role = blockMatch[1].trim();
            } else {
                // Fallback chunking if regex fails or captures too much
                const cleanSnippet = searchTarget.replace(new RegExp(`your application was (?:sent to|viewed by)\\s+${safeCompany}`, 'i'), '').trim();
                const firstChunk = cleanSnippet.split(new RegExp(safeCompany, 'i'))[0]?.trim();
                if (firstChunk && firstChunk.length >= 3 && firstChunk.length < 100) {
                    role = firstChunk;
                }
            }
        }
    }

    if (!role || role.length < 3 || role.toLowerCase() === "unknown role") {
        // Deep snippet search fallback
        const snippetRoleMatch = fullTextSearch.match(/(?:applied for|application for|interest in)\s+(?:the\s+)?(.*?)(?:\s+(?:position|role|at)|[.,!])/i);
        if (snippetRoleMatch && snippetRoleMatch[1]) {
            const possibleRole = snippetRoleMatch[1].trim();
            if (possibleRole.length > 2 && possibleRole.length < 50) {
                role = possibleRole;
            }
        }
    }

    if (!role || role.length < 3) role = "Unknown Role";
    if (!company || company.length < 2) company = "Unknown Company";

    // 3. Determine Status (Strict Keyword Matching to avoid promotional junk)
    let status = "Applied";
    const searchString = (subjectHeader + " " + fullTextSearch).toLowerCase();

    // Use regular expressions with word boundaries \b to ensure we don't match substrings of other words 
    // e.g. "proffered" won't match "offer"
    if (/\b(offer|offer letter|congratulations on the offer)\b/i.test(searchString) && !/\b(exclusive offer|special offer|promotional offer|limited time offer)\b/i.test(searchString)) {
        status = "Offer";
    } else if (/\b(interview|schedule an interview|chat with|speak with|interviewing)\b/i.test(searchString)) {
        status = "Interview";
    } else if (/\b(unfortunately|not moving forward|other candidates|we have decided to proceed with other candidates)\b/i.test(searchString)) {
        status = "Rejected";
    } else if (/\b(next steps|assessment|coding challenge|take-home|take home|application was viewed)\b/i.test(searchString)) {
        status = "Screening";
    }

    // Convert Date
    let parsedDate = new Date().toISOString().slice(0, 10); // Standard fallback is today

    // First, try to see if LinkedIn explicitly stated "Applied on [Date]" or "Viewed on [Date]" in the full body
    const explicitDateMatch = fullTextSearch.match(/(?:Applied on|Viewed on)\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i);
    if (explicitDateMatch && explicitDateMatch[1]) {
        try {
            const d = new Date(explicitDateMatch[1]);
            if (!isNaN(d.getTime())) {
                parsedDate = d.toISOString().slice(0, 10);
            }
        } catch (e) { }
    } else if (dateHeader) {
        // Fallback to the email received date
        try {
            const d = new Date(dateHeader);
            if (!isNaN(d.getTime())) {
                parsedDate = d.toISOString().slice(0, 10);
            }
        } catch (e) { }
    }

    return {
        company,
        role,
        status,
        date: parsedDate,
        source: "Gmail Sync",
        priority: "Target",
        notes: `Auto-synced from Gmail.\nSubject: ${subjectHeader}`,
        // ID will be assigned by saveApplication
    };
}
