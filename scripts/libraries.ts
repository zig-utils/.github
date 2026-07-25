/**
 * The zig-utils libraries, as one list.
 *
 * The deploy config, the docs build script and the marketing page all read
 * from here so they cannot disagree about which libraries exist or where their
 * documentation is published.
 *
 * `slug` is BOTH the documentation subdomain (`<slug>.zig-utils.org`) and the
 * `dist/` directory the built site lands in. `repo` is the GitHub repository
 * the docs are cloned from — note that these are not always `zig-<slug>` and
 * are not all in the same organisation.
 */
export interface Library {
  /** Documentation subdomain + dist directory name. */
  slug: string
  /** `owner/name` on GitHub. */
  repo: string
  /** Display name, as the library is referred to in prose. */
  name: string
  /** One line, used as the docs site description. */
  tagline: string
  /** Grouping on the marketing page. */
  category: Category
}

export type Category =
  | 'Runtime & engines'
  | 'Security'
  | 'Text & data'
  | 'Building applications'
  | 'Testing, benchmarking & release'

/** Section order on the marketing page. */
export const CATEGORIES: Category[] = [
  'Runtime & engines',
  'Security',
  'Text & data',
  'Building applications',
  'Testing, benchmarking & release',
]

export const LIBRARIES: Library[] = [
  {
    slug: 'js',
    repo: 'zig-utils/zig-js',
    name: 'zig-js',
    tagline: 'A pure-Zig JavaScript engine with a JavaScriptCore-shaped C API.',
    category: 'Runtime & engines',
  },
  {
    slug: 'gc',
    repo: 'zig-utils/zig-gc',
    name: 'zig-gc',
    tagline: 'A precise, tri-color mark-sweep garbage collector, generic over an embedder binding.',
    category: 'Runtime & engines',
  },
  {
    slug: 'waf',
    repo: 'zig-utils/zig-waf',
    name: 'zig-waf',
    tagline: 'An embeddable web application firewall targeting ModSecurity 3 / Coraza semantics.',
    category: 'Security',
  },
  {
    slug: 'tls',
    repo: 'zig-utils/zig-tls',
    name: 'zig-tls',
    tagline: 'Pure Zig TLS 1.3 and 1.2 — client and server, non-blocking I/O, STARTTLS.',
    category: 'Security',
  },
  {
    slug: 'injection',
    repo: 'zig-utils/zig-injection',
    name: 'zig-injection',
    tagline: 'Allocation-free SQLi and XSS detection, behaviorally compatible with libinjection 4.',
    category: 'Security',
  },
  {
    slug: 'regex',
    repo: 'zig-utils/zig-regex',
    name: 'zig-regex',
    tagline: 'A linear-time Thompson NFA paired with a backtracking engine for lookaround and backreferences.',
    category: 'Text & data',
  },
  {
    slug: 'xml',
    repo: 'zig-utils/zig-xml',
    name: 'zig-xml',
    tagline: 'A lenient, allocation-light XML/HTML pull tokenizer built for untrusted markup.',
    category: 'Text & data',
  },
  {
    slug: 'search-engine',
    repo: 'zig-utils/zig-search-engine',
    name: 'zig-search-engine',
    tagline: 'Search-engine integrations for Zig services. Declare a collection as a schema.',
    category: 'Text & data',
  },
  {
    slug: 'faker',
    repo: 'zig-utils/zig-faker',
    name: 'zig-faker',
    tagline: 'Realistic fake data for tests, seeds and prototypes — 20+ categories across 55 locales.',
    category: 'Text & data',
  },
  {
    slug: 'cli',
    repo: 'zig-utils/zig-cli',
    name: 'zig-cli',
    tagline: 'Type-safe, compile-time validated CLIs. Define options as a struct.',
    category: 'Building applications',
  },
  {
    slug: 'config',
    repo: 'zig-utils/zig-config',
    name: 'zig-config',
    tagline: 'A smart configuration loader — files, home directory, env vars and defaults, deep-merged.',
    category: 'Building applications',
  },
  {
    slug: 'error-handling',
    repo: 'zig-utils/zig-error-handling',
    name: 'zig-error-handling',
    tagline: 'A Result(T, E) type with chainable map / andThen and zero runtime overhead.',
    category: 'Building applications',
  },
  {
    // Lives in the `cwcss` organisation, not `zig-utils` — it is the Zig port
    // of Crosswind rather than a zig-utils-native library, but it ships as part
    // of the same collection and is documented alongside it.
    slug: 'crosswind',
    repo: 'cwcss/zig-crosswind',
    name: 'zig-crosswind',
    tagline: 'A utility-first CSS engine in Zig — generates only the classes you actually use.',
    category: 'Building applications',
  },
  {
    slug: 'test-framework',
    repo: 'zig-utils/zig-test-framework',
    name: 'zig-test-framework',
    tagline: 'Jest/Vitest-style testing for Zig: describe/it, matchers, mocks, snapshots and coverage.',
    category: 'Testing, benchmarking & release',
  },
  {
    slug: 'benchmarks',
    repo: 'zig-utils/zig-benchmarks',
    name: 'zig-benchmarks',
    tagline: 'A mitata-inspired benchmark harness with high-precision timing and percentile statistics.',
    category: 'Testing, benchmarking & release',
  },
  {
    slug: 'bump',
    repo: 'zig-utils/zig-bump',
    name: 'zig-bump',
    tagline: 'One command to bump the version in build.zig.zon — interactive, with commit, tag and push.',
    category: 'Testing, benchmarking & release',
  },
  {
    slug: 'changelog',
    repo: 'zig-utils/zig-changelog',
    name: 'zig-changelog',
    tagline: 'Generate changelogs from conventional commits, as a library or a CLI.',
    category: 'Testing, benchmarking & release',
  },
  {
    slug: 'starter',
    repo: 'zig-utils/zig-starter',
    name: 'zig-starter',
    tagline: 'A production-ready template wiring the collection together for a new library or CLI.',
    category: 'Testing, benchmarking & release',
  },
]
