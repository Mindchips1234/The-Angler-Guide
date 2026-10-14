# Angler Guide 3.2

A fan-made, offline-ready field guide for the game *The Angler*, made by Vanderholst Studios. It covers all five reserves, 96 fish entries (84 species), 15 legendary fish, 313 missions, 247 collectibles and 175 pieces of gear, with a 3D model of every species and a log for everything you catch.

The game's development ended in January 2025, so this data is complete. Every picture and map is stored in the app, so it keeps working even if the wiki it came from goes offline.

## Use it

- **Quick look:** open `index.html` in a browser. (The 3D models, Guides and offline mode need it served over http/https, see below.)
- **Install as an app:** serve the folder over HTTPS (e.g. GitHub Pages), then use *Add to Home Screen* / *Install App*. Once visited, it works offline.

For local testing with the service worker, any static server works:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## How the app is organised

Five tabs on phones (header buttons on larger screens):

| Tab | What's in it |
| --- | --- |
| **Home** | **This week's legendaries** (the active legendary and its spawn spot in each reserve, with a countdown to the next rotation), search every fish, **What's biting?** (pick a reserve, time of day, water temperature and bait; it ranks the fish most likely to bite), and the reserve list |
| **Reserves** | Interactive map with hotspot overlays, the reserve's legendary fish, and a filterable fish list. Each fish page has bait preferences, traits, a hotspot map, a **rank table with the weight range and hook size for every rank**, the 3D model (tap the picture) and a **Log a catch** button |
| **Log** | Your catches with weight, rank (worked out from the weight), score and date (enter the weight in kg, g, lb or oz; a weight above the fish's maximum is flagged as invalid); fish caught, Diamonds and legendaries counters; a collection of every fish showing your best rank and personal best; share any catch as a picture |
| **Guides** | **Legendary fish** (story, bait, traits, hooks and location map, with a caught tracker), **Missions** and **Collectibles** (tick-off lists per reserve, missions with objectives and rewards), **Gear guide** (every rod, reel, line and hook, plus a setup helper that suggests hooks, line and rods for any fish and rank), and links to the community records hub and the wiki |
| **Settings** | Metric/imperial, °C/°F, dark/light/match-device theme, back up and restore your progress, replay the intro |

Your log, legendaries, missions and collectibles are saved on the device only. Use **Settings → Save backup** before changing phones or clearing your browser, and **Restore backup** to bring them back.

Also: an intro animation on launch (tap to skip), sliding screen transitions, swipe from the left edge to go back in the installed app, an "A new version is ready" banner when a release is out, and an "Offline" badge.

## Project layout

| File | Purpose |
| --- | --- |
| `index.html` | Page structure and styles (dark and light themes) |
| `app.js` | The app: screens, routing, log, guides, settings |
| `data/fish-data.js` | Fish and reserve data (`DATA`) and reserve logos (`RIMG`) |
| `data/legendary.json`, `missions.json`, `collectibles.json`, `gear.json` | Guide data, loaded when a guide opens |
| `data/this-week.json` | This week's legendaries and spawn spots (see below) |
| `img/` | Every fish picture, reserve map, hotspot map, logo and legendary picture/map (WebP) |
| `fish3d.js` | 3D models: builds each fish from its outline and texture, swim styles, the jointed crab and crayfish models (walking legs, working pincers, tail flick), and the viewer |
| `fish-shapes.js`, `fish-tex/` | Traced body outlines and cut-out textures for the 82 fish |
| `vendor/three.module.min.js` | [Three.js](https://threejs.org/) r160 (MIT licence, see `vendor/three-LICENSE.txt`), loaded for the 3D models |
| `service-worker.js` | Offline support and updates: app files open from the cache and refresh in the background; pictures and maps are cached once seen |
| `manifest.webmanifest` | Install metadata, icons and home-screen shortcuts (My log, Guides) |
| `tools/` | Scripts that rebuild the data and images (see below) |

## Rebuilding the data

All data comes from [The Angler Wiki](https://theangler.org/). The scripts need Python 3 with `beautifulsoup4`, `lxml`, `Pillow` (and `numpy`, `scipy` for the 3D shapes).

1. `python3 tools/wiki-data.py` – downloads legendaries, missions, collectibles, gear and the latest fish facts into `data/` (pages are cached in `.wiki-cache/`).
2. `python3 tools/apply-fish-refresh.py` – merges the latest rank tables (weights and hooks) and traits into `data/fish-data.js`.
3. `python3 tools/bundle-images.py` – saves any new pictures and maps into `img/` and points the data at them.
4. `python3 tools/fish-shapes.py <pictures-folder> fish-tex fish-shapes.js` – rebuilds the 3D textures and outlines (see the notes at the top of the script).

## This week's legendaries

Each reserve has one legendary active per week, at one of its known spawn spots. The rotation changes every **Wednesday at 10 pm US Eastern time** and is random, so it can't be worked out in advance. It has to be confirmed by players (in-game, the community Discord, or the weekly videos linked on the wiki's legendary page).

Once it's confirmed, record it and push to `main`:

```sh
python3 tools/this-week.py "Golden Ridge Reserve" Goldstein "Gravy Bubble"
python3 tools/this-week.py              # shows what's set for the current week
```

The app re-checks `data/this-week.json` whenever it's opened. It works out the rotation itself, so after the week turns over it shows "Not confirmed yet" instead of last week's spots. No version bump is needed for these updates.

## Releasing

1. Bump `V` in `service-worker.js` (e.g. `angler-guide-v3-2`). This is what makes installed copies show the update banner.
2. Update `APP_VERSION` in `app.js` so Settings shows the right version.

## Credits

Fish data, legendaries, missions, collectibles, gear, pictures and maps come from [The Angler Wiki](https://theangler.org/) (community-maintained; may contain errors). The images in `img/` and the 3D textures in `fish-tex/` are copies of, or cut from, the wiki's pictures. Community records link to [The Angler Hub](https://hub.theangler.org). This project is not affiliated with the game's developers.
