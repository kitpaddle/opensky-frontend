<template>
  <aside class="filters-panel">
    <h3>Filters</h3>
    <div class="filters-content">
      <div class="filter-section">
        <label class="filter-label">Select Date:</label>
        <input
          type="date"
          v-model="localDate"
          @change="handleDateChange"
          :min="minDate"
          :max="maxDate"
          :disabled="availableDates.length === 0 || disabled"
          class="filter-input"
        />
      </div>

      <!-- Preview section - permanent display below date picker -->
      <div v-if="preview || loading" class="preview-info">
        <!-- Loading overlay -->
        <div v-if="loading" class="preview-overlay">
          <div class="spinner"></div>
          <span class="loading-text">Loading preview...</span>
        </div>

        <!-- Runway grid and count data - only show when preview exists -->
        <template v-if="preview">
          <!-- Runway grid -->
          <div class="runway-grid">
            <div class="runway-column">
              <span class="runway-label">ARR:</span>
              <div class="runway-list">
                <span 
                  v-for="rwy in allRunways" 
                  :key="`arr-${rwy}`"
                  :class="['runway-badge', { active: isRunwayUsed(rwy, 'arr') }]"
                >
                  {{ rwy }}
                </span>
              </div>
            </div>
            <div class="runway-column">
              <span class="runway-label">DEP:</span>
              <div class="runway-list">
                <span 
                  v-for="rwy in allRunways" 
                  :key="`dep-${rwy}`"
                  :class="['runway-badge', { active: isRunwayUsed(rwy, 'dep') }]"
                >
                  {{ rwy }}
                </span>
              </div>
            </div>
          </div>

          <!-- Counts Grid -->
          <div class="counts-grid">
            <div class="count-item">
              <span class="count-label">ARR</span>
              <span class="count-value">{{ preview.essa_arr }}</span>
            </div>
            <div class="count-item">
              <span class="count-label">DEP</span>
              <span class="count-value">{{ preview.essa_dep }}</span>
            </div>
            <div class="count-item">
              <span class="count-label">VFR</span>
              <span class="count-value">{{ preview.ctr_flights }}</span>
            </div>
            <div class="count-item">
              <span class="count-label">G/A</span>
              <span class="count-value">{{ preview.go_arounds }}</span>
            </div>
          </div>
        </template>

        <!-- Load button -->
        <button @click="loadFullData" class="load-button" :disabled="loading || dataLoading || lastLoadedDate === localDate || disabled">Load Data</button>
      </div>

      <p v-else class="filter-placeholder">Select a date to preview</p>
    </div>
  </aside>
</template>

<script>
import { ref, watch, computed, onMounted } from 'vue'

export default {
  name: 'FiltersPanel',
  props: {
    selectedDate: String,
    dataLoading: Boolean,
    dataLoaded: Boolean,
    disabled: { type: Boolean, default: false },
  },
  emits: ['update-date', 'load-data'],
  setup(props, { emit }) {
    const localDate = ref(props.selectedDate)
    const availableDates = ref([])
    const preview = ref(null)
    const loading = ref(false)
    const lastLoadedDate = ref(null)
    const allRunways = ['01L', '01R', '19L', '19R', '08', '26']

    watch(() => props.selectedDate, (newDate) => {
      localDate.value = newDate
    })


    // Helper to get API base URL
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'

    // Fetch available dates on component mount
    onMounted(async () => {
      try {
        const response = await fetch(`${apiBase}/api/days/available`, {
          headers: {
            "ngrok-skip-browser-warning": "true"
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        availableDates.value = data.dates
      } catch (error) {
        console.error("Failed to fetch available dates:", error)
      }
    })

    // Compute min and max dates for HTML date input constraints
    const minDate = computed(() => {
      if (availableDates.value.length === 0) return ''
      return availableDates.value[availableDates.value.length - 1] // oldest date
    })

    const maxDate = computed(() => {
      if (availableDates.value.length === 0) return ''
      return availableDates.value[0] // newest date
    })

    const isRunwayUsed = (runway, type) => {
      if (!preview.value) return false
      const runways = type === 'arr' ? preview.value.arr_runways : preview.value.dep_runways
      return runways && runways.some(rwy => rwy.trim() === runway)
    }

    const handleDateChange = async () => {
      // Only allow selection of dates that have data
      if (availableDates.value.includes(localDate.value)) {
        emit('update-date', localDate.value)
        lastLoadedDate.value = null // Reset loaded state when date changes
        
        // Fetch preview data
        loading.value = true
        try {
          const response = await fetch(`${apiBase}/api/days/${localDate.value}/preview`)
          if (response.ok) {
            const data = await response.json()
            preview.value = data.preview
          }
        } catch (error) {
          console.error('Failed to fetch preview:', error)
          preview.value = null
        } finally {
          loading.value = false
        }
      } else {
        // Reset if invalid date selected
        localDate.value = props.selectedDate
        preview.value = null
      }
    }

    const loadFullData = () => {
      lastLoadedDate.value = localDate.value
      emit('load-data')
    }

    return {
      localDate,
      availableDates,
      minDate,
      maxDate,
      preview,
      loading,
      lastLoadedDate,
      allRunways,
      isRunwayUsed,
      handleDateChange,
      loadFullData,
    }
  }
}
</script>

<style scoped>
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
  padding-bottom: 0.35rem;
}

.filters-content {
  color: #999;
}

.filter-section {
  margin-bottom: 0.75rem;
}

.filter-label {
  display: block;
  margin-bottom: 0.35rem;
  font-weight: 500;
  color: #333;
  font-size: 0.85rem;
}

.filter-input {
  width: 100%;
  padding: 0.4rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
  background: white;
  color: #333;
}

.filter-input:disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.filter-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Preview Info Section */
.preview-info {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e0e0e0;
  position: relative;
}

/* Loading Overlay */
.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(128, 128, 128, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 4px;
  z-index: 10;
}

/* Runway Grid */
.runway-grid {
  margin-bottom: 0.75rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.runway-column {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.runway-label {
  font-weight: 600;
  color: #666;
  font-size: 0.75rem;
  text-align: center;
}

.runway-list {
  display: flex;
  gap: 0.15rem;
  flex-wrap: wrap;
  justify-content: center;
}

.runway-badge {
  display: inline-block;
  padding: 0.15rem 0.3rem;
  border-radius: 2px;
  background: #f0f0f0;
  color: #999;
  font-size: 0.65rem;
  font-weight: 500;
  transition: all 0.2s;
  text-align: center;
  min-width: 24px;
  flex: 0 1 auto;
}

.runway-badge.active {
  background: #667eea;
  color: white;
  font-weight: 600;
}

/* Counts Grid */
.counts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.count-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.count-label {
  font-size: 0.65rem;
  color: #666;
  font-weight: 500;
  text-align: center;
}

.count-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: #667eea;
}

/* Load Button */
.load-button {
  width: 100%;
  padding: 0.5rem 0.7rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background 0.2s;
}

.load-button:hover:not(:disabled) {
  background: #5568d3;
}

.load-button:active:not(:disabled) {
  background: #4856b9;
}

.load-button:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.filter-placeholder {
  font-size: 0.85rem;
  color: #ccc;
}

/* Flight Filters Section */
.flight-filters {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.flight-filters .filter-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
}

.filter-row {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
}

.state-btn {
  flex: 1;
  padding: 0.6rem;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.state-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.state-btn:active {
  transform: translateY(0);
}

/* Default state: IGNORE (grey) */
.state-btn {
  background: #9e9e9e;
}

.state-btn:hover {
  background: #757575;
}

/* TRUE state (green) */
.state-btn.true {
  background: #4caf50;
}

.state-btn.true:hover {
  background: #45a049;
}

/* FALSE state (red) */
.state-btn.false {
  background: #f44336;
}

.state-btn.false:hover {
  background: #da190b;
}

/* Full width button for overflights and vehicles */
.state-btn.full-width {
  width: 100%;
}

/* Runway buttons - smaller and more compact */
.runway-row {
  gap: 0.25rem;
}

.state-btn.runway-btn {
  flex: 1;
  padding: 0.4rem 0.3rem;
  font-size: 0.7rem;
  font-weight: 700;
}

.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #f0f0f0;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 0.8rem;
  color: #667eea;
  font-weight: 500;
}

/* Flight Filters */
.flight-filters {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.filter-section {
  margin-bottom: 1rem;
}

.filter-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #666;
  margin: 0 0 0.5rem 0;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.filter-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.filter-btn {
  padding: 0.5rem 0.75rem;
  border: 1.5px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  color: #666;
  transition: all 0.2s;
}

.filter-btn:hover {
  border-color: #667eea;
  color: #667eea;
  background: #f9f9ff;
}

.filter-btn.active {
  background: #667eea;
  border-color: #667eea;
  color: white;
}
</style>
