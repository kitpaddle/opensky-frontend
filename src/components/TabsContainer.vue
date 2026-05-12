<template>
  <section class="content-area">
    <!-- Tab buttons -->
    <div class="tabs-header">
      <button
        v-for="tab in tabs"
        :key="tab"
        @click="$emit('switch-tab', tab)"
        :disabled="tab === 'Overview' ? false : (tab === 'Daily Stats' ? !statisticsReady : (!dataLoaded || dataLoading))"
        :class="['tab-button', { active: activeTab === tab, loading: (tab !== 'Overview' && (tab === 'Daily Stats' ? (!statisticsReady && dataLoading) : dataLoading)) }]"
      >
        <span v-if="tab !== 'Overview' && (tab === 'Daily Stats' ? (!statisticsReady && dataLoading) : dataLoading)" class="tab-spinner"></span>
        {{ tab }}
      </button>
      <div class="tabs-date-controls">
        <input type="date" v-model="localDate"
          :min="minDate" :max="maxDate"
          @change="onDateChange"
          class="tabs-date-input"/>
        <button @click="onLoadClick"
          :disabled="dataLoading || !localDate || lastLoadedDate === localDate"
          class="tabs-load-btn">
          <span v-if="dataLoading" class="tab-spinner"></span>
          {{ dataLoading ? 'Loading…' : 'Load Data' }}
        </button>
      </div>
    </div>

    <!-- Tab content -->
    <div class="tab-content">
      <!-- Welcome message when no data loaded (not shown on Overview which loads its own data) -->
      <div v-if="!dataLoaded && activeTab !== 'Overview'" class="welcome-state">
        <p>📅 Select a date on the left and load data to begin analyzing flight data.</p>
      </div>

      <!-- Overview Tab -->
      <div v-show="activeTab === 'Overview'" class="tab-pane tab-pane-padded">
        <OverviewTab
          :selectedDate="date"
          :dataLoading="dataLoading"
          @update-date="$emit('update-date', $event)"
          @load-data="$emit('load-data')"
        />
      </div>

      <!-- Data Tab -->
      <div v-show="activeTab === 'Daily Stats'" class="tab-pane">
        <DataTab :statistics="statistics" />
      </div>

      <!-- Flights Map Tab -->
      <div v-show="activeTab === 'Flights Map'" class="tab-pane">
        <FlightsMap 
          :date="date" 
          :mergedFlights="mergedFlights"
          :filteredFlightIds="filteredFlightIds"
        />
      </div>

      <!-- 3D View Tab -->
      <div v-show="activeTab === '3D View'" class="tab-pane">
        <FlightsView3D
          ref="flightsView3D"
          :activeTab="activeTab"
          :date="date"
          :mergedFlights="mergedFlights"
          :filteredFlightIds="filteredFlightIds"
          :dataLoading="dataLoading"
        />
      </div>

      <!-- Flights Review Tab -->
      <div v-show="activeTab === 'Flights Review'" class="tab-pane">
        <FlightsReview :mergedFlights="mergedFlights" @filtered-flights-changed="onFilteredFlightsChanged" />
      </div>
    </div>
  </section>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import OverviewTab from './OverviewTab.vue'
import DataTab from './DataTab.vue'
import FlightsMap from './FlightsMap.vue'
import FlightsView3D from './FlightsView3D.vue'
import FlightsReview from './FlightsReview.vue'

export default {
  name: 'TabsContainer',
  components: {
    OverviewTab,
    DataTab,
    FlightsMap,
    FlightsView3D,
    FlightsReview,
  },
  props: {
    activeTab: String,
    dataLoaded: Boolean,
    dataLoading: Boolean,
    statisticsReady: Boolean,
    tracksLoaded: Boolean,
    date: String,
    statistics: Object,
    mergedFlights: Array,
  },
  emits: ['switch-tab', 'update-date', 'load-data'],
  setup(props, { emit }) {
    const tabs = ['Overview', 'Daily Stats', 'Flights Review', 'Flights Map', '3D View']

    const filteredFlightIds = ref([])
    const flightsView3D = ref(null)
    const localDate = ref(props.date || '')
    const lastLoadedDate = ref(null)
    const availableDates = ref([])

    watch(() => props.date, v => { if (v) localDate.value = v })

    onMounted(async () => {
      try {
        const res = await axios.get('/api/days/available')
        availableDates.value = res.data.dates || []
        if (!localDate.value && availableDates.value.length) localDate.value = availableDates.value[0]
      } catch (e) { /* ignore */ }
    })

    const minDate = computed(() => availableDates.value.length ? availableDates.value[availableDates.value.length - 1] : '')
    const maxDate = computed(() => availableDates.value.length ? availableDates.value[0] : '')

    const onDateChange = () => {
      if (availableDates.value.includes(localDate.value)) {
        emit('update-date', localDate.value)
      } else {
        localDate.value = props.date || availableDates.value[0] || ''
      }
    }

    const onLoadClick = () => {
      lastLoadedDate.value = localDate.value
      emit('load-data')
    }

    const onFilteredFlightsChanged = (flightIds) => {
      filteredFlightIds.value = flightIds
    }

    return { tabs, filteredFlightIds, onFilteredFlightsChanged, flightsView3D, localDate, lastLoadedDate, minDate, maxDate, onLoadClick, onDateChange }
  }
}
</script>

<style scoped>
.content-area {
  flex: 1;
  background: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tabs-header {
  display: flex;
  align-items: center;
  background: #1e1e2e;
  flex-shrink: 0;
  padding: 0 0.5rem;
  gap: 0.1rem;
}

.tabs-date-controls {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.5rem;
}

.tabs-date-input {
  padding: 0.25rem 0.45rem;
  border: 1px solid #3a3a55;
  border-radius: 4px;
  font-size: 0.78rem;
  color: #ccc;
  background: #2a2a3e;
}
.tabs-date-input:focus { outline: none; border-color: #667eea; color: #fff; }

.tabs-load-btn {
  padding: 0.25rem 0.75rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  white-space: nowrap;
  transition: background 0.2s;
}
.tabs-load-btn:hover:not(:disabled) { background: #7b8ff5; }
.tabs-load-btn:disabled { background: #3a3a55; color: #666; cursor: not-allowed; }

.tab-button {
  padding: 0.55rem 1.1rem;
  background: transparent;
  border: none;
  border-radius: 0;
  cursor: pointer;
  font-size: 0.8rem;
  color: #888;
  font-weight: 500;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  transition: color 0.15s;
  letter-spacing: 0.2px;
  border-bottom: 2px solid transparent;
  margin-bottom: -0px;
}

.tab-button:hover:not(:disabled) {
  color: #bbb;
}

.tab-button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.tab-button.active {
  color: #fff;
  border-bottom-color: #667eea;
  font-weight: 600;
}

.tab-button.loading {
  color: #667eea;
}

.tab-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255,255,255,0.2);
  border-top: 2px solid #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.tab-content {
  flex: 1;
  overflow: hidden;
  padding: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.tab-pane {
  flex: 1;
  min-height: 0;
}

.tab-pane-padded {
  flex: 1;
  min-height: 0;
  padding: 1rem;
  overflow-y: auto;
}

.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.95);
  z-index: 50;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f0f0f0;
  border-top: 4px solid #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-overlay p {
  color: #666;
  font-size: 0.95rem;
  margin: 0;
}

.placeholder {
  text-align: center;
  color: #ccc;
  padding: 2rem 1.5rem;
  font-size: 1rem;
}

.welcome-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #999;
}

.welcome-state p {
  font-size: 1.1rem;
  margin: 0;
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #888;
}
</style>
