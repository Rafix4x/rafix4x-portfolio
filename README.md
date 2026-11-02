# Rafix4x — 3D Portfolio

Single-page Three.js portfolio for [Rafix4x](https://github.com/Rafix4x), a backend
developer from Bangladesh.

Static site: no build step, no CDN, no runtime dependencies. Three.js, GSAP and all
fonts are vendored under `vendor/`.

## Run locally

ES modules need HTTP, so open it through a server rather than `file://`:

```sh
python3 -m http.server 4321
# http://localhost:4321
```

## Deploy on Vercel

Import the repo at [vercel.com/new](https://vercel.com/new). Framework preset
**Other**, build command empty, output directory `.` — `vercel.json` already sets
this up. No environment variables needed.

## Structure

- `index.html` — content, import map, font preloads
- `styles.css` — layout, tokens, responsive rules
- `js/main.js` — boot/loader, GSAP entrance, scroll, counters
- `js/scene.js` — Three.js hero scene, bloom, camera
- `js/tech.js` — 3D tech icon grid
- `vendor/` — three@0.187, gsap + plugins, Inter / Instrument Serif / JetBrains Mono
