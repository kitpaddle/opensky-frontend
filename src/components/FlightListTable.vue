<template>
  <div class="flight-list-container">
    <div class="table-wrapper">
      <table class="flight-table">
        <thead>
          <tr>
            <th @click="sort('callsign')" class="sortable">Callsign</th>
            <th @click="sort('ac_type')" class="sortable">Type</th>
            <th @click="sort('dep_rwy')" class="sortable">DEP RWY</th>
            <th @click="sort('actual_takeoff_time')" class="sortable">T/O Time</th>
            <th @click="sort('dep_runway_occupancy')" class="sortable">DEP OCC</th>
            <th @click="sort('arr_rwy')" class="sortable">ARR RWY</th>
            <th @click="sort('actual_landing_time')" class="sortable">Landing Time</th>
            <th @click="sort('arr_runway_occupancy')" class="sortable">ARR OCC</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="flight in sortedFlights" :key="flight.flight_id">
            <td class="mono">{{ flight.callsign || 'N/A' }}</td>
            <td>{{ flight.ac_type || 'N/A' }}</td>
            <td class="mono">{{ flight.dep_rwy || 'N/A' }}</td>
            <td>{{ formatTimeUTC(flight.actual_takeoff_time) }}</td>
            <td class="mono">{{ formatOccupancy(flight.dep_runway_occupancy) }}</td>
            <td class="mono">{{ flight.arr_rwy || 'N/A' }}</td>
            <td>{{ formatTimeUTC(flight.actual_landing_time) }}</td>
            <td class="mono">{{ formatOccupancy(flight.arr_runway_occupancy) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="table-stats">
      Total flights: {{ flightCount }}
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'FlightListTable',
  props: {
    flights: {
      type: Array,
      required: true,
    },
  },
  setup(props) {
    const sortColumn = ref('flight_id')
    const sortAscending = ref(true)

    const flightCount = computed(() => {
      return props.flights ? props.flights.length : 0
    })

    const sortedFlights = computed(() => {
      const sorted = [...props.flights]
      sorted.sort((a, b) => {
        const aVal = a[sortColumn.value]
        const bVal = b[sortColumn.value]

        let comparison = 0
        if (aVal == null && bVal == null) comparison = 0
        else if (aVal == null) comparison = 1
        else if (bVal == null) comparison = -1
        else if (typeof aVal === 'string') comparison = aVal.localeCompare(bVal)
        else comparison = aVal - bVal

        return sortAscending.value ? comparison : -comparison
      })
      return sorted
    })

    const sort = (column) => {
      if (sortColumn.value === column) {
        sortAscending.value = !sortAscending.value
      } else {
        sortColumn.value = column
        sortAscending.value = true
      }
    }

    const formatTimeUTC = (timestamp) => {
      if (!timestamp) return 'N/A'
      const date = new Date(timestamp * 1000)
      const hours = String(date.getUTCHours()).padStart(2, '0')
      const minutes = String(date.getUTCMinutes()).padStart(2, '0')
      return `${hours}:${minutes}`
    }

    const formatOccupancy = (seconds) => {
      if (seconds === null || seconds === undefined) return 'N/A'
      return Math.round(seconds).toString()
    }

    return {
      sortedFlights,
      sort,
      formatTimeUTC,
      formatOccupancy,
      flightCount,
    }
  },
}
</script>

<style scoped>
.flight-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1rem;
}

.table-wrapper {
  flex: 1;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}

.flight-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.flight-table thead {
  background: #f5f5f5;
  position: sticky;
  top: 0;
  z-index: 1;
}

.flight-table th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
  white-space: nowrap;
}

.flight-table th.sortable {
  cursor: pointer;
  user-select: none;
  color: #667eea;
}

.flight-table th.sortable:hover {
  background: #efefef;
}

.flight-table td {
  padding: 0.7rem 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}

.flight-table tbody tr:hover {
  background: #fafafa;
}

.flight-table tbody tr:nth-child(even) {
  background: #fefefe;
}

.mono {
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  color: #666;
}

.table-stats {
  text-align: right;
  font-size: 0.9rem;
  color: #999;
  padding: 0.5rem 0;
}
</style>
