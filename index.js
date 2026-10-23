/**
 * Host half of the OpenCode Go usage bundle.
 *
 * The browser must not hold the provider key, so this exact route keeps the
 * credential on the Host: it reads the same `OPENCODE_GO_API_KEY` reference the
 * `opencode-go` LLM route uses, queries the subscription usage endpoint, and
 * returns only the three quota windows. Every failure becomes a small JSON
 * result with a stable code; the handler never throws into the HTTP server.
 */

const USAGE_URL = 'https://opencode.ai/zen/go/v1/usage'
const ROUTE = '/opencode-go/usage'
const WINDOWS = ['rolling', 'weekly', 'monthly']
const CREDENTIAL = 'OPENCODE_GO_API_KEY'
const TIMEOUT_MS = 15000

export const inject = ['webServer', 'credentials', 'connection']

/** Keep known window fields; null means absent, undefined means malformed. */
function normalizeWindow(value) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'object' || Array.isArray(value)) return undefined
  if (!['status', 'percent', 'resetsAt'].some((name) => Object.hasOwn(value, name))) return undefined
  const { status, percent, resetsAt } = value
  if (status !== undefined && status !== null && typeof status !== 'string') return undefined
  if (percent !== undefined && percent !== null && (typeof percent !== 'number' || !Number.isFinite(percent))) return undefined
  if (resetsAt !== undefined && resetsAt !== null && typeof resetsAt !== 'string') return undefined
  return { status: status ?? null, percent: percent ?? null, resetsAt: resetsAt ?? null }
}

/** Query upstream usage and map every outcome to a status plus JSON body. */
async function usageOutcome(ctx) {
  const credential = await ctx.credentials.resolve(CREDENTIAL)
  if (credential === undefined) return { status: 401, body: { code: 'missing-key' } }

  let response
  try {
    response = await fetch(USAGE_URL, {
      headers: {
        authorization: `Bearer ${credential.value}`,
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    return { status: 502, body: { code: 'network' } }
  }

  if (!response.ok) return { status: 502, body: { code: 'upstream', status: response.status } }

  let body
  try {
    body = await response.json()
  } catch {
    return { status: 502, body: { code: 'invalid-response' } }
  }

  const usage = body !== null && typeof body === 'object' && body.usage !== undefined ? body.usage : body
  if (usage === null || typeof usage !== 'object' || Array.isArray(usage) || !WINDOWS.some((name) => Object.hasOwn(usage, name))) {
    return { status: 502, body: { code: 'invalid-response' } }
  }

  const normalized = {}
  for (const name of WINDOWS) {
    const window = normalizeWindow(usage[name])
    if (window === undefined) return { status: 502, body: { code: 'invalid-response' } }
    normalized[name] = window
  }
  return { status: 200, body: { usage: normalized } }
}

/** Answer with JSON and no caching: quota values are live facts. */
function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.setHeader('x-content-type-options', 'nosniff')
  res.end(JSON.stringify(body))
}

export function apply(ctx) {
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: ROUTE,
        handler: async (req, res) => {
          let outcome
          try {
            const rejection = ctx.connection.requestRejection(req)
            if (rejection !== undefined) {
              outcome = { status: rejection, body: { code: rejection === 401 ? 'unauthorized' : 'forbidden' } }
            } else if (req.method !== 'GET' && req.method !== 'HEAD') {
              res.setHeader('allow', 'GET, HEAD')
              outcome = { status: 405, body: { code: 'method-not-allowed' } }
            } else {
              outcome = await usageOutcome(ctx)
            }
          } catch (error) {
            ctx.logger?.warn('opencode-go-usage: query failed: %s', error instanceof Error ? error.message : String(error))
            outcome = { status: 500, body: { code: 'internal' } }
          }

          if (req.method === 'HEAD') {
            res.statusCode = outcome.status
            res.setHeader('content-type', 'application/json; charset=utf-8')
            res.setHeader('cache-control', 'no-store')
            res.setHeader('x-content-type-options', 'nosniff')
            res.end()
            return
          }
          sendJson(res, outcome.status, outcome.body)
        },
      }),
    `opencode-go-usage: GET ${ROUTE}`,
  )
}
