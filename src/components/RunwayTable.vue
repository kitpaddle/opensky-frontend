<template>
  <div class="runway-table">
    <h4>Runway Operations</h4>
    <table>
      <thead>
        <tr>
          <th class="label-col"></th>
          <th v-for="rwy in allRunways" :key="rwy" class="runway-col">{{ rwy }}</th>
        </tr>
      </thead>
      <tbody>
        <!-- Arrivals row -->
        <tr>
          <td class="label-col"><strong>ARR</strong></td>
          <td v-for="rwy in allRunways" :key="`arr-${rwy}`" class="runway-col">
            {{ getCount('Arrival', rwy) }}
          </td>
        </tr>
        <!-- Departures row -->
        <tr>
          <td class="label-col"><strong>DEP</strong></td>
          <td v-for="rwy in allRunways" :key="`dep-${rwy}`" class="runway-col">
            {{ getCount('Departure', rwy) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'RunwayTable',
  props: {
    runwayData: {
      type: Array,
      required: true,
    },
  },
  setup(props) {
    const allRunways = ['01L', '01R', '19L', '19R', '08', '26']
    
    // Build a lookup map for easy access
    const runwayMap = computed(() => {
      const map = {}
      props.runwayData.forEach(item => {
        const key = `${item.operation}-${item.runway}`
        map[key] = item.count || 0
      })
      return map
    })
    
    const getCount = (operation, runway) => {
      const key = `${operation}-${runway}`
      return runwayMap.value[key] || 0
    }
    
    return {
      allRunways,
      getCount,
    }
  }
}
</script>

<style scoped>
.runway-table {
  margin-bottom: 1.5rem;
}

.runway-table h4 {
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
  border-bottom: 2px solid #667eea;
  padding-bottom: 0.35rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

thead {
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

th, td {
  padding: 0.4rem 0.3rem;
  text-align: center;
  border-right: 1px solid #e0e0e0;
}

th:last-child, td:last-child {
  border-right: none;
}

th {
  font-weight: 600;
  color: #666;
  font-size: 0.75rem;
}

.label-col {
  text-align: left;
  font-weight: 600;
  color: #333;
  width: 40px;
}

.runway-col {
  color: #667eea;
  font-weight: 500;
}

tbody tr:hover {
  background: #fafafa;
}
</style>
