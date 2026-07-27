import type { CloudConfig } from '@stacksjs/ts-cloud'
import { LIBRARIES } from './scripts/libraries'

/**
 * ts-cloud deployment config for zig-utils.org.
 *
 * Ships two kinds of static site to the shared Stacks Hetzner box:
 *
 *   - `main`  → the marketing page at the apex, `zig-utils.org`
 *   - one site per library → `<slug>.zig-utils.org`, built with BunPress from
 *     that library's own `docs/` directory (see scripts/build-docs.ts, which
 *     clones each repo and renders it into `dist/<slug>`)
 *
 * The documentation lives in each library's repository, where it belongs next
 * to the code it documents; this repo only assembles and ships it, so there is
 * one deploy pipeline instead of nineteen.
 *
 * @see https://github.com/stacksjs/ts-cloud
 */
const config: CloudConfig = {
  project: {
    name: 'zig-utils',
    slug: 'zig-utils',
    region: 'us-east-1',
  },

  environments: {
    production: {
      type: 'production',
      // Push to `main` → deploy here, served at the bare domains.
      deployBranch: 'main',
      variables: { NODE_ENV: 'production' },
    },
  },

  // Reuse the shared box owned by the `stacks` project instead of provisioning
  // our own: the deploy resolves `stacks-production-app`, ships only this
  // project's sites, and adds an additive rpx `sites.d/zig-utils.json`
  // fragment — never touching the box lifecycle or the other tenants.
  cloud: {
    provider: 'hetzner',
    attachTo: 'stacks',
  },
  hetzner: {
    // apiToken falls back to HCLOUD_TOKEN in the environment.
    location: 'fsn1',
    image: 'ubuntu-24.04',
    sshPrivateKeyPath: '~/.ssh/id_ed25519',
    sshUser: 'root',
  },

  infrastructure: {
    compute: {
      mode: 'server',
      size: 'small',
      runtime: 'bun',
      // rpx serves the box (not nginx). Both signals are set so the deploy
      // never stands up nginx + certbot, which would race rpx for :80.
      webServer: 'rpx',
      proxy: {
        engine: 'rpx',
        // rpx lazily issues a Let's Encrypt cert per hostname on the first
        // HTTPS hit once DNS resolves — which is what makes nineteen
        // hostnames practical without pre-provisioning nineteen certs.
        onDemandTls: true,
        onDemandTlsEmail: 'hello@stacksjs.com',
        // Explicitly production, never the staging ACME directory: an absent
        // flag makes tlsx fall back to staging and issue certs that chain to
        // an untrusted root while the deploy still reports success.
        onDemandTlsStaging: false,
        // `main` is an apex, so its www redirect is auto-added; the per-library
        // sites are subdomains and get none.
      },
    },

    // zig-utils.org is registered and DNS-managed at Porkbun. The deploy
    // reconciles an A record per site domain → the box IP.
    dns: {
      provider: 'porkbun',
      domain: 'zig-utils.org',
    },
  },

  sites: {
    // The marketing page: one stx page rendered to static HTML, whose whole
    // job is routing people to the library documentation.
    main: {
      deploy: 'server',
      root: 'dist/site',
      path: '/',
      domain: 'zig-utils.org',
      build: 'bun scripts/build-site.ts',
    },

    // Keep a memorable community URL on our own domain while allowing the
    // Discord invite itself to change without a cached permanent redirect.
    discord: {
      domain: 'zig-utils.org',
      path: '/discord',
      redirect: {
        to: 'https://discord.gg/f7wBym6JF2',
        status: 302,
        preservePath: false,
      },
    },

    // www → apex. rpx auto-adds this ROUTE for any apex domain, but DNS
    // reconciliation only walks the domains named in `sites`, so without an
    // explicit entry `www.zig-utils.org` gets a gateway route and no A record —
    // it resolves nowhere.
    www: { domain: 'www.zig-utils.org', redirect: 'https://zig-utils.org' },

    // One documentation site per library, generated from LIBRARIES so the
    // marketing page, the build script and the deploy can never disagree about
    // which libraries exist.
    ...Object.fromEntries(
      LIBRARIES.map(lib => [
        lib.slug.replace(/-/g, ''),
        {
          deploy: 'server' as const,
          // BunPress renders into a `.bunpress` subdirectory of --outdir, so
          // THAT is the document root — shipping `dist/<slug>` would serve a
          // directory whose only entry is `.bunpress`.
          root: `dist/${lib.slug}/.bunpress`,
          path: '/',
          domain: `${lib.slug}.zig-utils.org`,
          // BunPress emits clean directory URLs.
          pathRewriteStyle: 'directory' as const,
          build: `bun scripts/build-docs.ts ${lib.slug}`,
        },
      ]),
    ),
  },
}

export default config
