# Angler Guide 2.0

All five reserves, 96 fish. Open `index.html` in a browser, or serve the folder over HTTPS to install it (Add to Home Screen / Install App).

What's new in 2.0
- Slim header with a settings sheet; unit, temperature and last reserve are remembered
- Back button and browser/Android back now work; search, filters and scroll position are kept
- Search fish, bait or habitat; filter by time, temperature, bait and habitat
- Cleaner fish page: grouped baits (preferred bait starred), rank-first hook chart, no repeated info
- Phone-friendly maps: drag, pinch zoom, clear overlay; zoom resets per fish
- Real PNG icons (incl. maskable + Apple), network-first service worker, image caching for offline

Release note: bump `V` in `service-worker.js` for every release. Fish data lives only inside `index.html` (`const DATA`).
Hotspot maps are only published for Golden Ridge so far.
