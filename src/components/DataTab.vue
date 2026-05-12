<template>
  <div class="data-tab">
    <div v-if="statistics" class="stats-container">
      <!-- ===== KPI CARDS (full width) ===== -->
      <div class="kpi-section">
        <div class="kpi-card" style="--accent-color: #000000">
          <div class="kpi-value">{{ statistics.metadata.essa_departures + statistics.metadata.essa_arrivals }}</div>
          <div class="kpi-label">IFR Flights</div>
        </div>
        <div class="kpi-card" style="--accent-color: #2196F3">
          <div class="kpi-value">{{ statistics.metadata.essa_departures }}</div>
          <div class="kpi-label">Departures</div>
        </div>
        <div class="kpi-card" style="--accent-color: #FFC107">
          <div class="kpi-value">{{ statistics.metadata.essa_arrivals }}</div>
          <div class="kpi-label">Arrivals</div>
        </div>
        <div class="kpi-card" style="--accent-color: #9C27B0">
          <div class="kpi-value">{{ statistics.metadata.ctr_flights }}</div>
          <div class="kpi-label">CTR Flights</div>
        </div>
        <div class="kpi-card" style="--accent-color: #FF9800">
          <div class="kpi-value">{{ statistics.metadata.goarounds }}</div>
          <div class="kpi-label">Go-arounds</div>
        </div>
        <div class="kpi-card" style="--accent-color: #00897B">
          <div class="kpi-value">{{ (statistics.metadata.avg_arr_tma_track_nm || 0).toFixed(1) }}</div>
          <div class="kpi-label">ARR Avg TM (NM)</div>
        </div>
        <div class="kpi-card" style="--accent-color: #1565C0">
          <div class="kpi-value">{{ (statistics.metadata.avg_dep_taxi_time_sec / 60).toFixed(1) }}</div>
          <div class="kpi-label">Avg Dep Taxi (min)</div>
        </div>
        <div class="kpi-card" style="--accent-color: #00BCD4">
          <div class="kpi-value">{{ (statistics.metadata.avg_arr_taxi_time_sec / 60).toFixed(1) }}</div>
          <div class="kpi-label">Avg Arr Taxi (min)</div>
        </div>
        <div class="kpi-card" style="--accent-color: #E91E63">
          <div class="kpi-value">{{ statistics.metadata.arr_taxi_wait_count || 0 }}</div>
          <div class="kpi-label">Wait Count</div>
        </div>
        <div class="kpi-card" style="--accent-color: #C2185B">
          <div class="kpi-value">{{ ((statistics.metadata.arr_taxi_wait_total_sec || 0) / 60).toFixed(1) }}</div>
          <div class="kpi-label">Wait Min</div>
        </div>
        <div class="kpi-card" style="--accent-color: #4CAF50">
          <div class="kpi-value">{{ statistics.metadata.essa_vehicles }}</div>
          <div class="kpi-label">Vehicles</div>
        </div>
        <div class="kpi-card" style="--accent-color: #4CAF50">
          <div class="kpi-value">{{ (statistics.metadata.total_city_crossings || 0) + (statistics.metadata.total_norra_crossings || 0) }}</div>
          <div class="kpi-label">Crossings</div>
        </div>
      </div>

      <!-- ===== RUNWAY PAIRS (3 columns, 2 runways each) ===== -->
      <div class="runway-pairs-section">
        <div v-for="pair in [['19R','01L'],['08','26'],['19L','01R']]" :key="pair[0]" class="runway-pair">
          <div v-for="rwy in pair" :key="rwy"
               :class="['pair-card', { 'pair-card-unused': getRunwayStatCount(rwy,'Departure')===0 && getRunwayStatCount(rwy,'Arrival')===0 }]">
            <div class="pair-rwy-name">{{ rwy }}</div>
            <div class="pair-rwy-ops">
              <!-- DEP -->
              <div :class="['pair-section','dep-section',{ 'section-empty': getRunwayStatCount(rwy,'Departure')===0 }]">
                <div class="pair-count-side">
                  <div class="pair-op-label">DEP</div>
                  <div class="pair-count">{{ getRunwayStatCount(rwy,'Departure') || '—' }}</div>
                </div>
                <div class="pair-stat-col" v-if="getRunwayStatCount(rwy,'Departure') > 0">
                  <span class="pair-avg-label">OCC (s)</span>
                  <span class="pair-avg-val">{{ getRunwayStat(rwy,'Departure','avg_occupancy_sec') }}</span>
                </div>
                <div class="pair-stat-col" v-if="getRunwayTaxiStat(rwy,'Departure','avg_taxi_sec')">
                  <span class="pair-avg-label">TAXI (min)</span>
                  <span class="pair-avg-val">{{ (getRunwayTaxiStat(rwy,'Departure','avg_taxi_sec') / 60).toFixed(1) }}</span>
                </div>
              </div>
              <!-- Divider -->
              <div class="pair-divider"></div>
              <!-- ARR (mirrored — yellow bar on right, content right-to-left) -->
              <div :class="['pair-section','arr-section',{ 'section-empty': getRunwayStatCount(rwy,'Arrival')===0 }]">
                <div class="pair-stat-col arr-stat-col" v-if="getRunwayTaxiStat(rwy,'Arrival','avg_taxi_sec')">
                  <span class="pair-avg-label">TAXI (min)</span>
                  <span class="pair-avg-val">{{ (getRunwayTaxiStat(rwy,'Arrival','avg_taxi_sec') / 60).toFixed(1) }}</span>
                </div>
                <div class="pair-stat-col arr-stat-col" v-if="getRunwayStatCount(rwy,'Arrival') > 0">
                  <span class="pair-avg-label">OCC (s)</span>
                  <span class="pair-avg-val">{{ getRunwayStat(rwy,'Arrival','avg_occupancy_sec') }}</span>
                </div>
                <div class="pair-count-side arr-count-side">
                  <div class="pair-op-label">ARR</div>
                  <div class="pair-count">{{ getRunwayStatCount(rwy,'Arrival') || '—' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== HOURLY ACTIVITY ===== -->
      <div class="section hourly-section">
        <h2 class="section-title">24-Hour Activity</h2>
        
        <!-- Detail table with hover visualization -->
        <div class="hourly-table-wrapper" @mouseleave="hoveredMetric.label = 'Total'; hoveredMetric.isDefault = true; hoveredMetric.color = '#333'; hoveredMetric.values = statistics.hourly.map(h => h.departures + h.arrivals + h.inctr_flights)">
          <!-- Hover bars visualization -->
          <div :class="['hover-bars-container', { 'hover-non-total': !hoveredMetric.isDefault }]">
            <!-- Grid lines -->
            <div class="hover-bars-grid">
              <div 
                v-for="lineValue in gridLines"
                :key="`gridline-${lineValue}`"
                class="grid-line"
                :style="{ bottom: `${(lineValue / totalMax) * 100}%` }"
              ></div>
            </div>
            
            <div class="hover-metric-label">{{ hoveredMetric.label }}</div>
            <div class="hover-bars">
              <div 
                v-for="(hour, idx) in statistics.hourly" 
                :key="`hover-bar-${idx}`"
                class="hover-bar-column"
              >
                <!-- TOTAL bars (always visible in background) -->
                <div 
                  class="hover-bar hover-bar-total" 
                  :style="{ 
                    height: getHoverBarHeight(statistics.hourly[idx].departures + statistics.hourly[idx].arrivals + statistics.hourly[idx].inctr_flights, totalMax)
                  }"
                ></div>
                <!-- Hovered metric bars (overlay on top when not showing total) -->
                <div 
                  v-if="!hoveredMetric.isDefault"
                  :class="['hover-bar', 'hover-bar-metric', { 'hover-bar-taxi': hoveredMetric.isTaxiTime }]"
                  :style="{ 
                    height: getHoverBarHeight(hoveredMetric.values[idx], hoveredMetric.max),
                    backgroundColor: hoveredMetric.color
                  }"
                ></div>
              </div>
            </div>
          </div>
          
          <table class="hourly-table">
            <thead>
              <tr>
                <th class="metric-label">UTC Time</th>
                <th v-for="(hour, idx) in statistics.hourly" :key="`header-${idx}`" class="hour-column">
                  {{ String((idx + 3) % 24).padStart(2, '0') }}:00
                </th>
              </tr>
            </thead>
            <tbody>
              <tr class="metric-row total-row" @mouseenter="hoveredMetric.isDefault = true; hoveredMetric.label = 'Total'; hoveredMetric.color = '#333'">
                <td class="metric-label">Total</td>
                <td v-for="(hour, idx) in statistics.hourly" :key="`total-${idx}`" class="data-cell total-cell">{{ hour.departures + hour.arrivals + hour.inctr_flights }}</td>
              </tr>
              <tr class="metric-row deps-row" @mouseenter="setHoveredMetric('Departures', statistics.hourly.map(h => h.departures), '#2196F3')">
                <td class="metric-label">Deps</td>
                <td v-for="(hour, idx) in statistics.hourly" :key="`deps-${idx}`" class="data-cell">{{ hour.departures }}</td>
              </tr>
              <tr class="metric-row arrs-row" @mouseenter="setHoveredMetric('Arrivals', statistics.hourly.map(h => h.arrivals), '#FFC107')">
                <td class="metric-label">Arrs</td>
                <td v-for="(hour, idx) in statistics.hourly" :key="`arrs-${idx}`" class="data-cell">{{ hour.arrivals }}</td>
              </tr>
              <tr class="metric-row ctr-row" @mouseenter="setHoveredMetric('CTR Flights', statistics.hourly.map(h => h.inctr_flights * 2), '#9C27B0')">
                <td class="metric-label">CTR</td>
                <td v-for="(hour, idx) in statistics.hourly" :key="`ctr-${idx}`" class="data-cell">{{ hour.inctr_flights }}</td>
              </tr>
              <tr class="metric-row vehicles-active-row" @mouseenter="setHoveredMetric('Vehicles Active', statistics.hourly.map(h => h.vehicles_active * 2), '#4CAF50', false)">
                <td class="metric-label">Vehicles Active</td>
                <td v-for="(hour, idx) in statistics.hourly" :key="`vehicles-active-${idx}`" class="data-cell">{{ hour.vehicles_active }}</td>
              </tr>
              <tr class="metric-row tow-trucks-row" @mouseenter="setHoveredMetric('Tow Trucks Active', statistics.hourly.map(h => h.tow_trucks_active * 2), '#4CAF50', false)">
                <td class="metric-label">Tow Trucks</td>
                <td v-for="(hour, idx) in statistics.hourly" :key="`tow-${idx}`" class="data-cell">{{ hour.tow_trucks_active || 0 }}</td>
              </tr>
              <tr class="metric-row crossings-row" @mouseenter="setHoveredMetric('Crossings', statistics.hourly.map(h => ((h.city_crossings || 0) + (h.norra_crossings || 0)) * 2), '#4CAF50', false)">
                <td class="metric-label">Crossings</td>
                <td v-for="(hour, idx) in statistics.hourly" :key="`crossings-${idx}`" class="data-cell">{{ (hour.city_crossings || 0) + (hour.norra_crossings || 0) || '—' }}</td>
              </tr>
              <tr class="metric-row dep-taxi-row" @mouseenter="setHoveredMetric('Avg Dep Taxi', statistics.hourly.map(h => parseFloat((h.avg_dep_taxi_time_sec / 60).toFixed(1))), '#1565C0', true, true)">
                <td class="metric-label">Avg Dep Taxi</td>
                <td v-for="(hour, idx) in statistics.hourly" :key="`dep-taxi-${idx}`" class="data-cell">{{ (hour.avg_dep_taxi_time_sec / 60).toFixed(1) }}</td>
              </tr>
              <tr class="metric-row arr-taxi-row" @mouseenter="setHoveredMetric('Avg Arr Taxi', statistics.hourly.map(h => parseFloat((h.avg_arr_taxi_time_sec / 60).toFixed(1))), '#00BCD4', true, true)">
                <td class="metric-label">Avg Arr Taxi</td>
                <td v-for="(hour, idx) in statistics.hourly" :key="`arr-taxi-${idx}`" class="data-cell">{{ (hour.avg_arr_taxi_time_sec / 60).toFixed(1) }}</td>
              </tr>
              <tr class="metric-row arr-tma-row" @mouseenter="setHoveredMetric('Avg Arr TM (NM)', statistics.hourly.map(h => parseFloat((h.avg_arr_tma_track_nm || 0).toFixed(1))), '#00897B', true, true)">
                <td class="metric-label">Avg Arr TM (NM)</td>
                <td v-for="(hour, idx) in statistics.hourly" :key="`arr-tma-${idx}`" class="data-cell">{{ (hour.avg_arr_tma_track_nm || 0).toFixed(1) }}</td>
              </tr>
              <tr v-for="runway in allRunways" :key="`runway-row-${runway}`" class="metric-row runway-row">
                <td class="metric-label">{{ runway }}</td>
                <td v-for="(hour, idx) in statistics.hourly" :key="`${runway}-${idx}`" class="runway-data-cell">
                  <template v-if="getRunwayOpsForHour(hour, runway)">
                    <div class="runway-ops-inline">
                      <span v-if="getRunwayOpsForHour(hour, runway).arrs > 0" class="arr-count">{{ getRunwayOpsForHour(hour, runway).arrs }}</span>
                      <span v-if="getRunwayOpsForHour(hour, runway).deps > 0" class="dep-count">{{ getRunwayOpsForHour(hour, runway).deps }}</span>
                    </div>
                  </template>
                  <template v-else>
                    —
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ===== AIRCRAFT & AIRLINES & VEHICLES ===== -->
      <div class="section two-column three-col">
        <div class="subsection">
          <h3 class="subsection-title">Top Aircraft</h3>
          <AircraftTable :aircraftData="statistics.aircraft" />
        </div>
        <div class="subsection">
          <h3 class="subsection-title">Top Airlines</h3>
          <AirlinesTable :airlinesData="statistics.airlines" />
        </div>
        <div class="subsection">
          <h3 class="subsection-title">Top Vehicles</h3>
          <VehiclesTable :vehiclesData="statistics.vehicles" />
        </div>
      </div>

    </div>
    <div v-else class="no-data">
      <p>Loading statistics...</p>
    </div>
  </div>
</template>

<script>
import RunwayTable from './RunwayTable.vue'
import AircraftTable from './AircraftTable.vue'
import AirlinesTable from './AirlinesTable.vue'
import VehiclesTable from './VehiclesTable.vue'

export default {
  name: 'DataTab',
  components: {
    RunwayTable,
    AircraftTable,
    AirlinesTable,
    VehiclesTable,
  },
  props: {
    statistics: Object,
  },
  data() {
    return {
      hoveredMetric: {
        label: 'Total',
        values: [],
        color: '#333',
        max: 1,
        isDefault: true,
        isLine: false,
      },
      totalMax: 1,
    }
  },
  computed: {
    maxFlights() {
      if (!this.statistics?.hourly) return 1
      return Math.max(...this.statistics.hourly.map(h => h.departures + h.arrivals))
    },
    uniqueRunways() {
      if (!this.statistics?.runways) return []
      const runways = new Set(this.statistics.runways.map(r => r.runway))
      return Array.from(runways).sort()
    },
    allRunways() {
      if (!this.statistics?.hourly) return []
      const allRunways = new Set()
      this.statistics.hourly.forEach((hour, idx) => {
        if (hour.runway_operations && Array.isArray(hour.runway_operations) && hour.runway_operations.length > 0) {
          hour.runway_operations.forEach(op => {
            if (op && op.runway) {
              allRunways.add(op.runway)
            }
          })
        }
      })
      return Array.from(allRunways).sort()
    },
    gridLines() {
      const lines = []
      for (let i = 10; i <= this.totalMax; i += 10) {
        lines.push(i)
      }
      return lines
    },
  },
  watch: {
    statistics: {
      handler() {
        if (this.statistics?.hourly) {
          const totalValues = this.statistics.hourly.map(h => h.departures + h.arrivals + h.inctr_flights)
          this.totalMax = Math.max(...totalValues)
          // Always update the visualization to show TOTAL
          this.hoveredMetric = {
            label: 'Total',
            values: totalValues,
            color: '#333',
            max: this.totalMax,
            isDefault: true,
          }
        }
      },
      immediate: true,
    },
  },
  methods: {
    getBarHeight(value, max) {
      const height = (value / max) * 100
      return `${Math.max(height, 2)}%`
    },
    setHoveredMetric(label, values, color, useOwnScale = false, isTaxiTime = false) {
      const max = useOwnScale ? Math.max(...values) : this.totalMax
      this.hoveredMetric = {
        label,
        values,
        color,
        max,
        isDefault: false,
        isTaxiTime,
      }
    },
    getHoverBarHeight(value, max) {
      if (value === undefined || value === null) return '0%'
      const height = (value / max) * 100
      return `${Math.max(height, 1)}%`
    },
    getRunwayOpsForHour(hour, runway) {
      if (!hour.runway_operations) return null
      return hour.runway_operations.find(op => op.runway === runway) || null
    },
    getRunwayStatCount(runway, operation) {
      if (!this.statistics?.runways) return 0
      const stat = this.statistics.runways.find(r => r.runway === runway && r.operation === operation)
      return stat ? stat.count : 0
    },
    getRunwayStat(runway, operation, field) {
      if (!this.statistics?.runways) return 0
      const stat = this.statistics.runways.find(r => r.runway === runway && r.operation === operation)
      return stat ? Math.round(stat[field]) : 0
    },
    getRunwayTaxiStat(runway, operation, field) {
      if (!this.statistics?.runways) return null
      const stat = this.statistics.runways.find(r => r.runway === runway && r.operation === operation)
      return stat ? stat[field] : null
    },
    fmtMin(sec) {
      if (sec == null) return '—'
      return (sec / 60).toFixed(1) + 'm'
    },
    getRangeStyle(runway, operation, type) {
      const stat = this.statistics?.runways?.find(r => r.runway === runway && r.operation === operation)
      if (!stat) return {}
      let min, max, scale
      if (type === 'taxi') {
        min = stat.min_taxi_sec || 0; max = stat.max_taxi_sec || 0; scale = 900
      } else {
        min = stat.min_occupancy_sec || 0; max = stat.max_occupancy_sec || 0; scale = 120
      }
      const leftPct = Math.min((min / scale) * 100, 100)
      const widthPct = Math.min(((max - min) / scale) * 100, 100 - leftPct)
      return { left: leftPct + '%', width: Math.max(widthPct, 2) + '%' }
    },
    getMeanStyle(runway, operation, type) {
      const stat = this.statistics?.runways?.find(r => r.runway === runway && r.operation === operation)
      if (!stat) return {}
      let avg, scale
      if (type === 'taxi') {
        avg = stat.avg_taxi_sec || 0; scale = 900
      } else {
        avg = stat.avg_occupancy_sec || 0; scale = 120
      }
      return { left: Math.min((avg / scale) * 100, 100) + '%' }
    },
  },
}
</script>

<style scoped>
.data-tab {
  height: 100%;
  padding: 0;
  overflow-y: auto;
  background: #fafafa;
}

.stats-container {
  display: flex;
  flex-direction: column;
  gap: 0rem;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0.75rem 1.5rem;
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #999;
  font-size: 0.9rem;
}

/* ===== KPI SECTION (full width) ===== */
.kpi-section {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.kpi-card {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  border-left: 6px solid var(--accent-color, #666);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.kpi-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--accent-color, #333);
  margin-bottom: 0.25rem;
}

.kpi-label {
  font-size: 0.7rem;
  color: #999;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ===== RUNWAY PAIRS (3 columns, 2 per pair) ===== */
.runway-pairs-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.runway-pair {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pair-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.pair-card-unused {
  opacity: 0.4;
}

.pair-rwy-name {
  font-size: 0.82rem;
  font-weight: 700;
  color: #444;
  background: #f0f0f0;
  padding: 0.25rem 0.75rem;
  border-bottom: 1px solid #ddd;
  letter-spacing: 0.5px;
  text-align: center;
}

.pair-rwy-ops {
  display: flex;
  flex-direction: row;
  min-height: 90px;
}

.pair-section {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  padding: 0 0.55rem 0.5rem;
  gap: 0;
  min-width: 0;
}

.dep-section {
  background: rgba(33, 150, 243, 0.03);
  border-left: 3px solid #2196F3;
}

.arr-section {
  background: rgba(255, 193, 7, 0.03);
  border-right: 3px solid #FFC107;
}

.section-empty {
  opacity: 0.3;
}

.pair-divider {
  width: 1px;
  background: #e8e8e8;
  flex-shrink: 0;
  align-self: stretch;
}

.pair-count-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  flex: 2;
  padding: 0 0.4rem;
  border-right: 1px solid #eee;
  min-width: 0;
}

.arr-count-side {
  border-right: none;
  border-left: 1px solid #eee;
  padding: 0 0.4rem;
}

.pair-op-label {
  font-size: 0.52rem;
  font-weight: 700;
  color: #bbb;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  padding-top: 0.35rem;
}

.pair-count {
  font-size: 2rem;
  font-weight: 700;
  color: #222;
  line-height: 1;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-variant-numeric: tabular-nums;
}

.pair-stat-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  flex: 1.4;
  border-left: 1px solid #eee;
  padding: 0 0.3rem;
  min-width: 0;
}

.arr-stat-col {
  border-left: none;
  border-right: 1px solid #eee;
}

.pair-avg-label {
  font-size: 0.5rem;
  font-weight: 700;
  color: #bbb;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  align-self: center;
  padding-top: 0.35rem;
}

.pair-avg-val {
  font-size: 1.1rem;
  font-weight: 700;
  color: #333;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== STAT BAR GROUPS ===== */
.stat-bar-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-bar-label {
  font-size: 0.58rem;
  font-weight: 600;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ===== OCCUPANCY RANGE BAR ===== */
.occ-range-wrap {
  width: 100%;
}

.occ-bar-track {
  position: relative;
  height: 6px;
  background: #e8e8e8;
  border-radius: 3px;
  margin-bottom: 0.3rem;
}

.occ-bar-range {
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: 3px;
  opacity: 0.35;
}

.dep-range { background: #2196F3; }
.arr-range { background: #FFC107; }

.occ-bar-mean {
  position: absolute;
  top: -3px;
  width: 3px;
  height: 12px;
  border-radius: 2px;
  transform: translateX(-50%);
}

.dep-mean { background: #1565C0; }
.arr-mean { background: #F57F17; }

.occ-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.6rem;
  color: #999;
}

.occ-avg {
  font-weight: 700;
  color: #444;
  font-size: 0.65rem;
}

/* ===== SECTIONS ===== */
.section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.section.two-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  padding: 0;
}

.section.two-column.three-col {
  grid-template-columns: 1fr 1fr 1fr;
}

.section.two-column > .subsection {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
}


.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1rem;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 0.75rem;
}

.subsection-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #555;
  margin-bottom: 0.75rem;
}

/* ===== HOURLY SECTION ===== */
.hourly-section {
  padding: 1.5rem !important;
  margin-bottom: 1rem;
}

.hourly-grid-container {
  width: 100%;
  overflow-x: auto;
  border: 1px solid #eee;
  border-radius: 6px;
  background: white;
  padding: 1rem;
}

.hourly-grid {
  display: grid;
  grid-template-columns: repeat(24, minmax(80px, 1fr));
  gap: 1rem;
  min-width: min(100%, 2000px);
}

.hourly-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.column-header {
  font-size: 0.7rem;
  font-weight: 600;
  color: #666;
  white-space: nowrap;
}

.bar-container {
  width: 100%;
  height: 150px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  border: 1px solid #eee;
  border-radius: 4px;
  background: #fafafa;
  padding: 0.5rem 0.25rem;
}

.bar-stack {
  display: flex;
  flex-direction: column;
  width: 60%;
  height: 100%;
  gap: 1px;
}

.bar-segment {
  flex: 1;
  min-height: 2px;
  border-radius: 2px;
  transition: opacity 0.2s;
}

.dep-bar {
  background: #2196F3;
}

.arr-bar {
  background: #FFC107;
}

.bar-segment:hover {
  opacity: 0.8;
}

.ctr-indicator {
  width: 100%;
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ctr-badge {
  background: #FF9800;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 600;
}

.column-metrics {
  width: 100%;
  font-size: 0.65rem;
  text-align: center;
  border-top: 1px solid #eee;
  padding-top: 0.5rem;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.metric-label {
  color: #999;
  font-size: 0.6rem;
  text-transform: uppercase;
}

.metric-value {
  color: #333;
  font-weight: 600;
  font-size: 0.7rem;
}

.hourly-table-wrapper {
  width: 100%;
  position: relative;
  border: 1px solid #eee;
  border-radius: 6px;
  background: white;
}

.hover-bars-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  border-bottom: 2px solid #eee;
  background: #fafafa;
  animation: slideDown 0.2s ease-out;
  border-radius: 6px 6px 0 0;
  z-index: 20;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.hover-bars-container.hover-non-total {
  opacity: 1;
  z-index: 25;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 300px;
  }
}

.hover-metric-label {
  width: 90px;
  padding: 1rem 0.75rem;
  font-weight: 600;
  color: #333;
  font-size: 0.75rem;
  display: flex;
  align-items: flex-end;
  border-right: 2px solid #ddd;
  white-space: nowrap;
  flex-shrink: 0;
}

.hover-bars {
  display: flex;
  flex: 1;
  gap: 0;
  padding: 0.75rem 0 0;
  align-items: flex-end;
  position: relative;
}

.hover-bars-grid {
  position: absolute;
  top: 0.75rem;
  left: 90px;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.grid-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: #ddd;
  z-index: 0;
}

.hover-bar-column {
  flex: 1;
  height: 200px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  border-right: 1px solid #eee;
  padding: 0;
  min-width: 50px;
  position: relative;
}

.hover-bar {
  width: 100%;
  border-radius: 3px 3px 0 0;
  transition: opacity 0.2s;
  opacity: 0.9;
  min-height: 1px;
  position: absolute;
  bottom: 0;
}

.hover-bar-total {
  background: #333;
  opacity: 0.5;
  z-index: 1;
}

.hover-bar-metric {
  opacity: 0.6;
  z-index: 2;
}

.hover-bar-metric.hover-bar-taxi {
  opacity: 0.3;
}

.hover-line {
  position: absolute;
  width: 100%;
  height: 2px;
  z-index: 2;
  opacity: 0.75;
}

.hover-bar:hover {
  opacity: 1;
}

.hourly-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
  background: white;
  table-layout: fixed;
  margin-top: 210px;
}

.hourly-table thead {
  background: #f5f5f5;
  border-bottom: 2px solid #ddd;
  position: static;
}

.hourly-table th {
  padding: 0.5rem 0.25rem;
  text-align: center;
  font-weight: 600;
  color: #666;
  border-right: 1px solid #eee;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.7rem;
}

.hourly-table th.metric-label {
  text-align: left;
  border-right: 2px solid #ddd;
  width: 90px;
  flex-shrink: 0;
  font-size: 0.7rem;
  padding: 0.5rem 0.75rem;
}

.hourly-table tbody tr {
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
  cursor: pointer;
}

.hourly-table tbody tr:hover {
  background: #f9f9f9;
}

.hourly-table tbody tr:last-child {
  border-bottom: none;
}

.metric-label {
  font-weight: 600;
  color: #333;
  padding: 0.5rem 0.75rem;
  white-space: nowrap;
  border-right: 2px solid #ddd;
  width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}

.data-cell {
  padding: 0.5rem 0.25rem;
  text-align: center;
  color: #555;
  border-right: 1px solid #eee;
  font-size: 0.75rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.deps-row .data-cell {
  color: #2196F3;
  font-weight: 700;
  background: rgba(33, 150, 243, 0.05);
}

.arrs-row .data-cell {
  color: #FFC107;
  font-weight: 700;
  background: rgba(255, 193, 7, 0.05);
}

.ctr-row .data-cell {
  color: #9C27B0;
  font-weight: 700;
  background: rgba(156, 39, 176, 0.05);
}

.vehicles-active-row .data-cell {
  color: #4CAF50;
  font-weight: 700;
  background: rgba(76, 175, 80, 0.05);
}

.tow-trucks-row .data-cell {
  color: #4CAF50;
  font-weight: 700;
  background: rgba(76, 175, 80, 0.05);
}

.crossings-row .data-cell {
  color: #4CAF50;
  font-weight: 700;
  background: rgba(76, 175, 80, 0.05);
}

.dep-taxi-row .data-cell {
  color: #1565C0;
  font-weight: 700;
  background: rgba(21, 101, 192, 0.05);
}

.arr-taxi-row .data-cell {
  color: #00BCD4;
  font-weight: 700;
  background: rgba(0, 188, 212, 0.05);
}

.total-row {
  background: #f0f0f0;
  border-top: 2px solid #999;
  border-bottom: 2px solid #999;
  font-weight: 600;
}

.total-cell {
  font-weight: 600;
  color: #333 !important;
}

.runway-cell {
  font-size: 0.65rem;
  color: #666;
  font-family: monospace;
  letter-spacing: -0.5px;
}

.runway-row {
  background: #fafafa;
  border-top: 2px solid #eee;
}

.runway-data-cell {
  padding: 0.5rem 0.25rem;
  text-align: center;
  color: #555;
  border-right: 1px solid #eee;
  font-size: 0.75rem;
}

.runway-ops-inline {
  display: flex;
  flex-direction: row;
  gap: 3px;
  min-height: 16px;
  align-items: center;
  justify-content: center;
}

.dep-count {
  color: #2196F3;
  font-weight: 600;
  font-size: 0.75rem;
}

.arr-count {
  color: #FFC107;
  font-weight: 600;
  font-size: 0.75rem;
}

/* ===== Old runway table styles (keeping for reference, can be removed) ===== */

@media (max-width: 1200px) {
  .hourly-grid {
    grid-template-columns: repeat(24, minmax(70px, 1fr));
  }
  
  .bar-container {
    height: 120px;
  }
}

@media (max-width: 800px) {
  .hourly-grid {
    grid-template-columns: repeat(24, minmax(60px, 1fr));
    gap: 0.75rem;
  }
  
  .bar-container {
    height: 100px;
  }
}

/* ===== RUNWAY CARDS ===== */

.stat-operation {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
  padding: 0.25rem 0.5rem;
  display: inline-block;
  border-radius: 3px;
  color: white;
}

.stat-operation.departure {
  background: #2196F3;
}

.stat-operation.arrival {
  background: #FFC107;
  color: #333;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  margin-bottom: 0.3rem;
}

.stat-label {
  color: #999;
  font-weight: 600;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 900px) {
  .section.two-column {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1200px) {
  .kpi-section {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 700px) {
  .kpi-section {
    grid-template-columns: repeat(3, 1fr);
  }
  .runway-pairs-section {
    grid-template-columns: 1fr;
  }
}
</style>

