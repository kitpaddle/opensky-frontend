<template>
  <div class="analysis-layout">
    <!-- Backdrop closes any open dropdown -->
    <div v-if="activeDropdown" class="dropdown-backdrop" @click="activeDropdown = null"></div>

    <!-- ── Left: Control Panel ─────────────────────────────────────── -->
    <div class="analysis-controls">
      <!-- Date / Time Range -->
      <div class="ctrl-section">
        <div class="ctrl-row">
          <span class="ctrl-row-lbl">From</span>
          <input type="date" v-model="filters.startDate" class="ctrl-input" />
          <input type="time" v-model="filters.startTime" class="ctrl-input ctrl-input-time" />
        </div>
        <div class="ctrl-row">
          <span class="ctrl-row-lbl">To</span>
          <input type="date" v-model="filters.endDate" class="ctrl-input" />
          <input type="time" v-model="filters.endTime" class="ctrl-input ctrl-input-time" />
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="!filtersReady" class="filters-loading">
        {{ loadingOptions ? 'Loading filters…' : 'Set a date range to load filters.' }}
      </div>

      <template v-if="filtersReady">

      <!-- DEPARTURES -->
      <div class="clf-section clf-dep">
        <div class="clf-header">
          <input type="checkbox" v-model="enabled.dep" class="clf-toggle" />
          <span class="clf-name">Departures</span>
          <span v-if="sectionCounts.dep !== null" class="clf-count">{{ sectionCounts.dep }}</span>
        </div>
        <div class="clf-body" :class="{ 'clf-body--off': !enabled.dep }">
          <div class="clf-row">
            <span class="clf-row-lbl">Aircraft</span>
            <div class="filter-dropdown">
              <button class="dropdown-btn" @click.stop="toggleDropdown('depAc')">
                {{ dropLabel(filters.depAcTypes, options.dep.acTypes, 'Type') }} ▾
              </button>
              <div v-if="activeDropdown === 'depAc'" class="dropdown-menu" @click.stop>
                <template v-if="lfItems(options.dep.acTypes).length">
                  <label class="dropdown-item dropdown-group-header">
                    <input type="checkbox"
                      :checked="lfAllSelected(filters.depAcTypes, options.dep.acTypes)"
                      :indeterminate.prop="lfSomeSelected(filters.depAcTypes, options.dep.acTypes)"
                      @change="filters.depAcTypes = toggleLfGroup(filters.depAcTypes, options.dep.acTypes)" />
                    LF <span class="opt-count">({{ lfCount(options.dep.acTypes) }})</span>
                  </label>
                  <label v-for="t in lfItems(options.dep.acTypes)" :key="t.value"
                    class="dropdown-item dropdown-item-lf" :class="{ 'zero-count': t.count === 0 }">
                    <input type="checkbox" :value="t.value" v-model="filters.depAcTypes" />
                    {{ t.value }} <span class="opt-count">({{ t.count }})</span>
                  </label>
                  <div v-if="otherItems(options.dep.acTypes).length" class="dropdown-separator"></div>
                </template>
                <label v-for="t in otherItems(options.dep.acTypes)" :key="t.value"
                  class="dropdown-item" :class="{ 'zero-count': t.count === 0 }">
                  <input type="checkbox" :value="t.value" v-model="filters.depAcTypes" />
                  {{ t.value }} <span class="opt-count">({{ t.count }})</span>
                </label>
                <div class="dropdown-actions">
                  <button @click="filters.depAcTypes = vals(options.dep.acTypes)">All</button>
                  <button @click="filters.depAcTypes = []">None</button>
                </div>
              </div>
            </div>
          </div>
          <div class="clf-row">
            <span class="clf-row-lbl">Runway</span>
            <div class="filter-dropdown">
              <button class="dropdown-btn" @click.stop="toggleDropdown('depRwy')">
                {{ dropLabel(filters.depRunways, options.dep.runways, 'RWY') }} ▾
              </button>
              <div v-if="activeDropdown === 'depRwy'" class="dropdown-menu" @click.stop>
                <label v-for="r in options.dep.runways" :key="r.value" class="dropdown-item" :class="{ 'zero-count': r.count === 0 }">
                  <input type="checkbox" :value="r.value" v-model="filters.depRunways" />
                  {{ r.value }} <span class="opt-count">({{ r.count }})</span>
                </label>
                <div class="dropdown-actions">
                  <button @click="filters.depRunways = vals(options.dep.runways)">All</button>
                  <button @click="filters.depRunways = []">None</button>
                </div>
              </div>
            </div>
          </div>
          <div class="clf-row">
            <span class="clf-row-lbl">TMA Exit</span>
            <div class="filter-dropdown">
              <button class="dropdown-btn" @click.stop="toggleDropdown('depSid')">
                {{ dropLabel(filters.depSids, options.dep.sids, 'SID') }} ▾
              </button>
              <div v-if="activeDropdown === 'depSid'" class="dropdown-menu" @click.stop>
                <label v-for="s in options.dep.sids" :key="s.value" class="dropdown-item" :class="{ 'zero-count': s.count === 0 }">
                  <input type="checkbox" :value="s.value" v-model="filters.depSids" />
                  {{ s.value }} <span class="opt-count">({{ s.count }})</span>
                </label>
                <div class="dropdown-actions">
                  <button @click="filters.depSids = vals(options.dep.sids)">All</button>
                  <button @click="filters.depSids = []">None</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ARRIVALS -->
      <div class="clf-section clf-arr">
        <div class="clf-header">
          <input type="checkbox" v-model="enabled.arr" class="clf-toggle" />
          <span class="clf-name">Arrivals</span>
          <span v-if="sectionCounts.arr !== null" class="clf-count">{{ sectionCounts.arr }}</span>
        </div>
        <div class="clf-body" :class="{ 'clf-body--off': !enabled.arr }">
          <div class="clf-row">
            <span class="clf-row-lbl">Aircraft</span>
            <div class="filter-dropdown">
              <button class="dropdown-btn" @click.stop="toggleDropdown('arrAc')">
                {{ dropLabel(filters.arrAcTypes, options.arr.acTypes, 'Type') }} ▾
              </button>
              <div v-if="activeDropdown === 'arrAc'" class="dropdown-menu" @click.stop>
                <template v-if="lfItems(options.arr.acTypes).length">
                  <label class="dropdown-item dropdown-group-header">
                    <input type="checkbox"
                      :checked="lfAllSelected(filters.arrAcTypes, options.arr.acTypes)"
                      :indeterminate.prop="lfSomeSelected(filters.arrAcTypes, options.arr.acTypes)"
                      @change="filters.arrAcTypes = toggleLfGroup(filters.arrAcTypes, options.arr.acTypes)" />
                    LF <span class="opt-count">({{ lfCount(options.arr.acTypes) }})</span>
                  </label>
                  <label v-for="t in lfItems(options.arr.acTypes)" :key="t.value"
                    class="dropdown-item dropdown-item-lf" :class="{ 'zero-count': t.count === 0 }">
                    <input type="checkbox" :value="t.value" v-model="filters.arrAcTypes" />
                    {{ t.value }} <span class="opt-count">({{ t.count }})</span>
                  </label>
                  <div v-if="otherItems(options.arr.acTypes).length" class="dropdown-separator"></div>
                </template>
                <label v-for="t in otherItems(options.arr.acTypes)" :key="t.value"
                  class="dropdown-item" :class="{ 'zero-count': t.count === 0 }">
                  <input type="checkbox" :value="t.value" v-model="filters.arrAcTypes" />
                  {{ t.value }} <span class="opt-count">({{ t.count }})</span>
                </label>
                <div class="dropdown-actions">
                  <button @click="filters.arrAcTypes = vals(options.arr.acTypes)">All</button>
                  <button @click="filters.arrAcTypes = []">None</button>
                </div>
              </div>
            </div>
          </div>
          <div class="clf-row">
            <span class="clf-row-lbl">Runway</span>
            <div class="filter-dropdown">
              <button class="dropdown-btn" @click.stop="toggleDropdown('arrRwy')">
                {{ dropLabel(filters.arrRunways, options.arr.runways, 'RWY') }} ▾
              </button>
              <div v-if="activeDropdown === 'arrRwy'" class="dropdown-menu" @click.stop>
                <label v-for="r in options.arr.runways" :key="r.value" class="dropdown-item" :class="{ 'zero-count': r.count === 0 }">
                  <input type="checkbox" :value="r.value" v-model="filters.arrRunways" />
                  {{ r.value }} <span class="opt-count">({{ r.count }})</span>
                </label>
                <div class="dropdown-actions">
                  <button @click="filters.arrRunways = vals(options.arr.runways)">All</button>
                  <button @click="filters.arrRunways = []">None</button>
                </div>
              </div>
            </div>
          </div>
          <div class="clf-row">
            <span class="clf-row-lbl">TMA Entry</span>
            <div class="filter-dropdown">
              <button class="dropdown-btn" @click.stop="toggleDropdown('arrEntry')">
                {{ dropLabel(filters.arrEntryPoints, options.arr.entryPoints, 'Point') }} ▾
              </button>
              <div v-if="activeDropdown === 'arrEntry'" class="dropdown-menu" @click.stop>
                <label v-for="p in options.arr.entryPoints" :key="p.value" class="dropdown-item" :class="{ 'zero-count': p.count === 0 }">
                  <input type="checkbox" :value="p.value" v-model="filters.arrEntryPoints" />
                  {{ p.value }} <span class="opt-count">({{ p.count }})</span>
                </label>
                <div class="dropdown-actions">
                  <button @click="filters.arrEntryPoints = vals(options.arr.entryPoints)">All</button>
                  <button @click="filters.arrEntryPoints = []">None</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CTR FLIGHTS -->
      <div class="clf-section clf-ctr">
        <div class="clf-header">
          <input type="checkbox" v-model="enabled.ctr" class="clf-toggle" />
          <span class="clf-name">CTR Flights</span>
          <span v-if="ctrSectionCount !== null" class="clf-count">{{ ctrSectionCount }}</span>
        </div>
        <div class="clf-body" :class="{ 'clf-body--off': !enabled.ctr }">
          <div class="clf-row">
            <span class="clf-row-lbl">Aircraft</span>
            <div class="filter-dropdown">
              <button class="dropdown-btn" @click.stop="toggleDropdown('ctrAc')">
                {{ dropLabel(filters.ctrAcTypes, options.ctr.acTypes, 'Type') }} ▾
              </button>
              <div v-if="activeDropdown === 'ctrAc'" class="dropdown-menu" @click.stop>
                <template v-if="ctrHeliItems(options.ctr.acTypes).length">
                  <label class="dropdown-item dropdown-group-header">
                    <input type="checkbox"
                      :checked="ctrHeliAllSelected(filters.ctrAcTypes, options.ctr.acTypes)"
                      :indeterminate.prop="ctrHeliSomeSelected(filters.ctrAcTypes, options.ctr.acTypes)"
                      @change="filters.ctrAcTypes = toggleCtrHeliGroup(filters.ctrAcTypes, options.ctr.acTypes)" />
                    Helicopters <span class="opt-count">({{ ctrHeliCount(options.ctr.acTypes) }})</span>
                  </label>
                  <label v-for="t in ctrHeliItems(options.ctr.acTypes)" :key="t.value"
                    class="dropdown-item dropdown-item-lf" :class="{ 'zero-count': t.count === 0 }">
                    <input type="checkbox" :value="t.value" v-model="filters.ctrAcTypes" />
                    {{ t.value }} <span class="opt-count">({{ t.count }})</span>
                  </label>
                  <div v-if="ctrNonHeliItems(options.ctr.acTypes).length" class="dropdown-separator"></div>
                </template>
                <label v-for="t in ctrNonHeliItems(options.ctr.acTypes)" :key="t.value"
                  class="dropdown-item" :class="{ 'zero-count': t.count === 0 }">
                  <input type="checkbox" :value="t.value" v-model="filters.ctrAcTypes" />
                  {{ t.value }} <span class="opt-count">({{ t.count }})</span>
                </label>
                <div class="dropdown-actions">
                  <button @click="filters.ctrAcTypes = vals(options.ctr.acTypes)">All</button>
                  <button @click="filters.ctrAcTypes = []">None</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- VEHICLES -->
      <div class="clf-section clf-veh">
        <div class="clf-header">
          <input type="checkbox" v-model="enabled.veh" class="clf-toggle" />
          <span class="clf-name">Vehicles</span>
          <span v-if="sectionCounts.veh !== null" class="clf-count">{{ sectionCounts.veh }}</span>
        </div>
        <div class="clf-body" :class="{ 'clf-body--off': !enabled.veh }">
          <div class="clf-row clf-row-check">
            <label class="clf-check">
              <input type="checkbox" v-model="filters.vehTowTruck" />
              Tow Trucks
            </label>
          </div>
          <div class="clf-row clf-row-check">
            <label class="clf-check">
              <input type="checkbox" v-model="filters.vehCityCrossing" />
              City Crossings
            </label>
          </div>
          <div class="clf-row clf-row-check">
            <label class="clf-check">
              <input type="checkbox" v-model="filters.vehNorraCrossing" />
              Norra Crossings
            </label>
          </div>
        </div>
      </div>

      <!-- ALL OTHERS -->
      <div class="clf-section clf-other">
        <div class="clf-header">
          <input type="checkbox" v-model="enabled.other" class="clf-toggle" />
          <span class="clf-name">All Others</span>
          <span v-if="sectionCounts.other !== null" class="clf-count">{{ sectionCounts.other }}</span>
        </div>
        <div class="clf-body" :class="{ 'clf-body--off': !enabled.other }">
          <div class="clf-row">
            <span class="clf-row-lbl">Aircraft</span>
            <div class="filter-dropdown">
              <button class="dropdown-btn" @click.stop="toggleDropdown('otherAc')">
                {{ dropLabel(filters.otherAcTypes, options.other.acTypes, 'Type') }} ▾
              </button>
              <div v-if="activeDropdown === 'otherAc'" class="dropdown-menu" @click.stop>
                <label v-for="t in options.other.acTypes" :key="t.value" class="dropdown-item" :class="{ 'zero-count': t.count === 0 }">
                  <input type="checkbox" :value="t.value" v-model="filters.otherAcTypes" />
                  {{ t.value }} <span class="opt-count">({{ t.count }})</span>
                </label>
                <div class="dropdown-actions">
                  <button @click="filters.otherAcTypes = vals(options.other.acTypes)">All</button>
                  <button @click="filters.otherAcTypes = []">None</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      </template>

      <!-- Analysis Script + Run -->
      <hr class="ctrl-divider" />

      <div class="ctrl-section ctrl-section-script">
        <div class="ctrl-label">Analysis Type</div>
        <select v-model="filters.script" class="ctrl-select">
          <option value="">— select —</option>
          <option v-for="s in scripts" :key="s.id" :value="s.id">{{ s.label }}</option>
        </select>
        <button class="ctrl-run-btn" :disabled="!filters.script || !filtersReady" @click="runAnalysis">
          Run Analysis
        </button>
      </div>

    </div>

    <!-- ── Right: Results Panel ───────────────────────────────────── -->
    <div class="analysis-results">
      <div class="results-empty">
        <span>Configure filters and choose an analysis type, then run.</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import axios from 'axios'

export default {
  name: 'AnalysisTab',
  setup() {
    const activeDropdown = ref(null)
    const toggleDropdown = (key) => {
      activeDropdown.value = activeDropdown.value === key ? null : key
    }

    const scripts = []

    const filtersReady   = ref(false)
    const loadingOptions = ref(false)
    const sectionCounts  = ref({ dep: null, arr: null, ctr: null, veh: null, other: null })

    // Per-category option lists: [{ value, count }, ...]
    const options = ref({
      dep:   { acTypes: [], runways: [], sids: [] },
      arr:   { acTypes: [], runways: [], entryPoints: [] },
      ctr:   { acTypes: [] },
      other: { acTypes: [] },
    })

    const enabled = ref({ dep: true, arr: true, ctr: true, veh: true, other: true })

    const filters = ref({
      startDate: '', startTime: '00:00',
      endDate:   '', endTime:   '23:59',
      depAcTypes: [], depRunways: [], depSids: [],
      arrAcTypes: [], arrRunways: [], arrEntryPoints: [],
      ctrAcTypes: [],
      vehTowTruck: false, vehCityCrossing: false, vehNorraCrossing: false,
      otherAcTypes: [],
      script: '',
    })

    // LF (regional/prop) aircraft type grouping
    const LF_TYPES = new Set(['AT73', 'AT75', 'AT76', 'DH8D', 'DH8C', 'BE20', 'B190', 'F50'])
    const lfItems    = (optList) => optList.filter(o => LF_TYPES.has(o.value))
    const otherItems = (optList) => optList.filter(o => !LF_TYPES.has(o.value))
    const lfAllSelected  = (sel, optList) => { const lf = lfItems(optList); return lf.length > 0 && lf.every(o => sel.includes(o.value)) }
    const lfSomeSelected = (sel, optList) => { const lf = lfItems(optList); return lf.some(o => sel.includes(o.value)) && !lf.every(o => sel.includes(o.value)) }
    const lfCount = (optList) => lfItems(optList).reduce((s, o) => s + o.count, 0)
    function toggleLfGroup(sel, optList) {
      const lfVals = lfItems(optList).map(o => o.value)
      const allSel = lfVals.every(v => sel.includes(v))
      if (allSel) return sel.filter(v => !lfVals.includes(v))
      return [...sel.filter(v => !lfVals.includes(v)), ...lfVals]
    }

    // CTR helicopter grouping (based on is_heli flag from API)
    const ctrHeliItems    = (optList) => optList.filter(o => o.is_heli)
    const ctrNonHeliItems = (optList) => optList.filter(o => !o.is_heli)
    const ctrHeliAllSelected  = (sel, optList) => { const h = ctrHeliItems(optList); return h.length > 0 && h.every(o => sel.includes(o.value)) }
    const ctrHeliSomeSelected = (sel, optList) => { const h = ctrHeliItems(optList); return h.some(o => sel.includes(o.value)) && !h.every(o => sel.includes(o.value)) }
    const ctrHeliCount = (optList) => ctrHeliItems(optList).reduce((s, o) => s + o.count, 0)
    function toggleCtrHeliGroup(sel, optList) {
      const heliVals = ctrHeliItems(optList).map(o => o.value)
      const allSel = heliVals.every(v => sel.includes(v))
      if (allSel) return sel.filter(v => !heliVals.includes(v))
      return [...sel.filter(v => !heliVals.includes(v)), ...heliVals]
    }

    // Extract just the values from an options array
    const vals = (optList) => optList.map(o => o.value)

    const dropLabel = (selected, optList, name) => {
      if (!optList.length) return `All ${name}s`
      if (selected.length === 0) return `No ${name}`
      if (selected.length === optList.length) return `All ${name}s`
      return `${selected.length} ${name}s`
    }

    // resetSelections=true on initial load; false on date-range updates (preserve user's choices)
    function applyOptions(data, resetSelections) {
      options.value.dep   = { acTypes: data.dep.ac_types,  runways: data.dep.runways, sids: data.dep.sids }
      options.value.arr   = { acTypes: data.arr.ac_types,  runways: data.arr.runways, entryPoints: data.arr.entry_points }
      options.value.ctr   = { acTypes: data.ctr.ac_types }
      options.value.other = { acTypes: data.other.ac_types }

      if (resetSelections) {
        filters.value.depAcTypes     = vals(options.value.dep.acTypes)
        filters.value.depRunways     = vals(options.value.dep.runways).filter(v => v !== 'UNKNOWN')
        filters.value.depSids        = vals(options.value.dep.sids)
        filters.value.arrAcTypes     = vals(options.value.arr.acTypes)
        filters.value.arrRunways     = vals(options.value.arr.runways).filter(v => v !== 'UNKNOWN')
        filters.value.arrEntryPoints = vals(options.value.arr.entryPoints)
        filters.value.ctrAcTypes     = vals(options.value.ctr.acTypes)
        filters.value.otherAcTypes   = vals(options.value.other.acTypes)
      }
    }

    // Guard: don't trigger re-fetch during the initial mount load
    let initializing = true

    onMounted(async () => {
      loadingOptions.value = true
      try {
        const { data } = await axios.get('/api/analysis/filter-options')

        // Set date pickers to the full dataset range
        filters.value.startDate = data.dataset_range.from_date
        filters.value.startTime = data.dataset_range.from_time
        filters.value.endDate   = data.dataset_range.to_date
        filters.value.endTime   = data.dataset_range.to_time

        applyOptions(data, true)
        filtersReady.value = true
        await fetchCounts()
      } catch (e) {
        console.error('Failed to load filter options', e)
      } finally {
        loadingOptions.value = false
        nextTick(() => { initializing = false })
      }
    })

    // Re-fetch options when the date/time range changes
    let debounceTimer = null
    watch(
      [() => filters.value.startDate, () => filters.value.startTime,
       () => filters.value.endDate,   () => filters.value.endTime],
      () => {
        if (initializing) return
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(async () => {
          if (!filters.value.startDate || !filters.value.endDate) return
          loadingOptions.value = true
          try {
            const { data } = await axios.get('/api/analysis/filter-options', {
              params: {
                from_dt: `${filters.value.startDate}T${filters.value.startTime}`,
                to_dt:   `${filters.value.endDate}T${filters.value.endTime}`,
              },
            })
            applyOptions(data, false)
          } catch (e) {
            console.error('Failed to refresh filter options', e)
          } finally {
            loadingOptions.value = false
          }
        }, 600)
      },
    )

    const ctrSectionCount = computed(() => sectionCounts.value.ctr ?? null)

    async function fetchCounts() {
      if (!filtersReady.value) return
      const f = filters.value
      const csv = (arr) => arr.join(',')
      try {
        const { data } = await axios.get('/api/analysis/flight-counts', {
          params: {
            from_dt:  `${f.startDate}T${f.startTime}`,
            to_dt:    `${f.endDate}T${f.endTime}`,
            dep_ac:   csv(f.depAcTypes),
            dep_rwy:  csv(f.depRunways),
            dep_sid:  csv(f.depSids),
            arr_ac:   csv(f.arrAcTypes),
            arr_rwy:  csv(f.arrRunways),
            arr_ep:   csv(f.arrEntryPoints),
            ctr_ac:   csv(f.ctrAcTypes),
            other_ac: csv(f.otherAcTypes),
          },
        })
        sectionCounts.value = data
      } catch (e) {
        console.error('Failed to fetch flight counts', e)
      }
    }

    let countDebounce = null
    watch(filters, () => {
      if (initializing) return
      clearTimeout(countDebounce)
      countDebounce = setTimeout(fetchCounts, 400)
    }, { deep: true })

    const runAnalysis = () => {
      // placeholder — will POST to /api/analysis/run
    }

    return {
      activeDropdown, toggleDropdown,
      options, filtersReady, loadingOptions, sectionCounts,
      enabled, filters, scripts,
      vals, dropLabel, runAnalysis,
      lfItems, otherItems, lfAllSelected, lfSomeSelected, lfCount, toggleLfGroup,
      ctrHeliItems, ctrNonHeliItems, ctrHeliAllSelected, ctrHeliSomeSelected, ctrHeliCount, toggleCtrHeliGroup,
      ctrSectionCount,
    }
  }
}
</script>

<style scoped>
.analysis-layout {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: #12121e;
  color: #ccc;
}

/* ── Backdrop ──────────────────────────────────────────────────── */
.dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
}

/* ── Left Control Panel ────────────────────────────────────────── */
.analysis-controls {
  flex: 0 0 270px;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0.9rem 0.85rem 1.5rem;
  border-right: 1px solid #2a2a3e;
  overflow-y: auto;
  overflow-x: visible;
  background: #1a1a2e;
}

.ctrl-title {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.9px;
  color: #667eea;
  margin-bottom: 0.75rem;
}

.ctrl-section {
  margin-bottom: 0.85rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid #252538;
}

.ctrl-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #666;
  margin-bottom: 0.4rem;
}

.ctrl-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.3rem;
}

.ctrl-row-lbl {
  font-size: 0.67rem;
  color: #666;
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 2.2rem;
}

.ctrl-input {
  background: #22223a;
  border: 1px solid #33334d;
  border-radius: 4px;
  color: #bbb;
  font-size: 0.72rem;
  padding: 0.22rem 0.35rem;
  min-width: 0;
  width: 100px;
}
.ctrl-input:focus { outline: none; border-color: #667eea; color: #eee; }
.ctrl-input-time { width: 82px; }

.ctrl-select {
  width: 100%;
  background: #22223a;
  border: 1px solid #33334d;
  border-radius: 4px;
  color: #bbb;
  font-size: 0.73rem;
  padding: 0.28rem 0.4rem;
  margin-bottom: 0.5rem;
}
.ctrl-select:focus { outline: none; border-color: #667eea; }

.ctrl-section-script { border-bottom: none; }

.ctrl-divider {
  border: none;
  border-top: 1px solid #2a2a3e;
  margin: 0.4rem 0 0.8rem;
}

.ctrl-run-btn {
  width: 100%;
  padding: 0.45rem;
  background: #667eea;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.ctrl-run-btn:hover:not(:disabled) { background: #7b8ff5; }
.ctrl-run-btn:disabled { background: #2a2a3e; color: #444; cursor: not-allowed; }

/* ── Loading placeholder ───────────────────────────────────────── */
.filters-loading {
  font-size: 0.68rem;
  color: #444;
  text-align: center;
  padding: 1.2rem 0;
  flex: 1;
}

/* ── Classification Sections ───────────────────────────────────── */
.clf-section {
  border-left: 3px solid transparent;
  margin-bottom: 0.5rem;
  border-radius: 0 4px 4px 0;
  background: #1e1e30;
}

.clf-dep   { border-left-color: #4fc3f7; }
.clf-arr   { border-left-color: #ffb74d; }
.clf-ctr   { border-left-color: #ce93d8; }
.clf-veh   { border-left-color: #81c784; }
.clf-other { border-left-color: #90a4ae; }

.clf-header {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.5rem 0.3rem;
  cursor: pointer;
}

.clf-toggle {
  accent-color: #667eea;
  cursor: pointer;
  flex-shrink: 0;
}

.clf-name {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #ccc;
}

.clf-count {
  margin-left: auto;
  font-size: 0.68rem;
  font-weight: 700;
  color: #667eea;
  padding-right: 0.1rem;
}

.clf-body {
  padding: 0.1rem 0.5rem 0.4rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: opacity 0.15s;
}

.clf-body--off {
  opacity: 0.3;
  pointer-events: none;
}

.clf-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.clf-row-check { padding: 0.05rem 0; }

.clf-row-lbl {
  font-size: 0.65rem;
  color: #666;
  width: 46px;
  flex-shrink: 0;
}

.clf-check {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  color: #aaa;
  cursor: pointer;
}
.clf-check input { accent-color: #667eea; cursor: pointer; }

.clf-sub {
  padding-left: 1.4rem;
  display: flex;
  gap: 0.8rem;
  transition: opacity 0.15s;
}
.clf-sub-tree {
  flex-direction: column;
  gap: 0.12rem;
}
.clf-check-sub { font-size: 0.68rem; color: #888; }

/* ── Dropdowns ─────────────────────────────────────────────────── */
.filter-dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-btn {
  padding: 0.18rem 0.45rem;
  border-radius: 3px;
  border: 1px solid #33334d;
  background: #22223a;
  color: #aaa;
  font-size: 0.68rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s;
}
.dropdown-btn:hover { border-color: #667eea; color: #ccc; }

.dropdown-menu {
  position: absolute;
  top: calc(100% + 3px);
  left: 0;
  z-index: 1000;
  background: #22223a;
  border: 1px solid #3a3a5c;
  border-radius: 5px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  min-width: 140px;
  max-height: 200px;
  overflow-y: auto;
  padding: 3px 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.22rem 0.65rem;
  font-size: 0.7rem;
  color: #bbb;
  cursor: pointer;
  white-space: nowrap;
}
.dropdown-item:hover { background: #2a2a45; }
.dropdown-item input { accent-color: #667eea; cursor: pointer; }

.opt-count {
  color: #555;
  font-size: 0.65rem;
  margin-left: auto;
  padding-left: 0.5rem;
}
.dropdown-item.zero-count {
  opacity: 0.4;
}

.dropdown-group-header {
  font-weight: 700;
  font-size: 0.67rem;
  color: #aaa;
  background: #1e1e30;
  padding-top: 0.28rem;
  padding-bottom: 0.28rem;
  letter-spacing: 0.3px;
}
.dropdown-group-header:hover { background: #252540; }

.dropdown-item-lf {
  padding-left: 1.5rem;
}

.dropdown-separator {
  border-top: 1px solid #2a2a45;
  margin: 2px 0;
}

.dropdown-actions {
  display: flex;
  gap: 0.3rem;
  padding: 0.3rem 0.55rem;
  border-top: 1px solid #2a2a45;
}
.dropdown-actions button {
  flex: 1;
  padding: 0.14rem 0.3rem;
  font-size: 0.63rem;
  border: 1px solid #3a3a5c;
  border-radius: 3px;
  background: #1e1e30;
  cursor: pointer;
  color: #888;
}
.dropdown-actions button:hover { background: #2a2a45; color: #ccc; }

/* ── Right Results Panel ───────────────────────────────────────── */
.analysis-results {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.results-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
  font-size: 0.85rem;
  text-align: center;
  padding: 2rem;
}
</style>
