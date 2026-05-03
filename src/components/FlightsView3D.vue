<template>
  <div class="flights-view-3d">
    <!-- Loading overlay -->
    <div v-if="dataLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>Loading 3D data...</p>
    </div>

    <!-- Error state -->
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
    </div>

    <!-- 3D View Content -->
    <div v-if="!dataLoading && !error" class="view-3d-container">
      <!-- Controls Panel -->
      <div class="controls-panel">
        <div class="control-section">
          <label>Basemap</label>
          <div class="basemap-options">
            <label class="basemap-option">
              <input
                type="radio"
                v-model="selectedBasemap"
                value="black"
                @change="changeBasemap"
              />
              Black Map
            </label>
            <label class="basemap-option">
              <input
                type="radio"
                v-model="selectedBasemap"
                value="lightgrey"
                @change="changeBasemap"
              />
              White Map
            </label>
          </div>
        </div>

        <div class="control-section">
          <label>Time Control</label>
          <div class="time-control">
            <div class="time-buttons">
              <button 
                v-if="!isPlaying"
                @click="startAnimation"
                class="play-btn"
                :disabled="!globalTimeRange.min || !globalTimeRange.max"
                title="Play animation"
              >
                ▶ Play
              </button>
              <button 
                v-else
                @click="stopAnimation"
                class="stop-btn"
                title="Stop animation"
              >
                ⏹ Stop
              </button>
              <div class="speed-buttons">
                <button
                  @click="setPlaybackSpeed(1)"
                  :class="['speed-btn', { active: playbackSpeed === 1 }]"
                  title="Real-time (1x)"
                >
                  1x
                </button>
                <button
                  @click="setPlaybackSpeed(5)"
                  :class="['speed-btn', { active: playbackSpeed === 5 }]"
                  title="5x speed"
                >
                  5x
                </button>
                <button
                  @click="setPlaybackSpeed(30)"
                  :class="['speed-btn', { active: playbackSpeed === 30 }]"
                  title="30x speed"
                >
                  30x
                </button>
                <button
                  @click="setPlaybackSpeed(100)"
                  :class="['speed-btn', { active: playbackSpeed === 100 }]"
                  title="100x speed"
                >
                  100x
                </button>
              </div>
            </div>
            <input 
              v-if="globalTimeRange.min && globalTimeRange.max"
              type="range" 
              :min="globalTimeRange.min"
              :max="globalTimeRange.max"
              :value="currentTime"
              @input="onTimeSliderChange"
              class="time-slider"
            />
            <span class="time-display">{{ formatTime(currentTime) }}</span>
          </div>
        </div>

        <div class="control-section">
          <label>Airspace Volumes</label>
          <div class="volume-options">
            <label class="volume-option">
              <input type="checkbox" v-model="showCTR" @change="toggleCTR" />
              ESSA CTR
            </label>
            <label class="volume-option">
              <input type="checkbox" v-model="showR16" @change="toggleR16" />
              ES R16 Restricted
            </label>
          </div>
        </div>

        <div class="control-section">
          <label>Track Fade</label>
          <div class="speed-buttons">
            <button @click="fadeDuration = null" :class="['speed-btn', { active: fadeDuration === null }]">Unlimited</button>
            <button @click="fadeDuration = 600"  :class="['speed-btn', { active: fadeDuration === 600 }]">10 min</button>
            <button @click="fadeDuration = 60"   :class="['speed-btn', { active: fadeDuration === 60 }]">1 min</button>
          </div>
        </div>

        <div class="control-section">
          <label>3D Flights ({{ displayedFlights.length }}/{{ filteredFlightCount }}, max 50)</label>
        </div>

        <div class="control-section info-box">
          <p v-if="displayedFlights.length === 0">
            Select up to 10 flights from the Flight List to view their 3D tracks.
          </p>
          <p v-else-if="displayedFlights.length < filteredFlightCount" class="info-truncated">
            Showing first {{ displayedFlights.length }} of {{ filteredFlightCount }} selected flights.
          </p>
        </div>
      </div>

      <!-- Cesium 3D Viewer -->
      <div ref="cesiumContainer" class="cesium-container"></div>
    </div>

    <!-- Empty state -->
    <div v-if="!dataLoading && !error && displayedFlights.length === 0 && filteredFlightCount === 0" class="empty-state">
      <p>No flights selected. Select flights from the Flight List to view them in 3D.</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useAirspaceData } from '../composables/useAirspaceData.js'

export default {
  name: 'FlightsView3D',
  props: {
    activeTab: String,
    date: String,
    mergedFlights: Array,
    filteredFlightIds: Array,
    dataLoading: Boolean,
  },
  setup(props) {
    const cesiumContainer = ref(null)
    const viewer = ref(null)
    const error = ref(null)
    const selectedBasemap = ref('black')

    const currentTime = ref(null)
    const globalTimeRange = ref({ min: null, max: null })
    const trackData = ref({})
    
    // Animation state - tied to Cesium Clock
    const isPlaying = ref(false)
    const playbackSpeed = ref(1)  // Default to 1x

    // Airspace volume toggles
    const showCTR = ref(false)
    const showR16 = ref(false)
    const fadeDuration = ref(600) // seconds: 600=10min, 60=1min, null=unlimited
    const { airspaceData, fetchEssaCtr, fetchR16 } = useAirspaceData()
    const volumeEntities = { ctr: [], r16: [] }  // Cesium entity refs

    // Get Cesium reference (available after page load)
    const getCesium = () => window.Cesium

    // Colors matching Flight List column themes
    const CATEGORY_COLORS = {
      essa_dep:  { hex: '#2196F3', r: 33,  g: 150, b: 243 },
      essa_arr:  { hex: '#FFC107', r: 255, g: 193, b: 7   },
      ctr:       { hex: '#9C27B0', r: 156, g: 39,  b: 176 },
      vehicle:   { hex: '#4CAF50', r: 76,  g: 175, b: 80  },
      other:     { hex: '#757575', r: 117, g: 117, b: 117 },
    }

    const getFlightCategory = (flight) => {
      if (flight.is_essa_dep)                              return 'essa_dep'
      if (flight.is_essa_arr)                              return 'essa_arr'
      if (flight.is_inctr)                                 return 'ctr'
      if (flight.is_vehicle || flight.is_essa_vehicle)     return 'vehicle'
      return 'other'
    }

    const getFlightColor = (flight) => {
      const cat = getFlightCategory(flight)
      return CATEGORY_COLORS[cat].hex
    }

    // Get first 10 flights from filtered IDs
    const displayedFlights = computed(() => {
      if (!props.mergedFlights || !props.filteredFlightIds) return []
      const first20Ids = props.filteredFlightIds.slice(0, 50)
      return props.mergedFlights.filter(f => first20Ids.includes(f.flight_id))
    })

    const filteredFlightCount = computed(() => {
      return props.filteredFlightIds?.length || 0
    })

    // Format timestamp
    const formatTime = (timestamp) => {
      if (!timestamp) return '--:--:--'
      const date = new Date(timestamp * 1000)
      const hours = String(date.getUTCHours()).padStart(2, '0')
      const minutes = String(date.getUTCMinutes()).padStart(2, '0')
      const seconds = String(date.getUTCSeconds()).padStart(2, '0')
      return `${hours}:${minutes}:${seconds}`
    }

    // Parse altitude value from LFV WFS properties (feet → metres, "GND"/"SFC" → 0)
    const parseAltM = (val) => {
      if (!val || val === 'GND' || val === 'SFC' || val === '0') return 0
      return parseFloat(val) * 0.3048
    }

    // Render a set of GeoJSON polygon features as Cesium extruded volumes
    const renderVolumes = (features, color, entityBucket) => {
      if (!viewer.value || viewer.value.isDestroyed()) return
      const Cesium = window.Cesium
      const fill   = Cesium.Color.fromCssColorString(color).withAlpha(0.12)
      const outline = Cesium.Color.fromCssColorString(color).withAlpha(0.85)

      features.forEach(f => {
        const geom = f.geometry
        if (!geom) return
        const props = f.properties || {}
        const lowerM = parseAltM(props.LOWER)
        const upperM = parseAltM(props.UPPER)
        const rings = geom.type === 'MultiPolygon' ? geom.coordinates.flat() : geom.coordinates

        rings.forEach(ring => {
          const positions = ring.map(c => Cesium.Cartesian3.fromDegrees(c[0], c[1], lowerM))
          const entity = viewer.value.entities.add({
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(positions),
              height: lowerM,
              extrudedHeight: upperM,
              material: fill,
              outline: true,
              outlineColor: outline,
              outlineWidth: 2,
            },
          })
          entityBucket.push(entity)
        })
      })
    }

    const setVolumeVisible = (entityBucket, visible) => {
      entityBucket.forEach(e => { if (e && !e.isDestroyed) e.show = visible })
    }

    const toggleCTR = async () => {
      if (!viewer.value || viewer.value.isDestroyed()) return
      if (volumeEntities.ctr.length === 0) {
        await fetchEssaCtr()
        if (!airspaceData.value.essaCtr?.length) { showCTR.value = false; return }
        renderVolumes(airspaceData.value.essaCtr, '#2196F3', volumeEntities.ctr)
      }
      setVolumeVisible(volumeEntities.ctr, showCTR.value)
    }

    const toggleR16 = async () => {
      if (!viewer.value || viewer.value.isDestroyed()) return
      if (volumeEntities.r16.length === 0) {
        await fetchR16()
        if (!airspaceData.value.r16?.length) { showR16.value = false; return }
        renderVolumes(airspaceData.value.r16, '#FF5722', volumeEntities.r16)
      }
      setVolumeVisible(volumeEntities.r16, showR16.value)
    }

    // Create imagery provider based on selected basemap
    const createBasemapImageryProvider = () => {
      if (!window.Cesium) {
        console.warn('[3D View] Cesium not available in createBasemapImageryProvider')
        return null
      }
      const Cesium = window.Cesium

      // Always return a valid provider, default to black
      const mapType = selectedBasemap.value || 'black'
      console.log('[3D View] Creating basemap provider for:', mapType)

      try {
        if (mapType === 'lightgrey') {
          // Try CartoDB first, fall back to OSM
          try {
            return new Cesium.UrlTemplateImageryProvider({
              url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
              subdomains: ['a', 'b', 'c', 'd'],
              credit: '© OpenStreetMap contributors © CARTO',
            })
          } catch (e) {
            console.warn('[3D View] CartoDB light map failed, using OSM');
            return new Cesium.UrlTemplateImageryProvider({
              url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              credit: '© OpenStreetMap contributors',
            })
          }
        } else {
          // Black map (default)
          try {
            return new Cesium.UrlTemplateImageryProvider({
              url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
              subdomains: ['a', 'b', 'c', 'd'],
              credit: '© OpenStreetMap contributors © CARTO',
            })
          } catch (e) {
            console.warn('[3D View] CartoDB dark map failed, using OSM');
            return new Cesium.UrlTemplateImageryProvider({
              url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              credit: '© OpenStreetMap contributors',
            })
          }
        }
      } catch (error) {
        console.error('[3D View] Failed to create basemap provider:', error);
        // Last resort: return OSM directly without try/catch
        try {
          return new Cesium.UrlTemplateImageryProvider({
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            credit: '© OpenStreetMap contributors',
          })
        } catch (osmError) {
          console.error('[3D View] Even OSM failed:', osmError);
          return null;
        }
      }
    }

    // Apply scene styling based on basemap type
    const applySceneStyle = (mapType) => {
      if (!viewer.value || viewer.value.isDestroyed()) return
      const Cesium = window.Cesium
      const scene = viewer.value.scene

      if (mapType === 'black') {
        scene.skyAtmosphere.show = false
        scene.globe.showGroundAtmosphere = false
        scene.fog.enabled = false
        scene.globe.baseColor = Cesium.Color.fromCssColorString('#0d0d0d')
        scene.skyBox.show = true  // keep stars
      } else {
        scene.skyAtmosphere.show = true
        scene.globe.showGroundAtmosphere = true
        scene.fog.enabled = true
        scene.globe.baseColor = Cesium.Color.fromCssColorString('#4b9ad4')  // Cesium ocean blue
        scene.skyBox.show = true
      }
    }

    // Change basemap imagery provider
    const changeBasemap = () => {
      if (!viewer.value) return
      try {
        const newProvider = createBasemapImageryProvider()
        viewer.value.imageryLayers.removeAll()
        if (newProvider) {
          viewer.value.imageryLayers.addImageryProvider(newProvider)
        }
        applySceneStyle(selectedBasemap.value)
        console.log('[3D View] Basemap changed to:', selectedBasemap.value)
      } catch (err) {
        console.error('Error changing basemap:', err)
      }
    }

    // Load and prepare track data
    const loadTrackData = () => {
      console.log('[3D View] loadTrackData called, flights:', displayedFlights.value.length)
      
      if (displayedFlights.value.length === 0) {
        console.log('[3D View] No flights selected')
        trackData.value = {}
        globalTimeRange.value = { min: null, max: null }
        currentTime.value = null
        error.value = null  // No error - just no flights selected yet
        return
      }

      try {
        let allTimestamps = []
        trackData.value = {}

        displayedFlights.value.forEach((flight, idx) => {
          // Log raw flight data for first flight
          if (idx === 0) {
            console.log('[3D View] FIRST FLIGHT DEBUG:')
            console.log('  callsign:', flight.callsign)
            console.log('  flight_id:', flight.flight_id)
            console.log('  has coordinates?', !!flight.coordinates)
            console.log('  coordinates length:', flight.coordinates?.length)
            console.log('  has altitude_profile?', !!flight.altitude_profile)
            console.log('  altitude_profile length:', flight.altitude_profile?.length)
            console.log('  [FULL FLIGHT OBJECT]:', flight)
          }

          if (flight.coordinates && Array.isArray(flight.coordinates)) {
            // Combine coordinates [lon, lat] with altitude_profile (interleaved: [alt, time, alt, time, ...])
            const altitudeTimeProfile = flight.altitude_profile || []
            
            const points = flight.coordinates.map((coord, idx) => ({
              lon: coord[0],
              lat: coord[1],
              alt: altitudeTimeProfile[idx * 2] || 0,           // alt at even index
              time: altitudeTimeProfile[idx * 2 + 1] || null,   // time at odd index
            }))

            trackData.value[flight.flight_id] = points
            allTimestamps.push(...points.map(p => p.time).filter(t => t !== null))
            
            // Debug: Log altitude and time data for first flight
            if (!window.__flightAltitudeDebugLogged) {
              console.log('[3D View Debug] Sample coordinate structure for', flight.callsign)
              console.log('[3D View Debug] Raw coords (first 3):', flight.coordinates.slice(0, 3))
              console.log('[3D View Debug] Altitude/Time profile (first 6):', altitudeTimeProfile.slice(0, 6))
              console.log('[3D View Debug] Parsed points (first 3):', points.slice(0, 3))
              console.log('[3D View Debug] Min/Max altitudes:', Math.min(...points.map(p => p.alt)), '/', Math.max(...points.map(p => p.alt)))
              console.log('[3D View Debug] Time range:', Math.min(...points.map(p => p.time).filter(t => t)), '/', Math.max(...points.map(p => p.time).filter(t => t)))
              window.__flightAltitudeDebugLogged = true
            }
          }
        })

        if (allTimestamps.length === 0) {
          // No valid timestamp data - don't show error, just empty
          error.value = null
          return
        }

        // Calculate global time range
        const minTime = Math.min(...allTimestamps)
        const maxTime = Math.max(...allTimestamps)
        globalTimeRange.value = { min: minTime, max: maxTime }
        currentTime.value = minTime
        error.value = null
      } catch (err) {
        console.error('Error loading track data:', err)
        error.value = `Failed to load track data: ${err.message}`
      }
    }

    // Initialize Cesium viewer with Clock system
    const initializeCesium = () => {
      console.log('🔧 [3D View] CREATING VIEWER')
      if (!cesiumContainer.value) {
        console.error('[3D View] ❌ FATAL: cesiumContainer.value is null!')
        return
      }
      
      const rect = cesiumContainer.value.getBoundingClientRect()
      console.log('[3D View] Container rect:', { 
        width: rect.width, 
        height: rect.height, 
        size: `${rect.width}x${rect.height}`,
        visible: rect.width > 0 && rect.height > 0
      })
      
      if (!window.Cesium) {
        console.log('[3D View] Cesium not yet available, retrying in 500ms...')
        setTimeout(() => {
          if (!window.Cesium) {
            error.value = 'Cesium library failed to load from CDN. Please check your internet connection and refresh.'
            console.error('[3D View] ❌ Cesium still not loaded after retry')
            return
          }
          console.log('[3D View] Cesium now available, retrying initialization...')
          initializeCesium()
        }, 500)
        return
      }

      const Cesium = window.Cesium

      console.log('[3D View] ✓ Cesium available, initializing viewer', {
        cesiumVersion: Cesium.VERSION,
        containerSize: `${rect.width}x${rect.height}`
      })

      try {
        // Create viewer if not exists
        if (!viewer.value) {
          try {
            // Create basemap provider FIRST, before viewer initialization
            const basemapProvider = createBasemapImageryProvider()
            console.log('[3D View] Basemap provider created:', !!basemapProvider)
            
            console.log('[3D View] About to create Cesium viewer...')
            
            // Use basemap provider if available, otherwise use OSM as fallback to avoid Ion auth
            let imageryProvider = basemapProvider
            if (!imageryProvider) {
              try {
                imageryProvider = new Cesium.UrlTemplateImageryProvider({
                  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  credit: 'Map © OpenStreetMap contributors',
                })
                console.log('[3D View] Using OSM as default imagery provider')
              } catch (osmErr) {
                console.warn('[3D View] Failed to create OSM provider:', osmErr)
              }
            }
            
            viewer.value = new Cesium.Viewer(cesiumContainer.value, {
              imageryProvider: imageryProvider || undefined,
              baseLayerPicker: false,
              geocoder: false,
              homeButton: false,
              infoBox: false,
              sceneModePicker: false,
              selectionIndicator: false,
              timeline: false,
              navigationHelpButton: false,
              animation: false,
              fullscreenButton: false,
              vrButton: false,
            })

            console.log('✅ [3D View] VIEWER CREATED - initializing layers and clock')
            console.log('[3D View] Viewer object:', {
              destroyed: viewer.value.isDestroyed(),
              canvas: !!viewer.value.canvas,
              canvasSize: `${viewer.value.canvas?.width}x${viewer.value.canvas?.height}`,
              imageryLayersCount: viewer.value.imageryLayers?.length || 0,
            })

            // Ensure basemap is present - add it again if needed
            if (!basemapProvider || viewer.value.imageryLayers.length === 0) {
              console.log('[3D View] Basemap missing, adding fallback...')
              viewer.value.imageryLayers.removeAll()
              try {
                const fallbackProvider = new Cesium.UrlTemplateImageryProvider({
                  url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
                  subdomains: ['a', 'b', 'c', 'd'],
                  credit: '© OpenStreetMap contributors © CARTO',
                })
                viewer.value.imageryLayers.addImageryProvider(fallbackProvider)
                console.log('[3D View] Added CartoDB fallback basemap')
              } catch (cartError) {
                console.warn('[3D View] CartoDB fallback failed, trying OSM:', cartError)
                try {
                  const osmProvider = new Cesium.UrlTemplateImageryProvider({
                    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    credit: '© OpenStreetMap contributors',
                  })
                  viewer.value.imageryLayers.addImageryProvider(osmProvider)
                  console.log('[3D View] Added OSM fallback basemap')
                } catch (osmError) {
                  console.error('[3D View] Both CartoDB and OSM failed!', osmError)
                  error.value = 'Failed to load any basemap provider'
                }
              }
            }

            // Apply scene style for initial basemap (black by default)
            applySceneStyle(selectedBasemap.value)

            // Set initial camera view with delay to ensure viewer is fully initialized
            setTimeout(() => {
              if (viewer.value && !viewer.value.isDestroyed()) {
                console.log('[3D View] Setting camera view')
                // lookAt centres camera on ESSA, then release so user can pan freely
                const essaCenter = Cesium.Cartesian3.fromDegrees(17.9289, 59.6519, 0)
                viewer.value.camera.lookAt(
                  essaCenter,
                  new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 120000)
                )
                viewer.value.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
              }
            }, 300)

            console.log('[3D View] Viewer initialized')
          } catch (viewerErr) {
            console.error('[3D View] Error creating Cesium viewer:', viewerErr)
            error.value = 'Failed to initialize 3D viewer: ' + viewerErr.message
            viewer.value = null
            throw viewerErr
          }
        }

        // Setup Clock with time range
        if (globalTimeRange.value.min && globalTimeRange.value.max) {
          const startJulianDate = Cesium.JulianDate.fromDate(new Date(globalTimeRange.value.min * 1000))
          const endJulianDate = Cesium.JulianDate.fromDate(new Date(globalTimeRange.value.max * 1000))
          
          viewer.value.clock.startTime = startJulianDate
          viewer.value.clock.currentTime = startJulianDate
          viewer.value.clock.stopTime = endJulianDate
          viewer.value.clock.multiplier = 1.0  // 1x speed
          viewer.value.clock.shouldAnimate = false  // Don't auto-play
        }

        // Ensure basemap is always present (safeguard for race conditions)
        if (viewer.value.imageryLayers.length === 0) {
          const basemapProvider = createBasemapImageryProvider()
          if (basemapProvider) {
            viewer.value.imageryLayers.addImageryProvider(basemapProvider)
            console.log('[3D View] Basemap added (safety check)')
          }
        }

        // Clear existing entities
        viewer.value.entities.removeAll()
        console.log('[3D View] Initialized with Cesium Clock. Flights:', displayedFlights.value.length)

        // Helper: binary search to find points up to a given time (O(log n) instead of O(n))
        const getVisiblePointsIndex = (points, timeSeconds) => {
          let left = 0, right = points.length
          while (left < right) {
            const mid = Math.floor((left + right) / 2)
            if (points[mid].time <= timeSeconds) {
              left = mid + 1
            } else {
              right = mid
            }
          }
          return left
        }

        // ESSA airport elevation ~42m AMSL — subtract so on-ground tracks sit at Cesium's flat terrain (0m)
        const ESSA_ELEVATION_M = 42
        const TRAIL_SECONDS = 15   // simulated seconds of trail — fast=long, stopped=no trail

        // Pre-compute Cartesian3 arrays once per flight — avoids per-frame object allocation in callbacks
        const cartesianCache = {}
        displayedFlights.value.forEach((flight) => {
          const points = trackData.value[flight.flight_id]
          if (!points || points.length < 2) return
          cartesianCache[flight.flight_id] = points.map(p =>
            Cesium.Cartesian3.fromDegrees(p.lon, p.lat, Math.max(0, p.alt - ESSA_ELEVATION_M))
          )
        })

        displayedFlights.value.forEach((flight) => {
          const points = trackData.value[flight.flight_id]
          if (!points || points.length < 2) return

          const cartesians = cartesianCache[flight.flight_id]
          const cat = CATEGORY_COLORS[getFlightCategory(flight)]
          const colorFull = Cesium.Color.fromBytes(cat.r, cat.g, cat.b, 255)
          const colorDim  = Cesium.Color.fromBytes(cat.r, cat.g, cat.b, 80)

          const getT = () => Cesium.JulianDate.toDate(viewer.value.clock.currentTime).getTime() / 1000

          // Dim tail throttled at 100ms (10fps) — it only grows, jumps are imperceptible
          let lastWallDim = 0, cachedDim = []

          // --- 1. Dim tail: full history from start to current dot position, throttled 100ms ---
          viewer.value.entities.add({
            polyline: {
              positions: new Cesium.CallbackProperty(() => {
                const now = Date.now()
                if (now - lastWallDim < 100) return cachedDim
                lastWallDim = now
                const t = getT()
                const n = getVisiblePointsIndex(points, t)
                if (n < 1) { cachedDim = []; return cachedDim }
                const history = cartesians.slice(0, n)
                // Extend to current dot position so tail reaches the dot
                if (n < points.length) {
                  const p0 = points[n - 1], p1 = points[n]
                  if (p0.time && p1.time && p1.time !== p0.time) {
                    const frac = Math.min(1, Math.max(0, (t - p0.time) / (p1.time - p0.time)))
                    cachedDim = [...history, Cesium.Cartesian3.lerp(cartesians[n - 1], cartesians[n], frac, new Cesium.Cartesian3())]
                    return cachedDim
                  }
                }
                cachedDim = history.length >= 2 ? history : []
                return cachedDim
              }, false),
              width: 1.5,
              material: new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty(() => {
                const t = getT()
                if (t <= lastPointTime) return colorDim
                const fd = fadeDuration.value
                if (fd === null) return colorDim
                const elapsed = t - lastPointTime
                if (elapsed >= fd) return Cesium.Color.TRANSPARENT
                const alpha = Math.round(80 * (1 - elapsed / fd))
                return Cesium.Color.fromBytes(cat.r, cat.g, cat.b, alpha)
              }, false)),
              clampToGround: false,
            },
          })

          // --- 2. Time-based trail: last TRAIL_SECONDS of movement, every frame ---
          // Fast aircraft = long trail, stationary = no trail (proportional to speed).
          // Both ends interpolated. Handles case where entire window falls inside one
          // inter-waypoint gap (common on long straight RDP-simplified ground segments).
          viewer.value.entities.add({
            polyline: {
              positions: new Cesium.CallbackProperty(() => {
                const t = getT()
                const n = getVisiblePointsIndex(points, t)
                if (n < 1) return []

                const windowStartTime = t - TRAIL_SECONDS
                const rootIdx = getVisiblePointsIndex(points, windowStartTime)

                // Interpolate tail root at exact window start time
                let tailRoot = null
                if (rootIdx > 0) {
                  const pr0 = points[rootIdx - 1]
                  const pr1 = points[rootIdx] // may be undefined if rootIdx >= points.length
                  if (pr1 && pr1.time !== pr0.time) {
                    const frac = Math.min(1, Math.max(0, (windowStartTime - pr0.time) / (pr1.time - pr0.time)))
                    tailRoot = Cesium.Cartesian3.lerp(cartesians[rootIdx - 1], cartesians[rootIdx], frac, new Cesium.Cartesian3())
                  } else {
                    tailRoot = cartesians[rootIdx - 1]
                  }
                }

                // Waypoints strictly inside the window (may be empty if window spans one gap)
                const anchors = rootIdx < n ? cartesians.slice(rootIdx, n) : []

                const result = []
                if (tailRoot) result.push(tailRoot)
                result.push(...anchors)

                // Interpolate tip at current time (front of trail = same position as dot)
                if (n < points.length) {
                  const p0 = points[n - 1], p1 = points[n]
                  if (p0.time && p1.time && p1.time !== p0.time) {
                    const frac = Math.min(1, Math.max(0, (t - p0.time) / (p1.time - p0.time)))
                    result.push(Cesium.Cartesian3.lerp(cartesians[n - 1], cartesians[n], frac, new Cesium.Cartesian3()))
                  } else {
                    result.push(cartesians[n - 1])
                  }
                } else {
                  result.push(cartesians[n - 1])
                }

                return result.length >= 2 ? result : []
              }, false),
              width: 3,
              material: colorFull,
              clampToGround: false,
            },
          })

          // --- 3. Leading dot + label: interpolated between waypoints for smooth gliding ---
          // Runs every frame (cheap: one lerp + one Cartesian3 allocation per flight)
          const lastPointTime = points[points.length - 1].time
          const dotVisible = new Cesium.CallbackProperty(() => getT() <= lastPointTime, false)
          viewer.value.entities.add({
            position: new Cesium.CallbackProperty(() => {
              const t = getT()
              const n = getVisiblePointsIndex(points, t)
              if (n < 1) return undefined
              if (n >= points.length) return cartesians[cartesians.length - 1]
              // Interpolate between last revealed point and next upcoming point
              const p0 = points[n - 1], p1 = points[n]
              if (!p0.time || !p1.time || p1.time === p0.time) return cartesians[n - 1]
              const frac = Math.min(1, Math.max(0, (t - p0.time) / (p1.time - p0.time)))
              return Cesium.Cartesian3.lerp(cartesians[n - 1], cartesians[n], frac, new Cesium.Cartesian3())
            }, false),
            point: {
              pixelSize: 10,
              color: colorFull,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              show: dotVisible,
            },
            label: {
              text: flight.callsign || flight.flight_id,
              font: '11px sans-serif',
              fillColor: colorFull,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(14, -18),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              showBackground: false,
              show: dotVisible,
            },
          })

          console.log('[3D View] Added flight track:', flight.callsign, '(' + points.length + ' points)')
        })
      } catch (err) {
        console.error('[3D View] CRITICAL ERROR initializing Cesium:', err)
        console.error('[3D View] Error stack:', err.stack)
        error.value = `Failed to initialize 3D viewer: ${err.message}`
      }

      console.log('✅ [3D View] VIEWER READY - initialization complete')
    }

    // Handle time slider change
    const onTimeSliderChange = (event) => {
      const newTime = parseInt(event.target.value)
      currentTime.value = newTime
      
      // Update Cesium Clock
      if (viewer.value && viewer.value.clock) {
        const Cesium = getCesium()
        const julianDate = Cesium.JulianDate.fromDate(new Date(newTime * 1000))
        viewer.value.clock.currentTime = julianDate
      }
      
      // Stop animation when user drags slider
      stopAnimation()
    }

    // Start animation
    const startAnimation = () => {
      if (!viewer.value || !viewer.value.clock) return
      
      isPlaying.value = true
      viewer.value.clock.shouldAnimate = true
      console.log('[3D View] Clock animation started')
    }

    // Stop animation
    const stopAnimation = () => {
      if (viewer.value && viewer.value.clock) {
        viewer.value.clock.shouldAnimate = false
      }
      isPlaying.value = false
      console.log('[3D View] Clock animation stopped')
    }

    // Set playback speed
    const setPlaybackSpeed = (speed) => {
      playbackSpeed.value = speed
      if (viewer.value && viewer.value.clock) {
        viewer.value.clock.multiplier = speed
        console.log('[3D View] Playback speed set to:', speed + 'x')
      }
    }

    // Watch for clock time changes and sync with Vue state
    const updateCurrentTimeFromClock = () => {
      if (viewer.value && viewer.value.clock) {
        const Cesium = getCesium()
        const clockDate = Cesium.JulianDate.toDate(viewer.value.clock.currentTime)
        const timeSeconds = Math.floor(clockDate.getTime() / 1000)
        currentTime.value = timeSeconds
        
        // Check if animation has finished
        if (Cesium.JulianDate.compare(viewer.value.clock.currentTime, viewer.value.clock.stopTime) >= 0) {
          stopAnimation()
        }
      }
      
      // Continue polling clock state
      if (isPlaying.value) {
        requestAnimationFrame(updateCurrentTimeFromClock)
      }
    }

    // Watch for new merged flights with tracks
    watch(
      () => props.mergedFlights,
      (newFlights) => {
        if (newFlights && newFlights.length > 0) {
          console.log('[3D View] mergedFlights arrived:', newFlights.length)
          loadTrackData()
        }
      }
    )

    // Initialize only when clicking 3D tab (if viewer doesn't exist)
    watch(
      () => props.activeTab,
      async (newTab) => {
        if (newTab === '3D View' && !viewer.value && displayedFlights.value.length > 0) {
          console.log('📍 [3D View] TAB CLICKED - waiting for DOM render')
          // Wait for DOM to layout the container before creating Cesium viewer
          await nextTick()
          // Wait one more frame for flexbox to actually size the container
          await new Promise(resolve => requestAnimationFrame(resolve))
          console.log('📍 [3D View] DOM rendered - initializing Cesium')
          initializeCesium()
        }
      }
    )

    // Watch displayedFlights — reload track data and re-render entities when selection changes
    watch(
      () => displayedFlights.value,
      (newFlights) => {
        loadTrackData()
        if (viewer.value && !viewer.value.isDestroyed()) {
          initializeCesium()
        }
      }
    )

    // Initialize viewer on mount
    onMounted(() => {
      console.log('[3D View] Component mounted')
    })

    // Cleanup on unmount
    onUnmounted(() => {
      stopAnimation()
      if (viewer.value && !viewer.value.isDestroyed()) {
        viewer.value.destroy()
        viewer.value = null
      }
    })

    // Start polling clock time when animation starts
    watch(
      () => isPlaying.value,
      (newVal) => {
        if (newVal) {
          updateCurrentTimeFromClock()
        }
      }
    )

    // Expose method to destroy viewer from parent
    const destroyViewer = () => {
      if (viewer.value && !viewer.value.isDestroyed()) {
        console.log('☠️  [3D View] DESTROYING VIEWER - load data called')
        stopAnimation()
        viewer.value.destroy()
        viewer.value = null
        console.log('☠️  [3D View] VIEWER DESTROYED')
      }
    }

    return {
      cesiumContainer,
      error,
      currentTime,
      globalTimeRange,
      displayedFlights,
      filteredFlightCount,
      selectedBasemap,
      isPlaying,
      playbackSpeed,
      showCTR,
      showR16,
      fadeDuration,
      formatTime,
      getFlightColor,
      onTimeSliderChange,
      changeBasemap,
      startAnimation,
      stopAnimation,
      setPlaybackSpeed,
      toggleCTR,
      toggleR16,
      destroyViewer,
      dataLoading: computed(() => props.dataLoading),
    }
  }
}
</script>

<style scoped>
.flights-view-3d {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  min-height: 100vh;
  position: relative;
}

.view-3d-container {
  display: flex;
  height: 100%;
  width: 100%;
  gap: 1rem;
  padding: 1rem;
  background: #f5f5f5;
  box-sizing: border-box;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.controls-panel {
  width: 280px;
  flex-shrink: 0;
  background: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.cesium-container {
  flex: 1;
  min-width: 0;
  min-height: 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  background: #1a1a1a;
  height: 100%;
  width: 100%;
}

.control-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-section label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #333;
}

.time-control {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.time-slider {
  width: 100%;
  cursor: pointer;
  height: 5px;
}

.time-display {
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
  text-align: center;
  font-family: monospace;
}

.time-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.play-btn,
.stop-btn,
.speed-btn {
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: white;
}

.play-btn,
.stop-btn {
  flex: 1;
}

.play-btn {
  background: #4CAF50;
}

.play-btn:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.play-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.stop-btn {
  background: #f44336;
}

.stop-btn:hover {
  background: #da190b;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.speed-buttons {
  display: flex;
  gap: 0.3rem;
  margin-left: 0.5rem;
}

.speed-btn {
  background: #2196F3;
  padding: 0.4rem 0.6rem;
  font-size: 0.75rem;
  min-width: 2.5rem;
}

.speed-btn:hover {
  background: #0b7dda;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.speed-btn.active {
  background: #0d47a1;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
  transform: none;
}

.volume-options {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.volume-option {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0;
  cursor: pointer;
  font-size: 0.8rem;
  color: #333;
}

.volume-option input[type="checkbox"] {
  cursor: pointer;
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

.basemap-options {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.basemap-option {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0;
  cursor: pointer;
  font-size: 0.8rem;
  color: #333;
}

.basemap-option input[type="radio"] {
  cursor: pointer;
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

.flight-legend {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem;
  background: #f9f9f9;
  border-radius: 4px;
  font-size: 0.85rem;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-label {
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-box {
  padding: 0.75rem;
  background: #e3f2fd;
  border-left: 3px solid #2196f3;
  border-radius: 4px;
}

.info-box p {
  margin: 0;
  font-size: 0.85rem;
  color: #1565c0;
  line-height: 1.4;
}

.info-truncated {
  color: #d32f2f !important;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  z-index: 100;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f0f0f0;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-overlay p {
  color: #666;
  font-weight: 500;
}

.error-message {
  padding: 1rem;
  background: #ffebee;
  color: #c62828;
  border-radius: 8px;
  margin: 1rem;
  border-left: 4px solid #c62828;
  font-weight: 500;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-size: 1rem;
}
</style>
