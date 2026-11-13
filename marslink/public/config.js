// All tunable settings. Thresholds are team assumptions, not NASA figures.
export const CFG = {
  center: [18.38, 77.58],   // Jezero Crater (lat, lon)
  zoom: 6, maxZoom: 9,
  // NASA Mars Trek WMTS tiles (EPSG:4326). Verify layer names at https://trek.nasa.gov/mars/
  baseUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
  // Optional slope overlay: paste a Mars Trek slope layer URL pattern here (same {z}/{y}/{x} scheme), or leave null.
  slopeUrl: null,
  attribution: 'Map: NASA/JPL Mars Trek'
};
