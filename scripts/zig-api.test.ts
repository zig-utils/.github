import { describe, expect, it } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { collectApi, extractDecls, renderApiMarkdown, resolveModuleRoot } from './zig-api'

function fixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'zig-api-'))
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name)
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, content)
  }
  return dir
}

describe('extractDecls', () => {
  it('captures public declarations with their doc comments', () => {
    const dir = fixture({
      'src/root.zig': `const std = @import("std");

/// Parse a document.
/// Returns an error on malformed input.
pub fn parse(input: []const u8) !Doc {
    return undefined;
}

pub const VERSION = "1.0.0";

/// Not exported.
fn private() void {}
`,
    })
    const decls = extractDecls(join(dir, 'src/root.zig'))
    expect(decls.map(d => d.name)).toEqual(['parse', 'VERSION'])
    expect(decls[0].doc).toBe('Parse a document.\nReturns an error on malformed input.')
    expect(decls[0].signature).toBe('fn parse(input: []const u8) !Doc')
    // A const keeps its initializer — for a re-export manifest that IS the API.
    expect(decls[1].signature).toBe('const VERSION = "1.0.0"')
  })

  it('marks nested declarations as members without double-counting braces', () => {
    // `fn X() type { return union(enum) {` opens two braces for one level of
    // nesting; a raw depth count would bury `ok` two headings deep.
    const dir = fixture({
      'src/root.zig': `/// A result.
pub fn Result(comptime T: type) type {
    return union(enum) {
        /// Wrap a value.
        pub fn ok(v: T) Self {
            return .{};
        }
    };
}

/// Back at the top level.
pub fn helper() void {}
`,
    })
    const decls = extractDecls(join(dir, 'src/root.zig'))
    expect(decls.map(d => [d.name, d.member])).toEqual([
      ['Result', false],
      ['ok', true],
      ['helper', false],
    ])
  })

  it('does not let a brace inside a string literal skew nesting', () => {
    const dir = fixture({
      'src/root.zig': `pub const OPEN = "{";
/// Still top level.
pub fn after() void {}
`,
    })
    expect(extractDecls(join(dir, 'src/root.zig')).find(d => d.name === 'after')?.member).toBe(false)
  })

  it('never attaches a doc comment to an unrelated later declaration', () => {
    const dir = fixture({
      'src/root.zig': `/// Belongs to alpha.
pub fn alpha() void {}

const somethingElse = 1;

pub fn beta() void {}
`,
    })
    const decls = extractDecls(join(dir, 'src/root.zig'))
    expect(decls.find(d => d.name === 'alpha')?.doc).toBe('Belongs to alpha.')
    expect(decls.find(d => d.name === 'beta')?.doc).toBe('')
  })
})

describe('resolveModuleRoot', () => {
  it('reads the module root out of build.zig', () => {
    const dir = fixture({
      'build.zig': `pub fn build(b: *std.Build) void {
    const mod = b.addModule("xml", .{
        .root_source_file = b.path("src/custom.zig"),
        .target = target,
    });
}`,
      'src/custom.zig': 'pub fn go() void {}\n',
      'src/root.zig': 'pub fn wrong() void {}\n',
    })
    expect(resolveModuleRoot(dir)).toBe(join(dir, 'src/custom.zig'))
  })

  it('falls back to a conventional root when addModule is unreadable', () => {
    const dir = fixture({ 'src/root.zig': 'pub fn go() void {}\n' })
    expect(resolveModuleRoot(dir)).toBe(join(dir, 'src/root.zig'))
  })
})

describe('collectApi + renderApiMarkdown', () => {
  it('follows re-exports and renders members one level below their container', () => {
    const dir = fixture({
      'src/root.zig': `pub const Reader = @import("reader.zig");\n`,
      'src/reader.zig': `/// Reads things.
pub fn read() void {}
`,
    })
    const groups = collectApi(join(dir, 'src/root.zig'))
    expect(groups.map(g => g.module)).toEqual(['Root', 'Reader'])

    const md = renderApiMarkdown('zig-x', groups)!
    expect(md).toContain('## Root')
    expect(md).toContain('## Reader')
    expect(md).toContain('### `read`')
    expect(md).toContain('Reads things.')
  })

  it('returns undefined when a library exposes nothing public', () => {
    const dir = fixture({ 'src/root.zig': 'fn hidden() void {}\n' })
    expect(renderApiMarkdown('zig-x', collectApi(join(dir, 'src/root.zig')))).toBeUndefined()
  })
})

describe('resolveModuleRoot with b.createModule', () => {
  it('falls back to the first root_source_file when no module is named', () => {
    // Some libraries build their module with `b.createModule`, which takes no
    // name, so the addModule pattern finds nothing and the API reference was
    // skipped entirely.
    const dir = fixture({
      'build.zig': `pub fn build(b: *std.Build) void {
    const bench_module = b.createModule(.{
        .root_source_file = b.path("src/bench.zig"),
    });
    const export_module = b.createModule(.{
        .root_source_file = b.path("src/export.zig"),
    });
}`,
      'src/bench.zig': 'pub fn run() void {}\n',
      'src/export.zig': 'pub fn other() void {}\n',
    })
    expect(resolveModuleRoot(dir)).toBe(join(dir, 'src/bench.zig'))
  })
})

describe('resolveModuleRoot picks the library, not a neighbour', () => {
  it('prefers the module named after the library over a vendored dependency', () => {
    // zig-crosswind declares `zig_config` (a vendored dependency) BEFORE its
    // own `crosswind` module; taking the first match documented someone
    // else's API.
    const dir = fixture({
      'build.zig': `pub fn build(b: *std.Build) void {
    const zig_config_mod = b.addModule("zig_config", .{
        .root_source_file = b.path("src/vendor/config.zig"),
    });
    const crosswind_lib = b.addModule("crosswind", .{
        .root_source_file = b.path("src/crosswind.zig"),
    });
}`,
      'src/vendor/config.zig': 'pub fn notMine() void {}\n',
      'src/crosswind.zig': 'pub fn mine() void {}\n',
    })
    expect(resolveModuleRoot(dir, 'zig-crosswind')).toBe(join(dir, 'src/crosswind.zig'))
  })

  it('prefers a library root over the CLI entry point', () => {
    // zig-bump/zig-changelog declare the EXECUTABLE's module (src/main.zig)
    // first. main.zig is a CLI entry; the library API lives in lib.zig.
    const dir = fixture({
      // A second, non-main root (a test module) must not stop the preference.
      'build.zig': `pub fn build(b: *std.Build) void {
    const exe_mod = b.createModule(.{
        .root_source_file = b.path("src/main.zig"),
    });
    const test_mod = b.createModule(.{
        .root_source_file = b.path("src/test_version.zig"),
    });
}`,
      'src/test_version.zig': 'pub fn t() void {}\n',
      'src/main.zig': 'pub fn main() void {}\n',
      'src/lib.zig': 'pub const semver = @import("semver.zig");\n',
    })
    expect(resolveModuleRoot(dir, 'zig-bump')).toBe(join(dir, 'src/lib.zig'))
  })

  it('normalizes zig- prefixes and separators when matching', () => {
    const dir = fixture({
      'build.zig': `const m = b.addModule("search_engine", .{ .root_source_file = b.path("src/se.zig") });`,
      'src/se.zig': 'pub fn go() void {}\n',
    })
    expect(resolveModuleRoot(dir, 'zig-search-engine')).toBe(join(dir, 'src/se.zig'))
  })
})
