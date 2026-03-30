import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const SCAM_SIGNALS = [
  "commission only", "commission-only", "mlm", "multi-level",
  "be your own boss", "unlimited earning", "network marketing",
];

const SEARCH_QUERIES = [
  "equity research analyst",
  "financial analyst",
  "investment analyst",
  "graduate scheme finance",
  "markets analyst",
  "financial analyst graduate",
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'api-dev-middleware',
        configureServer(server) {
          server.middlewares.use('/api/search-jobs', (req, res) => {
            res.setHeader('Content-Type', 'application/json')
            const apiKey = env.RAPIDAPI_KEY
            if (!apiKey) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'RAPIDAPI_KEY not set in .env.local' }))
              return
            }
            const chunks = []
            req.on('data', chunk => chunks.push(chunk))
            req.on('end', async () => {
              try {
                let body = {}
                if (chunks.length > 0) {
                  try { body = JSON.parse(Buffer.concat(chunks).toString()) } catch (e) {}
                }
                const keywords = (Array.isArray(body.keywords) && body.keywords.length > 0)
                  ? body.keywords : SEARCH_QUERIES
                const dateFilter = body.dateFilter || 'week'

                const results = await Promise.allSettled(
                  keywords.map(query =>
                    fetch(
                      `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&num_pages=2&location=Ireland&date_posted=${dateFilter}`,
                      { headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'jsearch.p.rapidapi.com' } }
                    ).then(r => r.json())
                  )
                )

                const seen = new Set()
                const jobs = []
                for (const result of results) {
                  if (result.status !== 'fulfilled') continue
                  const data = result.value
                  if (!Array.isArray(data.data)) continue
                  for (const job of data.data) {
                    if (!job.job_id || seen.has(job.job_id)) continue
                    if (isScam(job.job_title, job.job_description)) continue
                    seen.add(job.job_id)
                    jobs.push(mapJob(job))
                  }
                }

                res.end(JSON.stringify({ jobs }))
              } catch (err) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: err.message }))
              }
            })
          })

          server.middlewares.use('/api/generate-resume', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }
            // Forward to the Vercel function handler directly
            const chunks = []
            req.on('data', chunk => chunks.push(chunk))
            req.on('end', async () => {
              res.setHeader('Content-Type', 'application/json')
              try {
                const body = JSON.parse(Buffer.concat(chunks).toString())
                // Dynamically import the handler
                const { default: handler } = await import('./api/generate-resume.js')
                // Create mock req/res compatible with the handler
                const mockReq = { method: 'POST', body }
                const mockRes = {
                  _status: 200,
                  status(code) { this._status = code; return this },
                  json(data) { res.statusCode = this._status; res.end(JSON.stringify(data)) },
                }
                await handler(mockReq, mockRes)
              } catch (err) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: err.message }))
              }
            })
          })
        }
      }
    ],
  }
})
