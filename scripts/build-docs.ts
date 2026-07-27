/**
 * Build every library's documentation site.
 *
 * Each library owns its CONTENT — the `docs/` directory and README that live
 * beside its code, in its own repository. This repo owns the PRESENTATION: one
 * BunPress config generated per library from `libraries.ts`, so the nineteen
 * sites share a theme, a nav, and the analyticshq tracker without nineteen
 * copies of the same config drifting apart.
 *
 * Sources are cloned into a temp dir (shallow, single branch). A local
 * sibling checkout is preferred when present, so a local run documents the
 * working tree rather than whatever was last pushed.
 *
 *   bun scripts/build-docs.ts            # every library
 *   bun scripts/build-docs.ts regex xml  # just these
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { $ } from 'bun'
import { LIBRARIES, type Library } from './libraries'
import { collectApi, renderApiMarkdown, resolveModuleRoot } from './zig-api'

const ROOT = resolve(import.meta.dir, '..')
// Cloned sources and staged markdown are transient build scratch, so they live
// OUTSIDE the project. Keeping them in-tree also fed every cloned repo's test
// fixtures to ts-cloud's pre-deploy secret scanner, which flagged zig-js's
// hex-laden ABI JSON as leaked AWS keys and blocked the deploy on ~128 false
// positives from files that are never shipped.
const SRC_DIR = join(tmpdir(), 'zig-utils-docs-src')
const OUT_DIR = join(ROOT, 'dist')
/** Sibling checkouts, used in preference to a clone when they exist. */
const LOCAL_LIBS = join(homedir(), 'Code', 'Libraries')

/**
 * analyticshq, identical on every docs site.
 *
 * BunPress appends `/collect` to `apiEndpoint`, and its beacon body
 * (`{ s, e, u, r, t, sw, sh, ... }`) is exactly what analyticshq's ingest
 * reads — extra fields like `sid`/`vid`/`ts` are ignored — so its built-in
 * client posts straight to the real endpoint with no shim.
 *
 * The newer `analytics.scriptSrc` option loads analyticshq's own tracker
 * instead, which is preferable (one canonical client, and no
 * sessionStorage/localStorage session ids on a service that derives sessions
 * server-side). Switch to it once BunPress publishes a release containing it —
 * it is not in 0.1.20.
 */
const ANALYTICS = {
  enabled: true,
  siteId: 'zig-utils',
  apiEndpoint: 'https://analyticshq.org',
} as const

/**
 * Resolve a library's documentation source, preferring a local checkout.
 * Returns the directory the repository is rooted at.
 */
async function resolveSource(lib: Library): Promise<string> {
  const localName = lib.repo.split('/')[1]
  const local = join(LOCAL_LIBS, localName)
  if (existsSync(join(local, 'build.zig.zon')) || existsSync(join(local, 'build.zig'))) {
    console.log(`  source: ${local} (local checkout)`)
    return local
  }

  const dest = join(SRC_DIR, lib.slug)
  rmSync(dest, { recursive: true, force: true })
  mkdirSync(SRC_DIR, { recursive: true })
  console.log(`  source: cloning ${lib.repo}`)
  await $`git clone --depth 1 --single-branch https://github.com/${lib.repo}.git ${dest}`.quiet()
  return dest
}

/** Read `build.zig.zon` for the facts the install page has to get right. */
function readManifest(src: string): { module: string, minZig: string, version: string } {
  const zon = existsSync(join(src, 'build.zig.zon')) ? readFileSync(join(src, 'build.zig.zon'), 'utf8') : ''
  const build = existsSync(join(src, 'build.zig')) ? readFileSync(join(src, 'build.zig'), 'utf8') : ''
  // The importable module name is what `addModule` registers — that is the
  // string a consumer passes to `addImport`, and it is NOT always the package
  // name in build.zig.zon (e.g. zig-search-engine registers "search-engine"
  // while the package is "search_engine").
  const addModule = build.match(/addModule\("([^"]+)"/)
  const pkg = zon.match(/\.name\s*=\s*[."]?([A-Za-z0-9_-]+)/)
  return {
    module: addModule?.[1] ?? pkg?.[1] ?? '',
    minZig: zon.match(/\.minimum_zig_version\s*=\s*"([^"]+)"/)?.[1] ?? '',
    version: zon.match(/\.version\s*=\s*"([^"]+)"/)?.[1] ?? '',
  }
}

/**
 * Title-case a docs filename for the sidebar. `ADVANCED_FEATURES.md` and
 * `lifecycle-hooks.md` both have to read as prose.
 */
function titleFor(file: string): string {
  const base = file.replace(/\.md$/i, '').replace(/[-_]/g, ' ')
  if (base === base.toUpperCase())
    return base.charAt(0) + base.slice(1).toLowerCase()
  return base.charAt(0).toUpperCase() + base.slice(1)
}

async function buildOne(lib: Library): Promise<boolean> {
  console.log(`\n${lib.name}`)
  const src = await resolveSource(lib)
  const manifest = readManifest(src)

  // Stage the content: the library's own docs/, plus an index and an install
  // page synthesized from material that actually exists in the repo (its
  // README and its build manifest) rather than invented here.
  const stage = join(SRC_DIR, `${lib.slug}-docs`)
  rmSync(stage, { recursive: true, force: true })
  mkdirSync(stage, { recursive: true })

  const libDocs = join(src, 'docs')
  const pages: string[] = []
  if (existsSync(libDocs)) {
    await $`cp -R ${libDocs}/. ${stage}/`.quiet().nothrow()
    const listed = await $`find ${stage} -name '*.md' -maxdepth 1`.quiet().nothrow().text()
    for (const line of listed.split('\n').filter(Boolean))
      pages.push(line.split('/').pop()!)
  }

  // index.md — the README, minus its centred HTML banner, which renders badly
  // outside GitHub.
  const readmePath = ['README.md', 'readme.md'].map(f => join(src, f)).find(existsSync)
  const readme = readmePath ? readFileSync(readmePath, 'utf8') : ''
  const intro = readme
    .replace(/<p align="center">[\s\S]*?<\/p>/g, '')
    .replace(/<h1 align="center">([\s\S]*?)<\/h1>/g, '# $1')
    .replace(/<div align="center">[\s\S]*?<\/div>/g, '')
    .trim()
  writeFileSync(join(stage, 'index.md'), intro || `# ${lib.name}\n\n${lib.tagline}\n`)

  // install.md — every fact here is read out of build.zig.zon / build.zig, so
  // it cannot claim a module name or Zig version the library does not have.
  const zigLine = manifest.minZig ? `\nRequires Zig \`${manifest.minZig}\` or newer.\n` : '\n'
  writeFileSync(join(stage, 'install.md'), `# Installation

Add ${lib.name} to your \`build.zig.zon\`:

\`\`\`sh
zig fetch --save git+https://github.com/${lib.repo}
\`\`\`

Then wire the module up in \`build.zig\`:

\`\`\`zig
const ${manifest.module.replace(/-/g, '_') || 'lib'} = b.dependency("${manifest.module || lib.slug}", .{
    .target = target,
    .optimize = optimize,
});
exe.root_module.addImport("${manifest.module || lib.slug}", ${manifest.module.replace(/-/g, '_') || 'lib'}.module("${manifest.module || lib.slug}"));
\`\`\`
${zigLine}
Or through [Pantry](https://github.com/stacksjs/pantry):

\`\`\`sh
pantry add ${lib.repo.split('/')[1]}
\`\`\`
`)

  // api.md — generated from the library's own Zig source, so the reference
  // lists the declarations that actually exist with the doc comments as
  // written. Skipped entirely when a library exposes nothing public, rather
  // than publishing an empty page.
  //
  // A library that already ships its own API page keeps it: a hand-written
  // reference beats a generated one, and writing ours anyway collided with it
  // on case-insensitive filesystems — zig-regex's `docs/API.md` and a
  // generated `api.md` are the SAME file on macOS, so the site ended up with
  // one page reachable at /API and a dead link at /api.
  const ownApiPage = pages.find(f => /^api\.md$/i.test(f))
  let apiLink: string | undefined = ownApiPage ? `/${ownApiPage.replace(/\.md$/i, '')}` : undefined
  const moduleRoot = resolveModuleRoot(src, lib.repo.split('/')[1])
  if (!ownApiPage && moduleRoot) {
    const api = renderApiMarkdown(lib.name, collectApi(moduleRoot))
    if (api) {
      writeFileSync(join(stage, 'api.md'), api)
      apiLink = '/api'
    }
  }

  // usage.md — the fenced examples the README already carries, lifted into a
  // page of their own so they are reachable from the sidebar. Only written
  // when the README actually has Zig examples; nothing is invented.
  const examples = [...readme.matchAll(/```zig\n([\s\S]*?)```/g)].map(m => m[1].trimEnd())
  const ownUsagePage = pages.find(f => /^usage\.md$/i.test(f))
  let hasUsage = false
  if (examples.length > 0 && !ownUsagePage) {
    writeFileSync(join(stage, 'usage.md'), `# Usage

${examples.length === 1 ? 'The example' : `The ${examples.length} examples`} below ${examples.length === 1 ? 'is' : 'are'} taken from ${lib.name}'s README.

${examples.map(e => `\`\`\`zig\n${e}\n\`\`\``).join('\n\n')}
`)
    hasUsage = true
  }

  // community.md — the same two places to talk that every README points at,
  // as a page of its own so a reader who arrives at the docs rather than the
  // repository still finds them. A library that ships its own community page
  // keeps it.
  const ownCommunityPage = pages.find(f => /^community\.md$/i.test(f))
  if (!ownCommunityPage) {
    writeFileSync(join(stage, 'community.md'), `# Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/${lib.repo}/discussions)

For casual chit-chat with others using this package:

[Join the zig-utils Discord Server](https://discord.gg/f7wBym6JF2)

Bugs and feature requests belong in [${lib.name}'s issues](https://github.com/${lib.repo}/issues), where they can be tracked to a fix.
`)
  }

  const sidebarItems = [
    { text: 'Introduction', link: '/' },
    { text: 'Installation', link: '/install' },
    ...(hasUsage ? [{ text: 'Usage', link: '/usage' }] : []),
    ...(apiLink ? [{ text: 'API reference', link: apiLink }] : []),
    ...pages
      // Anything already surfaced above is not repeated further down.
      .filter(f => !['index.md', 'install.md', 'usage.md', 'api.md', 'community.md'].includes(f.toLowerCase()))
      .sort()
      .map(f => ({ text: titleFor(f), link: `/${f.replace(/\.md$/i, '')}` })),
    // Last in the sidebar: it is where you go when the pages above did not
    // answer the question.
    { text: 'Community', link: `/${(ownCommunityPage ?? 'community.md').replace(/\.md$/i, '')}` },
  ]

  writeFileSync(join(stage, 'bunpress.config.ts'), `import type { BunPressConfig } from '@stacksjs/bunpress'

// Generated by scripts/build-docs.ts in zig-utils/.github — edit that, not this.
const config: BunPressConfig = ${JSON.stringify({
    title: lib.name,
    description: lib.tagline,
    url: `https://${lib.slug}.zig-utils.org`,
    analytics: ANALYTICS,
    // `markdown.title` is the <title> fallback for pages with no h1; the
    // top-level `title` alone leaves every page titled "BunPress Documentation".
    markdown: { title: lib.name },
    themeConfig: {
      nav: [
        { text: 'All libraries', link: 'https://zig-utils.org' },
        { text: 'GitHub', link: `https://github.com/${lib.repo}` },
        { text: 'Discord', link: 'https://discord.gg/f7wBym6JF2' },
      ],
      sidebar: [{ text: lib.name, items: sidebarItems }],
      socialLinks: [{ icon: 'github', link: `https://github.com/${lib.repo}` }],
    },
  }, null, 2)}

export default config
`)

  const out = join(OUT_DIR, lib.slug)
  rmSync(out, { recursive: true, force: true })
  // Run FROM the staging dir. BunPress resolves its config through bunfig at
  // module-import time, relative to the working directory — its documented
  // `--config <path>` flag is declared on the command but never read, so a
  // config passed that way is silently ignored and every site would render
  // with the stock theme and no tracker.
  const built = await $`bunx @stacksjs/bunpress build --dir ${stage} --outdir ${out}`
    .cwd(stage).nothrow()
  if (built.exitCode !== 0) {
    console.error(`  ✗ build failed (exit ${built.exitCode})`)
    return false
  }
  console.log(`  ✓ ${sidebarItems.length} page(s)${apiLink ? ` (API at ${apiLink})` : ''} → dist/${lib.slug}`)
  return true
}

const only = process.argv.slice(2)
const targets = only.length > 0 ? LIBRARIES.filter(l => only.includes(l.slug)) : LIBRARIES
if (targets.length === 0) {
  console.error(`no libraries matched: ${only.join(', ')}`)
  process.exit(1)
}

const failed: string[] = []
for (const lib of targets) {
  if (!(await buildOne(lib)))
    failed.push(lib.slug)
}

console.log(`\nbuilt ${targets.length - failed.length}/${targets.length} docs sites`)
if (failed.length > 0) {
  console.error(`failed: ${failed.join(', ')}`)
  process.exit(1)
}
