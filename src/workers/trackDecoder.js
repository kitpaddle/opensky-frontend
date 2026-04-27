/**
 * WebWorker for decoding compact integer-encoded track data AND merging with flight metadata
 * Runs in background to avoid blocking UI
 */

self.onmessage = (event) => {
  const { tracks, flights } = event.data
  
  try {
    const startTime = performance.now()
    
    // Decode all tracks, merge with flight metadata
    const mergedFlights = decodeAndMergeFlights(tracks, flights)
    
    const endTime = performance.now()
    const processingTimeMs = endTime - startTime
    
    // Send back merged data with timing
    self.postMessage({
      success: true,
      mergedFlights,
      processingTimeMs,
    })
  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message,
    })
  }
}

/**
 * Decode tracks and merge with flight metadata into single comprehensive objects
 * @param {Array} tracks - Array of track objects with encoded coords
 * @param {Array} flights - Array of flight summary objects
 * @returns {Array} Merged flight objects with both metadata and decoded coordinates
 */
function decodeAndMergeFlights(tracks, flights) {
  // Create flight lookup map for O(1) access
  const flightMap = new Map()
  flights.forEach(flight => {
    flightMap.set(flight.flight_id, flight)
  })

  return tracks.map(track => {
    // Get flight metadata
    const flightMetadata = flightMap.get(track.flight_id) || {}
    
    // Decode integer coordinates to decimal
    const decodedCoords = decodeCoordinates(track.coords)
    
    // MERGE: Return single comprehensive object with metadata + decoded track
    return {
      // All metadata fields from flight summary
      ...flightMetadata,
      
      // Decoded trajectory coordinates in [lon, lat] format for mapping
      coordinates: decodedCoords.map(coord => [coord.lon, coord.lat]),
      
      // Altitude and time profile (interleaved: [alt, time, alt, time, ...])
      altitude_profile: decodedCoords.flatMap(coord => [coord.alt, coord.time]),
      
    }
  })
}

/**
 * Decode flat integer array to coordinate objects
 * Input format: [lat_int, lon_int, alt, time, lat_int, lon_int, alt, time, ...]
 * Decoding: Integer lat/lon / 1,000,000 = decimal degree; alt and time already integers
 * @param {Array} flatCoords - Flat array of integers
 * @returns {Array} Array of {lat, lon, alt, time} objects
 */
function decodeCoordinates(flatCoords) {
  const coords = []
  
  // Process in groups of 4 (lat_int, lon_int, alt, time)
  for (let i = 0; i < flatCoords.length; i += 4) {
    const latInt = flatCoords[i]
    const lonInt = flatCoords[i + 1]
    const alt = flatCoords[i + 2]
    const time = flatCoords[i + 3]
    
    // Decode from millionths back to degrees
    const lat = latInt / 1_000_000
    const lon = lonInt / 1_000_000
    
    coords.push({ lat, lon, alt, time })
  }
  
  return coords
}
