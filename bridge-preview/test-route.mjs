// 端到端测试:模拟插件的路由处理器(相同的解析/校验逻辑),用真实文件验证
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { readFile, stat } from 'node:fs/promises'

const BRIDGE_DIR = resolve(join(tmpdir(), 'dsh-vision-bridge'))
const MAX_BYTES = 20 * 1024 * 1024

const MEDIA_BY_EXT = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.bmp': 'image/bmp',
}
function mediaTypeFor(p) {
  const lower = p.toLowerCase()
  for (const [ext, type] of Object.entries(MEDIA_BY_EXT)) if (lower.endsWith(ext)) return type
  return null
}
function parseQuery(rawUrl) {
  const query = {}
  const at = rawUrl.indexOf('?')
  if (at === -1) return query
  for (const pair of rawUrl.slice(at + 1).split('&')) {
    const eq = pair.indexOf('=')
    if (eq === -1) continue
    try { query[pair.slice(0, eq)] = decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, ' ')) } catch { /* skip */ }
  }
  return query
}

async function handler(req, res) {
  try {
    const raw = String(req.url ?? '')
    const query = parseQuery(raw)
    const p = query.p
    if (typeof p !== 'string' || p.length === 0) { res.writeHead(400); res.end('bad request'); return }
    const mediaType = mediaTypeFor(p)
    if (mediaType === null) { res.writeHead(400); res.end('not an image path'); return }
    const host = String(req.headers?.host ?? '')
    if (host !== '' && !/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host)) { res.writeHead(403); res.end('forbidden'); return }
    const target = resolve(p)
    if (target !== BRIDGE_DIR && !target.startsWith(BRIDGE_DIR + sep)) { res.writeHead(403); res.end('forbidden'); return }
    const info = await stat(target)
    if (!info.isFile()) { res.writeHead(404); res.end('not found'); return }
    const bytes = await readFile(target)
    res.writeHead(200, { 'Content-Type': mediaType, 'Cache-Control': 'private, max-age=60' })
    res.end(bytes)
  } catch {
    try { res.writeHead(404); res.end('not found') } catch { /* ignore */ }
  }
}

const server = createServer(handler)
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const port = server.address().port
const base = `http://127.0.0.1:${port}/plugins/dsh-bridge-preview/image`

import { request } from 'node:http'

function rawGet(url, hostHeader) {
  return new Promise((resolvePromise, rejectPromise) => {
    const req = request(url, { headers: hostHeader ? { host: hostHeader } : {} }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolvePromise({ status: res.statusCode, type: res.headers['content-type'], bytes: Buffer.concat(chunks).length }))
    })
    req.on('error', rejectPromise)
    req.end()
  })
}

const outsidePng = 'C:\\Users\\axezt\\Pictures\\outside-test.png'
const tests = [
  ['valid ADS png', `${base}?p=${encodeURIComponent(BRIDGE_DIR + '\\image_sha256:23c41.png')}`, 200, 'image/png'],
  ['missing file (in-dir)', `${base}?p=${encodeURIComponent(BRIDGE_DIR + '\\nope.png')}`, 404, null],
  ['outside dir image', `${base}?p=${encodeURIComponent(outsidePng)}`, 403, null],
  ['non-image', `${base}?p=${encodeURIComponent(BRIDGE_DIR + '\\x.txt')}`, 400, null],
  ['no p param', base, 400, null],
]

let allOk = true
for (const [label, url, wantStatus, wantType] of tests) {
  const r = await rawGet(url)
  const ok = r.status === wantStatus && (wantType === null || r.type === wantType)
  if (!ok) allOk = false
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${label} | status=${r.status} (want ${wantStatus}) type=${r.type} bytes=${r.bytes}`)
}

// Host 检查:原始 http 请求可以带自定义 Host 头
for (const [label, host] of [['evil host 403', 'evil.example.com'], ['localhost ok', 'localhost']]) {
  const r = await rawGet(`${base}?p=${encodeURIComponent(BRIDGE_DIR + '\\image_sha256:23c41.png')}`, host)
  const want = label.includes('403') ? 403 : 200
  const ok = r.status === want
  if (!ok) allOk = false
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${label} | status=${r.status} (want ${want})`)
}
server.close()
console.log(allOk ? 'ALL ROUTE TESTS PASSED' : 'SOME ROUTE TESTS FAILED')
process.exit(allOk ? 0 : 1)
