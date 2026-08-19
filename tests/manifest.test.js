import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

test('root manifest describes the multi-component repo', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  assert.equal(pkg.name, 'dsh-vision-hub')
  assert.equal(pkg.private, true)
  for (const w of ['tool-vision', 'bridge-preview', 'file-drop']) {
    assert.ok(pkg.workspaces.includes(w), `workspace ${w} missing`)
  }
  assert.equal(typeof pkg.scripts.test, 'string')
})

test('tool-vision manifest is release-ready', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'tool-vision/package.json'), 'utf8'))
  assert.equal(pkg.name, 'dsh-tool-vision')
  assert.equal(pkg.version, '0.4.0')
  assert.equal(pkg.type, 'module')
  assert.equal(pkg.main, 'index.js')
  // runtime deps declared
  for (const dep of ['@deepseek-ai/schemastery', 'sharp', 'potrace', 'puppeteer-core']) {
    assert.ok(pkg.dependencies?.[dep], `missing dependency ${dep}`)
  }
  // bundle manifest present
  assert.equal(pkg.dsh?.bundle?.patch, './cordis.patch.yml')
  // critical files shipped
  for (const f of ['index.js', 'client.js', 'lib', 'vendor', 'cordis.patch.yml']) {
    assert.ok(pkg.files.includes(f), `files must include ${f}`)
  }
  // every listed file actually exists
  for (const f of pkg.files) {
    assert.ok(existsSync(join(root, 'tool-vision', f)), `listed file missing: ${f}`)
  }
})

test('bridge-preview and file-drop manifests are complete', () => {
  for (const dir of ['bridge-preview', 'file-drop']) {
    const pkg = JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8'))
    assert.ok(pkg.name, `${dir} name missing`)
    assert.ok(pkg.version, `${dir} version missing`)
    assert.ok(existsSync(join(root, dir, 'index.js')), `${dir} index.js missing`)
    assert.ok(existsSync(join(root, dir, 'client.js')), `${dir} client.js missing`)
    assert.ok(existsSync(join(root, dir, 'LICENSE')), `${dir} LICENSE missing`)
  }
})

test('every component keeps a README and the repo keeps docs + screenshots', () => {
  for (const dir of ['tool-vision', 'bridge-preview', 'file-drop']) {
    assert.ok(existsSync(join(root, dir, 'README.md')), `${dir} README.md missing`)
  }
  for (const doc of ['ARCHITECTURE', 'ENHANCEMENTS', 'ADAPTABILITY', 'SETTINGS', 'EAC-ADAPTABILITY', 'FAQ', 'INSTALL', 'MIGRATION', 'presets', 'SECURITY', 'TIPS', 'examples']) {
    assert.ok(existsSync(join(root, 'docs', `${doc}.md`)), `docs/${doc}.md missing`)
  }
  assert.ok(existsSync(join(root, 'screenshots/vision-colors-result.png')), 'screenshot missing')
})
