<template>
  <div class="flights-review">
    <!-- TABLE SECTION -->
    <div class="review-section">
      <div class="section-header">
        <span class="flight-count">{{ sortedFlights.length }} / {{ flights.length }} flights</span>
        <div class="filter-checks">
          <label class="fcheck dep"><input type="checkbox" v-model="filters.dep" /> ESSA DEP</label>
          <label class="fcheck arr"><input type="checkbox" v-model="filters.arr" /> ESSA ARR</label>
          <label class="fcheck veh"><input type="checkbox" v-model="filters.veh" /> Vehicles</label>
          <label class="fcheck ctr"><input type="checkbox" v-model="filters.ctr" /> CTR</label>
          <label class="fcheck other"><input type="checkbox" v-model="filters.other" /> All Other</label>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="review-table">
          <thead>
            <tr>
              <th @click="sortBy('callsign')" :class="{ sorted: sortKey === 'callsign' }">Callsign</th>
              <th @click="sortBy('ac_type')" :class="{ sorted: sortKey === 'ac_type' }">Type</th>
              <th @click="sortBy('start_time')" :class="{ sorted: sortKey === 'start_time' }">Start (UTC)</th>
              <th @click="sortBy('is_essa_arr')" :class="{ sorted: sortKey === 'is_essa_arr' }" class="col-bool">ARR</th>
              <th @click="sortBy('arr_rwy')" :class="{ sorted: sortKey === 'arr_rwy' }">ARR RWY</th>
              <th @click="sortBy('goaround_count')" :class="{ sorted: sortKey === 'goaround_count' }" class="col-num">G/A</th>
              <th @click="sortBy('init_arr_point')" :class="{ sorted: sortKey === 'init_arr_point' }">STAR</th>
              <th @click="sortBy('arr_runway_occupancy')" :class="{ sorted: sortKey === 'arr_runway_occupancy' }">ARR OCC</th>
              <th @click="sortBy('calc_arr_taxi')" :class="{ sorted: sortKey === 'calc_arr_taxi' }">ARR TAXI</th>
              <th @click="sortBy('taxi_stop_count')" :class="{ sorted: sortKey === 'taxi_stop_count' }" class="col-bool">WAIT</th>
              <th @click="sortBy('arrival_apron')" :class="{ sorted: sortKey === 'arrival_apron' }">ARR Apron</th>
              <th @click="sortBy('arrival_stand')" :class="{ sorted: sortKey === 'arrival_stand' }">ARR Stand</th>
              <th @click="sortBy('is_essa_dep')" :class="{ sorted: sortKey === 'is_essa_dep' }" class="col-bool">DEP</th>
              <th @click="sortBy('dep_rwy')" :class="{ sorted: sortKey === 'dep_rwy' }">DEP RWY</th>
              <th @click="sortBy('sid')" :class="{ sorted: sortKey === 'sid' }">SID</th>
              <th @click="sortBy('departure_apron')" :class="{ sorted: sortKey === 'departure_apron' }">DEP Apron</th>
              <th @click="sortBy('departure_stand')" :class="{ sorted: sortKey === 'departure_stand' }">DEP Stand</th>
              <th @click="sortBy('calc_dep_taxi')" :class="{ sorted: sortKey === 'calc_dep_taxi' }">DEP TAXI</th>
              <th @click="sortBy('dep_runway_occupancy')" :class="{ sorted: sortKey === 'dep_runway_occupancy' }">DEP OCC</th>
              <th @click="sortBy('is_inctr')" :class="{ sorted: sortKey === 'is_inctr' }" class="col-bool">CTR</th>
              <th @click="sortBy('ctr_entry_time')" :class="{ sorted: sortKey === 'ctr_entry_time' }">CTR TIME</th>
              <th @click="sortBy('is_essa_vehicle')" :class="{ sorted: sortKey === 'is_essa_vehicle' }" class="col-bool">VEH</th>
              <th @click="sortBy('city_crossings_json')" :class="{ sorted: sortKey === 'city_crossings_json' }" class="col-num">X CITY</th>
              <th @click="sortBy('norra_crossings_json')" :class="{ sorted: sortKey === 'norra_crossings_json' }" class="col-num">X NORRA</th>
              <th @click="sortBy('rwy1_count')" :class="{ sorted: sortKey === 'rwy1_count' }" class="col-num">XRWY</th>
              <th @click="sortBy('is_overflight')" :class="{ sorted: sortKey === 'is_overflight' }" class="col-bool">OVR</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="f in sortedFlights"
              :key="f.flight_id"
              :class="[rowClass(f), { 'row-selected': selectedFlight && selectedFlight.flight_id === f.flight_id }]"
              @click="selectFlight(f)"
            >
              <td class="col-callsign">{{ f.callsign || '—' }}</td>
              <td class="col-type">{{ f.ac_type || '—' }}</td>
              <td class="col-time">{{ fmtTime(f.start_time) }}</td>
              <td class="col-bool"><span v-if="f.is_essa_arr" class="dot dot-arr"></span></td>
              <td class="col-rwy">{{ f.arr_rwy && f.arr_rwy !== 'UNKNOWN' ? f.arr_rwy : '—' }}</td>
              <td class="col-bool"><span v-if="f.goaround_count > 0" class="dot dot-ga"></span></td>
              <td class="col-sid">{{ f.init_arr_point || '—' }}</td>
              <td class="col-stat">{{ fmtSec(f.arr_runway_occupancy) }}</td>
              <td class="col-stat">{{ fmtSec(f.calc_arr_taxi) }}</td>
              <td class="col-bool"><span v-if="f.is_essa_arr && f.taxi_stop_count > 0" class="dot dot-wait"></span></td>
              <td class="col-stand">{{ f.arrival_apron || '—' }}</td>
              <td class="col-stand">{{ f.arrival_stand || '—' }}</td>
              <td class="col-bool"><span v-if="f.is_essa_dep" class="dot dot-dep"></span></td>
              <td class="col-rwy">{{ f.dep_rwy && f.dep_rwy !== 'UNKNOWN' ? f.dep_rwy : '—' }}</td>
              <td class="col-sid">{{ f.sid || '—' }}</td>
              <td class="col-stand">{{ f.departure_apron || '—' }}</td>
              <td class="col-stand">{{ f.departure_stand || '—' }}</td>
              <td class="col-stat">{{ fmtSec(f.calc_dep_taxi) }}</td>
              <td class="col-stat">{{ fmtSec(f.dep_runway_occupancy) }}</td>
              <td class="col-bool"><span v-if="f.is_inctr" class="dot dot-ctr"></span></td>
              <td class="col-stat">{{ fmtCtrTime(f) }}</td>
              <td class="col-bool"><span v-if="f.is_essa_vehicle" class="dot dot-veh"></span></td>
              <td class="col-num">{{ cntJson(f.city_crossings_json) || '—' }}</td>
              <td class="col-num">{{ cntJson(f.norra_crossings_json) || '—' }}</td>
              <td class="col-num">{{ xrwyCount(f) || '—' }}</td>
              <td class="col-bool"><span v-if="f.is_overflight" class="dot dot-ovr"></span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- BOTTOM PANELS -->
    <div class="bottom-panels">

      <!-- Map panel (always mounted so OL can init on mount) -->
      <div class="detail-panel">
        <div ref="mapEl" class="map-el"></div>
        <div v-if="!selectedFlight" class="panel-overlay">
          <span>Select a flight to view track</span>
        </div>
      </div>

      <!-- Vertical profile chart panel -->
      <div class="detail-panel chart-panel">
        <div v-if="!selectedFlight" class="panel-overlay">
          <span>Select a flight to view profile</span>
        </div>
        <div v-else-if="selectedFlight.is_essa_vehicle" class="panel-overlay">
          <span>No altitude profile for vehicles</span>
        </div>
        <div v-else-if="!svgChart" class="panel-overlay">
          <span>No altitude data</span>
        </div>
        <svg v-else viewBox="0 0 460 180" class="profile-svg" preserveAspectRatio="xMidYMid meet">
          <!-- Background -->
          <rect x="0" y="0" width="460" height="180" fill="#111" />
          <rect x="50" y="12" width="395" height="136" fill="#1a1a1a" />

          <!-- Horizontal grid lines -->
          <line
            v-for="t in svgChart.yTicks"
            :key="'grid' + t.y"
            x1="50" :y1="t.y" x2="445" :y2="t.y"
            stroke="#2a2a2a" stroke-width="1"
          />

          <!-- Profile area fill -->
          <polygon :points="svgChart.areaPath" :fill="chartColor + '28'" />

          <!-- Profile line -->
          <polyline
            :points="svgChart.pts"
            fill="none"
            :stroke="chartColor"
            stroke-width="1.5"
            stroke-linejoin="round"
            stroke-linecap="round"
          />

          <!-- Axes -->
          <line x1="50" y1="12" x2="50" y2="148" stroke="#444" stroke-width="1" />
          <line x1="50" y1="148" x2="445" y2="148" stroke="#444" stroke-width="1" />

          <!-- Y-axis ticks + labels -->
          <g v-for="t in svgChart.yTicks" :key="'y' + t.y">
            <line :x1="46" :y1="t.y" x1="46" :x2="50" :y2="t.y" stroke="#555" stroke-width="1" />
            <text :x="44" :y="t.y + 4" text-anchor="end" class="tick-label">{{ t.label }}</text>
          </g>

          <!-- X-axis ticks + labels -->
          <g v-for="t in svgChart.xTicks" :key="'x' + t.x">
            <line :x1="t.x" y1="148" :x2="t.x" y2="152" stroke="#555" stroke-width="1" />
            <text :x="t.x" y="162" text-anchor="middle" class="tick-label">{{ t.label }}</text>
          </g>

          <!-- Axis labels -->
          <text x="247" y="176" text-anchor="middle" class="axis-label">{{ svgChart.xLabel }}</text>
          <text x="8" y="80" text-anchor="middle" transform="rotate(-90,8,80)" class="axis-label">ft</text>
        </svg>
      </div>

    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import OLMap from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import Feature from 'ol/Feature'
import { LineString } from 'ol/geom'
import { Style, Stroke } from 'ol/style'
import { fromLonLat } from 'ol/proj'

// SVG chart dimensions
const ML = 50, MT = 12, IW = 395, IH = 136

function haversineNM(lat1, lon1, lat2, lon2) {
  const R = 3440.065
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function niceMax(val) {
  if (val <= 1000) return 1000
  if (val <= 2000) return 2000
  if (val <= 3000) return 3000
  if (val <= 5000) return 5000
  if (val <= 10000) return 10000
  if (val <= 15000) return 15000
  if (val <= 20000) return 20000
  return Math.ceil(val / 5000) * 5000
}

function fmtAlt(val, yMax) {
  if (val === 0) return '0'
  if (yMax >= 10000) return val >= 1000 ? `${Math.round(val / 1000)}k` : String(val)
  return String(Math.round(val / 100) * 100)
}

export default {
  name: 'FlightsReview',
  props: {
    mergedFlights: { type: Array, default: () => [] },
  },
  setup(props) {
    const sortKey = ref('start_time')
    const sortDir = ref(1)
    const filters = ref({ dep: true, arr: true, veh: true, ctr: true, other: false })
    const selectedFlight = ref(null)
    const mapEl = ref(null)

    let olMap = null
    let trackSource = null

    const flights = computed(() => props.mergedFlights || [])

    const isOther = (f) =>
      !f.is_essa_dep && !f.is_essa_arr && !f.is_essa_vehicle && !f.is_inctr

    const filteredFlights = computed(() => {
      const f = filters.value
      return flights.value.filter(fl => {
        if (fl.is_essa_vehicle && f.veh) return true
        if (fl.is_essa_dep    && f.dep) return true
        if (fl.is_essa_arr    && f.arr) return true
        if (fl.is_inctr       && f.ctr) return true
        if (isOther(fl)       && f.other) return true
        return false
      })
    })

    const sortBy = (key) => {
      if (sortKey.value === key) sortDir.value *= -1
      else { sortKey.value = key; sortDir.value = 1 }
    }

    const sortedFlights = computed(() => {
      const arr = [...filteredFlights.value]
      const key = sortKey.value
      const dir = sortDir.value
      const jsonCols = ['city_crossings_json', 'norra_crossings_json']
      return arr.sort((a, b) => {
        let av = a[key] ?? ''
        let bv = b[key] ?? ''
        if (jsonCols.includes(key)) {
          av = cntJson(av)
          bv = cntJson(bv)
        }
        if (av < bv) return -dir
        if (av > bv) return dir
        return 0
      })
    })

    const fmtSec = (sec) => {
      if (sec == null || sec === 0) return '—'
      const m = Math.floor(sec / 60)
      const s = Math.round(sec % 60)
      return `${m}:${String(s).padStart(2, '0')}`
    }

    const fmtTime = (ts) => {
      if (!ts) return '—'
      return new Date(ts * 1000).toISOString().slice(11, 16)
    }

    const fmtCtrTime = (f) => {
      if (!f.ctr_entry_time || !f.ctr_exit_time) return '—'
      return fmtSec(f.ctr_exit_time - f.ctr_entry_time)
    }

    const cntJson = (json) => {
      if (!json) return 0
      try { return JSON.parse(json).length } catch { return 0 }
    }

    const xrwyCount = (f) => {
      return (f.rwy1_count || 0) + (f.rwy2_count || 0) + (f.rwy3_count || 0)
    }

    const rowClass = (f) => {
      if (f.is_essa_vehicle) return 'row-vehicle'
      if (f.is_essa_arr && f.is_essa_dep) return 'row-turnaround'
      if (f.is_essa_arr) return 'row-arr'
      if (f.is_essa_dep) return 'row-dep'
      if (f.is_inctr) return 'row-ctr'
      if (f.is_overflight) return 'row-ovr'
      return ''
    }

    const selectFlight = (f) => {
      selectedFlight.value = selectedFlight.value?.flight_id === f.flight_id ? null : f
    }

    // ── MAP ──────────────────────────────────────────────────────────────────

    const mapTrackColor = (f) => {
      if (f.is_inctr) return 'rgba(155, 89, 182, 0.9)'
      if (f.is_essa_dep) return 'rgba(52, 152, 219, 0.9)'
      if (f.is_essa_arr) return 'rgba(241, 196, 15, 0.9)'
      if (f.is_essa_vehicle) return 'rgba(46, 204, 113, 0.9)'
      return 'rgba(149, 165, 166, 0.9)'
    }

    onMounted(() => {
      if (!mapEl.value) return
      trackSource = new VectorSource()
      olMap = new OLMap({
        target: mapEl.value,
        layers: [
          new TileLayer({
            source: new XYZ({
              url: 'https://cartodb-basemaps-{a-d}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
              attributions: '',
            }),
          }),
          new VectorLayer({ source: trackSource, zIndex: 10 }),
        ],
        view: new View({ center: fromLonLat([17.932, 59.648]), zoom: 11 }),
        controls: [],
      })
    })

    onUnmounted(() => {
      if (olMap) { olMap.setTarget(undefined); olMap = null }
    })

    watch(selectedFlight, (flight) => {
      if (!olMap || !trackSource) return
      trackSource.clear()
      if (!flight || !flight.coordinates || flight.coordinates.length < 2) return

      const feature = new Feature({
        geometry: new LineString(flight.coordinates.map(c => fromLonLat(c))),
      })
      feature.setStyle(new Style({
        stroke: new Stroke({ color: mapTrackColor(flight), width: 2.5, lineCap: 'round', lineJoin: 'round' }),
      }))
      trackSource.addFeature(feature)

      const view = olMap.getView()
      const ESSA = fromLonLat([17.932, 59.648])

      if (flight.is_essa_dep || flight.is_essa_arr || flight.is_essa_vehicle) {
        view.animate({ center: ESSA, zoom: 13, duration: 300 })
      } else if (flight.is_inctr) {
        view.fit(trackSource.getExtent(), { padding: [30, 30, 30, 30], duration: 300, maxZoom: 11 })
      } else {
        view.fit(trackSource.getExtent(), { padding: [30, 30, 30, 30], duration: 300, maxZoom: 9 })
      }
    })

    // ── VERTICAL PROFILE ──────────────────────────────────────────────────────

    const chartColor = computed(() => {
      const f = selectedFlight.value
      if (!f) return '#888'
      if (f.is_inctr) return '#9C27B0'
      if (f.is_essa_dep) return '#2196F3'
      if (f.is_essa_arr) return '#FFC107'
      if (f.is_essa_vehicle) return '#4CAF50'
      return '#9E9E9E'
    })

    const buildPoints = (f) => {
      if (!f.coordinates || !f.altitude_profile || f.coordinates.length === 0) return null
      const ap = f.altitude_profile
      if (ap.length < f.coordinates.length * 2) return null
      return f.coordinates.map((c, i) => ({
        lon: c[0], lat: c[1],
        alt: (ap[i * 2] ?? 0) * 3.28084,  // stored in metres, display in feet
        time: ap[i * 2 + 1] ?? 0,
      }))
    }

    const profileData = computed(() => {
      const f = selectedFlight.value
      if (!f) return null
      if (f.is_essa_vehicle) return { type: 'vehicle' }

      const pts = buildPoints(f)
      if (!pts || pts.length < 2) return { type: 'no_data' }

      if (f.is_essa_dep) {
        const tkTime = f.actual_takeoff_time || f.takeoff_time
        let startIdx = 0
        if (tkTime) {
          const idx = pts.findIndex(p => p.time >= tkTime)
          if (idx !== -1) startIdx = idx
        }
        const slice = pts.slice(startIdx)
        let d = 0
        const profile = []
        for (let i = 0; i < slice.length; i++) {
          if (i > 0) d += haversineNM(slice[i-1].lat, slice[i-1].lon, slice[i].lat, slice[i].lon)
          if (d > 20) break
          profile.push({ x: d, y: slice[i].alt })
        }
        if (profile.length < 2) return { type: 'no_data' }
        const yMax = niceMax(Math.max(...profile.map(p => p.y)))
        return { type: 'dep', points: profile, xMax: 20, yMax, xLabel: 'Distance (NM)' }

      } else if (f.is_essa_arr) {
        const ldTime = f.actual_landing_time || f.threshold_time
        let endIdx = pts.length - 1
        if (ldTime) {
          const idx = pts.findIndex(p => p.time >= ldTime)
          if (idx !== -1) endIdx = idx
        }
        const slice = pts.slice(0, endIdx + 1)
        const distBack = new Array(slice.length).fill(0)
        for (let i = slice.length - 2; i >= 0; i--) {
          distBack[i] = distBack[i + 1] + haversineNM(slice[i].lat, slice[i].lon, slice[i + 1].lat, slice[i + 1].lon)
        }
        const profile = slice
          .map((p, i) => ({ x: distBack[i], y: p.alt }))
          .filter(p => p.x <= 20)
        if (profile.length < 2) return { type: 'no_data' }
        return { type: 'arr', points: profile, xMax: 20, yMax: 5000, xLabel: 'Distance to Landing (NM)' }

      } else {
        const t0 = pts[0].time
        const profile = pts.map(p => ({ x: (p.time - t0) / 60, y: p.alt }))
        const xMax = Math.max(profile[profile.length - 1].x, 1)
        const yMax = niceMax(Math.max(...profile.map(p => p.y)))
        return { type: 'time', points: profile, xMax, yMax, xLabel: 'Time (min)' }
      }
    })

    const svgChart = computed(() => {
      const d = profileData.value
      if (!d || !d.points || d.points.length < 2) return null

      const toX = (x) => d.type === 'arr'
        ? ML + (1 - x / d.xMax) * IW
        : ML + (x / d.xMax) * IW
      const toY = (y) => MT + IH - (Math.max(0, Math.min(y, d.yMax)) / d.yMax) * IH

      const pts = d.points.map(p => `${toX(p.x).toFixed(1)},${toY(p.y).toFixed(1)}`).join(' ')
      const f0 = d.points[0], fN = d.points[d.points.length - 1]
      const bY = (MT + IH).toFixed(1)
      const areaPath = `${toX(f0.x).toFixed(1)},${bY} ${pts} ${toX(fN.x).toFixed(1)},${bY}`

      const xTicks = []
      for (let i = 0; i <= 4; i++) {
        const frac = i / 4
        let label
        if (d.type === 'arr') label = Math.round((1 - frac) * d.xMax)
        else if (d.type === 'time') {
          const v = frac * d.xMax
          label = v >= 60 ? `${(v / 60).toFixed(1)}h` : String(Math.round(v))
        } else label = Math.round(frac * d.xMax)
        xTicks.push({ x: ML + frac * IW, label: String(label) })
      }

      const yTicks = []
      for (let i = 0; i <= 4; i++) {
        const val = (i / 4) * d.yMax
        yTicks.push({ y: toY(val), label: fmtAlt(val, d.yMax) })
      }

      return { pts, areaPath, xTicks, yTicks, xLabel: d.xLabel }
    })

    return {
      flights, filters, sortKey, sortDir, sortedFlights, sortBy, fmtSec, fmtTime, fmtCtrTime,
      cntJson, xrwyCount, rowClass,
      selectedFlight, selectFlight, mapEl,
      svgChart, chartColor,
    }
  },
}
</script>

<style scoped>
.flights-review {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  overflow: hidden;
}

/* Table section takes upper portion */
.review-section {
  flex: 0 0 55%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0.75rem 1rem 0.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 1rem;
}

.flight-count {
  font-size: 0.75rem;
  color: #999;
  font-weight: 600;
  white-space: nowrap;
}

.filter-checks {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.fcheck {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: 20px;
  border: 1px solid #eee;
  background: #fafafa;
  user-select: none;
}

.fcheck input { cursor: pointer; margin: 0; }
.fcheck.dep { color: #1565C0; border-color: rgba(33,150,243,.3); }
.fcheck.arr { color: #E65100; border-color: rgba(255,193,7,.4); }
.fcheck.veh { color: #2E7D32; border-color: rgba(76,175,80,.3); }
.fcheck.ctr { color: #6A1B9A; border-color: rgba(156,39,176,.3); }
.fcheck.other { color: #555; border-color: #ddd; }

.table-wrapper {
  flex: 1;
  overflow: auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  border: 1px solid #eee;
}

.review-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
  table-layout: auto;
}

.review-table thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #f5f5f5;
}

.review-table th {
  padding: 0.5rem 0.6rem;
  text-align: left;
  font-size: 0.65rem;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  border-bottom: 2px solid #e0e0e0;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}

.review-table th:hover { background: #eeeeee; }
.review-table th.sorted { color: #2196F3; }

.review-table td {
  padding: 0.35rem 0.6rem;
  border-bottom: 1px solid #f5f5f5;
  white-space: nowrap;
  color: #333;
  cursor: pointer;
}

.review-table tbody tr:hover { background: #f0f0f0 !important; }
.row-selected { outline: 2px solid #2196F3; outline-offset: -1px; }
.row-selected td { background: rgba(33, 150, 243, 0.08) !important; }

.col-callsign { font-weight: 600; font-family: monospace; letter-spacing: 0.3px; }
.col-type { color: #666; }
.col-time { font-family: monospace; color: #555; }
.col-bool { text-align: center; width: 36px; }
.col-rwy { font-family: monospace; font-weight: 600; color: #555; }
.col-num { text-align: center; width: 40px; }
.col-stat  { font-family: monospace; color: #555; text-align: right; }
.col-stand { font-family: monospace; font-size: 0.72rem; color: #555; }
.col-sid   { font-family: monospace; font-size: 0.72rem; color: #777; }

.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
.dot-arr  { background: #FFC107; }
.dot-dep  { background: #2196F3; }
.dot-ctr  { background: #9C27B0; }
.dot-ovr  { background: #757575; }
.dot-veh  { background: #4CAF50; }
.dot-ga   { background: #FF9800; }
.dot-wait { background: #E91E63; }

.row-arr        { background: rgba(255, 193,   7, 0.04); }
.row-dep        { background: rgba( 33, 150, 243, 0.04); }
.row-turnaround { background: rgba(156,  39, 176, 0.04); }
.row-ctr        { background: rgba(156,  39, 176, 0.05); }
.row-ovr        { background: rgba(117, 117, 117, 0.04); }
.row-vehicle    { background: rgba( 76, 175,  80, 0.05); }

/* ── BOTTOM PANELS ─────────────────────────────────────────────────────────── */

.bottom-panels {
  flex: 0 0 45%;
  min-height: 0;
  display: flex;
  flex-direction: row;
  border-top: 2px solid #e0e0e0;
}

.detail-panel {
  flex: 1;
  min-width: 0;
  position: relative;
  overflow: hidden;
  background: #111;
}

.detail-panel + .detail-panel {
  border-left: 1px solid #2a2a2a;
  background: #111;
}

.map-el {
  width: 100%;
  height: 100%;
}

.panel-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 0.82rem;
  background: rgba(17, 17, 17, 0.92);
  z-index: 20;
  pointer-events: none;
}

/* ── PROFILE SVG ─────────────────────────────────────────────────────────── */

.profile-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.tick-label {
  font-size: 9px;
  fill: #888;
  font-family: monospace;
}

.axis-label {
  font-size: 9px;
  fill: #666;
  font-family: sans-serif;
}
</style>
