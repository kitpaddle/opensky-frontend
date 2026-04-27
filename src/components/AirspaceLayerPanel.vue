<template>
  <div class="layer-control-panel">
    <div class="panel-header">
      <h3>Map Layers</h3>
      <button class="collapse-btn" @click="isExpanded = !isExpanded">
        {{ isExpanded ? '▼' : '▶' }}
      </button>
    </div>

    <div v-if="isExpanded" class="panel-content">
      <!-- Basemap Layer Selector -->
      <div class="layer-group">
        <div class="group-header">
          <span class="group-title">Basemap</span>
        </div>
        <div class="basemap-options">
          <label class="basemap-option">
            <input
              type="radio"
              v-model="selectedBasemap"
              value="black"
              @change="updateBasemap"
            />
            Black Map
          </label>
          <label class="basemap-option">
            <input
              type="radio"
              v-model="selectedBasemap"
              value="lightgrey"
              @change="updateBasemap"
            />
            White Map
          </label>
          <label class="basemap-option">
            <input
              type="radio"
              v-model="selectedBasemap"
              value="none"
              @change="updateBasemap"
            />
            No Map
          </label>
        </div>
      </div>

      <!-- ESSA CTR -->
      <div class="layer-group">
        <div class="group-header">
          <input
            type="checkbox"
            v-model="layers.ctr.essa.full"
            @change="updateLayer('ctr', 'essa', 'full')"
            class="group-checkbox"
          />
          <span class="group-title">ESSA CTR</span>
        </div>
      </div>

      <!-- TMA -->
      <div class="layer-group">
        <div class="group-header">
          <input
            type="checkbox"
            v-model="layers.tma.visible"
            @change="updateSimpleLayer('tma')"
            class="group-checkbox"
          />
          <span class="group-title">TMA</span>
        </div>
      </div>

      <!-- Restricted Areas -->
      <div class="layer-group">
        <div class="group-header">
          <input
            type="checkbox"
            v-model="layers.r16.visible"
            @change="updateSimpleLayer('r16')"
            class="group-checkbox"
          />
          <span class="group-title" @click="rasExpanded = !rasExpanded">
            {{ rasExpanded ? '▼' : '▶' }} RAs
          </span>
        </div>
        <div v-if="rasExpanded" class="group-content">
          <label class="zone-checkbox">
            <input
              type="checkbox"
              v-model="layers.r16.visible"
              @change="updateSimpleLayer('r16')"
            />
            R16
          </label>
        </div>
      </div>

      <!-- SID / STAR -->
      <div class="layer-group">
        <div class="group-header">
          <input
            type="checkbox"
            :checked="layers.sid.visible || layers.star.visible"
            @change="toggleAllSIDSTAR"
            class="group-checkbox"
          />
          <span class="group-title" @click="sidstarExpanded = !sidstarExpanded">
            {{ sidstarExpanded ? '▼' : '▶' }} SID / STAR
          </span>
        </div>
        <div v-if="sidstarExpanded" class="group-content">
          <label class="zone-checkbox">
            <input
              type="checkbox"
              v-model="layers.sid.visible"
              @change="updateSimpleLayer('sid')"
            />
            SID Points
          </label>
          <label class="zone-checkbox">
            <input
              type="checkbox"
              v-model="layers.star.visible"
              @change="updateSimpleLayer('star')"
            />
            STAR Points
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'AirspaceLayerPanel',
  emits: ['layer-change', 'basemap-change'],
  setup(props, { emit }) {
    const isExpanded = ref(true)
    const rasExpanded = ref(false)
    const sidstarExpanded = ref(false)
    const selectedBasemap = ref('black')

    const layers = ref({
      ctr: {
        essa: { full: false },
      },
      tma: { visible: false },
      r16: { visible: false },
      sid: { visible: false },
      star: { visible: false },
    })

    const updateLayer = (type, airport, zone) => {
      emit('layer-change', { type, airport, zone, data: layers.value[type][airport] })
    }

    const updateSimpleLayer = (type) => {
      emit('layer-change', { type, data: layers.value[type] })
    }

    const toggleAllSIDSTAR = (event) => {
      const isChecked = event.target.checked
      layers.value.sid.visible = isChecked
      layers.value.star.visible = isChecked
      emit('layer-change', { type: 'sid', data: layers.value.sid })
      emit('layer-change', { type: 'star', data: layers.value.star })
    }

    const updateBasemap = () => {
      emit('basemap-change', { basemap: selectedBasemap.value })
    }

    return {
      isExpanded,
      rasExpanded,
      sidstarExpanded,
      selectedBasemap,
      layers,
      updateLayer,
      updateSimpleLayer,
      toggleAllSIDSTAR,
      updateBasemap,
    }
  },
}
</script>

<style scoped>
.layer-control-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
  max-width: 300px;
  font-family: sans-serif;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
}

.panel-header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.collapse-btn {
  background: none;
  border: none;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  color: #666;
}

.panel-content {
  padding: 6px 0;
  max-height: 400px;
  overflow-y: auto;
}

.layer-group,
.airport-group {
  margin-bottom: 4px;
}

.group-header,
.airport-header {
  display: flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
}

.group-header:hover,
.airport-header:hover {
  background: #f5f5f5;
}

.group-checkbox,
.airport-checkbox {
  margin-right: 8px;
  cursor: pointer;
}

.group-title,
.airport-title {
  font-size: 12px;
  font-weight: 500;
  color: #333;
  flex: 1;
}

.airport-title {
  font-weight: 400;
  margin-left: 8px;
}

.group-content {
  margin-left: 0;
  border-left: 2px solid #ddd;
  padding-left: 8px;
  margin-top: 4px;
}

.airport-content {
  margin-left: 16px;
  padding: 2px 0;
}

.zone-checkbox {
  display: block;
  padding: 2px 6px;
  font-size: 11px;
  color: #555;
  cursor: pointer;
  border-radius: 3px;
  transition: background 0.2s;
}

.zone-checkbox:hover {
  background: #f9f9f9;
}

.zone-checkbox input {
  margin-right: 6px;
  cursor: pointer;
}

.basemap-options {
  display: flex;
  flex-direction: column;
  padding: 4px 6px;
  gap: 3px;
}

.basemap-option {
  display: flex;
  align-items: center;
  font-size: 11px;
  color: #555;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  transition: background 0.2s;
}

.basemap-option:hover {
  background: #f9f9f9;
}

.basemap-option input {
  margin-right: 8px;
  cursor: pointer;
}
</style>
