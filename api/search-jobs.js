require('dotenv').config({ path: '.env.local' });

const SCAM_SIGNALS = [
  "commission only", "commission-only", "mlm", "multi-level",
  "be your own boss", "unlimited earning", "network marketing",
  "no experience needed", "guaranteed income",
];

const SEARCH_QUERIES = [
  "equity research analyst",
  "financial analyst graduate",
  "investment analyst",
  "graduate scheme finance",
  "markets analyst",
];

function isScam(title = "", description = "") {
  const text = `${title} ${description}`.toLowerCase();
  return SCAM_SIGNALS.some(s => text.includes(s));
}

function mapJob(job) {
  return {
    id: job.job_id,
    title: job.job_title || "",
    company: job.employer_name || "",
    location: [job.job_city, job.job_country].filter(Boolean).join(", "),
    url: job.job_apply_link || job.job_google_link || "",
    description: job.job_description || "",
    postedAt: job.job_posted_at_datetime_utc || null,
    easyApply: job.job_apply_is_direct === false,
    employerLogo: job.employer_logo || null,
    employmentType: job.job_employment_type || "",
    salary: job.job_min_salary
      ? `€${job.job_min_salary.toLocaleString()}–€${job.job_max_salary?.toLocaleString()}`
      : "",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "RAPIDAPI_KEY not configured." });
  }

  try {
    const keywords = (Array.isArray(req.body?.keywords) && req.body.keywords.length > 0)
      ? req.body.keywords : SEARCH_QUERIES;
    const dateFilter = req.body?.dateFilter || "week";

    const results = await Promise.allSettled(
      keywords.map(query =>
        fetch(
          `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&num_pages=2&location=Ireland&date_posted=${dateFilter}`,
          { headers: { "x-rapidapi-key": apiKey, "x-rapidapi-host": "jsearch.p.rapidapi.com" } }
        ).then(r => r.json())
      )
    );

    const seen = new Set();
    const jobs = [];
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const data = result.value;
      if (!Array.isArray(data.data)) continue;
      for (const job of data.data) {
        if (!job.job_id || seen.has(job.job_id)) continue;
        if (isScam(job.job_title, job.job_description)) continue;
        seen.add(job.job_id);
        jobs.push(mapJob(job));
      }
    }

    return res.status(200).json({ jobs });
  } catch (err) {
    console.error("search-jobs error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
