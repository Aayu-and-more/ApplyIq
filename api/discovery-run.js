// Discovery pipeline — JSearch (indexes LinkedIn, Indeed, company sites) + direct LinkedIn Jobs API

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const JSEARCH_HOST = "jsearch.p.rapidapi.com";
const LINKEDIN_HOST = "linkedin-jobs-search.p.rapidapi.com";

// Broader/different queries than the Job Hunt view, targeting Dublin + EU locations
const DISCOVERY_SEARCHES = [
  { query: "equity research analyst graduate", location: "Dublin" },
  { query: "investment analyst graduate", location: "Dublin" },
  { query: "fund administrator Dublin", location: "Ireland" },
  { query: "financial analyst graduate Ireland", location: "Ireland" },
  { query: "fund accountant Dublin graduate", location: "Ireland" },
  { query: "markets analyst graduate", location: "Ireland" },
  { query: "FP&A analyst graduate", location: "Ireland" },
  { query: "equity research analyst Frankfurt", location: "Germany" },
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

function detectSource(job) {
  const applyLink = (job.job_apply_link || "").toLowerCase();
  const publisher = (job.job_publisher || "").toLowerCase();
  const googleLink = (job.job_google_link || "").toLowerCase();

  if (publisher.includes("linkedin") || applyLink.includes("linkedin.com") || googleLink.includes("linkedin.com")) {
    return "linkedin";
  }
  if (publisher.includes("indeed") || applyLink.includes("indeed.com")) {
    return "indeed";
  }
  // LinkedIn Easy Apply jobs have indirect apply
  if (job.job_apply_is_direct === false) {
    return "linkedin";
  }
  return "company";
}

// Only keep jobs from Ireland/core EU. Empty country = keep (unknown = benefit of doubt).
const TARGET_COUNTRIES = new Set(["IE", "DE", "NL", "BE", "FR", "LU", "AT", "CH", "GB"]);

function normalizeJob(job) {
  const source = detectSource(job);
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
    url: job.job_apply_link || job.job_google_link || "",
    description: (job.job_description || "").trim(),
    salary,
    employmentType: job.job_employment_type || "",
    employerLogo: job.employer_logo || null,
  };
}

function isTargetLocation(job) {
  if (!job.country) return true; // unknown → keep
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

// LinkedIn Jobs Search API — gracefully returns [] if not subscribed
async function fetchLinkedInJobs() {
  const queries = [
    { keywords: "investment analyst graduate", location: "Dublin, Ireland" },
    { keywords: "fund accountant graduate Dublin", location: "Dublin, Ireland" },
    { keywords: "financial analyst graduate Ireland", location: "Ireland" },
    { keywords: "equity research analyst", location: "Dublin, Ireland" },
    { keywords: "markets analyst graduate", location: "Dublin, Ireland" },
    { keywords: "investment analyst graduate", location: "Frankfurt, Germany" },
    { keywords: "investment analyst graduate", location: "Amsterdam, Netherlands" },
  ];

  const results = await Promise.allSettled(
    queries.map(({ keywords, location }) => {
      const url = `https://${LINKEDIN_HOST}/?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&dateSincePosted=past%20week&sort=mostRelevant&start=0`;
      return fetch(url, {
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": LINKEDIN_HOST,
        },
      }).then(r => (r.ok ? r.json() : []));
    })
  );

  const jobs = [];
  for (const result of results) {
    if (result.status !== "fulfilled" || !Array.isArray(result.value)) continue;
    for (const job of result.value) {
      if (!job.position || !job.company) continue;
      if (isTooSenior(job.position)) continue;
      const location = job.location || "";
      jobs.push({
        source: "linkedin",
        externalId: `li_${job.id || job.link || Math.random()}`,
        title: job.position.trim(),
        company: job.company.trim(),
        location,
        country: countryFromText(location),
        postedAt: null,
        url: job.link || "",
        description: job.description || "",
        salary: null,
        employmentType: "",
        employerLogo: job.companyLogo || null,
      });
    }
  }
  return jobs;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!RAPIDAPI_KEY) {
    return res.status(500).json({ error: "RAPIDAPI_KEY not configured." });
  }

  const headers = {
    "x-rapidapi-key": RAPIDAPI_KEY,
    "x-rapidapi-host": JSEARCH_HOST,
  };

  // Run JSearch + LinkedIn in parallel
  const [jsearchResults, linkedInJobs] = await Promise.all([
    Promise.allSettled(
      DISCOVERY_SEARCHES.map(({ query, location }) => {
        const url = `https://${JSEARCH_HOST}/search?query=${encodeURIComponent(query)}&page=1&num_pages=2&location=${encodeURIComponent(location)}&date_posted=week`;
        return fetch(url, { headers }).then(r => r.ok ? r.json() : { data: [] });
      })
    ),
    fetchLinkedInJobs().catch(() => []),
  ]);

  const seen = new Set();
  const jobs = [];

  // Process JSearch results
  for (const result of jsearchResults) {
    if (result.status !== "fulfilled") continue;
    const items = result.value?.data;
    if (!Array.isArray(items)) continue;

    for (const raw of items) {
      if (!raw.job_id || seen.has(raw.job_id)) continue;
      if (!raw.job_title || !raw.employer_name) continue;
      if (isTooSenior(raw.job_title)) continue;
      seen.add(raw.job_id);
      jobs.push(normalizeJob(raw));
    }
  }

  // Merge LinkedIn results (dedup by externalId)
  for (const job of linkedInJobs) {
    if (!job.externalId || seen.has(job.externalId)) continue;
    seen.add(job.externalId);
    jobs.push(job);
  }

  const liCount = linkedInJobs.length;
  console.log(`Discovery: ${jobs.length} raw (incl. ${liCount} LinkedIn direct)`);

  // Secondary dedupe by company+title (catches same job from multiple queries)
  const comboSeen = new Set();
  const unique = jobs.filter(j => {
    const key = `${j.company.toLowerCase().trim()}::${j.title.toLowerCase().trim()}`;
    if (comboSeen.has(key)) return false;
    comboSeen.add(key);
    return true;
  });

  const filtered = unique.filter(isTargetLocation);
  console.log(`Discovery: ${jobs.length} raw → ${unique.length} deduped → ${filtered.length} after location filter`);

  return res.status(200).json({
    jobs: filtered,
    meta: {
      raw: jobs.length,
      unique: unique.length,
      filtered: filtered.length,
      linkedInDirect: liCount,
      queries: DISCOVERY_SEARCHES.length,
    },
  });
}
