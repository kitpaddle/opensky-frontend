<template>
  <div class="aircraft-table">
    <h4>Aircraft Types</h4>
    <div class="table-scroll-wrapper">
      <table>
        <thead>
          <tr>
            <th class="code-col">Aircraft</th>
            <th class="count-col">Count</th>
            <th class="percent-col">% of Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in aircraftData" :key="item.code">
            <td class="code-col">{{ item.code }}</td>
            <td class="count-col">{{ item.count }}</td>
            <td class="percent-col">{{ item.percentage }}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AircraftTable',
  props: {
    aircraftData: {
      type: Array,
      required: true,
    },
  },
}
</script>

<style scoped>
.aircraft-table {
  margin-bottom: 1.5rem;
}

.aircraft-table h4 {
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
  border-bottom: 2px solid #667eea;
  padding-bottom: 0.35rem;
}

.table-scroll-wrapper {
  max-height: 200px;
  overflow-y: auto;
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
  padding: 0.4rem 0.5rem;
  text-align: left;
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

.code-col {
  font-weight: 600;
  color: #333;
}

.count-col {
  text-align: center;
  color: #667eea;
  font-weight: 500;
}

.percent-col {
  text-align: center;
  color: #999;
}

tbody tr:hover {
  background: #fafafa;
}
</style>
