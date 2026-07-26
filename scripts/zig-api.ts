/**
 * Extract a library's public API from its Zig source.
 *
 * The reference pages are generated from the declarations and `///` doc
 * comments that are actually in the code, so they cannot describe a function
 * that does not exist or drift from a renamed parameter. Nothing here is
 * invented: a declaration with no doc comment is listed with its signature and
 * no prose, which is an honest "undocumented" rather than a guess.
 *
 * This is a pragmatic line scanner, not a Zig parser. It tracks brace depth to
 * nest members under their container and to skip function bodies. That is
 * sufficient for the declaration headers a reference page shows, and it has no
 * dependency on a Zig toolchain being installed at docs-build time.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

export interface ZigDecl {
  /** `fn`, `const`, `var` — what kind of declaration this is. */
  kind: string
  /** Declaration name, e.g. `Result` or `isOk`. */
  name: string
  /** The signature as written, up to the body or initializer. */
  signature: string
  /** Joined `///` lines immediately above the declaration. */
  doc: string
  /**
   * Whether this declaration is nested inside another container.
   *
   * Deliberately a boolean rather than a brace count: `pub fn Result(...) type
   * { return union(enum) {` opens two braces for one level of nesting, so a raw
   * depth would render members two headings deep and imply structure that is
   * not there.
   */
  member: boolean
}

/** Strip string and char literals so their braces do not skew depth tracking. */
function stripLiterals(line: string): string {
  return line
    .replace(/\\./g, '')
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
}

/**
 * Resolve a module's root source file from `build.zig`.
 *
 * Falls back to the conventional roots when `addModule` cannot be read, since
 * a few libraries build their module from a generated or conditional path.
 */
export function resolveModuleRoot(repoDir: string, preferredName?: string): string | undefined {
  const buildZig = join(repoDir, 'build.zig')
  if (existsSync(buildZig)) {
    const src = readFileSync(buildZig, 'utf8')

    // Named modules first. A build.zig can declare SEVERAL — including vendored
    // dependencies (zig-crosswind declares `zig_config` before its own
    // `crosswind`) — so pick the one whose name matches the library rather than
    // whichever appears first, which would document someone else's API.
    const named = [...src.matchAll(/addModule\(\s*"([^"]+)"\s*,\s*\.\{[\s\S]{0,400}?b\.path\(\s*"([^"]+)"/g)]
      .map(m => ({ name: m[1], path: m[2] }))
      .filter(m => existsSync(join(repoDir, m.path)))

    if (named.length > 0) {
      const want = normalizeModuleName(preferredName ?? repoDir.split('/').pop() ?? '')
      const match = named.find(m => normalizeModuleName(m.name) === want)
      return join(repoDir, (match ?? named[0]).path)
    }

    // Anonymous `b.createModule` roots. build.zig often declares the
    // EXECUTABLE's module (src/main.zig) first, so prefer a conventional
    // library root when one exists — main.zig is a CLI entry point, and its
    // public surface is not the library's API.
    const anonymous = [...src.matchAll(/\.root_source_file\s*=\s*b\.path\(\s*"([^"]+)"/g)]
      .map(m => m[1])
      .filter(rel => existsSync(join(repoDir, rel)))
    const libLike = anonymous.find(rel => /\/(lib|root)\.zig$/.test(rel))
    if (libLike)
      return join(repoDir, libLike)
    if (anonymous.length > 0) {
      const chosen = anonymous[0]
      // `main.zig` is the executable entry by convention; its public surface is
      // a CLI's `main`, not the library's API. Whenever a conventional library
      // root exists alongside it, that is the one to document.
      if (/main\.zig$/.test(chosen)) {
        for (const candidate of ['src/lib.zig', 'src/root.zig']) {
          if (existsSync(join(repoDir, candidate)))
            return join(repoDir, candidate)
        }
      }
      return join(repoDir, chosen)
    }
  }

  for (const candidate of ['src/root.zig', 'src/lib.zig', 'src/main.zig', 'src/index.zig']) {
    const p = join(repoDir, candidate)
    if (existsSync(p))
      return p
  }
  return undefined
}

/** `zig-search-engine`, `search_engine` and `searchEngine` are the same module. */
function normalizeModuleName(v: string): string {
  return v.toLowerCase().replace(/^zig[-_]/, '').replace(/[-_]/g, '')
}

/** Parse one Zig file into its public declarations. */
export function extractDecls(file: string): ZigDecl[] {
  const decls: ZigDecl[] = []
  if (!existsSync(file))
    return decls

  const lines = readFileSync(file, 'utf8').split('\n')
  let depth = 0
  let doc: string[] = []

  for (const raw of lines) {
    const line = raw.trim()

    if (line.startsWith('///')) {
      doc.push(line.replace(/^\/\/\/\s?/, ''))
      continue
    }
    // A `//!` module comment or a blank line does not break a doc block; any
    // other non-declaration line does, so prose never attaches to the wrong decl.
    if (line === '' || line.startsWith('//!')) {
      continue
    }

    const isPub = /^pub\s+(?:inline\s+|export\s+|extern\s+(?:"[^"]*"\s+)?|threadlocal\s+)*(fn|const|var)\s/.test(line)
    if (isPub && !line.startsWith('pub usingnamespace')) {
      const kind = line.match(/\b(fn|const|var)\s/)![1]
      const nameMatch = line.match(/\b(?:fn|const|var)\s+([A-Za-z_][A-Za-z0-9_]*)/)
      if (nameMatch) {
        // Signature = up to the body brace or the initializer, whichever first.
        let signature = line
        if (kind === 'fn') {
          const brace = signature.indexOf('{')
          if (brace > 0)
            signature = signature.slice(0, brace)
        }
        else {
          // Keep a const/var's initializer — for a re-export manifest like
          // `pub const Reader = @import("xml.zig").Reader` the initializer IS
          // the useful part. Drop it only when it opens a multi-line body.
          const brace = signature.indexOf('{')
          if (brace > 0)
            signature = signature.slice(0, brace)
          signature = signature.replace(/;\s*$/, '')
        }
        decls.push({
          kind,
          name: nameMatch[1],
          signature: signature.replace(/\s+$/, '').replace(/^pub\s+/, ''),
          doc: doc.join('\n').trim(),
          member: depth > 0,
        })
      }
    }

    doc = []
    const bare = stripLiterals(raw)
    depth += (bare.match(/\{/g)?.length ?? 0) - (bare.match(/\}/g)?.length ?? 0)
    if (depth < 0)
      depth = 0
  }

  return decls
}

/**
 * Follow one level of `pub const X = @import("y.zig")` re-exports, so a root
 * that is just a manifest of submodules still yields a real reference.
 */
export function collectApi(rootFile: string): { file: string, module: string, decls: ZigDecl[] }[] {
  const out: { file: string, module: string, decls: ZigDecl[] }[] = []
  const rootDecls = extractDecls(rootFile)
  if (rootDecls.length > 0)
    out.push({ file: rootFile, module: 'Root', decls: rootDecls })

  const src = existsSync(rootFile) ? readFileSync(rootFile, 'utf8') : ''
  const seen = new Set([resolve(rootFile)])
  for (const m of src.matchAll(/pub\s+const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*@import\(\s*"([^"]+\.zig)"\s*\)/g)) {
    const target = resolve(dirname(rootFile), m[2])
    if (seen.has(target) || !existsSync(target))
      continue
    seen.add(target)
    const decls = extractDecls(target)
    if (decls.length > 0)
      out.push({ file: target, module: m[1], decls })
  }
  return out
}

/** Render the reference page. Returns undefined when there is nothing public. */
export function renderApiMarkdown(name: string, groups: ReturnType<typeof collectApi>): string | undefined {
  const total = groups.reduce((n, g) => n + g.decls.length, 0)
  if (total === 0)
    return undefined

  const parts: string[] = [
    '# API reference',
    '',
    `Every declaration below is extracted from ${name}'s source, with the doc`,
    'comments as written there. A declaration listed without prose is public but',
    'undocumented in the source.',
    '',
  ]

  for (const group of groups) {
    if (groups.length > 1)
      parts.push(`## ${group.module}`, '')

    for (const d of group.decls) {
      // Top-level declarations get `##` (or `###` under a module heading);
      // members sit exactly one level below their container.
      const base = groups.length > 1 ? 3 : 2
      const level = base + (d.member ? 1 : 0)
      parts.push(`${'#'.repeat(level)} \`${d.name}\``, '')
      parts.push('```zig', d.signature, '```', '')
      if (d.doc)
        parts.push(d.doc, '')
    }
  }

  return parts.join('\n')
}
