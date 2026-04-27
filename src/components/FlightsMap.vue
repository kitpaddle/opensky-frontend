<template>
  <div class="flights-map-container">
    <div id="map" class="map-view"></div>
    
    <!-- Hover tooltip -->
    <div v-if="tooltipInfo" class="hover-tooltip" :style="{
      left: tooltipInfo.x + 10 + 'px',
      top: tooltipInfo.y - 35 + 'px'
    }">
      <div class="tooltip-callsign">{{ tooltipInfo.callsign }}</div>
    </div>
    
    <div v-if="!mergedFlights || mergedFlights.length === 0" class="map-status">
      <div class="status-content">
        <span class="spinner"></span>
        <span>Preparing track data...</span>
      </div>
    </div>

    <div v-else class="map-info">
      <div class="info-badge">
        {{ renderedTracks }} / {{ totalTracks }} tracks
      </div>
    </div>

    <!-- Airspace layer control panel -->
    <AirspaceLayerPanel @layer-change="onLayerChange" @basemap-change="onBasemapChange" />
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import OSM from 'ol/source/OSM'
import XYZ from 'ol/source/XYZ'
import Feature from 'ol/Feature'
import LineString from 'ol/geom/LineString'
import { fromLonLat } from 'ol/proj'
import { Stroke, Style, Fill, Circle as CircleStyle, Text } from 'ol/style'
import GeoJSON from 'ol/format/GeoJSON'
import AirspaceLayerPanel from './AirspaceLayerPanel.vue'
import { useAirspaceData } from '../composables/useAirspaceData.js'

export default {
  name: 'FlightsMap',
  components: {
    AirspaceLayerPanel,
  },
  props: {
    date: String,
    mergedFlights: Array,
    filteredFlightIds: Array,
  },
  setup(props) {
    const { airspaceData } = useAirspaceData()

    let map = null
    let vectorSource = null
    const mapReady = ref(false)
    const totalTracks = ref(0)
    const renderedTracks = ref(0)
    const features = ref([])
    
    // Hover state
    const hoveredFeatureId = ref(null)
    const tooltipInfo = ref(null)
    let hoveredFeature = null
    let originalHoveredStyle = null
    
    // Airspace layers management
    const airspaceLayers = ref({})
    const basemapLayer = ref(null)
    const geoJsonFormat = new GeoJSON()
    const airspaceLayerStyle = new Style({
      stroke: new Stroke({
        color: 'rgba(255, 50, 50, 0.8)',
        width: 1.5,
        lineDash: [5, 5],
      }),
      fill: new Fill({
        color: 'rgba(255, 50, 50, 0.02)',
      }),
    })

    const r16LayerStyle = new Style({
      stroke: new Stroke({
        color: 'rgba(255, 140, 0, 0.85)',
        width: 1.5,
        lineDash: [8, 4],
      }),
      fill: new Fill({
        color: 'rgba(255, 140, 0, 0.04)',
      }),
    })

    const tmaLayerStyle = new Style({
      stroke: new Stroke({
        color: 'rgba(100, 180, 255, 0.85)',
        width: 1.5,
        lineDash: [10, 5],
      }),
      fill: new Fill({
        color: 'rgba(100, 180, 255, 0.03)',
      }),
    })

    const makeProcedureStyleFn = (pointColor) => (feature) => {
      const name = feature.get('name') || ''
      return new Style({
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({ color: pointColor }),
          stroke: new Stroke({ color: 'rgba(0,0,0,0.6)', width: 1 }),
        }),
        text: new Text({
          text: name,
          offsetY: -12,
          font: 'bold 10px sans-serif',
          fill: new Fill({ color: pointColor }),
          stroke: new Stroke({ color: 'rgba(0,0,0,0.8)', width: 2 }),
        }),
      })
    }

    const sidStyleFn  = makeProcedureStyleFn('rgba(0, 210, 210, 1)')
    const starStyleFn = makeProcedureStyleFn('rgba(255, 170, 0, 1)')

    // Create basemap tile layers
    const createBasemapLayer = (type) => {
      if (type === 'none') {
        return null  // No basemap, just dark grey background
      } else if (type === 'black') {
        // Black basemap using CartoDB
        return new TileLayer({
          source: new XYZ({
            url: 'https://cartodb-basemaps-{a-d}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
            attributions: '© OpenStreetMap contributors © CARTO',
          }),
          preload: 4,
          updateWhileAnimating: true,
          updateWhileInteracting: true,
        })
      } else if (type === 'lightgrey') {
        // Light grey basemap using CartoDB
        return new TileLayer({
          source: new XYZ({
            url: 'https://cartodb-basemaps-{a-d}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
            attributions: '© OpenStreetMap contributors © CARTO',
          }),
          preload: 4,
          updateWhileAnimating: true,
          updateWhileInteracting: true,
        })
      }
    }

    // Helper to create fresh style for each feature (avoid caching issues with reused styles)
    const createStyle = (flight) => {
      // Determine color based on flight category (matching flight list filters)
      // NOTE: API returns boolean fields as 0/1 integers, so use truthy checks instead of === true
      let color
      if (flight.is_inctr) {
        // CTR flights - purple
        color = 'rgba(155, 89, 182, 0.7)'
      } else if (flight.is_essa_dep) {
        // ESSA departures - blue
        color = 'rgba(52, 152, 219, 0.7)'
      } else if (flight.is_essa_arr) {
        // ESSA arrivals - yellow
        color = 'rgba(241, 196, 15, 0.7)'
      } else if (flight.is_essa_vehicle) {
        // Vehicles - green
        color = 'rgba(46, 204, 113, 0.7)'
      } else {
        // Other/overflight - grey
        color = 'rgba(149, 165, 166, 0.7)'
      }
      
      return new Style({
        stroke: new Stroke({
          color: color,
          width: 1.5,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      })
    }

    // Create all tracks as features ONCE and add them ALL to vectorSource
    const createAllFeatures = () => {
      if (!vectorSource || !props.mergedFlights) {
        return
      }

      // ALWAYS clear old features before loading new date
      // This prevents old tracks from persisting when switching dates
      vectorSource.clear()
      features.value = []
      totalTracks.value = 0
      
      // Process each track and create features
      props.mergedFlights.forEach((flight) => {
        totalTracks.value++

        // Track coordinates are already in [lon, lat] format from WebWorker
        if (!flight.coordinates || flight.coordinates.length < 2) {
          return
        }

        // Determine type
        const isCTRFlight = flight.is_essa_dep || flight.is_essa_arr

        // Transform coordinates from WGS84 [lon, lat] to Web Mercator for OpenLayers
        const transformedCoords = flight.coordinates.map(coord => fromLonLat(coord))

        // Create LineString feature with transformed coordinates
        const lineString = new LineString(transformedCoords)
        const feature = new Feature({
          geometry: lineString,
          flight_id: flight.flight_id,
          callsign: flight.callsign,
          airline: flight.airline,
          start_time: flight.start_time,
          type: isCTRFlight ? (flight.is_essa_dep ? 'departure' : 'arrival') : 'overflight',
          is_essa_dep: flight.is_essa_dep,
          is_essa_arr: flight.is_essa_arr,
        })

        // Create unique style for this feature based on flight type
        feature.setStyle(createStyle(flight))
        
        // ADD ALL FEATURES TO SOURCE UPFRONT
        vectorSource.addFeature(feature)
        features.value.push(feature)
      })
      
      // Now that all features exist, apply the initial filter
      // If filteredFlightIds is empty/undefined, show everything
      // Use nextTick to ensure map has rendered the features before updating visibility
      nextTick(() => {
        updateVisibleTracks()
      })
    }

    // Update which tracks are visible - add/remove features to minimize WebGL state disruption
    const updateVisibleTracks = () => {
      if (!vectorSource || !features.value || features.value.length === 0) return
      
      // IMPORTANT: Distinguish between "no filter" and "empty filter"
      // - undefined/null = show all (no filter applied)
      // - [] = show nothing (all flights deselected)
      // - [id, id, ...] = show only these flights
      const hasFilterProvided = props.filteredFlightIds !== undefined && props.filteredFlightIds !== null
      const isFilterEmpty = hasFilterProvided && props.filteredFlightIds.length === 0
      const filteredIds = hasFilterProvided ? new Set(props.filteredFlightIds) : null
      
      console.log('[FlightsMap] updateVisibleTracks:', {
        hasFilterProvided,
        isFilterEmpty,
        filteredCount: filteredIds?.size ?? 0,
        totalFeatures: features.value.length,
      })
      
      let currentFeatures = vectorSource.getFeatures()
      
      // Remove features that shouldn't be visible
      currentFeatures.forEach(feature => {
        const fid = feature.get('flight_id')
        // Show feature if:
        // - No filter provided (show all), OR
        // - Filter provided and flight is in the filter list
        // BUT if filter is empty, remove everything
        const shouldKeep = !hasFilterProvided || (filteredIds && filteredIds.has(fid))
        if (!shouldKeep) {
          vectorSource.removeFeature(feature)
        }
      })
      
      // Recalculate current state after removals
      currentFeatures = vectorSource.getFeatures()
      const currentIds = new Set(currentFeatures.map(f => f.get('flight_id')))
      
      // Add features that should be visible but aren't
      if (hasFilterProvided && filteredIds && filteredIds.size > 0) {
        filteredIds.forEach(fid => {
          if (!currentIds.has(fid)) {
            const feature = features.value.find(f => f.get('flight_id') === fid)
            if (feature) {
              vectorSource.addFeature(feature)
            }
          }
        })
      } else {
        features.value.forEach(feature => {
          if (!currentIds.has(feature.get('flight_id'))) {
            vectorSource.addFeature(feature)
          }
        })
      }
      
      renderedTracks.value = vectorSource.getFeatures().length
      console.log('[FlightsMap] Update complete, rendered:', renderedTracks.value)
    }

    // Handle airspace layer visibility change
    const onLayerChange = async (event) => {
      const { type, airport, zone, data } = event
      console.log('[FlightsMap] Layer change event:', { type, airport, zone, data })
      
      if (type === 'ctr' && airport === 'essa') {
        // Handle ESSA CTR zones - data prefetched, just filter by zone
        try {
          if (!airspaceData.value.essaCtr) {
            console.log('[FlightsMap] ESSA CTR data not yet available')
            return
          }
          
          // Create the layer if it doesn't exist yet
          if (!airspaceLayers.value.essaCTR) {
            airspaceLayers.value.essaCTR = new VectorLayer({
              source: new VectorSource(),
              style: airspaceLayerStyle,
              zIndex: 5,
            })
            map.addLayer(airspaceLayers.value.essaCTR)
            console.log('[FlightsMap] Created ESSA CTR layer')
          }
          
          // Determine which zones should be visible
          const visibleZones = []
          if (data.west) visibleZones.push('Sector West')
          if (data.east) visibleZones.push('Sector East')
          if (data.full) visibleZones.push('ARLANDA CTR')
          
          console.log('[FlightsMap] Visible zones for ESSA:', visibleZones)
          
          // Filter features based on selected zones
          const featuresToShow = airspaceData.value.essaCtr.filter(feature => 
            visibleZones.includes(feature.properties.NAMEOFAREA)
          )
          
          console.log('[FlightsMap] Filtered to', featuresToShow.length, 'features to show')
          
          // Clear existing features and add filtered ones
          const source = airspaceLayers.value.essaCTR.getSource()
          source.clear()
          
          if (featuresToShow.length > 0) {
            const features = geoJsonFormat.readFeatures(
              { type: 'FeatureCollection', features: featuresToShow },
              {
                featureProjection: 'EPSG:3857',
                dataProjection: 'EPSG:4326',
              }
            )
            features.forEach(f => source.addFeature(f))
            console.log('[FlightsMap] Added', features.length, 'features to ESSA CTR layer')
            airspaceLayers.value.essaCTR.setVisible(true)
          } else {
            airspaceLayers.value.essaCTR.setVisible(false)
            console.log('[FlightsMap] No zones selected, hiding ESSA CTR layer')
          }
        } catch (error) {
          console.error('[FlightsMap] Error handling ESSA CTR:', error)
        }
      } else if (type === 'ctr' && airport === 'essb') {
        // Handle ESSB CTR - data prefetched, just toggle visibility
        try {
          if (!airspaceData.value.essbCtr) {
            console.log('[FlightsMap] ESSB CTR data not yet available')
            return
          }
          
          // Create the layer if it doesn't exist yet
          if (!airspaceLayers.value.essbCTR) {
            const features = geoJsonFormat.readFeatures(
              { type: 'FeatureCollection', features: airspaceData.value.essbCtr },
              {
                featureProjection: 'EPSG:3857',
                dataProjection: 'EPSG:4326',
              }
            )
            
            const source = new VectorSource()
            features.forEach(f => source.addFeature(f))
            
            airspaceLayers.value.essbCTR = new VectorLayer({
              source: source,
              style: airspaceLayerStyle,
              zIndex: 5,
            })
            
            map.addLayer(airspaceLayers.value.essbCTR)
            console.log('[FlightsMap] Created ESSB CTR layer with', features.length, 'features')
          }
          
          // Toggle visibility
          airspaceLayers.value.essbCTR.setVisible(data.visible)
          console.log('[FlightsMap] ESSB CTR visibility:', data.visible)
        } catch (error) {
          console.error('[FlightsMap] Error handling ESSB CTR:', error)
        }
      } else if (type === 'ctr' && airport === 'escm') {
        // Handle ESCM CTR - data prefetched, just toggle visibility
        try {
          if (!airspaceData.value.escmCtr) {
            console.log('[FlightsMap] ESCM CTR data not yet available')
            return
          }

          // Create the layer if it doesn't exist yet
          if (!airspaceLayers.value.escmCTR) {
            const features = geoJsonFormat.readFeatures(
              { type: 'FeatureCollection', features: airspaceData.value.escmCtr },
              {
                featureProjection: 'EPSG:3857',
                dataProjection: 'EPSG:4326',
              }
            )

            const source = new VectorSource()
            features.forEach(f => source.addFeature(f))

            airspaceLayers.value.escmCTR = new VectorLayer({
              source: source,
              style: airspaceLayerStyle,
              zIndex: 5,
            })

            map.addLayer(airspaceLayers.value.escmCTR)
            console.log('[FlightsMap] Created ESCM CTR layer with', features.length, 'features')
          }

          // Toggle visibility
          airspaceLayers.value.escmCTR.setVisible(data.visible)
          console.log('[FlightsMap] ESCM CTR visibility:', data.visible)
        } catch (error) {
          console.error('[FlightsMap] Error handling ESCM CTR:', error)
        }
      } else if (type === 'tma') {
        try {
          if (!airspaceLayers.value.tma) {
            const features = geoJsonFormat.readFeatures(
              { type: 'FeatureCollection', features: airspaceData.value.tma },
              { featureProjection: 'EPSG:3857', dataProjection: 'EPSG:4326' }
            )
            const source = new VectorSource()
            features.forEach(f => source.addFeature(f))
            airspaceLayers.value.tma = new VectorLayer({ source, style: tmaLayerStyle, zIndex: 4 })
            map.addLayer(airspaceLayers.value.tma)
          }
          airspaceLayers.value.tma.setVisible(data.visible)
        } catch (error) {
          console.error('[FlightsMap] Error handling TMA:', error)
        }
      } else if (type === 'r16') {
        try {
          if (!airspaceData.value.r16 || airspaceData.value.r16.length === 0) {
            console.log('[FlightsMap] R16 data not yet available')
            return
          }
          if (!airspaceLayers.value.r16) {
            const features = geoJsonFormat.readFeatures(
              { type: 'FeatureCollection', features: airspaceData.value.r16 },
              { featureProjection: 'EPSG:3857', dataProjection: 'EPSG:4326' }
            )
            const source = new VectorSource()
            features.forEach(f => source.addFeature(f))
            airspaceLayers.value.r16 = new VectorLayer({ source, style: r16LayerStyle, zIndex: 5 })
            map.addLayer(airspaceLayers.value.r16)
            console.log('[FlightsMap] Created R16 layer with', features.length, 'features')
          }
          airspaceLayers.value.r16.setVisible(data.visible)
        } catch (error) {
          console.error('[FlightsMap] Error handling R16:', error)
        }
      } else if (type === 'sid') {
        try {
          if (!airspaceLayers.value.sid) {
            const features = geoJsonFormat.readFeatures(
              { type: 'FeatureCollection', features: airspaceData.value.essaSid },
              { featureProjection: 'EPSG:3857', dataProjection: 'EPSG:4326' }
            )
            const source = new VectorSource()
            features.forEach(f => source.addFeature(f))
            airspaceLayers.value.sid = new VectorLayer({ source, style: sidStyleFn, zIndex: 6 })
            map.addLayer(airspaceLayers.value.sid)
            console.log('[FlightsMap] Created SID layer with', features.length, 'features')
          }
          airspaceLayers.value.sid.setVisible(data.visible)
        } catch (error) {
          console.error('[FlightsMap] Error handling SID:', error)
        }
      } else if (type === 'star') {
        try {
          if (!airspaceLayers.value.star) {
            const features = geoJsonFormat.readFeatures(
              { type: 'FeatureCollection', features: airspaceData.value.essaStar },
              { featureProjection: 'EPSG:3857', dataProjection: 'EPSG:4326' }
            )
            const source = new VectorSource()
            features.forEach(f => source.addFeature(f))
            airspaceLayers.value.star = new VectorLayer({ source, style: starStyleFn, zIndex: 6 })
            map.addLayer(airspaceLayers.value.star)
            console.log('[FlightsMap] Created STAR layer with', features.length, 'features')
          }
          airspaceLayers.value.star.setVisible(data.visible)
        } catch (error) {
          console.error('[FlightsMap] Error handling STAR:', error)
        }
      }
    }

    const onBasemapChange = (event) => {
      const { basemap } = event
      console.log('[FlightsMap] Basemap change event:', basemap)
      
      if (!map) return
      
      // Remove old basemap layer if it exists
      if (basemapLayer.value) {
        map.removeLayer(basemapLayer.value)
      }
      
      // Create and add new basemap layer (if not 'none')
      basemapLayer.value = createBasemapLayer(basemap)
      if (basemapLayer.value) {
        map.getLayers().insertAt(0, basemapLayer.value)
      }
      console.log('[FlightsMap] Basemap changed to:', basemap)
    }

    const initMap = async () => {
      await nextTick()
      
      vectorSource = new VectorSource({ wrapX: false })
      const vectorLayer = new VectorLayer({
        source: vectorSource,
        zIndex: 10,
        updateWhileAnimating: true,
        updateWhileInteracting: true,
        renderMode: 'canvas',  // Use Canvas instead of WebGL for predictable blend state
      })

      // Create initial basemap (black)
      basemapLayer.value = createBasemapLayer('black')

      const layers = basemapLayer.value ? [basemapLayer.value, vectorLayer] : [vectorLayer]
      map = new Map({
        target: 'map',
        layers: layers,  // Basemap (if any), then tracks on top
        view: new View({
          center: fromLonLat([17.9289, 59.6519]),  // ESSA - Stockholm Arlanda
          zoom: 8,
          // Enable smooth animations
          constrainResolution: false,
        }),
        // Performance options
        pixelRatio: window.devicePixelRatio || 1,
      })

      map.updateSize()
      mapReady.value = true
      console.log('[FlightsMap] Map initialized with Canvas rendering')

      // Add hover listener - only detect topmost feature at pixel
      map.on('pointermove', (e) => {
        const pixel = e.pixel
        let topFeature = null
        
        // forEachFeatureAtPixel iterates from top to bottom
        // Return true immediately after finding first (topmost) feature
        map.forEachFeatureAtPixel(pixel, (feature) => {
          topFeature = feature
          return true  // Stop iteration - we only want the topmost feature
        })

        if (topFeature) {
          const featureId = topFeature.get('flight_id')
          
          // If hovering over a different feature, update hover state
          if (hoveredFeatureId.value !== featureId) {
            // Restore previous hovered feature's original style
            if (hoveredFeature && originalHoveredStyle) {
              hoveredFeature.setStyle(originalHoveredStyle)
            }
            
            // Store new hovered feature and its original style
            hoveredFeature = topFeature
            hoveredFeatureId.value = featureId
            originalHoveredStyle = topFeature.getStyle()
            
            // Apply highlight style (thicker line)
            const currentStyle = topFeature.getStyle()
            const currentStroke = currentStyle.getStroke()
            topFeature.setStyle(new Style({
              stroke: new Stroke({
                color: currentStroke.getColor(),
                width: 3.5,  // Thicker than original 1.5px
                lineCap: 'round',
                lineJoin: 'round',
              }),
            }))
            
            // Show tooltip with flight info
            tooltipInfo.value = {
              callsign: topFeature.get('callsign') || 'Unknown',
              x: pixel[0],
              y: pixel[1],
            }
          }
        } else if (hoveredFeatureId.value !== null) {
          // No feature at this pixel - restore previous hovered feature and clear tooltip
          if (hoveredFeature && originalHoveredStyle) {
            hoveredFeature.setStyle(originalHoveredStyle)
          }
          hoveredFeatureId.value = null
          hoveredFeature = null
          originalHoveredStyle = null
          tooltipInfo.value = null
        }
      })

      // Clear hover when mouse leaves map
      map.getViewport().addEventListener('pointerleave', () => {
        if (hoveredFeature && originalHoveredStyle) {
          hoveredFeature.setStyle(originalHoveredStyle)
        }
        hoveredFeatureId.value = null
        hoveredFeature = null
        originalHoveredStyle = null
        tooltipInfo.value = null
      })

      // Create all features when tracks arrive
      if (props.mergedFlights && props.mergedFlights.length > 0) {
        createAllFeatures()
      }
    }

    // Watch for new mergedFlights - create features once
    watch(() => props.mergedFlights, (newFlights) => {
      if (mapReady.value && newFlights && newFlights.length > 0) {
        createAllFeatures()
      }
    }, { deep: false })


    // Watch for filter changes - instantly update visibility (no re-render, just filtering features)
    // Use { deep: true } to catch both reference AND content changes for reliability
    watch(() => props.filteredFlightIds, (newFilteredIds) => {
      console.log('[FlightsMap] watched filteredFlightIds changed:', {
        newLength: newFilteredIds?.length,
        newIds: newFilteredIds?.slice(0, 3), // Log first 3 for debugging
        mapReady: mapReady.value,
        featuresReady: features.value.length > 0,
      })
      if (mapReady.value && features.value.length > 0) {
        updateVisibleTracks()
      }
    }, { deep: true, immediate: false })

    onMounted(() => {
      initMap()
    })

    onUnmounted(() => {
      if (map) map.dispose()
    })

    return {
      mapReady,
      totalTracks,
      renderedTracks,
      tooltipInfo,
      onLayerChange,
      onBasemapChange,
    }
  },
}
</script>

<style scoped>
.flights-map-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #2a2a2a;  /* Dark grey background when no basemap */
  background: #f0f0f0;
}

.map-view {
  width: 100%;
  height: 100%;
  background: #1a1a1a;  /* Dark background for tracks to stand out */
}

.map-status {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.status-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid #f0f0f0;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.map-info {
  position: absolute;
  bottom: 35px;
  right: 10px;
  z-index: 100;
}

.info-badge {
  background: white;
  padding: 0.25rem 0.4rem;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 0.65rem;
  color: #555;
  font-weight: 500;
  white-space: nowrap;
}

.hover-tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 0.6rem 0.8rem;
  border-radius: 4px;
  font-size: 0.75rem;
  pointer-events: none;
  z-index: 500;
  white-space: nowrap;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.tooltip-callsign {
  font-weight: 600;
  margin-bottom: 0.3rem;
  letter-spacing: 0.5px;
}

.tooltip-time {
  font-size: 0.7rem;
  opacity: 0.85;
}
</style>
