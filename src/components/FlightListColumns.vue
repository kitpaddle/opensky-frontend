<template>
  <div class="flight-list-columns">
    <FlightListColumn
      title="ESSA DEP"
      :flights="essaDepFlights"
      :visible="visibility.essaDep"
      @toggle-visibility="toggleVisibility('essaDep')"
      :columns="essaDepColumns"
      theme="#2196F3"
      :selectedFlights="selectedFlights"
      @flight-selection-changed="onFlightSelectionChanged($event.flightId, $event.isSelected)"
      :enableFilters="true"
      columnName="essaDep"
      @column-filters-changed="onColumnFiltersChanged"
    />

    <FlightListColumn
      title="ESSA ARR"
      :flights="essaArrFlights"
      :visible="visibility.essaArr"
      @toggle-visibility="toggleVisibility('essaArr')"
      :columns="essaArrColumns"
      theme="#FFC107"
      :selectedFlights="selectedFlights"
      @flight-selection-changed="onFlightSelectionChanged($event.flightId, $event.isSelected)"
      :enableFilters="true"
      runwayField="arr_rwy"
      columnName="essaArr"
      @column-filters-changed="onColumnFiltersChanged"
    />

    <FlightListColumn
      title="CTR Flights"
      :flights="ctrFlights"
      :visible="visibility.ctr"
      @toggle-visibility="toggleVisibility('ctr')"
      :columns="ctrColumns"
      theme="#9C27B0"
      :selectedFlights="selectedFlights"
      @flight-selection-changed="onFlightSelectionChanged($event.flightId, $event.isSelected)"
      columnName="ctr"
      @column-filters-changed="onColumnFiltersChanged"
      enableSelectAllButton
    />

    <FlightListColumn
      title="Vehicles"
      :flights="vehicleFlights"
      :visible="visibility.vehicles"
      @toggle-visibility="toggleVisibility('vehicles')"
      :columns="vehicleColumns"
      theme="#4CAF50"
      :selectedFlights="selectedFlights"
      @flight-selection-changed="onFlightSelectionChanged($event.flightId, $event.isSelected)"
      columnName="vehicles"
      @column-filters-changed="onColumnFiltersChanged"
      enableSelectAllButton
    />

    <FlightListColumn
      title="Other Flights"
      :flights="otherFlights"
      :visible="visibility.other"
      @toggle-visibility="toggleVisibility('other')"
      :columns="otherColumns"
      theme="#757575"
      compact
      :selectedFlights="selectedFlights"
      @flight-selection-changed="onFlightSelectionChanged($event.flightId, $event.isSelected)"
      columnName="other"
      @column-filters-changed="onColumnFiltersChanged"
      enableSelectAllButton
    />
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import FlightListColumn from './FlightListColumn.vue'

export default {
  name: 'FlightListColumns',
  components: {
    FlightListColumn,
  },
  props: {
    mergedFlights: Array,
  },
  emits: ['filtered-flights-changed'],
  setup(props, { emit }) {
    const visibility = ref({
      essaDep: true,
      essaArr: true,
      ctr: true,
      vehicles: false,
      other: false,
    })

    // Track which flights pass column-level filters (e.g., runway + aircraft type for ESSA DEP)
    const columnFilters = ref({
      essaDep: [],
      essaArr: [],
      ctr: [],
      vehicles: [],
      other: [],
    })

    const selectedFlights = ref({})

    // Initialize selectedFlights when mergedFlights loads
    watch(() => props.mergedFlights, (newFlights) => {
      if (newFlights && newFlights.length > 0) {
        const newSelected = {}

        // Mirror the child column default: select all except UNKNOWN runway flights
        newFlights.forEach(f => {
          const isUnknownDep = f.is_essa_dep && f.dep_rwy === 'UNKNOWN'
          const isUnknownArr = f.is_essa_arr && f.arr_rwy === 'UNKNOWN'
          newSelected[f.flight_id] = !(isUnknownDep || isUnknownArr)
        })
        selectedFlights.value = newSelected

        // Initialize column filters with UNKNOWN already excluded — matches child default state
        columnFilters.value = {
          essaDep: newFlights.filter(f => f.is_essa_dep && f.dep_rwy !== 'UNKNOWN').map(f => f.flight_id),
          essaArr: newFlights.filter(f => f.is_essa_arr && f.arr_rwy !== 'UNKNOWN').map(f => f.flight_id),
          ctr: newFlights.filter(f => f.is_inctr).map(f => f.flight_id),
          vehicles: newFlights.filter(f => f.is_essa_vehicle).map(f => f.flight_id),
          other: newFlights.filter(f => !f.is_essa_dep && !f.is_essa_arr && !f.is_inctr && !f.is_essa_vehicle).map(f => f.flight_id),
        }

        // Emit only flights from visible categories
        const visibleFlights = newFlights.filter(flight => {
          return (
            (flight.is_essa_dep && visibility.value.essaDep) ||
            (flight.is_essa_arr && visibility.value.essaArr) ||
            (flight.is_inctr && visibility.value.ctr) ||
            (flight.is_essa_vehicle && visibility.value.vehicles) ||
            (!flight.is_essa_dep && !flight.is_essa_arr && !flight.is_inctr && !flight.is_essa_vehicle && visibility.value.other)
          )
        }).map(f => f.flight_id)
        emit('filtered-flights-changed', visibleFlights)
      }
    }, { immediate: true })

    // Format functions
    const formatTimeUTC = (timestamp) => {
      if (!timestamp) return 'N/A'
      const date = new Date(timestamp * 1000)
      const hours = String(date.getUTCHours()).padStart(2, '0')
      const minutes = String(date.getUTCMinutes()).padStart(2, '0')
      return `${hours}:${minutes}`
    }

    const formatRunwayCount = (value, flight) => {
      if (!flight) return 'N/A'
      const rwy1 = flight.rwy1_count || 0
      const rwy2 = flight.rwy2_count || 0
      const rwy3 = flight.rwy3_count || 0
      return rwy1 + rwy2 + rwy3
    }

    // Split flights into categories
    // NOTE: API returns boolean fields as 0/1 integers, so use truthy checks instead of === true
    const essaDepFlights = computed(() => {
      if (!props.mergedFlights) return []
      return props.mergedFlights.filter(f => f.is_essa_dep)
    })

    const essaArrFlights = computed(() => {
      if (!props.mergedFlights) return []
      return props.mergedFlights.filter(f => f.is_essa_arr)
    })

    const ctrFlights = computed(() => {
      if (!props.mergedFlights) return []
      return props.mergedFlights.filter(f => f.is_inctr)
    })

    const vehicleFlights = computed(() => {
      if (!props.mergedFlights) return []
      return props.mergedFlights.filter(f => f.is_essa_vehicle)
    })

    const otherFlights = computed(() => {
      if (!props.mergedFlights) return []
      return props.mergedFlights.filter(f =>
        !f.is_essa_dep &&
        !f.is_essa_arr &&
        !f.is_inctr &&
        !f.is_essa_vehicle
      )
    })

    // Column configurations
    const essaDepColumns = [
      { key: 'callsign', label: 'Callsign' },
      { key: 'dep_rwy', label: 'RWY' },
      { key: 'ac_type', label: 'Type' },
      { key: 'actual_takeoff_time', label: 'ATOT', format: formatTimeUTC },
    ]

    const essaArrColumns = [
      { key: 'callsign', label: 'Callsign' },
      { key: 'arr_rwy', label: 'RWY' },
      { key: 'ac_type', label: 'Type' },
      { key: 'actual_landing_time', label: 'ALT', format: formatTimeUTC },
      { key: 'goaround_count', label: 'G/A' },
    ]

    const ctrColumns = [
      { key: 'callsign', label: 'Callsign' },
      { key: 'start_time', label: 'Start Time', format: formatTimeUTC },
      { key: 'is_heli', label: 'Heli' },
    ]

    const vehicleColumns = [
      { key: 'callsign', label: 'Callsign' },
      { key: 'start_time', label: 'Start Time', format: formatTimeUTC },
      { key: 'rwy_count', label: 'RWY', format: formatRunwayCount },
    ]

    const otherColumns = [
      { key: 'callsign', label: 'Callsign' },
      { key: 'start_time', label: 'Start Time', format: formatTimeUTC },
    ]

    const toggleVisibility = (category) => {
      visibility.value[category] = !visibility.value[category]
      
      // Recalculate and emit filtered flights when visibility changes
      const newFiltered = props.mergedFlights
        .filter(flight => {
          const isVisible =
            (flight.is_essa_dep && visibility.value.essaDep) ||
            (flight.is_essa_arr && visibility.value.essaArr) ||
            (flight.is_inctr && visibility.value.ctr) ||
            (flight.is_essa_vehicle && visibility.value.vehicles) ||
            (!flight.is_essa_dep && !flight.is_essa_arr && !flight.is_inctr && !flight.is_essa_vehicle && visibility.value.other)
          
          const isSelected = selectedFlights.value[flight.flight_id]
          const passesColumnFilter = getPassesColumnFilter(flight)
          return isVisible && isSelected && passesColumnFilter
        })
        .map(flight => flight.flight_id)
      
      emit('filtered-flights-changed', newFiltered)
    }

    const onFlightSelectionChanged = (flightId, isSelected) => {
      // Directly mutate for faster reactivity
      selectedFlights.value[flightId] = isSelected
      
      // Immediately recalculate and emit filtered flights
      const newFiltered = props.mergedFlights
        .filter(flight => {
          const isVisible =
            (flight.is_essa_dep && visibility.value.essaDep) ||
            (flight.is_essa_arr && visibility.value.essaArr) ||
            (flight.is_inctr && visibility.value.ctr) ||
            (flight.is_essa_vehicle && visibility.value.vehicles) ||
            (!flight.is_essa_dep && !flight.is_essa_arr && !flight.is_inctr && !flight.is_essa_vehicle && visibility.value.other)
          
          // Also check if flight passes column-level filters
          const passesColumnFilter = getPassesColumnFilter(flight)
          
          return isVisible && selectedFlights.value[flight.flight_id] && passesColumnFilter
        })
        .map(flight => flight.flight_id)
      
      emit('filtered-flights-changed', newFiltered)
    }

    const onColumnFiltersChanged = (event) => {
      columnFilters.value[event.columnName] = event.filteredFlightIds
      
      // CRITICAL: When column filter changes, auto-deselect flights that no longer pass the filter
      // This ensures flights hidden by column filters can't somehow appear on the map
      const affectedFlights = props.mergedFlights.filter(flight => {
        // Get the column for this flight
        let flightColumn = null
        if (flight.is_essa_dep) flightColumn = 'essaDep'
        else if (flight.is_essa_arr) flightColumn = 'essaArr'
        else if (flight.is_inctr) flightColumn = 'ctr'
        else if (flight.is_essa_vehicle) flightColumn = 'vehicles'
        else flightColumn = 'other'
        
        // If this flight's category is the one that changed
        if (flightColumn === event.columnName) {
          // Check if it now fails the filter
          const nowPasses = event.filteredFlightIds.includes(flight.flight_id)
          const wasSelected = selectedFlights.value[flight.flight_id]
          
          // If it was selected but now fails the filter, deselect it
          if (wasSelected && !nowPasses) {
            return true
          }
        }
        return false
      })
      
      // Auto-deselect flights that no longer pass the filter
      affectedFlights.forEach(flight => {
        selectedFlights.value[flight.flight_id] = false
      })
      
      // Recalculate and emit when column filters change
      const newFiltered = props.mergedFlights
        .filter(flight => {
          const isVisible =
            (flight.is_essa_dep && visibility.value.essaDep) ||
            (flight.is_essa_arr && visibility.value.essaArr) ||
            (flight.is_inctr && visibility.value.ctr) ||
            (flight.is_essa_vehicle && visibility.value.vehicles) ||
            (!flight.is_essa_dep && !flight.is_essa_arr && !flight.is_inctr && !flight.is_essa_vehicle && visibility.value.other)
          
          const passesColumnFilter = getPassesColumnFilter(flight)
          
          return isVisible && selectedFlights.value[flight.flight_id] && passesColumnFilter
        })
        .map(flight => flight.flight_id)
      
      emit('filtered-flights-changed', newFiltered)
    }

    const getPassesColumnFilter = (flight) => {
      // Check if flight passes the column-level filters for its category
      if (flight.is_essa_dep) {
        return columnFilters.value.essaDep.includes(flight.flight_id)
      }
      if (flight.is_essa_arr) {
        return columnFilters.value.essaArr.includes(flight.flight_id)
      }
      if (flight.is_inctr) {
        return columnFilters.value.ctr.includes(flight.flight_id)
      }
      if (flight.is_essa_vehicle) {
        return columnFilters.value.vehicles.includes(flight.flight_id)
      }
      // Other flights
      return columnFilters.value.other.includes(flight.flight_id)
    }

    return {
      visibility,
      selectedFlights,
      essaDepFlights,
      essaArrFlights,
      ctrFlights,
      vehicleFlights,
      otherFlights,
      essaDepColumns,
      essaArrColumns,
      ctrColumns,
      vehicleColumns,
      otherColumns,
      toggleVisibility,
      onFlightSelectionChanged,
      onColumnFiltersChanged,
    }
  }
}
</script>

<style scoped>
.flight-list-columns {
  display: flex;
  gap: 1rem;
  height: 100%;
  overflow-x: auto;
  padding: 0.75rem;
  background: #f9f9f9;
}
</style>
