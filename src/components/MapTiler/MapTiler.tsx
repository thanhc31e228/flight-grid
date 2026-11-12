
import { useEffect, useRef, useState } from "react";
import circle from "@turf/circle";

import {
  Map as MapLibreMap,
  Popup,
  NavigationControl,
  setWorkerUrl,
  GeoJSONSource,
} from "maplibre-gl";

import type {
  Feature,
  FeatureCollection,
  Polygon,
} from "geojson";

import "maplibre-gl/dist/maplibre-gl.css";

const API_KEY = process.env.REACT_APP_MAPTILER_API_KEY;

setWorkerUrl(
  new URL(
    "maplibre-gl/dist/maplibre-gl-worker.mjs",
    import.meta.url
  ).toString()
);

// ========================================
// CONFIG
// ========================================
// CENTER của sân bay Kép
const CENTER: [number, number] = [
  106.263569,
  21.394697,
];

const COLS = 7;
const ROWS = 6;

const CELL_SIZE = 2000;

// Kích thước ô cấp 2 tùy chỉnh
const LEVEL_2_SIZE = 500;

type Point = {
  lng: number;
  lat: number;
};

type GridProperties = {
  id: string;
  level: 1 | 2 | 3;
  parentId?: string;

  row?: number;
  col?: number;

  west: number;
  east: number;
  south: number;
  north: number;

  widthMeters: number;
  heightMeters: number;

  xMin: number;
  yMin: number;
};

type GridFeature = Feature<Polygon, GridProperties>;

type GridCollection = FeatureCollection<
  Polygon,
  GridProperties
>;

const emptyGrid = (): GridCollection => ({
  type: "FeatureCollection",
  features: [],
});

// ========================================
// GEO CONVERSION
// ========================================

function getMetersPerDegree() {
  const lat = CENTER[1];

  return {
    lat: 111320,
    lng:
      111320 * Math.cos((lat * Math.PI) / 180),
  };
}

function metersToLngLat(
  x: number,
  y: number
): [number, number] {
  const meters = getMetersPerDegree();

  return [
    CENTER[0] + x / meters.lng,
    CENTER[1] + y / meters.lat,
  ];
}
function createRoundedRoute(
  points: Point[],
  radius = 0.25,
  steps = 12
): [number, number][] {

  if (points.length < 3) {
    return points.map(p => [p.lng, p.lat]);
  }

  const result: [number, number][] = [];

  const toXY = (p: Point) => ({
    x: (p.lng - CENTER[0]) *
      getMetersPerDegree().lng,
    y: (p.lat - CENTER[1]) *
      getMetersPerDegree().lat,
  });

  const toLngLat = (p: {x: number; y: number}):
    [number, number] => metersToLngLat(p.x, p.y);

  const xy = points.map(toXY);

  result.push(toLngLat(xy[0]));

  for (let i = 1; i < xy.length - 1; i++) {

    const A = xy[i - 1];
    const B = xy[i];
    const C = xy[i + 1];

    const dx1 = A.x - B.x;
    const dy1 = A.y - B.y;

    const dx2 = C.x - B.x;
    const dy2 = C.y - B.y;

    const len1 = Math.hypot(dx1, dy1);
    const len2 = Math.hypot(dx2, dy2);

    if (len1 === 0 || len2 === 0) continue;

    const cut = Math.min(
      len1 * radius,
      len2 * radius,
      200
    );

    const P1 = {
      x: B.x + dx1 / len1 * cut,
      y: B.y + dy1 / len1 * cut,
    };

    const P2 = {
      x: B.x + dx2 / len2 * cut,
      y: B.y + dy2 / len2 * cut,
    };

    result.push(toLngLat(P1));

    // Quadratic Bezier
    for (let j = 1; j <= steps; j++) {

      const t = j / steps;
      const mt = 1 - t;

      const x =
        mt * mt * P1.x +
        2 * mt * t * B.x +
        t * t * P2.x;

      const y =
        mt * mt * P1.y +
        2 * mt * t * B.y +
        t * t * P2.y;

      result.push(toLngLat({x, y}));
    }
  }

  result.push(
    toLngLat(xy[xy.length - 1])
  );

  return result;
}
// ========================================
// CREATE RECTANGLE
// ========================================

function createRectangle(
  xMin: number,
  yMin: number,
  width: number,
  height: number,
  properties: GridProperties
): GridFeature {
  const xMax = xMin + width;
  const yMax = yMin + height;

  const coordinates = [
    metersToLngLat(xMin, yMin),
    metersToLngLat(xMax, yMin),
    metersToLngLat(xMax, yMax),
    metersToLngLat(xMin, yMax),
    metersToLngLat(xMin, yMin),
  ];

  const west = coordinates[0][0];
  const south = coordinates[0][1];
  const east = coordinates[2][0];
  const north = coordinates[2][1];

  return {
    type: "Feature",
    properties: {
      ...properties,
      west,
      east,
      south,
      north,
    },
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
  };
}

// ========================================
// LEVEL 1: CREATE 42 CELLS
// ========================================

function createGrid(): GridCollection {
  const totalWidth = COLS * CELL_SIZE;
  const totalHeight = ROWS * CELL_SIZE;

  const startX = -totalWidth / 2;
  const startY = -totalHeight / 2;

  const features: GridFeature[] = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const xMin = startX + col * CELL_SIZE;
      const yMin = startY + (ROWS - 1 - row) * CELL_SIZE;

      const id = `R${row + 1}-C${col + 1}`;

      features.push(
        createRectangle(
          xMin,
          yMin,
          CELL_SIZE,
          CELL_SIZE,
          {
            id,
            level: 1,
            row: row + 1,
            col: col + 1,
            west: 0,
            east: 0,
            south: 0,
            north: 0,
            widthMeters: CELL_SIZE,
            heightMeters: CELL_SIZE,
            xMin,
            yMin,
          }
        )
      );
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

// ========================================
// LEVEL 2: DIVIDE LEVEL 1
// ========================================


function createLevel2(
  parent: GridFeature
): GridCollection {
  const {
    xMin,
    yMin,
    widthMeters,
    heightMeters,
    id,
  } = parent.properties;

  const features: GridFeature[] = [];

  const ROWS = 5;
  const COLS = 5;

  // Tự động tính kích thước mỗi ô
  const cellWidth = widthMeters / COLS;
  const cellHeight = heightMeters / ROWS;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = xMin + col * cellWidth;
      const y = yMin + row * cellHeight;

      const childId =
        `${id}-L2-R${row + 1}-C${col + 1}`;

      features.push(
        createRectangle(
          x,
          y,
          cellWidth,
          cellHeight,
          {
            id: childId,
            level: 2,
            parentId: id,
            row: row + 1,
            col: col + 1,
            west: 0,
            east: 0,
            south: 0,
            north: 0,
            widthMeters: cellWidth,
            heightMeters: cellHeight,
            xMin: x,
            yMin: y,
          }
        )
      );
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}


// ========================================
// LEVEL 3: 4 CORNERS + CENTER
// ========================================


function createLevel3(
  parent: GridFeature
): GridCollection {
  const {
    xMin,
    yMin,
    widthMeters,
    heightMeters,
    id,
  } = parent.properties;

  // Mỗi ô góc chiếm 1/2 chiều rộng và chiều cao
  const size = Math.min(
    widthMeters,
    heightMeters
  ) / 2;

  const positions = [
    // 4 góc
    {
      name: "NW",
      x: xMin,
      y: yMin + heightMeters - size,
    },
    {
      name: "NE",
      x: xMin + widthMeters - size,
      y: yMin + heightMeters - size,
    },
    {
      name: "SW",
      x: xMin,
      y: yMin,
    },
    {
      name: "SE",
      x: xMin + widthMeters - size,
      y: yMin,
    },

    // Chính giữa
    {
      name: "CENTER",
      x: xMin + (widthMeters - size) / 2,
      y: yMin + (heightMeters - size) / 2,
    },
  ];

  return {
    type: "FeatureCollection",
    features: positions.map((pos) =>
      createRectangle(
        pos.x,
        pos.y,
        size,
        size,
        {
          id: `${id}-L3-${pos.name}`,
          level: 3,
          parentId: id,
          west: 0,
          east: 0,
          south: 0,
          north: 0,
          widthMeters: size,
          heightMeters: size,
          xMin: pos.x,
          yMin: pos.y,
        }
      )
    ),
  };
}


// ========================================
// MAP COMPONENT
// ========================================
function createLevel3Index(): Map<string, GridFeature> {
  const index = new Map<string, GridFeature>();

  const level1 = createGrid();

  level1.features.forEach((parent) => {
    const level2 = createLevel2(parent);

    level2.features.forEach((child) => {
      const level3 = createLevel3(child);

      level3.features.forEach((feature) => {
        index.set(feature.properties.id, feature);
      });
    });
  });

  return index;
}
export default function MapTiler() {
  const mapContainer = useRef<HTMLDivElement>(null);

  const mapRef = useRef<MapLibreMap | null>(null);

  const pointsRef = useRef<Point[]>([]);

  const [points, setPoints] = useState<Point[]>([]);
const level3IndexRef = useRef<Map<string, GridFeature>>(
  new Map()
);

const [cellIdsInput, setCellIdsInput] = useState("");
function getCellCenter(
  feature: GridFeature
): Point {
  const {
    xMin,
    yMin,
    widthMeters,
    heightMeters,
  } = feature.properties;

  const [lng, lat] = metersToLngLat(
    xMin + widthMeters / 2,
    yMin + heightMeters / 2
  );

  return { lng, lat };
}
const connectCellsById = () => {
  const ids = cellIdsInput
    .split(/[\n,;]+/)
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length < 2) {
    alert("Cần nhập ít nhất 2 ID ô cấp 3");
    return;
  }

  const selectedCells: GridFeature[] = [];

  for (const id of ids) {
    const cell = level3IndexRef.current.get(id);

    if (!cell) {
      alert(`Không tìm thấy ô: ${id}`);
      return;
    }

    selectedCells.push(cell);
  }

  // Lấy tâm từng ô
  const routePoints = selectedCells.map(
    (cell) => getCellCenter(cell)
  );

  // Cập nhật tuyến đường
  commitPoints(routePoints);
};
  // ======================================
  // UPDATE ROUTE
  // ======================================

  const updateRoute = (
    map: MapLibreMap,
    newPoints: Point[]
  ) => {
    const routeSource = map.getSource(
      "route-source"
    ) as GeoJSONSource | undefined;

    const pointsSource = map.getSource(
      "points-source"
    ) as GeoJSONSource | undefined;

    if (!routeSource || !pointsSource) return;

    routeSource.setData({
  type: "FeatureCollection",
  features:
    newPoints.length >= 2
      ? [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: createRoundedRoute(
                newPoints,
                0.25,
                12
              ),
            },
          },
        ]
      : [],
});

    pointsSource.setData({
      type: "FeatureCollection",
      features: newPoints.map((p, index) => ({
        type: "Feature",
        properties: {
          name: `P${index + 1}`,
          lng: p.lng,
          lat: p.lat,
        },
        geometry: {
          type: "Point",
          coordinates: [p.lng, p.lat],
        },
      })),
    });
  };

  // ======================================
  // UPDATE POINTS
  // ======================================

  const commitPoints = (updated: Point[]) => {
    pointsRef.current = updated;
    setPoints(updated);

    if (mapRef.current) {
      updateRoute(mapRef.current, updated);
    }
  };

  const undoPoint = () => {
    commitPoints(pointsRef.current.slice(0, -1));
  };

  const clearPoints = () => {
    commitPoints([]);
  };

  // ======================================
  // INITIALIZE MAP
  // ======================================

  useEffect(() => {
    if (!mapContainer.current || !API_KEY) {
      console.error("Không tìm thấy MapTiler API Key");
      return;
    }

    const map = new MapLibreMap({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets-v4/style.json?key=${API_KEY}`,
      center: CENTER,
      zoom: 12,
    });

    mapRef.current = map;

    map.addControl(
      new NavigationControl(),
      "top-right"
    );

    // Hover state
    let activeParentId: string | null = null;
    let activeChildId: string | null = null;

    const getSource = (id: string) =>
      map.getSource(id) as GeoJSONSource | undefined;

    const setSourceData = (
      id: string,
      data: GridCollection
    ) => {
      getSource(id)?.setData(data);
    };

    const clearLevel2 = () => {
      activeParentId = null;
      activeChildId = null;

      setSourceData("grid-level-2", emptyGrid());
      setSourceData("grid-level-3", emptyGrid());
    };

    const clearLevel3 = () => {
      activeChildId = null;

      setSourceData("grid-level-3", emptyGrid());
    };

    const showLevel2 = (parent: GridFeature) => {
      const parentId = parent.properties.id;

      if (activeParentId === parentId) return;

      activeParentId = parentId;
      activeChildId = null;

      setSourceData(
        "grid-level-2",
        createLevel2(parent)
      );

      clearLevel3();
    };

    const showLevel3 = (child: GridFeature) => {
      const childId = child.properties.id;

      if (activeChildId === childId) return;

      activeChildId = childId;

      setSourceData(
        "grid-level-3",
        createLevel3(child)
      );
    };

    // ====================================
    // LOAD
    // ====================================

    const handleLoad = () => {
      // ----------------------------------
      // LEVEL 1
      // ----------------------------------
level3IndexRef.current = createLevel3Index();
      map.addSource("grid-source", {
        type: "geojson",
        data: createGrid() as any,
      });

     map.addLayer({
  id: "grid-fill",
  type: "fill",
  source: "grid-source",
  paint: {
    "fill-color": "#ffffff",
    "fill-opacity": 0,
  },
});

      map.addLayer({
    id: "grid-outline",
    type: "line",
    source: "grid-source",
    layout:{
      
    },
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

      // ----------------------------------
      // LEVEL 2
      // ----------------------------------

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
    "fill-opacity": 0,
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


      // ----------------------------------
      // LEVEL 3
      // ----------------------------------

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
    "fill-opacity": 0,
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

      // ----------------------------------
      // ROUTE SOURCE
      // ----------------------------------

      map.addSource("route-source", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route-source",
        paint: {
          "line-color": "#ff2222",
          "line-width": 4,
          "line-opacity": 0.9,
        },
      });

      // ----------------------------------
      // POINTS SOURCE
      // ----------------------------------

      map.addSource("points-source", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
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

      // ----------------------------------
      // AIRPORT CIRCLE
      // ----------------------------------

      const airportCircle = circle(
        CENTER,
        1.5,
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

      // ==================================
      // HOVER LOGIC
      // ==================================

      const handleMouseMove = (event: any) => {
        const features = map.queryRenderedFeatures(
          event.point,
          {
            layers: [
              "grid-level-3-fill",
              "grid-level-2-fill",
              "grid-fill",
            ],
          }
        );

        // Ưu tiên cấp 3 trước, sau đó cấp 2
        // và cuối cùng cấp 1.
        const level2Feature = features.find(
          (f) => f.layer.id === "grid-level-2-fill"
        );

        if (level2Feature) {
         const child =
  level2Feature as unknown as GridFeature;

          const parentId = child.properties.parentId;

          if (activeParentId !== parentId) {
            activeParentId = parentId ?? null;
            clearLevel3();
          }

          showLevel3(child);

          map.getCanvas().style.cursor = "pointer";
          return;
        }

        // Cấp 1
        const level1Feature = features.find(
          (f) => f.layer.id === "grid-fill"
        );

        if (level1Feature) {
         showLevel2(
  level1Feature as unknown as GridFeature
);

          map.getCanvas().style.cursor = "pointer";
          return;
        }

        clearLevel2();

        map.getCanvas().style.cursor = "crosshair";
      };

      map.on("mousemove", handleMouseMove);

      // ==================================
      // CLICK GRID
      // ==================================

      map.on("click", (event) => {
        const features = map.queryRenderedFeatures(
          event.point,
          {
            layers: [
              "grid-level-3-fill",
              "grid-level-2-fill",
              "grid-fill",
            ],
          }
        );

        // Ưu tiên ô sâu nhất
       const feature = features[0]
  ? (features[0] as unknown as GridFeature)
  : undefined;

        if (!feature) return;

        const props = feature.properties;

        new Popup()
          .setLngLat(event.lngLat)
          .setHTML(`
            <div style="font-size:14px">
              <strong>Ô: ${props.id}</strong>
              <hr/>
              Cấp: ${props.level}<br/>
              Hàng: ${props.row ?? "-"}<br/>
              Cột: ${props.col ?? "-"}<br/>
              Ô cha: ${props.parentId ?? "-"}<br/>
              Kích thước: ${props.widthMeters}m × ${props.heightMeters}m<br/>
              Kinh độ Tây: ${props.west.toFixed(6)}<br/>
              Kinh độ Đông: ${props.east.toFixed(6)}<br/>
              Vĩ độ Nam: ${props.south.toFixed(6)}<br/>
              Vĩ độ Bắc: ${props.north.toFixed(6)}
            </div>
          `)
          .addTo(map);
      });

      // ==================================
      // CLICK MAP TO ADD POINT
      // ==================================

      map.on("click", (event) => {
        // Nếu click vào bất kỳ cấp grid nào
        // thì không thêm điểm.
        const gridFeatures = map.queryRenderedFeatures(
          event.point,
          {
            layers: [
              "grid-level-3-fill",
              "grid-level-2-fill",
              "grid-fill",
            ],
          }
        );

        // if (gridFeatures.length > 0) return;

        const newPoint: Point = {
          lng: event.lngLat.lng,
          lat: event.lngLat.lat,
        };

        const updated = [
          ...pointsRef.current,
          newPoint,
        ];

        commitPoints(updated);

        new Popup()
          .setLngLat(event.lngLat)
          .setText(
            `P${updated.length} | Longitude: ${newPoint.lng.toFixed(6)} | Latitude: ${newPoint.lat.toFixed(6)}`
          )
          .addTo(map);
      });

      // Cursor
      map.getCanvas().style.cursor = "crosshair";

      console.log(
        "Đã khởi tạo grid 3 cấp, route, points và sân bay Kép."
      );
    };

    map.on("load", handleLoad);

    map.on("error", (event) => {
      console.error("Map error:", event.error);
    });

    return () => {
      map.off("load", handleLoad);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ======================================
  // UI
  // ======================================

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
      }}
    >
      <div
        ref={mapContainer}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#eee",
          borderRadius: "8px",
        }}
      />

      {/* CONTROL PANEL */}

      <div
        style={{
          position: "absolute",
          top: 15,
          left: 15,
          zIndex: 10,
          background: "#fff",
          padding: 15,
          borderRadius: 8,
          boxShadow: "0 2px 8px #0003",
          minWidth: 190,
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <strong>QUẢN LÝ TUYẾN ĐƯỜNG</strong>
        </div>

        <div style={{ marginBottom: 12 }}>
          Số điểm: <strong>{points.length}</strong>
        </div>

        <div style={{ marginBottom: 12, fontSize: 12 }}>
          <div>Grid cấp 1: 2.000m</div>
          <div>Grid cấp 2: {LEVEL_2_SIZE}m</div>
          <div>Grid cấp 3: 5 ô / ô cấp 2</div>
        </div>

        <button
          onClick={undoPoint}
          disabled={points.length === 0}
          style={{
            padding: "7px 12px",
            marginRight: 6,
            cursor: "pointer",
          }}
        >
          Hoàn tác
        </button>

        <button
          onClick={clearPoints}
          disabled={points.length === 0}
          style={{
            padding: "7px 12px",
            cursor: "pointer",
          }}
        >
          Xóa tất cả
        </button>
<div style={{
  marginTop: 15,
  borderTop: "1px solid #ddd",
  paddingTop: 12,
}}>

  <strong>NỐI Ô GRID CẤP 3</strong>

  <textarea
    value={cellIdsInput}
    onChange={(e) =>
      setCellIdsInput(e.target.value)
    }
    placeholder={`Nhập ID từng ô:

R1-C1-L2-R1-C1-L3-NW
R1-C1-L2-R1-C1-L3-CENTER`}
    style={{
      width: "100%",
      height: 120,
      marginTop: 8,
      padding: 8,
      boxSizing: "border-box",
      fontSize: 11,
      resize: "vertical",
    }}
  />

  <button
    onClick={connectCellsById}
    style={{
      width: "100%",
      padding: 9,
      marginTop: 8,
      background: "#2563eb",
      color: "#fff",
      border: "none",
      borderRadius: 5,
      cursor: "pointer",
    }}
  >
    NỐI CÁC Ô THÀNH TUYẾN
  </button>

</div>
        <div
          style={{
            marginTop: 12,
            maxHeight: 220,
            overflowY: "auto",
            fontSize: 12,
          }}
        >
          {points.map((point, index) => (
            <div
              key={index}
              style={{
                padding: "6px 0",
                borderTop: "1px solid #ddd",
              }}
            >
              <strong>P{index + 1}</strong>
              <br />
              Lng: {point.lng.toFixed(6)}
              <br />
              Lat: {point.lat.toFixed(6)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
