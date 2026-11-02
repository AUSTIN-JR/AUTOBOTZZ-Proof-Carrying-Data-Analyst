# Repository notes for agents

## What runs here

The served application is **`proof-carrying-analyst/`** — a self-contained, browser-only
front-end (HTML + CSS + vanilla ES modules). It is served as static files by nginx on host
port 3000 via `docker-compose.base44.yml`.

The rest of the repository (`backend/`, `frontend/`, `datasets/`, `benchmark/`, `docs/`,
`testing/`) is the earlier AUTOBOTZZ Next.js + FastAPI project. It is **not** started by the
compose file and is not part of the served app. Do not wire it into the sandbox stack.

## Run

```bash
docker compose -f docker-compose.base44.yml up -d      # nginx:1.27-alpine, source bind-mounted
curl -sI http://localhost:3000/                        # 200
```

Static files are mounted read-only at `/usr/share/nginx/html`, so edits appear on reload
without rebuilding. `proof-carrying-analyst/nginx.conf` disables caching and falls back to
`index.html` for deep links (the app uses a hash router).

## Architecture (all under `proof-carrying-analyst/js`)

| File | Responsibility |
| --- | --- |
| `util.js` | formatting, seeded PRNG (`mulberry32`), fingerprint/digest, statistics |
| `profile.js` | column profiling + documented data-quality model (5 weighted categories) |
| `calc.js` | dataset preparation, calculation registry (`CALCS`), validation checks, `buildEvidence`, `reproduceEvidence` |
| `seed.js` | deterministic demo workspace: 18,642-row FY2025 dataset + 2 smaller datasets, ~35 evidence artifacts, 27 insights, 8 charts, 2 reports |
| `store.js` | `state`, localStorage persistence, selectors, dashboard metrics |
| `analysis.js` | chart data builders + Analysis Studio engine |
| `charts.js` | Chart.js theming/builders, PNG export, heatmap renderer |
| `ui.js` | icons, badges, modal/drawer/toast, empty states |
| `evidencePanel.js`, `insightPanel.js`, `actions.js` | proof drawer/page sections, insight drawer, cross-page actions |
| `pages/*.js` | one module per route, each exports `render(root, params)` |
| `app.js` | hash router, shell, global search, menus |

## Persistence — important

The workspace is stored in `localStorage` under `pcda.workspace.v1`.

Rows for seeded datasets are **not persisted**: `store.saveNow()` strips `dataset.rows` when
`dataset.seedSpec` is set, and `initStore()` regenerates them from the seed spec
(`generateRetailRows`, etc.). This keeps the payload ~260 KB instead of several MB. Uploaded
datasets have `seedSpec: null`, so their rows are persisted normally.

Consequences:
- Seed generation must stay deterministic. Changing a generator (prices, distributions,
  missing-value rates) changes every recomputed evidence value; call
  `resetWorkspace()` / Settings → "Reset demo data" (or `localStorage.clear()`) to reseed.
- Importing a new version into a seeded dataset clears `seedSpec` (upload flow in
  `pages/datasets.js`), otherwise the uploaded rows would be regenerated away on reload.

## Verification

- JS syntax: `node --check` on copies renamed to `.mjs` (the app uses ES modules).
- Seed logic can be exercised headlessly in Node by copying `util/profile/calc/seed` to
  `.mjs` with rewritten import specifiers and calling `buildWorkspace()`; it renders
  ~18.2% Q3→Q4 growth, 14 flagged outlier transactions and a retail quality score of ~85.
- In the browser, the key flows to exercise: dataset preview (sort/search/pagination),
  Analysis Studio run → generate evidence → reproduce, chart create/edit, insight drawer,
  Evidence Vault reproduction (including the intentional mismatch on superseded v2
  artifacts), report builder and exports.

## Gotchas

- All figures are computed in-browser from the seeded rows; there is no backend. The AI
  never produces numbers — insights only explain deterministic results.
- `Chart.js` loads from jsDelivr with a local fallback at `vendor/chart.umd.min.js`.
- Print styles in `css/styles.css` are what "Export PDF" uses (browser print dialog).
- The date-range filter in the chart gallery is a temporary view overlay; saved evidence
  reflects the stored chart definition.
