# OpenSky Frontend — Project Guide for Claude

## What this project is

A Vue 3 single-page app for visualising flight data at Stockholm Arlanda Airport (ESSA). It consumes the OpenSky ETL FastAPI backend and displays flight tracks, statistics, and airspace layers in both 2D (OpenLayers + deck.gl) and 3D (Cesium).

- **Hosted:** GitHub Pages at `https://lfv-analyzer.se`
- **Backend repo:** `https://github.com/kitpaddle/opensky-etl` (separate repo, runs on VPS)
- **API base URL:** `https://lfv-analyzer.se` in production, `http://localhost:8000` in dev

---

## Directory layout

```
frontend/
├── index.html                    # Entry point; sets Cesium CDN URL, disables Ion auth
├── vite.config.js                # Vite config: port 5173, /api proxy, VITE_BASE
├── package.json                  # Dependencies and scripts
├── .env                          # VITE_API_URL=https://lfv-analyzer.se (production)
├── .env.local                    # VITE_API_URL=http://localhost:8000 (dev, gitignored)
├── public/favicon.ico
└── src/
    ├── main.js                   # Vue app init (mounts App.vue)
    ├── App.vue                   # Root: global state, data fetching, tab orchestration
    │
    ├── components/
    │   ├── Header.vue            # Top bar: logo, date display, load timing
    │   ├── TabsContainer.vue     # Tab nav + date picker + Load button
    │   │
    │   ├── OverviewTab.vue       # Dashboard: KPI cards + runway stats grid
    │   ├── DataTab.vue           # Daily stats: large KPI cards + full metrics table
    │   ├── AnalysisTab.vue       # Analysis map + filter controls (date range, type, rwy, airline)
    │   │
    │   ├── FlightsMap.vue        # 2D map: OpenLayers + deck.gl tracks + layer toggles
    │   ├── FlightsView3D.vue     # 3D map: Cesium viewer with tracks and airspace
    │   ├── FlightsReview.vue     # Flights table with filtering and sorting
    │   │
    │   ├── FlightListColumns.vue # Multi-column layout (DEP/ARR/CTR/CTR DEP/CTR ARR/CTR SPL)
    │   ├── FlightListColumn.vue  # Single column: filterable flight list per category
    │   ├── FlightListTable.vue   # Sortable table: callsign, type, runways, times, occupancy
    │   │
    │   ├── AirspaceLayerPanel.vue # Layer toggles: CTR, TMA, runways, SIDs, STARs, R16
    │   ├── FiltersPanel.vue      # Date selector with min/max bounds + flight preview
    │   │
    │   ├── RunwayTable.vue       # 6×2 grid: ARR/DEP counts per runway (19R/01L, 08/26, 19L/01R)
    │   ├── AircraftTable.vue     # Aircraft type distribution with %
    │   ├── AirlinesTable.vue     # Airline distribution with %
    │   └── VehiclesTable.vue     # Ground vehicle / helicopter callsigns with %
    │
    ├── composables/
    │   └── useAirspaceData.js    # Module-level cached fetching of all airspace layers
    │
    ├── utils/
    │   └── geoserverClient.js    # GeoServer WFS client (proxied through /api/proxy/daim)
    │
    ├── workers/
    │   └── trackDecoder.js       # WebWorker: decodes compact integer-encoded tracks off-thread
    │
    └── data/
        ├── essa_procedures.json  # Static GeoJSON: SID/STAR procedure geometries
        └── essa_tma.json         # Static GeoJSON: TMA boundary polygons
```

---

## Data flow

```
App.vue (on date load)
  ├── GET /api/days/{date}/statistics      → DataTab, OverviewTab
  ├── GET /api/days/{date}/flight-summaries → FlightListColumns, FlightListTable, FlightsReview
  └── GET /api/days/{date}/flight-tracks   → trackDecoder.js (WebWorker)
                                               └── mergedFlights → FlightsMap, FlightsView3D
```

All data lives in `App.vue` reactive state. Child components receive it as props — no Vuex/Pinia store.

---

## Key architectural decisions

**WebWorker for track decoding** — `trackDecoder.js` decodes compact integer-encoded coordinates and merges them with flight metadata off the main thread. The UI stays responsive during decode. `App.vue` spawns the worker on mount and sends `{ tracks, flights }` via `postMessage`.

**Module-level caching in `useAirspaceData.js`** — Airspace layers (CTR zones, R16, SIDs, TMA) are fetched once and cached at module scope. Both the 2D map and 3D map call the same composable and get the same cached data.

**GeoServer proxy** — Airspace features (CTR, R16, VFR points) come from LFV DAIM GeoServer. Requests go through the backend proxy at `/api/proxy/daim/{workspace}/ows` to avoid CORS.

**Dual mapping** — `FlightsMap.vue` (2D, OpenLayers + deck.gl) and `FlightsView3D.vue` (3D, Cesium) are both available. They share airspace data from `useAirspaceData`.

**Environment-driven API URL** — All API calls use `import.meta.env.VITE_API_URL`. Vite proxies `/api/*` to that URL in dev so CORS is never an issue locally.

**Cesium loaded from CDN** — `index.html` sets `window.CESIUM_BASE_URL = 'https://lfv-analyzer.se/cesium/'` before the app loads. Ion authentication is disabled to prevent 401 errors (no Ion account used).

---

## Environment variables

| Variable | Dev (`.env.local`) | Production (`.env`) |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | `https://lfv-analyzer.se` |
| `VITE_BASE` | (unset, defaults to `/`) | set if deploying to a subpath |

`.env.local` is gitignored. `.env` is committed (no secrets, just the production URL).

---

## Key dependencies

| Package | Version | Purpose |
|---|---|---|
| Vue | 3.3.4 | Core framework |
| Vite | 5.0 | Build tool, dev server |
| OpenLayers | 9.0 | 2D mapping |
| deck.gl / @deck.gl/layers | 8.9 | High-performance track rendering on 2D map |
| Mapbox GL | 2.15 | Vector tile basemap option |
| Cesium | 1.140 | 3D globe + flight track visualisation |
| Axios | 1.6 | HTTP client |

---

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173 — proxies /api to localhost:8000
```

Backend must be running at `localhost:8000` (or change `VITE_API_URL` in `.env.local`).

```bash
npm run build      # outputs dist/ for deployment
npm run preview    # serve dist/ locally to verify build
```

---

## Deployment (GitHub Pages)

The `dist/` folder is deployed to GitHub Pages. The site is live at `https://lfv-analyzer.se`.

The Cesium assets (viewer JS/CSS/workers) are hosted separately at `https://lfv-analyzer.se/cesium/` — this is why `CESIUM_BASE_URL` is set in `index.html` rather than bundled via npm.

---

## Tab structure

| Tab | Component | What it shows |
|---|---|---|
| Dashboard | `OverviewTab.vue` | Avg-per-day KPI cards + runway stats grid |
| Analysis | `AnalysisTab.vue` | Filterable 2D/3D map with date range, flight type, airline, runway controls |
| Daily Stats | `DataTab.vue` | Full 150+ metric stats table for the selected date |
| Flights Review | `FlightsReview.vue` | Sortable/filterable flight table (loaded on demand) |

---

## Analysis map filters

`AnalysisTab.vue` sends filter parameters to `GET /api/analysis/*` endpoints. The backend (`api/routes/analysis.py`) renders a map image or tiles based on those params. Filters include:

- Date range (start/end)
- Flight types: DEP, ARR, CTR, CTR DEP, CTR ARR, CTR SPL
- Aircraft types (multi-select)
- Airlines (multi-select)
- Runways (multi-select)
- CTR group: All / Only Patria / Exclude Patria (maps to `depart_fato`/`land_fato` SQL filter in backend)

---

## What is NOT in this repo

- `node_modules/` — gitignored, regenerate with `npm install`
- `dist/` — gitignored, regenerate with `npm run build`
- `.env.local` — gitignored, create it manually for local dev
- Backend code — lives in the separate `opensky-etl` repo
