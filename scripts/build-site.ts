/**
 * Build the zig-utils.org marketing page.
 *
 * One stx page rendered to static HTML. It ships as a `server-static` site, so
 * the box serves plain files with no process to run and nothing to keep alive.
 */
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
