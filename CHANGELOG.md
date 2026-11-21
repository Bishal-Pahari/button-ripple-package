# Changelog

## 1.5.0

No code changes are needed to upgrade: the API, import paths, `data-ripple-*`
attributes, CSS class and CSS variables are unchanged.

### Fixed

- `require("@rocket2mars/react-ripple-effect")` returned an empty object. The
  CommonJS build is now `dist/index.cjs`, and an `exports` map serves the right
  build (and types) to `import` and `require`. The old `dist/index.js` path
  still resolves through the map.
- A tap on a touch screen created two ripples.
- Event listeners piled up with every press and all fired together later.
- The fade-out was cut off half-way; ripples now fade out fully before removal.
- A right or middle click created a ripple that could get stuck.
- Centered ripples were mispositioned in browsers without the CSS `translate`
  property, and all ripples were offset by the border width on bordered hosts.
- `data-ripple-duration="0"` was treated as the default 0.4 s.

### Added

- Respects the OS "reduce motion" setting (no expanding animation).
- `data-ripple-*` changes after mount apply on the next press.
- With several fingers on one element, each ripple ends when its own finger
  lifts.
- A ripple that never receives a release event fades out after 10 seconds.
- `examples/ripple-selftest.html` for checking real devices.

### Changed

- Works in older browsers: Chrome/Edge 55+, Firefox 59+, Safari/iOS 10+,
  Samsung Internet 6+ (the output is now ES2017).
- Lighter on low-end devices: passive listeners, one layout pass per press,
  and one shared DOM observer no matter how many components initialise it.
- A ripple now lingers ~0.7 s after release (was ~0.4 s, cut off mid-fade).
- Moving a finger slightly on a button no longer ends the ripple; it ends when
  the finger lifts or the page starts scrolling.
- The library no longer adds `data-ripple-center="false"` to elements.
- Build dependencies updated to clear all known vulnerabilities.
