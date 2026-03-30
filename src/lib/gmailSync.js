export async function fetchRecentApplications(accessToken) {
    if (!accessToken) throw new Error("No Google Access Token found");

    // Query 1: known ATS senders + LinkedIn
    const queryAts = [
        "newer_than:30d",
        "(",
        "from:linkedin.com OR from:greenhouse.io OR from:lever.co OR",
        "from:ashbyhq.com OR from:teamtailor.com OR from:smartrecruiters.com OR",
        "from:workday.com OR from:jobvite.com OR from:icims.com OR from:bamboohr.com",
        ")",
        "(",
        "subject:application OR subject:applied OR subject:\"thank you for\" OR",
        "subject:\"your application\" OR subject:interview OR subject:offer OR",
        "subject:\"we received\" OR subject:\"next steps\" OR subject:\"application received\"",
        ")",
    ].join(" ");

    // Query 2: direct company emails caught by subject patterns only
    const queryDirect = [
        "newer_than:30d",
        "NOT from:linkedin.com NOT from:greenhouse.io NOT from:lever.co",
        "NOT from:ashbyhq.com NOT from:teamtailor.com NOT from:smartrecruiters.com",
        "(",
        "subject:\"thank you for your application\" OR",
        "subject:\"we have received your application\" OR",
        "subject:\"application received\" OR",
        "subject:\"your application has been received\" OR",
        "subject:\"we received your application\"",
        ")",
    ].join(" ");

    try {
        const [atsMessages, directMessages] = await Promise.all([
            fetchMessages(accessToken, queryAts),
            fetchMessages(accessToken, queryDirect),
        ]);

        // Merge and deduplicate by message ID
        const seen = new Set();
        const allMessages = [];
        for (const msg of [...atsMessages, ...directMessages]) {
            if (!seen.has(msg.id)) {
                seen.add(msg.id);
                allMessages.push(msg);
            }
        }

        if (allMessages.length === 0) return [];

        const applications = [];
        for (const msg of allMessages) {
            const detailsResponse = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (detailsResponse.ok) {
                const details = await detailsResponse.json();
                const parsed = parseEmailToApplication(details);
                if (parsed) applications.push(parsed);
            }
        }

        return applications;

    } catch (error) {
        console.error("Gmail Sync Error:", error);
        throw error;
    }
}

async function fetchMessages(accessToken, query) {
    let messages = [];
    let pageToken = null;
    let pageCount = 0;

    do {
        const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100${pageToken ? `&pageToken=${pageToken}` : ""}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

        if (!res.ok) {
            let errMsg = "Failed to fetch from Gmail API.";
            try { const d = await res.json(); if (d.error?.message) errMsg += ` ${d.error.message}`; } catch (e) {}
            throw new Error(errMsg);
        }

        const data = await res.json();
        if (data.messages) messages = messages.concat(data.messages);
        pageToken = data.nextPageToken;
        pageCount++;
    } while (pageToken && pageCount < 5);

    return messages;
}

// ─── EMAIL PARSING ────────────────────────────────────────────────────────────

function extractEmailBodyText(payload) {
    if (!payload) return "";

    let plainText = "";
    let htmlText = "";

    function decodeBase64(data) {
        try {
            const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
            return decodeURIComponent(escape(window.atob(base64)));
        } catch (e) { return ""; }
    }

    function traverse(node) {
        if (node.mimeType === "text/plain" && node.body?.data) {
            plainText += decodeBase64(node.body.data) + " ";
        } else if (node.mimeType === "text/html" && node.body?.data) {
            htmlText += decodeBase64(node.body.data) + " ";
        } else if (node.parts) {
            for (const part of node.parts) traverse(part);
        }
    }

    traverse(payload);

    let body = plainText.trim() ? plainText : htmlText.replace(/<[^>]*>?/gm, ' ');
    body = body.replace(/https?:\/\/[^\s]+/g, '');
    return body.replace(/\s+/g, ' ').trim();
}

function getSenderDomain(fromHeader) {
    const match = fromHeader.match(/@([a-zA-Z0-9.-]+)\./);
    return match ? match[1].toLowerCase() : "";
}

function isAtsSender(fromHeader) {
    const atsDomains = ["greenhouse.io", "lever.co", "ashbyhq.com", "teamtailor.com",
        "smartrecruiters.com", "workday.com", "jobvite.com", "icims.com", "bamboohr.com"];
    return atsDomains.some(d => fromHeader.toLowerCase().includes(d));
}

function isLinkedInSender(fromHeader) {
    return fromHeader.toLowerCase().includes("linkedin.com");
}

function parseEmailToApplication(emailDetails) {
    if (!emailDetails?.payload?.headers) return null;

    const headers = emailDetails.payload.headers;
    const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || "";
    const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || "";
    const dateHeader = headers.find(h => h.name.toLowerCase() === 'date')?.value || "";
    const bodyText = extractEmailBodyText(emailDetails.payload);
    const snippet = emailDetails.snippet || "";
    const fullText = (snippet + " " + bodyText).trim();
    const senderDomain = getSenderDomain(from);
    const isLinkedIn = isLinkedInSender(from);
    const isAts = isAtsSender(from);
    const isDirect = !isLinkedIn && !isAts;

    // ── 1. Company extraction ─────────────────────────────────────────────────

    let company = "Unknown Company";

    // Extract sender display name
    const senderNameMatch = from.match(/^"?([^"<]+)"?\s*</);
    const senderName = senderNameMatch ? senderNameMatch[1].trim() : "";

    if (isLinkedIn) {
        // LinkedIn: company is in subject or body
        const patterns = [
            /application to (.*?) was/i,
            /application was sent to (.*?)$/i,
            /application was viewed by (.*?)$/i,
            /your application to ([^.]+)/i,
        ];
        for (const p of patterns) {
            const m = subject.match(p) || fullText.match(p);
            if (m?.[1] && m[1].length < 60) { company = m[1].trim(); break; }
        }
        if (company === "Unknown Company") {
            // Try body block extraction
            const bodyMatch = fullText.match(/(?:sent to|viewed by)\s+(.+?)\s+(.+?)\s+\1/i);
            if (bodyMatch?.[1] && bodyMatch[1].length < 60) company = bodyMatch[1].trim();
        }
    } else if (isAts) {
        // ATS: sender display name usually IS the company
        // Clean up common ATS suffixes
        const cleaned = senderName
            .replace(/\s*(recruiting|talent|careers|team|hr|hiring|people|jobs)\s*/gi, " ")
            .replace(/\s+/g, " ")
            .trim();
        if (cleaned && cleaned.length > 1 && !cleaned.toLowerCase().includes("notification")) {
            company = cleaned;
        }
        // Also try subject patterns
        const subjectPatterns = [
            /thank you for (?:applying|your application) to ([^!.]+)/i,
            /your application (?:to|at|for.*at) ([^!.]+)/i,
            /application (?:received|confirmed) (?:at|for|–|-) ([^!.]+)/i,
            /we received your application (?:for|at) (?:.*? at )?([^!.]+)/i,
        ];
        for (const p of subjectPatterns) {
            const m = subject.match(p);
            if (m?.[1] && m[1].length < 60 && company === "Unknown Company") {
                company = m[1].trim(); break;
            }
        }
    } else {
        // Direct company email: use sender name, then domain
        if (senderName && !["gmail", "yahoo", "hotmail", "outlook"].some(x => senderName.toLowerCase().includes(x))) {
            const cleaned = senderName.replace(/\s*(recruiting|talent|careers|team|hr|hiring|noreply|no-reply|donotreply)\s*/gi, " ").trim();
            if (cleaned.length > 1) company = cleaned;
        }
        if (company === "Unknown Company" && senderDomain && !["gmail", "yahoo", "hotmail", "outlook"].includes(senderDomain)) {
            company = senderDomain.charAt(0).toUpperCase() + senderDomain.slice(1);
        }
        // Subject: "Thank you for applying to [Company]"
        const m = subject.match(/(?:applying|application) to ([^!.]+)/i) ||
            subject.match(/your application (?:to|at) ([^!.]+)/i);
        if (m?.[1] && m[1].length < 60) company = m[1].trim();
    }

    // ── 2. Role extraction ────────────────────────────────────────────────────

    let role = "Unknown Role";

    // Try body structured fields first (Greenhouse/Lever/Ashby often include these)
    const structuredMatch =
        bodyText.match(/(?:position|job title|role|job)[:\s]+([^\n•|,]{3,60})/i) ||
        bodyText.match(/(?:Position|Job Title|Role):\s*(.+)/i);
    if (structuredMatch?.[1]) {
        role = structuredMatch[1].trim().replace(/\.$/, "");
    }

    if (!role || role === "Unknown Role") {
        const rolePatterns = [
            /for the ([\w\s,&()-]{3,60}?) (?:role|position)/i,
            /position of ([\w\s,&()-]{3,60}?) at/i,
            /applied for (?:the )?([\w\s,&()-]{3,60}?) (?:position|role)/i,
            /application for (?:the )?([\w\s,&()-]{3,60}?) at/i,
            /your application for ([\w\s,&()-]{3,60}?) has/i,
            /interest in (?:the )?([\w\s,&()-]{3,60}?) (?:role|position|opportunity)/i,
        ];
        for (const p of rolePatterns) {
            const m = fullText.match(p) || subject.match(p);
            if (m?.[1] && m[1].length >= 3 && m[1].length < 60) {
                role = m[1].trim(); break;
            }
        }
    }

    // LinkedIn body block: "sent to [Company] [Role] [Company] · Location"
    if ((role === "Unknown Role") && isLinkedIn && company !== "Unknown Company") {
        const safeCompany = company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const blockMatch = bodyText.match(new RegExp(`(?:sent to|viewed by)\\s+${safeCompany}\\s+(.+?)\\s+${safeCompany}`, 'i'));
        if (blockMatch?.[1] && blockMatch[1].length < 100) role = blockMatch[1].trim();
    }

    // Subject fallback
    if (role === "Unknown Role") {
        const subjectRoleMatch =
            subject.match(/application[:\-–]\s*(.+)/i) ||
            subject.match(/re:\s*(.+)/i);
        if (subjectRoleMatch?.[1]) {
            const candidate = subjectRoleMatch[1].replace(/application|update|status|received|interview/gi, "").trim();
            if (candidate.length >= 3 && candidate.length < 60) role = candidate;
        }
    }

    if (!role || role.length < 3) role = "Unknown Role";
    if (!company || company.length < 2) company = "Unknown Company";

    // ── 3. Status ─────────────────────────────────────────────────────────────

    let status = "Applied";
    const searchStr = (subject + " " + fullText).toLowerCase();

    if (/\b(offer|offer letter|congratulations on the offer)\b/i.test(searchStr) &&
        !/\b(exclusive offer|special offer|promotional offer|limited time offer)\b/i.test(searchStr)) {
        status = "Offer";
    } else if (/\b(interview|schedule an interview|chat with|speak with|interviewing|we'd like to invite you|invite you to interview)\b/i.test(searchStr)) {
        status = "Interview";
    } else if (/\b(unfortunately|not moving forward|other candidates|we have decided to proceed with other|not selected|won't be moving|will not be moving)\b/i.test(searchStr)) {
        status = "Rejected";
    } else if (/\b(next steps|assessment|coding challenge|take-home|take home|application was viewed|move forward|moving forward)\b/i.test(searchStr)) {
        status = "Screening";
    }

    // ── 4. Date ───────────────────────────────────────────────────────────────

    let parsedDate = new Date().toISOString().slice(0, 10);

    const explicitDateMatch = fullText.match(/(?:Applied on|Viewed on|Received on)\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i);
    if (explicitDateMatch) {
        try { const d = new Date(explicitDateMatch[1]); if (!isNaN(d.getTime())) parsedDate = d.toISOString().slice(0, 10); } catch (e) {}
    } else if (dateHeader) {
        try { const d = new Date(dateHeader); if (!isNaN(d.getTime())) parsedDate = d.toISOString().slice(0, 10); } catch (e) {}
    }

    // ── 5. Source ─────────────────────────────────────────────────────────────

    const source = isLinkedIn ? "LinkedIn" : "Company Site";

    return {
        company,
        role,
        status,
        date: parsedDate,
        source,
        priority: "Target",
        notes: `Auto-synced from Gmail.\nSubject: ${subject}`,
    };
}
