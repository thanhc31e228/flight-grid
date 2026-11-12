
import circle from "@turf/circle";

import type { Map as MapLibreMap } from "maplibre-gl";

import { MAP_CONFIG } from "../../config/map.config";

import {
  createGrid,
  emptyGrid,
} from "../../features/grid/grid.factory";

export function addGridLayers(map: MapLibreMap) {
  map.addSource("grid-source", {
    type: "geojson",
    data: createGrid(),
  });

  map.addLayer({
    id: "grid-fill",
    type: "fill",
    source: "grid-source",
    paint: {
      "fill-color": "#ffffff",
      "fill-opacity": 0.001,
    },
  });

  map.addLayer({
    id: "grid-outline",
    type: "line",
    source: "grid-source",
    paint: {
      "line-color": "#64748b",
      "line-width": 1,
      "line-opacity": 0.45,
    },
  });

  map.addLayer({
    id: "grid-label",
    type: "symbol",
    source: "grid-source",
    layout: {
      "text-field": [
        "concat",
        "R",
        ["get", "row"],
        "-C",
        ["get", "col"],
      ],
      "text-size": 11,
      "text-font": ["Open Sans Regular"],
      "text-anchor": "center",
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#050e1c",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.2,
      "text-opacity": 0.8,
    },
  });

  map.addSource("grid-level-2", {
    type: "geojson",
    data: emptyGrid(),
  });

  map.addLayer({
    id: "grid-level-2-fill",
    type: "fill",
    source: "grid-level-2",
    paint: {
      "fill-color": "#ffffff",
      "fill-opacity": 0.001,
    },
  });

  map.addLayer({
    id: "grid-level-2-outline",
    type: "line",
    source: "grid-level-2",
    paint: {
      "line-color": "#94a3b8",
      "line-width": 0.8,
      "line-opacity": 0.5,
    },
  });

  map.addSource("grid-level-3", {
    type: "geojson",
    data: emptyGrid(),
  });

  map.addLayer({
    id: "grid-level-3-fill",
    type: "fill",
    source: "grid-level-3",
    paint: {
      "fill-color": "#ffffff",
      "fill-opacity": 0.001,
    },
  });

  map.addLayer({
    id: "grid-level-3-outline",
    type: "line",
    source: "grid-level-3",
    paint: {
      "line-color": "#64748b",
      "line-width": 0.7,
      "line-opacity": 0.55,
    },
  });
}

export function addRouteLayers(map: MapLibreMap) {
  map.addSource("route-source", {
    type: "geojson",
    data: emptyGrid(),
  });

  map.addLayer({
    id: "route-line",
    type: "line",
    source: "route-source",
    paint: {
      "line-color": MAP_CONFIG.ROUTE.COLOR,
      "line-width": MAP_CONFIG.ROUTE.WIDTH,
      "line-opacity": 0.9,
    },
  });

  map.addSource("points-source", {
    type: "geojson",
    data: emptyGrid(),
  });

  map.addLayer({
    id: "points-layer",
    type: "circle",
    source: "points-source",
    paint: {
      "circle-radius": 7,
      "circle-color": "#ff2222",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1,
    },
  });

  map.addLayer({
    id: "points-label",
    type: "symbol",
    source: "points-source",
    layout: {
      "text-field": ["get", "name"],
      "text-size": 13,
      "text-offset": [0, 1.5],
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#ff2222",
      "text-halo-color": "#ffffff",
      "text-halo-width": 2,
    },
  });
}

export function addAirportLayer(map: MapLibreMap) {
  const airportCircle = circle(
    MAP_CONFIG.CENTER,
    MAP_CONFIG.AIRPORT_RADIUS_KM,
    {
      steps: 128,
      units: "kilometers",
    }
  );

  map.addSource("kep-airport", {
    type: "geojson",
    data: airportCircle,
  });

  map.addLayer({
    id: "kep-airport-fill",
    type: "fill",
    source: "kep-airport",
    paint: {
      "fill-color": "#000000",
      "fill-opacity": 0,
    },
  });

  map.addLayer({
    id: "kep-airport-outline",
    type: "line",
    source: "kep-airport",
    paint: {
      "line-color": "#bca2a2",
      "line-width": 3,
    },
  });
}

export function initializeMapLayers(map: MapLibreMap) {
  addGridLayers(map);
  addRouteLayers(map);
  addAirportLayer(map);
}
