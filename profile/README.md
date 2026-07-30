## About zig-utils

Discover a growing collection of fast, dependency-free libraries and tools for Zig. From JavaScript runtimes and web application firewalls to testing, configuration, and release tooling.

Every project is written in **pure Zig**, has **zero external dependencies** unless stated otherwise, and is **MIT licensed**.

* Runtime and language infrastructure.
* Security and networking primitives.
* Text processing and data utilities.
* Application development tooling.
* Testing and benchmarking.
* Automated releases and changelogs.

> *“Batteries for Zig. Use what you need, compose what you want.”*

### A few highlights...

#### Runtime & Engines

* [zig-js](https://github.com/zig-utils/zig-js) - A pure Zig JavaScript engine with WebAssembly, JIT compilation, a JavaScriptCore-shaped C API, and no GIL.
* [zig-gc](https://github.com/zig-utils/zig-gc) - A precise tri-color mark-sweep garbage collector with generic embedder bindings and optional compaction.

#### Security

* [zig-waf](https://github.com/zig-utils/zig-waf) - An embeddable web application firewall with OWASP CRS 4 compatibility and integrations for Nginx, Caddy, Envoy, and HAProxy.
* [zig-tls](https://github.com/zig-utils/zig-tls) - Pure Zig TLS 1.3 and 1.2 for clients and servers, with non-blocking I/O, STARTTLS, session resumption, and optional 0-RTT.
* [zig-injection](https://github.com/zig-utils/zig-injection) - Allocation-free SQL injection and XSS detection compatible with libinjection 4.

#### Text & Data

* [zig-regex](https://github.com/zig-utils/zig-regex) - A regex engine combining a linear-time Thompson NFA with support for lookaround, backreferences, and named groups.
* [zig-xml](https://github.com/zig-utils/zig-xml) - A small XML and HTML tokenizer built for untrusted markup, with HTML5 character-reference decoding and no XXE.
* [zig-search-engine](https://github.com/zig-utils/zig-search-engine) - Typed search-engine integrations for Zig services. *Typesense first.*
* [zig-faker](https://github.com/zig-utils/zig-faker) - Reproducible fake data across more than 20 categories and 55 locales.

#### Application Development

* [zig-cli](https://github.com/zig-utils/zig-cli) - Type-safe, compile-time validated command-line interfaces with routing, help output, and interactive prompts.
* [zig-config](https://github.com/zig-utils/zig-config) - A typed configuration loader for files, environment variables, and defaults.
* [zig-error-handling](https://github.com/zig-utils/zig-error-handling) - A zero-overhead `Result(T, E)` type with mapping, chaining, and pattern matching.

#### Testing & Benchmarking

* [zig-test-framework](https://github.com/zig-utils/zig-test-framework) - Jest and Vitest-style testing with matchers, mocks, spies, snapshots, coverage, watch mode, and multiple reporters.
* [zig-benchmarks](https://github.com/zig-utils/zig-benchmarks) - High-precision benchmarking with percentile statistics and clean terminal output.

#### Release Tooling

* [zig-bump](https://github.com/zig-utils/zig-bump) - Update versions in `build.zig.zon`, with optional commits, tags, and pushes.
* [zig-changelog](https://github.com/zig-utils/zig-changelog) - Generate changelogs from conventional commits.
* [zig-starter](https://github.com/zig-utils/zig-starter) - A production-ready Zig project template with testing, configuration, benchmarking, and releases included.

### Getting started

Most projects can be installed through [Pantry](https://github.com/stacksjs/pantry) or the Zig package manager.

```sh
pantry add zig-regex
```

```zig
const regex = b.dependency("regex", .{
    .target = target,
    .optimize = optimize,
});

exe.root_module.addImport("regex", regex.module("regex"));
```

Refer to each repository for its module name, installation instructions, and minimum Zig version.

#### Community

* [Discord](https://discord.gg/f7wBym6JF2) - Questions, design discussions, and release news.
* [Repositories](https://github.com/zig-utils) - Explore every zig-utils project.
* GitHub Issues - Bug reports, feature requests, and contribution opportunities.

*If you are unsure where something belongs, start a discussion in [Discord](https://discord.gg/f7wBym6JF2).*

---

### More batteries are coming.
