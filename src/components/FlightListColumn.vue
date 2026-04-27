<template>
  <div :class="['flight-column', { compact: compact, 'not-visible': !visible }]">
    <!-- Header with title and checkbox -->
    <div class="column-header">
      <input 
        type="checkbox" 
        :checked="visible"
        @change="$emit('toggle-visibility')"
        class="column-checkbox"
      />
      <h3 class="column-title">{{ title }}</h3>
      <span class="column-count">{{ selectedCount }}/{{ flights.length }}</span>
    </div>

    <!-- Filter bar for ESSA DEP list -->
    <div v-if="enableFilters" class="filter-bar">
      <!-- Runway filter dropdown -->
      <div class="filter-group">
        <div class="dropdown-trigger">
          <span class="filter-label">Runway</span>
          <span class="dropdown-arrow">▼</span>
        </div>
        <div class="dropdown-menu">
          <div class="dropdown-item all-item">
            <input 
              type="checkbox" 
              id="rwy-all"
              :checked="allRunwaysSelected"
              @change="toggleAllRunways"
              class="filter-checkbox"
            />
            <label for="rwy-all" class="filter-item-label"><strong>ALL</strong></label>
          </div>
          <div v-for="rwy in uniqueRunways" :key="rwy" class="dropdown-item">
            <input 
              type="checkbox" 
              :id="`rwy-${rwy}`"
              v-model="activeRunways[rwy]"
              class="filter-checkbox"
            />
            <label :for="`rwy-${rwy}`" class="filter-item-label">{{ rwy || 'N/A' }}</label>
          </div>
        </div>
      </div>

      <!-- Aircraft type filter dropdown -->
      <div class="filter-group">
        <div class="dropdown-trigger">
          <span class="filter-label">Type</span>
          <span class="dropdown-arrow">▼</span>
        </div>
        <div class="dropdown-menu">
          <div class="dropdown-item all-item">
            <input 
              type="checkbox" 
              id="type-all"
              :checked="allAircraftTypesSelected"
              @change="toggleAllAircraftTypes"
              class="filter-checkbox"
            />
            <label for="type-all" class="filter-item-label"><strong>ALL</strong></label>
          </div>
          <div v-for="acType in uniqueAircraftTypes" :key="acType" class="dropdown-item">
            <input 
              type="checkbox" 
              :id="`type-${acType}`"
              v-model="activeAircraftTypes[acType]"
              class="filter-checkbox"
            />
            <label :for="`type-${acType}`" class="filter-item-label">{{ acType }}</label>
          </div>
        </div>
      </div>

      <!-- Select All / Deselect All button -->
      <button class="select-all-btn" @click="toggleSelectAll">
        {{ filteredCount === selectedInFiltered ? 'Deselect All' : 'Select All' }}
      </button>
    </div>

    <!-- Simple Select All / Deselect All button bar for non-filter lists -->
    <div v-else-if="enableSelectAllButton" class="select-all-bar">
      <button class="select-all-btn" @click="toggleSelectAll">
        {{ flights.length === selectedCount ? 'Deselect All' : 'Select All' }}
      </button>
    </div>

    <!-- Table wrapper with scrolling -->
    <div class="table-wrapper">
      <table class="flight-table">
        <thead>
          <tr>
            <th 
              v-for="col in columns" 
              :key="col.key" 
              :class="['sortable-header', `col-${col.key}`, { sorted: sortConfig.key === col.key }]"
              @click="toggleSort(col.key)"
            >
              <span class="header-content">
                {{ col.label }}
                <span v-if="sortConfig.key === col.key" :class="['sort-indicator', sortConfig.direction]">
                  {{ sortConfig.direction === 'asc' ? '▲' : '▼' }}
                </span>
              </span>
            </th>
            <th class="col-select">✓</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="flight in sortedFlights" :key="flight.flight_id">
            <td v-for="col in columns" :key="col.key" :class="`col-${col.key}`">
              {{ formatCell(flight, col) }}
            </td>
            <td class="col-select">
              <button 
                @click="toggleFlightSelection(flight.flight_id)"
                :class="['selection-btn', { selected: selectedFlights[flight.flight_id] }]"
                :title="selectedFlights[flight.flight_id] ? 'Click to deselect' : 'Click to select'"
              >
                {{ selectedFlights[flight.flight_id] ? '✓' : '✕' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'

export default {
  name: 'FlightListColumn',
  props: {
    title: String,
    flights: Array,
    visible: Boolean,
    columns: Array, // Array of { key, label, format? }
    theme: String, // Color theme for the column (hex color)
    compact: Boolean, // If true, make this column narrower
    selectedFlights: Object, // Object of { flightId: true/false }
    enableFilters: Boolean, // If true, show runway and aircraft type filters
    enableSelectAllButton: Boolean, // If true, show Select All / Deselect All button (even without filters)
    columnName: String, // Unique identifier for this column (e.g., 'essaDep', 'essaArr')
    runwayField: String, // Which field contains runway data (e.g., 'dep_rwy', 'arr_rwy')
  },
  emits: ['toggle-visibility', 'flight-selection-changed', 'column-filters-changed'],
  setup(props, { emit }) {
    const sortConfig = ref({
      key: null,
      direction: 'asc',
    })

    // Initialize filters - track which runways and aircraft types are active
    const activeRunways = ref({})
    const activeAircraftTypes = ref({})

    // Watch flights to initialize filters when data loads
    watch(() => props.flights, (newFlights) => {
      if (newFlights && newFlights.length > 0 && Object.keys(activeRunways.value).length === 0) {
        const rwyField = props.runwayField || 'dep_rwy'
        const runways = new Set(newFlights.map(f => f[rwyField]).filter(Boolean))
        const types = new Set(newFlights.map(f => f.ac_type).filter(Boolean))
        
        // Initialize all as checked, except UNKNOWN runways
        activeRunways.value = Object.fromEntries([...runways].map(r => [r, r !== 'UNKNOWN']))
        activeAircraftTypes.value = Object.fromEntries([...types].map(t => [t, true]))
      }
    }, { immediate: true })

    const uniqueRunways = computed(() => {
      if (!props.flights) return []
      const rwyField = props.runwayField || 'dep_rwy'
      return [...new Set(props.flights.map(f => f[rwyField]).filter(Boolean))]
    })

    const uniqueAircraftTypes = computed(() => {
      if (!props.flights) return []
      return [...new Set(props.flights.map(f => f.ac_type).filter(Boolean))].sort()
    })

    const filteredFlights = computed(() => {
      if (!props.flights || !props.enableFilters) return props.flights || []
      const rwyField = props.runwayField || 'dep_rwy'
      
      return props.flights.filter(flight => {
        const runwayMatch = activeRunways.value[flight[rwyField]]
        const typeMatch = activeAircraftTypes.value[flight.ac_type]
        return runwayMatch && typeMatch
      })
    })

    // Emit column-level filtered flight IDs whenever filters change
    watch(() => filteredFlights.value, (newFiltered) => {
      if (props.enableFilters && props.columnName) {
        const filteredIds = newFiltered.map(f => f.flight_id)
        emit('column-filters-changed', { columnName: props.columnName, filteredFlightIds: filteredIds })
      }
    }, { deep: true })

    const filteredCount = computed(() => filteredFlights.value?.length || 0)

    const selectedInFiltered = computed(() => {
      if (!filteredFlights.value) return 0
      return filteredFlights.value.filter(f => props.selectedFlights[f.flight_id]).length
    })

    const toggleAllRunways = (e) => {
      const shouldSelect = e.target.checked
      Object.keys(activeRunways.value).forEach(rwy => {
        activeRunways.value[rwy] = shouldSelect
      })
    }

    const toggleAllAircraftTypes = (e) => {
      const shouldSelect = e.target.checked
      Object.keys(activeAircraftTypes.value).forEach(type => {
        activeAircraftTypes.value[type] = shouldSelect
      })
    }

    const allRunwaysSelected = computed(() => {
      const runways = Object.values(activeRunways.value)
      return runways.length > 0 && runways.every(v => v === true)
    })

    const allAircraftTypesSelected = computed(() => {
      const types = Object.values(activeAircraftTypes.value)
      return types.length > 0 && types.every(v => v === true)
    })

    const toggleSelectAll = () => {
      const shouldSelect = selectedInFiltered.value < filteredCount.value
      
      // If DESELECTING: deselect ALL flights in this column (even hidden ones)
      // If SELECTING: only select visible flights (respect column filters)
      const flightsToToggle = shouldSelect ? filteredFlights.value : props.flights
      
      flightsToToggle.forEach(flight => {
        if (props.selectedFlights[flight.flight_id] !== shouldSelect) {
          emit('flight-selection-changed', { flightId: flight.flight_id, isSelected: shouldSelect })
        }
      })
    }

    const formatCell = (flight, col) => {
      // If custom format function provided, use it
      if (col.format) {
        return col.format(flight[col.key], flight)
      }

      const value = flight[col.key]
      
      // Null/undefined
      if (value === null || value === undefined) return 'N/A'
      
      // UNKNOWN runway values -> N/A
      if ((col.key === 'dep_rwy' || col.key === 'arr_rwy') && value === 'UNKNOWN') return 'N/A'
      
      // Boolean or 0/1 integer (API returns booleans as 0/1 from SQLite)
      if (typeof value === 'boolean' || value === 0 || value === 1) {
        // Treat as boolean: 0/false -> '—', 1/true -> '✓'
        return value ? '✓' : '—'
      }
      
      // Default
      return value
    }

    const toggleSort = (columnKey) => {
      if (sortConfig.value.key === columnKey) {
        // Toggle direction if same column clicked
        sortConfig.value.direction = sortConfig.value.direction === 'asc' ? 'desc' : 'asc'
      } else {
        // Switch to new column with ascending order
        sortConfig.value.key = columnKey
        sortConfig.value.direction = 'asc'
      }
    }

    const toggleFlightSelection = (flightId) => {
      const isSelected = !props.selectedFlights[flightId]
      emit('flight-selection-changed', { flightId, isSelected })
    }

    const sortedFlights = computed(() => {
      // Use filteredFlights if filters are enabled, otherwise use all flights
      const flightsToSort = props.enableFilters ? filteredFlights.value : props.flights
      
      if (!flightsToSort || flightsToSort.length === 0 || !sortConfig.value.key) {
        return flightsToSort || []
      }

      // Find the column definition for the current sort key
      const sortColumn = props.columns.find(col => col.key === sortConfig.value.key)

      const sorted = [...flightsToSort].sort((a, b) => {
        // Get values based on whether column has a format function
        let aVal, bVal
        
        if (sortColumn && sortColumn.format) {
          // Use format function to get sortable values
          aVal = sortColumn.format(a[sortConfig.value.key], a)
          bVal = sortColumn.format(b[sortConfig.value.key], b)
        } else {
          // Use raw values from flight object
          aVal = a[sortConfig.value.key]
          bVal = b[sortConfig.value.key]
        }

        // Handle nulls
        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1

        // String comparison
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.value.direction === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal)
        }

        // Numeric comparison
        if (aVal < bVal) return sortConfig.value.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.value.direction === 'asc' ? 1 : -1
        return 0
      })

      return sorted
    })

    const selectedCount = computed(() => {
      const flightsToCount = props.enableFilters ? filteredFlights.value : props.flights
      if (!flightsToCount) return 0
      return flightsToCount.filter(flight => props.selectedFlights[flight.flight_id]).length
    })

    return { 
      formatCell, 
      toggleSort, 
      sortConfig, 
      sortedFlights, 
      toggleFlightSelection, 
      selectedCount,
      activeRunways,
      activeAircraftTypes,
      uniqueRunways,
      uniqueAircraftTypes,
      filteredCount,
      selectedInFiltered,
      toggleSelectAll,
      allRunwaysSelected,
      allAircraftTypesSelected,
      toggleAllRunways,
      toggleAllAircraftTypes
    }
  }
}
</script>

<style scoped>
.flight-column {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 250px;
  max-width: 400px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  border-left: 4px solid v-bind(theme);
}

.flight-column.compact {
  flex: 0.65;
  min-width: 180px;
  max-width: 300px;
}

.flight-column.not-visible {
  opacity: 0.45;
  background: #f5f5f5;
}

.column-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: v-bind('theme + "15"');
  border-bottom: 2px solid v-bind(theme);
  flex-shrink: 0;
}

.column-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  flex-shrink: 0;
  accent-color: v-bind(theme);
}

.column-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: v-bind(theme);
}

.column-count {
  margin-left: auto;
  font-size: 0.85rem;
  color: #999;
  font-weight: 500;
}

.table-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.flight-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.flight-table thead {
  background: #fafafa;
  position: sticky;
  top: 0;
  z-index: 10;
}

.flight-table th {
  padding: 0.5rem;
  text-align: left;
  font-weight: 600;
  color: #666;
  border-bottom: 1px solid #e0e0e0;
  white-space: nowrap;
  font-size: 0.8rem;
}

.sortable-header {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.sortable-header:hover {
  background-color: #f0f0f0;
}

.sortable-header.sorted {
  font-weight: 700;
}

.sortable-header.sorted {
  background-color: rgba(0, 0, 0, 0.03);
  color: v-bind(theme);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.sort-indicator {
  font-size: 0.65rem;
  font-weight: 700;
  display: inline-block;
  min-width: 0.5rem;
  color: v-bind(theme);
}

.flight-table td {
  padding: 0.5rem;
  border-bottom: 1px solid #f0f0f0;
  color: #333;
}

.flight-table tbody tr:hover {
  background: #fafafa;
}

.flight-table .col-callsign,
.flight-table .col-rwy_dep,
.flight-table .col-rwy_arr,
.flight-table .col-ac_type,
.flight-table .col-start_time,
.flight-table .col-actual_takeoff_time,
.flight-table .col-actual_landing_time,
.flight-table .col-is_heli {
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
}

.col-select {
  text-align: center;
  padding: 0.35rem !important;
  width: 40px;
  flex-shrink: 0;
}

.selection-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 700;
  padding: 0.2rem 0.4rem;
  border-radius: 2px;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  min-height: 28px;
}

.selection-btn:not(.selected) {
  color: #d32f2f;
}

.selection-btn.selected {
  color: #4CAF50;
  background: rgba(76, 175, 80, 0.1);
}

.selection-btn:hover:not(.selected) {
  background: rgba(211, 47, 47, 0.1);
}

.selection-btn:hover.selected {
  background: rgba(76, 175, 80, 0.2);
}

/* Filter bar styles */
.filter-bar {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  align-items: center;
}

.select-all-bar {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  align-items: center;
  justify-content: flex-start;
}

.filter-group {
  position: relative;
  display: inline-block;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.5rem;
  background: white;
  border: 1px solid #bbb;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  font-size: 0.85rem;
  font-weight: 600;
  color: #333;
  gap: 0.3rem;
  white-space: nowrap;
}

.dropdown-trigger:hover {
  background: #f9f9f9;
  border-color: #999;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #666;
  margin: 0;
}

.dropdown-arrow {
  font-size: 0.7rem;
  color: #666;
  margin-left: 0.5rem;
  transition: transform 0.2s ease;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 150px;
  max-height: 250px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: none;
}

.filter-group:hover .dropdown-menu {
  display: block;
}

.dropdown-item {
  padding: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.15s ease;
}

.dropdown-item.all-item {
  background: #f9f9f9;
  border-bottom: 2px solid #e0e0e0;
  font-weight: 600;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background: #f0f0f0;
}

.filter-checkbox {
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.filter-item-label {
  cursor: pointer;
  font-size: 0.85rem;
  color: #333;
  flex: 1;
}

.select-all-btn {
  padding: 0.5rem 0.75rem;
  background: color-mix(in srgb, v-bind(theme) 20%, white);
  color: #555;
  border: 1px solid color-mix(in srgb, v-bind(theme) 30%, white);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;
  white-space: nowrap;
  margin-left: auto;
}

.select-all-btn:hover {
  background: color-mix(in srgb, v-bind(theme) 28%, white);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.select-all-btn:active {
  background: color-mix(in srgb, v-bind(theme) 35%, white);
}
</style>
