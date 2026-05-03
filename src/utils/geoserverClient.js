/**
 * GeoServer WFS client for fetching airspace data from LFV DAIM
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const GEOSERVER_BASE_URL = `${API_BASE}/api/proxy/daim`

export const GeoserverClient = {
  /**
   * Fetch feature data from GeoServer WFS as GeoJSON
   * @param {string} typeName - WFS layer name (e.g., "mais:CTR")
   * @param {string|null} cqlFilter - CQL filter expression
   * @returns {Promise<Object>} GeoJSON FeatureCollection
   */
  async fetchFeatures(typeName, cqlFilter = null) {
    try {
      // Extract workspace from typeName (e.g., "mais:CTR" → "mais")
      const workspace = typeName.split(':')[0]
      
      const params = new URLSearchParams({
        service: "WFS",
        version: "1.0.0",
        request: "GetFeature",
        typeName: typeName,
        outputFormat: "application/json",
      })

      if (cqlFilter) {
        params.append("CQL_FILTER", cqlFilter)
      }

      const url = `${GEOSERVER_BASE_URL}/${workspace}/ows?${params}`
      console.log('[GeoserverClient] Fetching:', url)
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`[GeoserverClient] Failed to fetch ${typeName}:`, error)
      throw error
    }
  },

  /**
   * Fetch CTR data for a specific airport using CQL filter
   * @param {string} airportIcao - Airport code (e.g., "ESSA", "ESSB", "ESCM")
   * @returns {Promise<Object>} GeoJSON FeatureCollection
   */
  async fetchCTR(airportIcao) {
    const cqlFilter = `POSITIONINDICATOR = '${airportIcao}'`
    return this.fetchFeatures("mais:CTR", cqlFilter)
  },

  /**
   * Fetch R16 restricted area (all sub-zones: R16, R16A, R16B, R16C) from mais:RSTA
   * @returns {Promise<Object>} GeoJSON FeatureCollection
   */
  async fetchR16() {
    return this.fetchFeatures("mais:RSTA", "NAMEOFAREA LIKE 'ES R16%'")
  },

}
