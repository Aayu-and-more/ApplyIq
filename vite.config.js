import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Inject all .env.local vars (including non-VITE_ ones) into process.env
  // so that server-side API handlers can read them via process.env
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)
  return {
    plugins: [
      react(),
      {
        name: 'api-dev-middleware',
        configureServer(server) {
          server.middlewares.use('/api/search-jobs', (req, res) => {
            res.setHeader('Content-Type', 'application/json')
            const chunks = []
            req.on('data', chunk => chunks.push(chunk))
            req.on('end', async () => {
              try {
                const body = chunks.length > 0
                  ? JSON.parse(Buffer.concat(chunks).toString())
                  : {}
                const { default: handler } = await import('./api/search-jobs.js')
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

          server.middlewares.use('/api/discovery-run', (req, res) => {
            res.setHeader('Content-Type', 'application/json')
            const chunks = []
            req.on('data', chunk => chunks.push(chunk))
            req.on('end', async () => {
              try {
                const body = chunks.length > 0
                  ? JSON.parse(Buffer.concat(chunks).toString())
                  : {}
                const { default: handler } = await import('./api/discovery-run.js')
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
