import { readFile, writeFile } from 'node:fs/promises'

const file = new URL('../src/main.jsx', import.meta.url)
let source = await readFile(file, 'utf8')

if (!source.includes("./services/bibleData")) {
  source = `import { getManifest, getChapter } from './services/bibleData'\n${source}`
}

// Remove the old generic get() helper. This matches the compact function used in v11.
source = source.replace(
  /const N=([^;]+);async function get\(u,signal\)\{[^}]*?return b\}/s,
  'const N=$1;',
)

// Initial load.
source = source.replace(/get\('\/api\/manifest',\s*c\.signal\)/g, 'getManifest(c.signal)')
source = source.replace(/get\('\/api\/chapters\/GEN\/1',\s*c\.signal\)/g, "getChapter('GEN', 1, c.signal)")

// Continuous scrolling chapter load.
source = source.replace(
  /get\(`\/api\/chapters\/\$\{target\.book\}\/\$\{target\.chapter\}`,(\s*)request\.current\.signal\)/g,
  'getChapter(target.book, target.chapter,$1request.current.signal)',
)

// Direct navigation from the book picker and notes list.
source = source.replace(
  /get\(`\/api\/chapters\/\$\{book\}\/\$\{chapter\}`\)/g,
  'getChapter(book, chapter)',
)

// Fail rather than silently leaving a broken production build.
const remaining = [...source.matchAll(/['`"]\/api\//g)]
if (remaining.length) {
  throw new Error(`main.jsx still contains ${remaining.length} direct /api request(s). Replace those with getManifest() or getChapter().`)
}

await writeFile(file, source)
console.log('[OK] src/main.jsx now supports static GitHub Pages Bible data.')
