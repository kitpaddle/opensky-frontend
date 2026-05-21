/**
 * Shared LFV airspace data composable.
 * Module-level state — fetched once, shared across all components (2D map, 3D map, etc.)
 * Add new layers here as needed; consumers just read from `airspaceData`.
 */
import { ref } from 'vue'
import { GeoserverClient } from '../utils/geoserverClient.js'
import essaProcedures from '../data/essa_procedures.json'
import essaTma from '../data/essa_tma.json'

// Shared state at module scope — survives component mount/unmount cycles
// Static data split at module load — no async fetch needed
const SID_FEATURES  = essaProcedures.features.filter(f => f.properties.procedure_type === 'SID')
const STAR_FEATURES = essaProcedures.features.filter(f => f.properties.procedure_type === 'STAR')
const TMA_FEATURES  = essaTma.features

const airspaceData = ref({
  essaCtr: null,   // GeoJSON features[]
  essbCtr: null,
  escmCtr: null,
  r16: null,
  essaSid: SID_FEATURES,
  essaStar: STAR_FEATURES,
  tma: TMA_FEATURES,
  essaVfrPoints: null,  // combined VFRH + ECTR features[]
})

// In-flight fetch promises — prevent duplicate concurrent requests for the same key
const pending = {}

const fetchOnce = async (key, fetchFn) => {
  if (airspaceData.value[key] !== null) return        // already in cache
  if (pending[key]) return pending[key]               // fetch already in progress

  pending[key] = fetchFn()
    .then(data => { airspaceData.value[key] = data.features || [] })
    .catch(e => {
      console.error(`[AirspaceData] Failed to fetch ${key}:`, e)
      airspaceData.value[key] = []                    // mark as attempted so we don't retry forever
    })
    .finally(() => { delete pending[key] })

  return pending[key]
}

export function useAirspaceData() {
  const fetchEssaCtr = () => fetchOnce('essaCtr', () => GeoserverClient.fetchCTR('ESSA'))
  const fetchEssbCtr = () => fetchOnce('essbCtr', () => GeoserverClient.fetchCTR('ESSB'))
  const fetchEscmCtr = () => fetchOnce('escmCtr', () => GeoserverClient.fetchCTR('ESCM'))
  const fetchR16     = () => fetchOnce('r16',     () => GeoserverClient.fetchR16())

  // SID/STAR are static — no fetch needed, already in airspaceData at init

  const fetchEssaVfrPoints = async () => {
    if (airspaceData.value.essaVfrPoints !== null) return
    if (pending['essaVfrPoints']) return pending['essaVfrPoints']

    pending['essaVfrPoints'] = Promise.all([
      GeoserverClient.fetchEssaVFRH(),
      GeoserverClient.fetchEssaECTR(),
    ])
      .then(([vfrh, ectr]) => {
        const tag = (features, vfrType) =>
          (features || []).map(f => ({ ...f, properties: { ...f.properties, _vfrType: vfrType } }))
        airspaceData.value.essaVfrPoints = [
          ...tag(vfrh.features, 'holdings'),
          ...tag(ectr.features, 'ectr'),
        ]
      })
      .catch(e => {
        console.error('[AirspaceData] Failed to fetch essaVfrPoints:', e)
        airspaceData.value.essaVfrPoints = []
      })
      .finally(() => { delete pending['essaVfrPoints'] })

    return pending['essaVfrPoints']
  }

  const prefetchAll = () => {
    fetchEssaCtr()
    fetchEssbCtr()
    fetchEscmCtr()
    fetchR16()
  }

  return {
    airspaceData,
    prefetchAll,
    fetchEssaCtr,
    fetchEssbCtr,
    fetchEscmCtr,
    fetchR16,
    fetchEssaVfrPoints,
  }
}
