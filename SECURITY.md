# Security Policy

## Reporting a vulnerability

Please report security issues privately via GitHub's
[private vulnerability reporting](https://github.com/Bishal-Pahari/button-ripple-package/security/advisories/new)
(Security → Advisories → "Report a vulnerability"). Do not open a public issue
for security reports. We aim to acknowledge reports within a few days.

## Supported versions

The latest published `1.x` release receives security fixes.

## Supply-chain hardening

This package is published with measures aligned to npm's current guidance for
defending against supply-chain attacks:

- **Locked, reproducible installs.** `package-lock.json` is committed and CI
  installs with `npm ci`.
- **Install scripts disabled.** [`.npmrc`](.npmrc) sets `ignore-scripts=true`,
  blocking dependency `preinstall`/`install`/`postinstall` scripts — the payload
  path behind the 2025 npm worm incidents.
- **Continuous auditing & updates.** CI runs `npm audit --audit-level=high`, and
  Dependabot opens weekly updates for dependencies and GitHub Actions.
- **Minimal footprint.** The package has zero runtime dependencies and only a
  `react` peer dependency.

### Hardening your own install

For extra hardening when installing in your own project, you can skip lifecycle
scripts for the whole tree:

```bash
npm ci --ignore-scripts
```

## Runtime input handling

The library reads `data-ripple-*` attributes from your DOM. User-supplied values
are validated before use:

- `data-ripple-color` is accepted only if the browser confirms it is a valid CSS
  color (`CSS.supports("color", value)`); otherwise the default is used. This
  prevents an attacker-controlled attribute value from being injected into the
  CSSOM.
- `data-ripple-duration` and `data-ripple-max-radius` are coerced to finite,
  range-checked numbers.
