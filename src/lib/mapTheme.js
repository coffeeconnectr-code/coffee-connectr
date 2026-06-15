import { getCategoryIcon } from './profileConstants'
import { getSectionIcon } from './noticeboardConstants'

export const MAP_COLORS = {
  water: '#C4A35A',
  land: '#0A0A0A',
  landMuted: '#161616',
  road: '#B08D57',
  roadMuted: '#8B6A3E',
  label: '#F5F2EC',
  labelHalo: '#0A0A0A',
  pin: '#F5F2EC',
  pinBorder: '#0A0A0A',
  pinIcon: '#0A0A0A',
}

export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'

const LAND_LAYERS = [
  'landcover_ice_shelf',
  'landcover_glacier',
  'landuse_residential',
  'landcover_wood',
  'landuse_park',
  'road_area_pier',
  'aeroway-area',
  'building',
]

const ROAD_LAYERS = [
  'highway_path',
  'highway_minor',
  'highway_major_casing',
  'highway_major_inner',
  'highway_major_subtle',
  'highway_motorway_casing',
  'highway_motorway_inner',
  'highway_motorway_subtle',
  'road_pier',
  'aeroway-taxiway',
  'aeroway-runway-casing',
  'aeroway-runway',
  'railway_transit',
  'railway_transit_dashline',
  'railway_minor',
  'railway_minor_dashline',
  'railway',
  'railway_dashline',
]

const WATER_LAYERS = ['water', 'waterway']

function setFillColor(map, layerId, color) {
  if (!map.getLayer(layerId)) {
    return
  }

  map.setPaintProperty(layerId, 'fill-color', color)
}

function setLineColor(map, layerId, color) {
  if (!map.getLayer(layerId)) {
    return
  }

  map.setPaintProperty(layerId, 'line-color', color)
}

function setTextColor(map, layerId, color) {
  if (!map.getLayer(layerId)) {
    return
  }

  map.setPaintProperty(layerId, 'text-color', color)
  map.setPaintProperty(layerId, 'text-halo-color', MAP_COLORS.labelHalo)
  map.setPaintProperty(layerId, 'text-halo-width', 1.2)
}

export function applyCoffeeMapTheme(map) {
  if (map.getLayer('background')) {
    map.setPaintProperty('background', 'background-color', MAP_COLORS.land)
  }

  if (map.getLayer('ne2_shaded')) {
    map.setLayoutProperty('ne2_shaded', 'visibility', 'none')
  }

  WATER_LAYERS.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      if (map.getLayer(layerId).type === 'fill') {
        setFillColor(map, layerId, MAP_COLORS.water)
      } else {
        setLineColor(map, layerId, MAP_COLORS.water)
      }
    }
  })

  LAND_LAYERS.forEach((layerId) => {
    const color = layerId === 'building' ? MAP_COLORS.landMuted : MAP_COLORS.land
    setFillColor(map, layerId, color)
  })

  ROAD_LAYERS.forEach((layerId) => {
    const color = layerId.includes('casing') ? MAP_COLORS.roadMuted : MAP_COLORS.road
    setLineColor(map, layerId, color)
  })

  map.getStyle().layers.forEach((layer) => {
    if (layer.type === 'symbol' && layer.layout?.['text-field']) {
      setTextColor(map, layer.id, MAP_COLORS.label)
    }
  })
}

export function createMapPinElement(category) {
  const element = document.createElement('div')
  element.className = 'coffee-map-pin'
  element.innerHTML = `<span class="coffee-map-pin-icon" aria-hidden="true">${getCategoryIcon(category)}</span>`
  return element
}

export function createMapPinCountElement(count) {
  const element = document.createElement('div')
  element.className = 'coffee-map-pin coffee-map-pin-count'
  element.innerHTML = `<span class="coffee-map-pin-count-label" aria-hidden="true">${count}</span>`
  return element
}

export function createListingPinElement(section) {
  const element = document.createElement('div')
  element.className = 'coffee-map-pin noticeboard-map-pin'
  element.innerHTML = `<span class="coffee-map-pin-icon" aria-hidden="true">${getSectionIcon(section)}</span>`
  return element
}

export function updateMapPinIcon(element, category) {
  const iconElement = element.querySelector('.coffee-map-pin-icon')
  if (iconElement) {
    iconElement.textContent = getCategoryIcon(category)
  }
}
