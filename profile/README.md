<h1 align="center">zig-utils</h1>

<p align="center">
  <b>Batteries for Zig.</b><br>
  Fast, dependency-free libraries and tools — from a JavaScript engine and a WAF down to the small pieces you reach for every day.
</p>

<p align="center">
  <a href="https://discord.gg/f7wBym6JF2">Discord</a> ·
  <a href="https://ziglang.org">Zig</a> ·
  <a href="https://github.com/zig-utils">Repositories</a>
</p>

---

Every library here is **pure Zig**, **zero external dependencies** unless stated, and **MIT licensed**. They compose well together but none of them require the others.

## 🚀 Runtime & Engines

| Project | What it is |
| --- | --- |
| [**zig-js**](https://github.com/zig-utils/zig-js) | A pure-Zig JavaScript engine with a JavaScriptCore-shaped C API. Passes the configured test262 corpus 53,175/53,175 and the ten-profile WebAssembly matrix, with a JIT and no GIL. |
| [**zig-gc**](https://github.com/zig-utils/zig-gc) | A precise, tri-color mark-sweep garbage collector, generic over an embedder binding (MMTk-style). Non-moving by default, with opt-in failure-atomic compaction. |

## 🛡️ Security

| Project | What it is |
| --- | --- |
| [**zig-waf**](https://github.com/zig-utils/zig-waf) | An embeddable web application firewall and fleet platform targeting ModSecurity 3 / Coraza semantics with OWASP CRS 4 compatibility. Ships a reverse proxy, a C connector ABI, and Nginx/Caddy/Envoy/HAProxy integrations. |
| [**zig-tls**](https://github.com/zig-utils/zig-tls) | Pure Zig TLS 1.3 and 1.2 — client and server, non-blocking I/O, STARTTLS, PSK resumption and opt-in 0-RTT, with optional AArch64/x86_64 AES-GCM assembly. |
| [**zig-injection**](https://github.com/zig-utils/zig-injection) | Allocation-free SQLi and XSS detection, behaviorally compatible with libinjection 4. Idiomatic Zig plus a stable C ABI. |

## 🔤 Text & Data

| Project | What it is |
| --- | --- |
| [**zig-regex**](https://github.com/zig-utils/zig-regex) | A regex engine pairing a linear-time Thompson NFA with a backtracking engine for lookaround, backreferences, and named groups. |
| [**zig-xml**](https://github.com/zig-utils/zig-xml) | A small, lenient, allocation-light XML/HTML pull tokenizer with HTML5 character-reference decoding. Built for untrusted markup — no DTDs, no XXE. |
| [**zig-search-engine**](https://github.com/zig-utils/zig-search-engine) | Search-engine integrations for Zig services. Declare a collection as a schema; a driver builds the engine-native structure. Typesense first. |
| [**zig-faker**](https://github.com/zig-utils/zig-faker) | Realistic fake data for tests, seeds, and prototypes — 20+ categories across 55 locales, with reproducible seeding. |

## 🧰 Building Applications

| Project | What it is |
| --- | --- |
| [**zig-cli**](https://github.com/zig-utils/zig-cli) | Type-safe, compile-time validated CLIs. Define options as a struct and get parsing, routing, help output, and interactive prompts for free. |
| [**zig-config**](https://github.com/zig-utils/zig-config) | A smart configuration loader — local files, home directory, env vars, and defaults, deep-merged into your typed config struct. |
| [**zig-error-handling**](https://github.com/zig-utils/zig-error-handling) | A `Result(T, E)` type inspired by Rust and neverthrow: chainable `map` / `andThen`, pattern matching, and zero runtime overhead. |

## 🔬 Testing, Benchmarking & Release

| Project | What it is |
| --- | --- |
| [**zig-test-framework**](https://github.com/zig-utils/zig-test-framework) | Jest/Vitest-style testing for Zig: describe/it, rich matchers, mocks and spies, snapshots, coverage, watch mode, and 5 reporters. |
| [**zig-benchmarks**](https://github.com/zig-utils/zig-benchmarks) | A mitata-inspired benchmark harness with high-precision timing, percentile statistics, and beautiful CLI output. |
| [**zig-bump**](https://github.com/zig-utils/zig-bump) | One command to bump the version in `build.zig.zon` — interactive, with optional commit, tag, and push. |
| [**zig-changelog**](https://github.com/zig-utils/zig-changelog) | Generate changelogs from conventional commits, as a library or a CLI. |
| [**zig-starter**](https://github.com/zig-utils/zig-starter) | A production-ready template wiring the above together, so a new library or CLI starts with tests, config, and releases already working. |

## Getting Started

Most projects install through [Pantry](https://github.com/stacksjs/pantry) or the Zig package manager:

```sh
pantry add zig-regex
```

```zig
// build.zig
const regex = b.dependency("regex", .{ .target = target, .optimize = optimize });
exe.root_module.addImport("regex", regex.module("regex"));
```

Check each repository's README for its exact module name and minimum Zig version.

## Contributing

Issues and pull requests are welcome on every repository. Good first steps: pick an open issue, add a test case, or improve documentation. If you are unsure where something belongs, ask in Discord.

## Community

- 💬 [Discord](https://discord.gg/f7wBym6JF2) — questions, design discussion, and release news
- 🐛 GitHub Issues on the relevant repository — bugs and feature requests

<p align="center">Made with 💙 · MIT licensed</p>
