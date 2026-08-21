// 正则提取回归测试:验证 HINT_RE 对 tool-vision 桥接提示文本的提取行为
import { readFile } from 'node:fs/promises'

const HINT_RE = /(?:exported to:\s*|\[图片:\s*|\[image:\s*)("[^"]+"|'[^']+'|[A-Za-z]:[\\/][^\s\]]+?\.(?:png|jpe?g|webp|gif|avif|bmp))/gi

const samples = [
  // 0.3.10 格式(单图):exported to 出现一次
  '[User sent an image (image.png), exported to: C:\\Users\\axezt\\AppData\\Local\\Temp\\dsh-vision-bridge\\image_sha256:23c41.png. Inspect it with the inspect_image tool to see its content.]',
  // 0.3.7 格式(单图):exported to 与 path= 各出现一次(应去重)
  '[User sent an image (image.png), exported to: C:\\Users\\axezt\\AppData\\Local\\Temp\\dsh-vision-bridge\\image_sha256:23c41.png. You cannot see images directly. Call the inspect_image tool with path="C:\\Users\\axezt\\AppData\\Local\\Temp\\dsh-vision-bridge\\image_sha256:23c41.png" now to have the external vision model analyze it, then answer using its result.]',
  // 双图(两个桥接提示块)
  '[User sent an image (a.png), exported to: C:\\Temp\\v\\a.png. Inspect it with the inspect_image tool to see its content.]\n[User sent an image (b.jpg), exported to: C:\\Temp\\v\\b.jpg. Inspect it with the inspect_image tool to see its content.]',
  // 用户附带提问文字
  '[User sent an image (image.png), exported to: C:\\Temp\\x.png. Inspect it with the inspect_image tool to see its content.]这个是什么',
  // 新格式单图标记
  '[图片: C:\\Users\\axezt\\AppData\\Local\\Temp\\dsh-vision-bridge\\image_sha256:23c41.png]',
  // 新格式双图标记
  '[图片: C:\\Temp\\v\\a.png][图片: C:\\Temp\\v\\b.jpg]',
]

function extractPaths(text) {
  const paths = []
  const seen = new Set()
  let m
  HINT_RE.lastIndex = 0
  while ((m = HINT_RE.exec(text)) !== null) {
    let p = m[1]
    if (p.length >= 2) {
      const first = p[0]
      const last = p[p.length - 1]
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) p = p.slice(1, -1)
    }
    if (!seen.has(p)) { seen.add(p); paths.push(p) }
  }
  return paths
}

const expected = [
  ['C:\\Users\\axezt\\AppData\\Local\\Temp\\dsh-vision-bridge\\image_sha256:23c41.png'],
  ['C:\\Users\\axezt\\AppData\\Local\\Temp\\dsh-vision-bridge\\image_sha256:23c41.png'],
  ['C:\\Temp\\v\\a.png', 'C:\\Temp\\v\\b.jpg'],
  ['C:\\Temp\\x.png'],
  ['C:\\Users\\axezt\\AppData\\Local\\Temp\\dsh-vision-bridge\\image_sha256:23c41.png'],
  ['C:\\Temp\\v\\a.png', 'C:\\Temp\\v\\b.jpg'],
]

let allOk = true
for (let i = 0; i < samples.length; i++) {
  const got = extractPaths(samples[i])
  const ok = JSON.stringify(got) === JSON.stringify(expected[i])
  if (!ok) allOk = false
  console.log(`${ok ? 'PASS' : 'FAIL'} | sample${i} | ${JSON.stringify(got)}`)
}

// 误伤检查:普通文本不应命中
const plain = '我昨天 exported to: 一个朋友,今天看了看文档'
const plainHits = extractPaths(plain).length
console.log(`${plainHits === 0 ? 'PASS' : 'FAIL'} | plain-text no hits (${plainHits})`)
allOk = allOk && plainHits === 0

// client.js 中实际使用的正则应与测试一致(防漂移)
const client = await readFile(new URL('./client.js', import.meta.url), 'utf8')
const inClient = client.includes('/(?:exported to:\\s*|\\[图片:\\s*|\\[image:\\s*)("[^"]+"|\'[^\']+\'|[A-Za-z]:[\\\\/][^\\s\\]]+?\\.(?:png|jpe?g|webp|gif|avif|bmp))/gi')
console.log(`${inClient ? 'PASS' : 'FAIL'} | client.js HINT_RE in sync`)
allOk = allOk && inClient

console.log(allOk ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED')
process.exit(allOk ? 0 : 1)
