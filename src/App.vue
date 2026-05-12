<template>
  <div class="app">
    <main class="app-main">
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div class="dashboard-container">
        <TabsContainer
          ref="tabsContainer"
          :activeTab="activeTab"
          :date="selectedDate"
          :statistics="statistics"
          :mergedFlights="mergedFlightsData"
          :dataLoaded="dataLoaded"
          :dataLoading="dataLoading"
          :statisticsReady="statisticsReady"
          :tracksLoaded="tracksLoaded"
          @switch-tab="activeTab = $event"
          @update-date="updateDate"
          @load-data="onLoadData"
        />
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useAirspaceData } from './composables/useAirspaceData.js'
import Header from './components/Header.vue'
import TabsContainer from './components/TabsContainer.vue'

export default {
  name: 'App',
  components: {
    Header,
    TabsContainer,
  },
  setup() {
    const { prefetchAll } = useAirspaceData()
    onMounted(() => prefetchAll())  // warm airspace cache for both 2D and 3D maps

    const selectedDate = ref('2026-03-26')
    const loading = ref(false)
    const error = ref(null)
    const dataLoaded = ref(false)
    const dataLoading = ref(false)
    const statisticsReady = ref(false)
    const activeTab = ref('Overview')
    const statistics = ref(null)
    const mergedFlightsData = ref([])  // SINGLE comprehensive data source
    const tracksLoaded = ref(false)
    const trackTimings = ref(null)
    const tabsContainer = ref(null)
    
    let trackDecoderWorker = null

    /**
     * Initialize WebWorker for decoding and merging tracks
     */
    const initTrackDecoderWorker = () => {
      if (!trackDecoderWorker) {
        trackDecoderWorker = new Worker(new URL('./workers/trackDecoder.js', import.meta.url))
      }
    }

    /**
     * Fetch and decode+merge tracks immediately after flights are loaded
     * This runs in parallel with the UI being interactive
     */
    const loadAndDecodeTracks = async (date, flightData) => {
      if (!date || !flightData) return

      initTrackDecoderWorker()
      const timings = {}

      try {
        // Step 1: Fetch compact format from API
        console.log('[Tracks] Starting fetch...')
        const fetchStartTime = performance.now()

        const response = await axios.get(`/api/days/${date}/flight-tracks`)
        
        const fetchEndTime = performance.now()
        timings.fetchTimeMs = Math.round(fetchEndTime - fetchStartTime)

        console.log(`✓ Fetched track data in ${timings.fetchTimeMs}ms`)
        console.log(`  Tracks: ${response.data.tracks.length}`)

        if (!response.data.tracks || response.data.tracks.length === 0) {
          console.warn('No tracks received from API')
          trackTimings.value = timings
          tracksLoaded.value = false
          return
        }

        // Step 2: Send to WebWorker for DECODE + MERGE (now merged)
        console.log('[Tracks] Sending to WebWorker for decode and merge...')
        
        await decodeAndMergeTracksWithWorker(response.data.tracks, flightData, timings)

      } catch (err) {
        console.error('Failed to load and decode flight tracks:', err)
        trackTimings.value = timings
        tracksLoaded.value = false
      }
    }

    /**
     * Use WebWorker to decode tracks AND merge with flight metadata asynchronously
     */
    const decodeAndMergeTracksWithWorker = (tracks, flightData, timings) => {
      return new Promise((resolve, reject) => {
        // Set up worker message handler (one-time)
        const handleMessage = (event) => {
          const { success, mergedFlights, processingTimeMs, error } = event.data

          // Remove the handler after first message
          trackDecoderWorker.removeEventListener('message', handleMessage)

          if (success) {
            timings.decodingTimeMs = processingTimeMs
            mergedFlightsData.value = mergedFlights  // SINGLE source of truth now
            tracksLoaded.value = true

            console.log(`✓ Decoded and merged tracks in ${processingTimeMs}ms`)
            console.log(`  Flights with tracks: ${mergedFlights.length}`)
            if (mergedFlights.length > 0) {
              console.log(`  Sample track points: ${mergedFlights[0].coordinates.length}`)
            }
            console.log(`  Total time: Fetch ${timings.fetchTimeMs}ms + Decode+Merge ${timings.decodingTimeMs}ms = ${timings.fetchTimeMs + timings.decodingTimeMs}ms`)

            trackTimings.value = timings
            resolve()
          } else {
            console.error('Worker error:', error)
            trackTimings.value = timings
            tracksLoaded.value = false
            reject(new Error(error))
          }
        }

        trackDecoderWorker.addEventListener('message', handleMessage)

        // Send data to worker - WebWorker now receives BOTH and returns MERGED
        trackDecoderWorker.postMessage({ tracks, flights: flightData })
      })
    }

    const updateDate = (newDate) => {
      selectedDate.value = newDate
    }

    const onLoadData = () => {
      // Destroy 3D viewer before loading new data
      if (tabsContainer.value?.$refs?.flightsView3D?.destroyViewer) {
        tabsContainer.value.$refs.flightsView3D.destroyViewer()
      }
      loadData()
    }

    const loadData = async () => {
      if (!selectedDate.value) return

      dataLoading.value = true
      statisticsReady.value = false  // Reset to lock Data tab while loading
      error.value = null
      statistics.value = null
      mergedFlightsData.value = []  // Clear previous data
      tracksLoaded.value = false
      trackTimings.value = null

      try {
        // 1. Load statistics first (fast) - must succeed
        const statsResponse = await axios.get(`/api/days/${selectedDate.value}/statistics`)
        if (statsResponse.data.statistics) {
          statistics.value = statsResponse.data.statistics
          dataLoaded.value = true
          statisticsReady.value = true  // Data tab is now ready
          if (activeTab.value !== 'Overview') activeTab.value = 'Daily Stats'
        }
      } catch (err) {
        error.value = `Failed to load statistics: ${err.message}`
        dataLoaded.value = false
        dataLoading.value = false
        statisticsReady.value = false
        return
      }
      
      // 2. Load flights
      try {
        const flightsResponse = await axios.get(`/api/days/${selectedDate.value}/flight-summaries`)
        if (flightsResponse.data.flights) {
          // 3. AWAIT track loading to complete before unlocking tabs
          // Keep dataLoading=true until all data (flights + tracks) are ready
          console.log('[App] Flights loaded, starting track fetch/decode/merge...')
          await loadAndDecodeTracks(selectedDate.value, flightsResponse.data.flights)
          dataLoading.value = false  // Only unlock AFTER all data is ready
        }
      } catch (err) {
        console.warn(`Failed to load flights: ${err.message}`)
        dataLoading.value = false  // Unlock on error too
      }
    }

    return {
      selectedDate,
      loading,
      error,
      dataLoaded,
      dataLoading,
      statisticsReady,
      tracksLoaded,
      trackTimings,
      activeTab,
      statistics,
      mergedFlightsData,
      updateDate,
      onLoadData,
      tabsContainer,
    }
  }
}
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: white;
}

/* HEADER */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  overflow: hidden;
}

.header-left h1 {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin: 0;
  padding: 0;
  line-height: 0.9;
}

.header-middle {
  flex: 1;
  display: flex;
  justify-content: center;
  margin: 0;
  padding: 0;
}

.header-status {
  font-size: 0.65rem;
  font-weight: 500;
  opacity: 0.95;
  margin: 0;
  padding: 0;
  line-height: 0.9;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 150px;
  justify-content: flex-end;
  margin: 0;
  padding: 0;
}

.loading-indicator,
.error-indicator,
.success-indicator {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.65rem;
  font-weight: 500;
  line-height: 0.9;
  margin: 0;
  padding: 0;
}

.spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0;
  padding: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-indicator {
  color: #ff6b6b;
}

.success-indicator {
  color: #51cf66;
}

/* MAIN CONTENT */
.app-main {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.error-message {
  background: #ffe0e0;
  color: #d32f2f;
  padding: 1rem 1.5rem;
  margin: 0.75rem;
  border-radius: 6px;
  border-left: 4px solid #d32f2f;
  font-weight: 500;
}

.welcome {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 1.2rem;
  padding: 1rem;
  text-align: center;
}

/* DASHBOARD LAYOUT */
.dashboard-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.filters-panel {
  width: 150px;
  background: white;
  border-radius: 8px;
  padding: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow-y: auto;
  flex-shrink: 0;
}

.filters-panel h3 {
  margin-bottom: 0.5rem;
  color: #333;
  font-size: 0.8rem;
  font-weight: 600;
  border-bottom: 2px solid #667eea;
  padding-bottom: 0.25rem;
}

.filters-content {
  color: #999;
}

.filter-section {
  margin-bottom: 1.5rem;
}

.filter-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
  font-size: 0.9rem;
}

.filter-input {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  background: white;
  color: #333;
}

.filter-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.filter-placeholder {
  font-size: 0.85rem;
  color: #ccc;
}

/* CONTENT AREA */
.content-area {
  flex: 1;
  background: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tabs-header {
  display: flex;
  border-bottom: 2px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
}

.tab-button {
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
  color: #666;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
  font-weight: 500;
  white-space: nowrap;
}

.tab-button:hover {
  color: #333;
  background: #f5f5f5;
}

.tab-button.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: white;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.tab-pane {
  height: 100%;
}

.placeholder {
  text-align: center;
  color: #ccc;
  padding: 3rem 2rem;
  font-size: 1rem;
}

/* DATA TAB STYLES */
.stats-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.stats-section {
  background: #fafafa;
  padding: 1.5rem;
  border-radius: 6px;
  border-left: 4px solid #667eea;
}

.stats-section h3 {
  margin-bottom: 1.5rem;
  color: #333;
  font-size: 1.05rem;
  font-weight: 600;
}

.stat-boxes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.stat-box {
  background: white;
  padding: 1.25rem;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  text-align: center;
  border-top: 3px solid #667eea;
}

.stat-label {
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
}

.stat-value {
  font-size: 1.8rem;
  color: #667eea;
  font-weight: 700;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stats-table thead {
  background: #f5f5f5;
  border-bottom: 2px solid #e0e0e0;
}

.stats-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #333;
  font-size: 0.9rem;
}

.stats-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f0f0f0;
  color: #555;
  font-size: 0.9rem;
}

.stats-table tbody tr:hover {
  background: #fafafa;
}

.stats-table tr:last-child td {
  border-bottom: none;
}

/* Scrollbar styling */
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

@media (max-width: 1200px) {
  .stat-boxes {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .dashboard-container {
    flex-direction: column;
  }

  .filters-panel {
    width: 100%;
  }

  .stat-boxes {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
