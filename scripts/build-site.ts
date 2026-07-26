/**
 * Build the zig-utils.org marketing page.
 *
 * One stx page rendered to static HTML. It ships as a `server-static` site, so
 * the box serves plain files with no process to run and nothing to keep alive.
 */
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildStaticSite } from '@stacksjs/stx'

const result = await buildStaticSite({
  name: 'zig-utils',
  url: 'https://zig-utils.org',
  description:
    'Fast, dependency-free Zig libraries and tools — from a JavaScript engine and a WAF down to the small pieces you reach for every day.',
  pagesDir: 'pages',
  publicDir: 'public',
  outDir: 'dist/site',
  seo: {
    title: 'zig-utils — batteries for Zig',
    siteName: 'zig-utils',
    description:
      'Pure Zig, zero external dependencies, MIT licensed. Nineteen libraries that compose freely and none of which require the others.',
  },
})

console.log(`built ${result.pages.length} page(s) → ${result.outDir} in ${result.durationMs}ms`)

// stx writes a render cache into `.stx/cache`. It is pure build scratch, and
// leaving it in the tree feeds its content hashes to ts-cloud's pre-deploy
// secret scanner, which reads a 40-char hex digest as an AWS secret key and
// blocks the deploy. The page builds in ~60ms, so there is nothing to save.
rmSync(resolve(import.meta.dir, '..', '.stx'), { recursive: true, force: true })
