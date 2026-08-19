/**
 * dsh-bridge-preview — 服务端(host half)。
 *
 * 只做一件事:为 dsh-tool-vision「图片桥」导出的图片提供同源回环路由,
 * 让浏览器端可以把桥接提示文本中的本地路径渲染成内联预览。
 *
 * 关键点:`inject: ['webServer']` —— 等待 host-webserver 服务就绪后才
 * apply(否则 apply 提前执行,ctx.get('webServer') 为 undefined,路由
 * 永远不会注册,请求全部落到 webserver 的 fallback 404)。
 *
 * 安全边界(只读、受限):
 *  - 仅允许读取桥接导出目录(<os.tmpdir>/dsh-vision-bridge)内的文件;
 *  - 仅允许图片扩展名(png/jpg/jpeg/webp/gif/avif/bmp);
 *  - Host 必须为本机(127.0.0.1 / localhost / [::1]);
 *  - 文件大小上限 20MB;
 *  - 不修改任何日志/请求:tool-vision 的桥接行为、模型请求完全不变。
 */
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { stat, readFile } from 'node:fs/promises'

export const name = 'dsh-bridge-preview'
export const inject = ['webServer']

const ROUTE_PATH = '/plugins/dsh-bridge-preview/image'
const BRIDGE_DIR = resolve(join(tmpdir(), 'dsh-vision-bridge'))
const MAX_BYTES = 20 * 1024 * 1024

const MEDIA_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
}

function mediaTypeFor(path) {
  const lower = path.toLowerCase()
  for (const [ext, type] of Object.entries(MEDIA_BY_EXT)) {
    if (lower.endsWith(ext)) return type
  }
  return null
}

function parseQuery(rawUrl) {
  const query = {}
  const at = rawUrl.indexOf('?')
  if (at === -1) return query
  for (const pair of rawUrl.slice(at + 1).split('&')) {
    const eq = pair.indexOf('=')
    if (eq === -1) continue
    try {
      query[pair.slice(0, eq)] = decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, ' '))
    } catch {
      /* skip malformed pairs */
    }
  }
  return query
}

export function apply(ctx) {
  const webServer = ctx.get('webServer')
  if (webServer === undefined) return

  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: ROUTE_PATH,
    async handler(req, res) {
      try {
        const raw = String(req.url ?? '')
        const query = parseQuery(raw)
        const p = query.p
        if (typeof p !== 'string' || p.length === 0) {
          res.writeHead(400)
          res.end('bad request')
          return
        }
        const mediaType = mediaTypeFor(p)
        if (mediaType === null) {
          res.writeHead(400)
          res.end('not an image path')
          return
        }
        // Host 检查:只允许本机访问
        const host = String(req.headers?.host ?? '')
        if (host !== '' && !/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host)) {
          res.writeHead(403)
          res.end('forbidden')
          return
        }
        // 路径必须解析在桥接导出目录内(防目录穿越/任意文件读取)
        const target = resolve(p)
        if (target !== BRIDGE_DIR && !target.startsWith(BRIDGE_DIR + sep)) {
          res.writeHead(403)
          res.end('forbidden')
          return
        }
        const info = await stat(target)
        if (!info.isFile() || info.size > MAX_BYTES) {
          res.writeHead(404)
          res.end('not found')
          return
        }
        const bytes = await readFile(target)
        res.writeHead(200, {
          'Content-Type': mediaType,
          'Cache-Control': 'private, max-age=60',
        })
        res.end(bytes)
      } catch {
        try {
          res.writeHead(404)
          res.end('not found')
        } catch {
          /* response already sent */
        }
      }
    },
  }), 'dsh-bridge-preview: image route')
}
