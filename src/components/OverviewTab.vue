<template>
  <div class="overview">
    <div v-if="loading" class="ov-loading">
      <div class="ov-spin"></div>Loading overview…
    </div>
    <div v-else-if="error" class="ov-err">{{ error }}</div>

    <template v-else>

      <!-- ── Top: KPIs left, Runways right ────────────────────────── -->
      <div class="top-section">

        <!-- Left: KPI Cards -->
        <div class="kpi-panel">
          <div class="kpi-panel-title">
            Average per day
            <span class="kpi-panel-subtitle">({{ averages?.kpi?.day_count || 0 }} days · {{ totalEssaFlights.toLocaleString() }} ESSA flights)</span>
          </div>
          <div v-for="c in kpiCards" :key="c.key"
            class="kpi-card"
            :style="{'--accent': c.color}"
            @mouseenter="setHoverKpi(c)">
            <div class="kpi-value">{{ fmtKpi(c.avg, c.precision) }}</div>
            <div class="kpi-label">{{ c.label }}</div>
          </div>
        </div>

        <!-- Right: Runway Cards (3 rows × 2) -->
        <div class="runway-panel">
          <div class="runway-panel-title">Runway Statistics</div>
          <div v-for="pair in [['19R','01L'],['08','26'],['19L','01R']]" :key="pair[0]" class="runway-row">
            <div v-for="rwy in pair" :key="rwy"
              :class="['pair-card', { 'pair-card-unused': rwyCount(rwy,'dep')===0 && rwyCount(rwy,'arr')===0 }]">
              <div class="pair-rwy-name">
                {{ rwy }}
                <span class="rwy-total-flights">({{ rwyTotalAll(rwy) }} flights)</span>
              </div>
              <div class="pair-rwy-ops">
                <!-- DEP -->
                <div :class="['pair-section','dep-section',{ 'section-empty': rwyCount(rwy,'dep')===0 }]">
                  <div class="pair-op-label">DEP</div>
                  <div class="pair-stats-block">
                    <div class="op-flight-count">{{ rwyTotal(rwy,'dep') }} flights</div>
                    <div class="pair-stats-row">
                      <div class="pair-stat-col"
                        v-if="rwyCount(rwy,'dep') > 0"
                        @mouseenter="setHoverRwy(rwy,'dep','occ')">
                        <span class="pair-avg-label">OCC (s)</span>
                        <span class="pair-avg-val">{{ rwyOcc(rwy,'dep') }}</span>
                      </div>
                      <div class="pair-stat-col"
                        v-if="rwyTaxi(rwy,'dep') != null"
                        @mouseenter="setHoverRwy(rwy,'dep','taxi')">
                        <span class="pair-avg-label">TAXI (min)</span>
                        <span class="pair-avg-val">{{ (rwyTaxi(rwy,'dep') / 60).toFixed(1) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="pair-divider"></div>
                <!-- ARR -->
                <div :class="['pair-section','arr-section',{ 'section-empty': rwyCount(rwy,'arr')===0 }]">
                  <div class="pair-stats-block">
                    <div class="op-flight-count">{{ rwyTotal(rwy,'arr') }} flights</div>
                    <div class="pair-stats-row">
                      <div class="pair-stat-col arr-stat-col"
                        v-if="rwyTaxi(rwy,'arr') != null"
                        @mouseenter="setHoverRwy(rwy,'arr','taxi')">
                        <span class="pair-avg-label">TAXI (min)</span>
                        <span class="pair-avg-val">{{ (rwyTaxi(rwy,'arr') / 60).toFixed(1) }}</span>
                      </div>
                      <div class="pair-stat-col arr-stat-col"
                        v-if="rwyCount(rwy,'arr') > 0"
                        @mouseenter="setHoverRwy(rwy,'arr','occ')">
                        <span class="pair-avg-label">OCC (s)</span>
                        <span class="pair-avg-val">{{ rwyOcc(rwy,'arr') }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="pair-op-label arr-op-label">ARR</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ── Hover Chart ─────────────────────────────────────────── -->
      <div class="chart-section">
        <div v-if="!hoveredMetric" class="chart-hint">
          Hover any card to see 28-day trend
        </div>
        <template v-else>
          <div class="chart-header">
            <span class="chart-label" :style="{color: hoveredMetric.color}">{{ hoveredMetric.label }}</span>
            <span class="chart-avg-tag" :style="{color: hoveredMetric.color}">
              all-time avg: {{ fmtKpi(hoveredMetric.average, hoveredMetric.precision) }}{{ hoveredMetric.unit ? ' ' + hoveredMetric.unit : '' }}
            </span>
          </div>
          <svg :viewBox="`0 0 ${CW} ${CH}`" class="bar-chart">
            <!-- Y grid -->
            <g v-for="y in chartGrid" :key="'cg'+y">
              <line :x1="CL" :y1="cYT(y)" :x2="CW-CR" :y2="cYT(y)" stroke="#eee" stroke-width="1"/>
              <text :x="CL-5" :y="cYT(y)+3" text-anchor="end" font-size="9" fill="#bbb">{{ fmtTick(y) }}</text>
            </g>
            <!-- Bars -->
            <template v-for="(v, i) in hoveredMetric.series" :key="'b'+i">
              <rect v-if="v != null && v > 0"
                :x="cBarX(i)"
                :y="cYT(v)"
                :width="cBarW"
                :height="cBarH(v)"
                :fill="hoveredMetric.color"
                opacity="0.72" rx="1"/>
            </template>
            <!-- Avg reference line -->
            <template v-if="hoveredMetric.average != null && hoveredMetric.average > 0 && hoveredMetric.average <= chartMax * 1.1">
              <line
                :x1="CL" :y1="cYT(hoveredMetric.average)"
                :x2="CW-CR" :y2="cYT(hoveredMetric.average)"
                :stroke="hoveredMetric.color" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.55"/>
            </template>
            <!-- X labels -->
            <text v-for="t in chartXTicks" :key="'xl'+t.i"
              :x="cBarX(t.i) + cBarW / 2"
              :y="CH - CB + 13"
              text-anchor="middle" font-size="8" fill="#bbb">{{ shortDate(t.date) }}</text>
          </svg>
        </template>
      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'

// ── Props / Emits ──────────────────────────────────────────────────
const props = defineProps({
  selectedDate: String,
  dataLoading:  { type: Boolean, default: false },
})
const emit = defineEmits(['update-date', 'load-data'])

// ── State ──────────────────────────────────────────────────────────
const loading   = ref(true)
const error     = ref(null)
const available = ref([])   // all available dates (DESC)
const rangeData = ref([])   // last 28 days metadata rows with .runways[]
const averages  = ref(null) // {kpi:{...}, runways:[...]}
const hoveredMetric = ref(null)
const localDate = ref(props.selectedDate || '')

watch(() => props.selectedDate, v => { if (v) localDate.value = v })

// ── Computed date range info ───────────────────────────────────────
const newestDate = computed(() => available.value[0] || '')
const oldestDate = computed(() => available.value[available.value.length - 1] || '')

// ── Fetch on mount ─────────────────────────────────────────────────
onMounted(async () => {
  try {
    const datesRes = await axios.get('/api/days/available')
    available.value = datesRes.data.dates || []

    if (!available.value.length) {
      error.value = 'No data available'
      return
    }

    if (!localDate.value) localDate.value = newestDate.value

    const latest = available.value[0]
    const to   = new Date(latest + 'T12:00:00Z')
    const from = new Date(to); from.setUTCDate(from.getUTCDate() - 27)
    const dateFrom = from.toISOString().slice(0, 10)

    const [rangeRes, avgRes] = await Promise.all([
      axios.get(`/api/days/stats/range?date_from=${dateFrom}&date_to=${latest}`),
      axios.get('/api/days/stats/averages'),
    ])
    rangeData.value  = rangeRes.data.days || []
    averages.value   = avgRes.data
  } catch (e) {
    error.value = `Failed to load overview: ${e.message}`
  } finally {
    loading.value = false
  }
})

// ── Helpers ────────────────────────────────────────────────────────
function shortDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function fmtKpi(v, precision = 0) {
  if (v == null) return '—'
  if (precision === 0) return Math.round(+v).toString()
  return (+v).toFixed(precision)
}

// ── KPI card definitions ───────────────────────────────────────────
const kpiCards = computed(() => {
  const k = averages.value?.kpi
  if (!k) return []
  return [
    { key: 'tma',   label: 'TMA Movements',   color: '#000000', avg: k.total_flights, precision: 0, seriesKey: 'total_flights' },
    { key: 'dep',   label: 'ESSA Dep',         color: '#2196F3', avg: k.essa_dep,      precision: 0, seriesKey: 'essa_departures' },
    { key: 'arr',   label: 'ESSA Arr',         color: '#FFC107', avg: k.essa_arr,      precision: 0, seriesKey: 'essa_arrivals' },
    { key: 'ctr',   label: 'CTR Flights',      color: '#9C27B0', avg: k.ctr_flights,   precision: 1, seriesKey: 'ctr_flights' },
    { key: 'dtax',  label: 'Avg Dep Taxi (min)',color: '#00BCD4', avg: k.dep_taxi_min,  precision: 1, seriesKey: 'dep_taxi_min', unit: 'min' },
    { key: 'atax',  label: 'Avg Arr Taxi (min)',color: '#00BCD4', avg: k.arr_taxi_min,  precision: 1, seriesKey: 'arr_taxi_min', unit: 'min' },
    { key: 'ga',    label: 'Go-Arounds',       color: '#FF9800', avg: k.goarounds,          precision: 1, seriesKey: 'goarounds' },
    { key: 'wc',    label: 'Wait Count',       color: '#E91E63', avg: k.wait_count,         precision: 1, seriesKey: 'wait_count' },
    { key: 'wm',    label: 'Wait Min',         color: '#E91E63', avg: k.wait_min,           precision: 1, seriesKey: 'wait_min', unit: 'min' },
    { key: 'atma',  label: 'ARR Avg TM (NM)',  color: '#00897B', avg: k.avg_arr_tma_track_nm, precision: 1, seriesKey: 'avg_arr_tma_track_nm', unit: 'NM' },
    { key: 'veh',   label: 'Vehicles',         color: '#4CAF50', avg: k.vehicles,           precision: 0, seriesKey: 'total_essa_vehicle_flights' },
    { key: 'cross', label: 'Crossings',        color: '#4CAF50', avg: k.crossings,          precision: 1, seriesKey: 'crossings' },
  ]
})

// ── Series extraction ──────────────────────────────────────────────
function getKpiSeries(seriesKey) {
  return rangeData.value.map(d => {
    switch (seriesKey) {
      case 'dep_taxi_min': return d.avg_dep_taxi_time_sec ? d.avg_dep_taxi_time_sec / 60 : null
      case 'arr_taxi_min': return d.avg_arr_taxi_time_sec ? d.avg_arr_taxi_time_sec / 60 : null
      case 'wait_count':   return d.arr_taxi_wait_count || 0
      case 'wait_min':     return d.arr_taxi_wait_total_sec ? d.arr_taxi_wait_total_sec / 60 : null
      case 'crossings':    return (d.total_city_crossings || 0) + (d.total_norra_crossings || 0)
      case 'avg_arr_tma_track_nm': return d.avg_arr_tma_track_nm || 0
      default:             return d[seriesKey] || 0
    }
  })
}

const opMap = { dep: 'Departure', arr: 'Arrival' }
function getRwyEntry(rwy, op) {
  const opVal = opMap[op] || op
  return averages.value?.runways?.find(r => r.runway === rwy && r.operation === opVal) || null
}
function rwyCount(rwy, op) {
  const e = getRwyEntry(rwy, op); return e ? Math.round(e.avg_count) : 0
}
function rwyOcc(rwy, op) {
  const e = getRwyEntry(rwy, op); return e ? e.avg_occ_sec : '—'
}
function rwyTaxi(rwy, op) {
  const e = getRwyEntry(rwy, op); return (e && e.avg_taxi_sec) ? e.avg_taxi_sec : null
}
function rwyTotal(rwy, op) {
  const e = getRwyEntry(rwy, op)
  return e ? (e.total_count || 0) : 0
}
function rwyTotalAll(rwy) {
  return rwyTotal(rwy, 'dep') + rwyTotal(rwy, 'arr')
}

const totalEssaFlights = computed(() => {
  const rwys = ['19R','01L','08','26','19L','01R']
  return rwys.reduce((sum, rwy) => sum + rwyTotalAll(rwy), 0)
})

function getRwySeries(rwy, op, field) {
  return rangeData.value.map(d => {
    const opVal = opMap[op] || op
    const r = (d.runways || []).find(r => r.runway === rwy && r.operation === opVal)
    if (!r) return null
    if (field === 'taxi') return r.avg_taxi_sec ? r.avg_taxi_sec / 60 : null
    return r[field] || 0
  })
}

// ── Hover setters ──────────────────────────────────────────────────
function setHoverKpi(c) {
  hoveredMetric.value = {
    label:   c.label,
    color:   c.color,
    series:  getKpiSeries(c.seriesKey),
    average: c.avg,
    unit:    c.unit || '',
    precision: c.precision,
  }
}
function setHoverRwy(rwy, op, type) {
  const color = op === 'dep' ? '#2196F3' : '#FFC107'
  const e = getRwyEntry(rwy, op)
  let label, series, average, unit, precision

  if (type === 'count') {
    label = `${rwy} ${op.toUpperCase()} count`
    series = getRwySeries(rwy, op, 'count')
    average = e?.avg_count; unit = ''; precision = 0
  } else if (type === 'occ') {
    label = `${rwy} ${op.toUpperCase()} occupancy`
    series = getRwySeries(rwy, op, 'avg_occupancy_sec')
    average = e?.avg_occ_sec; unit = 's'; precision = 0
  } else {
    label = `${rwy} ${op.toUpperCase()} taxi`
    series = getRwySeries(rwy, op, 'taxi')
    average = e?.avg_taxi_sec ? e.avg_taxi_sec / 60 : null; unit = 'min'; precision = 1
  }
  hoveredMetric.value = { label, color, series, average, unit, precision }
}

// ── Chart geometry ─────────────────────────────────────────────────
const CW = 900, CH = 200, CL = 50, CR = 30, CT = 20, CB = 35
const innerW = CW - CL - CR   // 820
const innerH = CH - CT - CB   // 145
const barBottom = CT + innerH  // 165

const chartMax = computed(() => {
  if (!hoveredMetric.value) return 1
  const vals = (hoveredMetric.value.series || []).filter(v => v != null && v > 0)
  return Math.max(...vals, 1) * 1.08
})

function cYT(v) {
  return barBottom - (v / chartMax.value) * innerH
}
const cBarW = computed(() => {
  const n = rangeData.value.length || 1
  return Math.max(1, innerW / n - 2)
})
function cBarX(i) {
  const n = rangeData.value.length || 1
  return CL + i * innerW / n
}
function cBarH(v) {
  if (!v || !chartMax.value) return 0
  return Math.min((v / chartMax.value) * innerH, innerH)
}

function gridTicks(maxY, count = 4) {
  if (!maxY || maxY <= 0) return []
  const rawStep = maxY / count
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep || 1)))
  const norm = rawStep / mag
  const step = norm <= 1 ? mag : norm <= 2 ? 2 * mag : norm <= 5 ? 5 * mag : 10 * mag
  const ticks = []
  for (let v = step; v <= maxY * 1.02 && ticks.length <= count; v += step) {
    ticks.push(Math.round(v * 1000) / 1000)
  }
  return ticks
}
const chartGrid = computed(() => hoveredMetric.value ? gridTicks(chartMax.value, 4) : [])

function fmtTick(v) {
  const m = hoveredMetric.value
  if (!m) return v
  if (m.unit === 'min') return `${(+v).toFixed(1)}m`
  if (m.unit === 's') return `${Math.round(v)}s`
  if (m.precision > 0) return (+v).toFixed(m.precision)
  return Math.round(v).toString()
}

const chartXTicks = computed(() => {
  const n = rangeData.value.length
  return rangeData.value
    .map((d, i) => ({ i, date: d.date }))
    .filter(({ i }) => i % 7 === 0 || i === n - 1)
})
</script>

<style scoped>
.overview {
  padding: 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
}

/* ── Loading / error ── */
.ov-loading {
  display: flex; align-items: center; gap: 0.6rem;
  color: #888; font-size: 0.9rem; padding: 2rem;
}
.ov-spin {
  width: 18px; height: 18px;
  border: 2px solid #e0e0e0; border-top-color: #667eea;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.ov-err { color: #d32f2f; padding: 1rem; }

/* ── Header ── */
.ov-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.range-info { display: flex; align-items: baseline; gap: 0.75rem; }
.range-dates { font-size: 0.9rem; font-weight: 700; color: #333; font-variant-numeric: tabular-nums; }
.range-total { font-size: 0.78rem; color: #999; }
.ov-controls { display: flex; align-items: center; gap: 0.5rem; }
.date-input {
  padding: 0.35rem 0.5rem;
  border: 1px solid #ddd; border-radius: 4px;
  font-size: 0.85rem; color: #333; background: white;
}
.date-input:focus { outline: none; border-color: #667eea; }
.load-btn {
  padding: 0.35rem 0.9rem;
  background: #667eea; color: white;
  border: none; border-radius: 4px;
  font-size: 0.85rem; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; gap: 0.35rem;
  transition: background 0.2s;
}
.load-btn:hover:not(:disabled) { background: #5568d3; }
.load-btn:disabled { background: #ccc; cursor: not-allowed; }
.btn-spin {
  width: 12px; height: 12px;
  border: 2px solid rgba(255,255,255,0.4); border-top-color: white;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}

/* ── Top section: KPIs left, runways right ── */
.top-section {
  display: flex;
  flex-direction: row;
  gap: 0.75rem;
  min-height: 0;
}

/* ── KPI panel (left half) ── */
.kpi-panel {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto;
  gap: 0.5rem;
  align-content: start;
}
.kpi-card {
  background: color-mix(in srgb, var(--accent, #888) 10%, white);
  border-radius: 8px;
  padding: 0.65rem 0.4rem 0.55rem;
  text-align: center;
  box-shadow: none;
  border: none;
  cursor: default;
  transition: filter 0.15s;
}
.kpi-card:hover {
  filter: brightness(0.95);
}
.kpi-value {
  font-size: 1.45rem; font-weight: 800;
  color: color-mix(in srgb, var(--accent, #888) 80%, #111);
  margin-bottom: 0.15rem;
  font-variant-numeric: tabular-nums;
}
.kpi-label {
  font-size: 0.58rem; color: color-mix(in srgb, var(--accent, #888) 50%, #777);
  font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
}

/* ── Runway panel (right half) ── */
.runway-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.runway-panel-title {
  text-align: center;
  font-size: 0.75rem; font-weight: 700; color: #888;
  text-transform: uppercase; letter-spacing: 0.6px;
}
.kpi-panel-title {
  grid-column: 1 / -1;
  text-align: center;
  font-size: 0.75rem; font-weight: 700; color: #888;
  text-transform: uppercase; letter-spacing: 0.6px;
}
.kpi-panel-subtitle {
  font-size: 0.68rem; font-weight: 400; color: #bbb;
  text-transform: none; letter-spacing: 0;
}
.runway-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  align-items: start;
}
.pair-card {
  background: white; border: 1px solid #ddd;
  border-radius: 8px; overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.pair-card-unused { opacity: 0.4; }
.pair-rwy-name {
  font-size: 0.82rem; font-weight: 700; color: #444;
  background: #f0f0f0; padding: 0.2rem 0.75rem;
  border-bottom: 1px solid #ddd; letter-spacing: 0.5px;
  display: flex; align-items: center; justify-content: center; gap: 0.3rem;
}
.pair-rwy-ops { display: flex; flex-direction: row; }
.pair-section {
  flex: 1; display: flex; flex-direction: row;
  align-items: center; padding: 0.2rem 0.15rem 0.4rem; gap: 0; min-width: 0;
}
.pair-stats-block {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; gap: 0; min-width: 0;
}
.op-flight-count {
  font-size: 0.58rem; color: #aaa; font-weight: 500;
  text-align: center; white-space: nowrap; line-height: 1;
  margin-bottom: 0.1rem;
}
.pair-stats-row {
  display: flex; flex-direction: row; width: 100%;
}
.dep-section { background: rgba(33,150,243,0.03); border-left: 3px solid #2196F3; }
.arr-section { background: rgba(255,193,7,0.03); border-right: 3px solid #FFC107; }
.section-empty { opacity: 0.3; }
.pair-divider { width: 1px; background: #e8e8e8; flex-shrink: 0; align-self: stretch; }
.rwy-total-flights {
  font-size: 0.62rem; font-weight: 400; color: #aaa; vertical-align: middle;
}
.pair-op-label {
  font-size: 0.5rem; font-weight: 700; color: #bbb;
  text-transform: uppercase; letter-spacing: 0.8px;
  writing-mode: vertical-rl; text-orientation: mixed;
  padding: 0 0.2rem;
}
.arr-op-label { transform: rotate(180deg); }
.pair-stat-col {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; flex: 1; border-left: 1px solid #eee;
  padding: 0.1rem 0.25rem; min-width: 0; cursor: default;
}
.pair-stat-col:hover { background: rgba(0,0,0,0.02); }
.arr-stat-col { border-left: none; border-right: 1px solid #eee; }
.pair-avg-label {
  font-size: 0.48rem; font-weight: 700; color: #bbb;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.pair-avg-val {
  font-size: 1.35rem; font-weight: 700; color: #333;
}

/* ── Hover chart ── */
.chart-section {
  background: white; border: 1px solid #eee;
  border-radius: 8px; padding: 0.75rem;
  min-height: 220px;
  display: flex; flex-direction: column;
}
.chart-hint {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: #ccc; font-size: 0.9rem;
}
.chart-header {
  display: flex; align-items: baseline; gap: 1rem; margin-bottom: 0.4rem;
}
.chart-label { font-size: 0.85rem; font-weight: 700; }
.chart-avg-tag { font-size: 0.75rem; opacity: 0.7; }
.bar-chart { width: 100%; height: auto; display: block; }

@media (max-width: 1100px) {
  .top-section { flex-direction: column; }
  .kpi-panel { grid-template-columns: repeat(4, 1fr); }
  .runway-panel { flex-direction: row; flex-wrap: wrap; }
  .runway-row { flex: 0 0 auto; width: 100%; }
}
@media (max-width: 700px) {
  .kpi-panel { grid-template-columns: repeat(3, 1fr); }
}
</style>
