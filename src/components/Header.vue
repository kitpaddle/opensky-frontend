<template>
  <header class="app-header">
    <div class="header-left">
      <h1>ESSA OpenSky Data</h1>
    </div>
    
    <div class="header-middle">
      <span v-if="!dataLoaded" class="header-status">Waiting for user to choose a date...</span>
      <span v-else class="header-status">{{ selectedDate }}</span>
    </div>

    <div class="header-right">
      <div v-if="loading" class="loading-indicator">
        <span class="spinner"></span>
        <span>Loading...</span>
      </div>
      <div v-else-if="error" class="error-indicator">
        ⚠ Error
      </div>
      <div v-else-if="dataLoaded" class="success-indicator">
        <div class="success-content">
          <span class="checkmark">✓</span>
          <div class="success-info">
            <span class="ready-text">Ready</span>
            <span v-if="trackTimings" class="timing-text">
              Fetch: {{ trackTimings.fetchTimeMs }}ms | Decode: {{ trackTimings.decodingTimeMs }}ms
            </span>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script>
export default {
  name: 'Header',
  props: {
    selectedDate: String,
    loading: Boolean,
    error: Boolean,
    dataLoaded: Boolean,
    trackTimings: Object,
  }
}
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0 2rem;
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
  padding: 0;
  margin: 0;
}

.header-status {
  font-size: 0.65rem;
  font-weight: 500;
  opacity: 0.95;
  line-height: 0.9;
  margin: 0;
  padding: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 300px;
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

.success-content {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  margin: 0;
  padding: 0;
}

.checkmark {
  display: inline-block;
  width: 10px;
  height: 10px;
  background: #51cf66;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.5rem;
  color: white;
  flex-shrink: 0;
  line-height: 0.9;
  margin: 0;
  padding: 0;
}

.success-info {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.3rem;
  line-height: 0.9;
  margin: 0;
  padding: 0;
}

.ready-text {
  font-size: 0.65rem;
  font-weight: 600;
  color: #51cf66;
  line-height: 0.9;
  margin: 0;
  padding: 0;
}

.timing-text {
  font-size: 0.55rem;
  opacity: 0.9;
  color: #e0f2e0;
  font-weight: 400;
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
</style>
