// Discovery pipeline:
// 1. LinkedIn guest API  — scrapes linkedin.com directly, returns linkedin.com/jobs/view/... URLs + full descriptions
// 2. JSearch (RapidAPI)  — indexes company career sites + some aggregators, full descriptions

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const JSEARCH_HOST = "jsearch.p.rapidapi.com";

// LinkedIn guest API search queries
const LINKEDIN_SEARCHES = [
  { keywords: "investment analyst graduate", location: "Dublin, Ireland" },
  { keywords: "fund accountant graduate", location: "Dublin, Ireland" },
  { keywords: "fund administrator graduate", location: "Dublin, Ireland" },
  { keywords: "financial analyst graduate", location: "Dublin, Ireland" },
  { keywords: "equity research analyst", location: "Dublin, Ireland" },
  { keywords: "markets analyst graduate", location: "Dublin, Ireland" },
  { keywords: "FP&A analyst graduate", location: "Dublin, Ireland" },
  { keywords: "investment analyst graduate", location: "Frankfurt, Germany" },
  { keywords: "investment analyst graduate", location: "Amsterdam, Netherlands" },
];

// JSearch queries — focuses on company career sites that LinkedIn/JSearch miss
const JSEARCH_QUERIES = [
  { query: "fund administrator Dublin graduate", location: "Ireland" },
  { query: "investment analyst graduate Ireland", location: "Ireland" },
  { query: "financial analyst graduate Ireland", location: "Ireland" },
  { query: "middle office analyst graduate Dublin", location: "Ireland" },
  { query: "equity research analyst Frankfurt graduate", location: "Germany" },
  { query: "investment analyst Amsterdam graduate", location: "Netherlands" },
];

const SENIOR_SIGNALS = [
  "senior", " sr ", "sr.", "manager", "director", "vice president",
  " vp ", "avp", "head of", " lead ", "principal", "associate director",
  "managing director", " md ", "chief ", "executive director",
  "experienced hire", "team lead", "5+ years", "7+ years",
];

function isTooSenior(title = "") {
  const t = ` ${title.toLowerCase()} `;
  return SENIOR_SIGNALS.some(s => t.includes(s));
}

const TARGET_COUNTRIES = new Set(["IE", "DE", "NL", "BE", "FR", "LU", "AT", "CH", "GB"]);

function isTargetLocation(job) {
  if (!job.country) return true;
  return TARGET_COUNTRIES.has(job.country);
}

function countryFromText(loc = "") {
  const l = loc.toLowerCase();
  if (l.includes("ireland") || l.endsWith(", ie")) return "IE";
  if (l.includes("germany") || l.endsWith(", de")) return "DE";
  if (l.includes("netherlands") || l.endsWith(", nl")) return "NL";
  if (l.includes("belgium") || l.endsWith(", be")) return "BE";
  if (l.includes("france") || l.endsWith(", fr")) return "FR";
  if (l.includes("luxembourg") || l.endsWith(", lu")) return "LU";
  if (l.includes("austria") || l.endsWith(", at")) return "AT";
  if (l.includes("switzerland") || l.endsWith(", ch")) return "CH";
  if (l.includes("united kingdom") || l.includes(", uk") || l.endsWith(", gb")) return "GB";
  return "";
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
}

// Parse the HTML list response from LinkedIn's guest job search API
function parseLinkedInSearchHTML(html) {
  const jobs = [];
  // Each card contains a data-entity-urn with the job ID
  const cardRegex = /data-entity-urn="urn:li:jobPosting:(\d+)"[\s\S]*?(?=data-entity-urn=|$)/g;
  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    const jobId = match[1];
    const chunk = match[0];

    const titleMatch = chunk.match(/class="base-search-card__title"[^>]*>\s*([\s\S]*?)\s*<\/h3>/);
    const companyMatch = chunk.match(/class="hidden-nested-link"[^>]*>\s*([\s\S]*?)\s*<\/a>/);
    const locationMatch = chunk.match(/class="job-search-card__location"[^>]*>\s*([\s\S]*?)\s*<\/span>/);
    const dateMatch = chunk.match(/datetime="([^"]+)"/);

    const title = titleMatch ? decodeHtmlEntities(stripTags(titleMatch[1])) : "";
    const company = companyMatch ? decodeHtmlEntities(stripTags(companyMatch[1])) : "";
    const location = locationMatch ? decodeHtmlEntities(stripTags(locationMatch[1])) : "";
    const postedAt = dateMatch ? dateMatch[1] : null;

    if (!title || !company) continue;

    jobs.push({ jobId, title, company, location, postedAt });
  }
  return jobs;
}

// Fetch full job description from LinkedIn's guest individual job API
async function fetchLinkedInDescription(jobId) {
  try {
    const res = await fetch(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return "";
    const html = await res.text();
    const descMatch = html.match(/class="show-more-less-html__markup[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (!descMatch) return "";
    return decodeHtmlEntities(stripTags(descMatch[1])).replace(/\s{2,}/g, "\n").trim();
  } catch {
    return "";
  }
}

// Scrape LinkedIn's public guest job search API — returns real linkedin.com/jobs/view/... URLs
async function fetchLinkedInGuestJobs() {
  const browserHeaders = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
  };

  // Step 1: Fetch all search result pages in parallel
  const searchResults = await Promise.allSettled(
    LINKEDIN_SEARCHES.map(({ keywords, location }) => {
      const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&f_TPR=r604800&start=0`;
      return fetch(url, { headers: browserHeaders }).then(r => r.ok ? r.text() : "").catch(() => "");
    })
  );

  // Step 2: Parse all results, dedup by jobId, filter seniority
  const seenIds = new Set();
  const candidates = [];
  for (const result of searchResults) {
    if (result.status !== "fulfilled" || !result.value) continue;
    const parsed = parseLinkedInSearchHTML(result.value);
    for (const job of parsed) {
      if (seenIds.has(job.jobId)) continue;
      if (isTooSenior(job.title)) continue;
      seenIds.add(job.jobId);
      candidates.push(job);
    }
  }

  // Step 3: Fetch full descriptions for all candidates in parallel (capped at 15)
  const top = candidates.slice(0, 15);
  const descriptions = await Promise.all(top.map(j => fetchLinkedInDescription(j.jobId)));

  // Step 4: Build normalized job objects
  return top.map((job, i) => ({
    source: "linkedin",
    externalId: `li_${job.jobId}`,
    title: job.title,
    company: job.company,
    location: job.location,
    country: countryFromText(job.location),
    postedAt: job.postedAt,
    url: `https://www.linkedin.com/jobs/view/${job.jobId}/`,
    description: descriptions[i] || "",
    salary: null,
    employmentType: "",
    employerLogo: null,
  }));
}

// JSearch normalization
function detectJSearchSource(job) {
  const applyLink = (job.job_apply_link || "").toLowerCase();
  const googleLink = (job.job_google_link || "").toLowerCase();
  const publisher = (job.job_publisher || "").toLowerCase();
  // Only flag as "linkedin" if the apply URL actually goes to LinkedIn
  if (applyLink.includes("linkedin.com") || googleLink.includes("linkedin.com")) return "linkedin";
  if (applyLink.includes("indeed.com") || publisher.includes("indeed")) return "indeed";
  return "company";
}

function normalizeJSearchJob(job) {
  const source = detectJSearchSource(job);
  // Prefer LinkedIn URL if detected, otherwise use apply/google link
  let url = job.job_apply_link || job.job_google_link || "";
  if (source === "linkedin" && !url.includes("linkedin.com") && job.job_google_link?.includes("linkedin.com")) {
    url = job.job_google_link;
  }
  const salary = job.job_min_salary
    ? `€${Number(job.job_min_salary).toLocaleString()} – €${Number(job.job_max_salary || job.job_min_salary).toLocaleString()}`
    : null;
  return {
    source,
    externalId: job.job_id || "",
    title: (job.job_title || "").trim(),
    company: (job.employer_name || "").trim(),
    location: [job.job_city, job.job_country].filter(Boolean).join(", "),
    country: job.job_country || "",
    postedAt: job.job_posted_at_datetime_utc || null,
    url,
    description: (job.job_description || "").trim(),
    salary,
    employmentType: job.job_employment_type || "",
    employerLogo: job.employer_logo || null,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!RAPIDAPI_KEY) {
    return res.status(500).json({ error: "RAPIDAPI_KEY not configured." });
  }

  const jsearchHeaders = {
    "x-rapidapi-key": RAPIDAPI_KEY,
    "x-rapidapi-host": JSEARCH_HOST,
  };

  // Run LinkedIn guest scraper + JSearch in parallel
  const [linkedInJobs, jsearchResults] = await Promise.all([
    fetchLinkedInGuestJobs().catch(() => []),
    Promise.allSettled(
      JSEARCH_QUERIES.map(({ query, location }) => {
        const url = `https://${JSEARCH_HOST}/search?query=${encodeURIComponent(query)}&page=1&num_pages=2&location=${encodeURIComponent(location)}&date_posted=week`;
        return fetch(url, { headers: jsearchHeaders }).then(r => r.ok ? r.json() : { data: [] });
      })
    ),
  ]);

  const seen = new Set();
  const jobs = [];

  // LinkedIn jobs first — they have real LinkedIn URLs
  for (const job of linkedInJobs) {
    if (!job.externalId || seen.has(job.externalId)) continue;
    seen.add(job.externalId);
    jobs.push(job);
  }

  // JSearch jobs — company sites + aggregators
  for (const result of jsearchResults) {
    if (result.status !== "fulfilled") continue;
    const items = result.value?.data;
    if (!Array.isArray(items)) continue;
    for (const raw of items) {
      if (!raw.job_id || seen.has(raw.job_id)) continue;
      if (!raw.job_title || !raw.employer_name) continue;
      if (isTooSenior(raw.job_title)) continue;
      seen.add(raw.job_id);
      jobs.push(normalizeJSearchJob(raw));
    }
  }

  // Secondary dedupe: same company+title from different sources
  const comboSeen = new Set();
  const unique = jobs.filter(j => {
    const key = `${j.company.toLowerCase().trim()}::${j.title.toLowerCase().trim()}`;
    if (comboSeen.has(key)) return false;
    comboSeen.add(key);
    return true;
  });

  const filtered = unique.filter(isTargetLocation);
  const liCount = linkedInJobs.length;
  console.log(`Discovery: ${liCount} LinkedIn + ${jobs.length - liCount} JSearch → ${unique.length} deduped → ${filtered.length} after location filter`);

  return res.status(200).json({
    jobs: filtered,
    meta: {
      raw: jobs.length,
      linkedin: liCount,
      unique: unique.length,
      filtered: filtered.length,
      queries: LINKEDIN_SEARCHES.length + JSEARCH_QUERIES.length,
    },
  });
}
