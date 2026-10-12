# Angler Guide 2.0

A fan-made, offline-ready field guide for the game *The Angler*: all five reserves and 96 fish entries (84 species), with baits, hook sizes, water conditions and hotspot maps.

## Use it

- **Quick look:** open `index.html` in a browser.
- **Install as an app:** serve the folder over HTTPS (e.g. GitHub Pages), then use *Add to Home Screen* / *Install App*. Once visited, it works offline.

For local testing with the service worker, any static server works:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Features

- **Home screen** – search every reserve for a fish, filter by reserve, or jump to a random fish.
- **Reserve pages** – interactive map with per-fish hotspot overlays (drag, pinch or +/− to zoom) and a fish list filterable by time, temperature, bait and habitat.
- **Fish guides** – grouped bait preferences (preferred bait starred), rank-first hook chart, legendary hooks and habitat/traits.
- **Fishing tools** – quick planner (reserve, fish, time, water clarity), a catch collection saved on the device, and a “copy fishing setup” button.
- **Settings** – metric/imperial and °C/°F; units, temperature and last reserve are remembered.
- Browser and Android back buttons work; search, filters and scroll position are kept.

## Project layout

| File | Purpose |
| --- | --- |
| `index.html` | The whole app: styles, fish data (`const DATA`), reserve logos (`const RIMG`) and code |
| `service-worker.js` | Offline support: network-first for app files, cache-first for wiki images |
| `manifest.webmanifest` | Install metadata and icons |
| `icon-*.png`, `apple-touch-icon.png`, `favicon.ico`, `icon.svg` | App icons |

## Releasing

Bump `V` in `service-worker.js` on every release so installed copies pick up the new version.

## Credits

Fish data, images and maps come from [The Angler Wiki](https://theangler.org/) (community-maintained; may contain errors). This project is not affiliated with the game's developers.
