# Vendored third-party code

Nothing here is installed at build time; the files are checked in so the app works from a plain static server.

| File | What | Version | License |
|---|---|---|---|
| `d3.min.js` | [D3.js](https://d3js.org) | 7.9.0 | ISC (header in file) |
| `qunit.js`, `qunit.css` | [QUnit](https://qunitjs.com) test runner (tests only) | 2.x | MIT |
| `tabler-icons.js` | Subset of [Tabler Icons](https://tabler.io/icons) (outline), stored as inner SVG markup | 3.x | MIT, see `LICENSE-tabler.txt` |

## Adding or updating icons

`tabler-icons.js` maps an icon name to the inner markup of its 24x24 SVG. To add one, download
`https://cdn.jsdelivr.net/npm/@tabler/icons@3/icons/outline/<name>.svg`, strip the outer `<svg>` element and the
`<path stroke="none" .../>` helper path, and add the entry. Then list the name in `src/icons.js` (`ICON_GROUPS`) so it shows up in Help → Icons.
