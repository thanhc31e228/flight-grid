
import { useEffect, useRef, useState } from "react";
import circle from "@turf/circle";
import {
  Map as MapLibreMap,
  Marker,
  Popup,
  NavigationControl,
  setWorkerUrl,
  GeoJSONSource,
} from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

const API_KEY = process.env.REACT_APP_MAPTILER_API_KEY;

setWorkerUrl(
  new URL(
    "maplibre-gl/dist/maplibre-gl-worker.mjs",
    import.meta.url
  ).toString()
);
// sân bay kép
// 106.263569 | Latitude: 21.394697
const CENTER: [number, number] = [
  106.263569,
  21.394697
];

// const GRID_WIDTH = 0.06;
// const GRID_HEIGHT = 0.04;

const COLS = 7;
const ROWS = 6;

type Point = {
  lng: number;
  lat: number;
};
const CELL_SIZE = 2000; // 2.000 mét

function createGrid() {
  const [centerLng, centerLat] = CENTER;

  // Chuyển đổi mét sang độ tại vĩ độ trung tâm
  const metersPerDegreeLat = 111320;

  const metersPerDegreeLng =
    111320 * Math.cos((centerLat * Math.PI) / 180);

  // Kích thước toàn bộ vùng lưới
  const cellWidthLng = CELL_SIZE / metersPerDegreeLng;
  const cellHeightLat = CELL_SIZE / metersPerDegreeLat;

  // Tổng kích thước vùng lưới 42 ô
  const totalWidth = cellWidthLng * COLS;
  const totalHeight = cellHeightLat * ROWS;

  const minLng = centerLng - totalWidth / 2;
  const minLat = centerLat - totalHeight / 2;

  const features = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const west = minLng + col * cellWidthLng;
      const east = west + cellWidthLng;

      const south = minLat + row * cellHeightLat;
      const north = south + cellHeightLat;

      features.push({
        type: "Feature",
        properties: {
          id: `R${row + 1}-C${col + 1}`,
          row: row + 1,
          col: col + 1,
          west,
          east,
          south,
          north,
          widthMeters: CELL_SIZE,
          heightMeters: CELL_SIZE,
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
          ]],
        },
      });
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

export default function MapTiler() {
  const mapContainer = useRef<HTMLDivElement>(null);

  const mapRef = useRef<MapLibreMap | null>(null);

  const [points, setPoints] = useState<Point[]>([]);

  // Cập nhật đường nối và các điểm trên bản đồ
  const updateRoute = (
    map: MapLibreMap,
    newPoints: Point[]
  ) => {
    const routeSource = map.getSource("route-source") as
      | GeoJSONSource
      | undefined;

    const pointsSource = map.getSource("points-source") as
      | GeoJSONSource
      | undefined;

    if (!routeSource || !pointsSource) return;

    // Đường nối các điểm
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
                  coordinates: newPoints.map((p) => [
                    p.lng,
                    p.lat,
                  ]),
                },
              },
            ]
          : [],
    });

    // Các điểm đánh dấu
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

  // Hoàn tác điểm cuối
  const undoPoint = () => {
    setPoints((prev) => {
      const updated = prev.slice(0, -1);

      if (mapRef.current) {
        updateRoute(mapRef.current, updated);
      }

      return updated;
    });
  };

  // Xóa toàn bộ điểm
  const clearPoints = () => {
    setPoints([]);

    if (mapRef.current) {
      updateRoute(mapRef.current, []);
    }
  };

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

    map.addControl(new NavigationControl(), "top-right");

    map.on("load", () => {
      // =========================
      // 1. TẠO LƯỚI 42 Ô
      // =========================

      map.addSource("grid-source", {
        type: "geojson",
        data: createGrid() as any,
      });

      map.addLayer({
        id: "grid-fill",
        type: "fill",
        source: "grid-source",
        paint: {
          "fill-color": "#3388ff",
          "fill-opacity": 0.12,
        },
      });

      map.addLayer({
        id: "grid-outline",
        type: "line",
        source: "grid-source",
        paint: {
          "line-color": "#0066ff",
          "line-width": 2,
        },
      });

      // =========================
      // 2. SOURCE ĐƯỜNG NỐI
      // =========================

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

      // =========================
      // 3. SOURCE CÁC ĐIỂM
      // =========================

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
          "circle-stroke-width": 2,
        },
      });

      // Tên P1, P2, P3...
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

      // =========================
      // 4. MARKER SÂN BAY KÉP
      // =========================

     
// Tạo vòng tròn bán kính 1500 mét
const airportCircle = circle(
  CENTER,
  1.5,
  {
    steps: 128,
    units: "kilometers"
  }
);

      // Thêm GeoJSON source
      map.addSource("kep-airport", {
        type: "geojson",
        data: airportCircle
      });

      // Vẽ nền trong suốt
      map.addLayer({
        id: "kep-airport-fill",
        type: "fill",
        source: "kep-airport",
        paint: {
          "fill-color": "#000000",
          "fill-opacity": 0
        }
      });

      // Vẽ đường viền màu đen
      map.addLayer({
        id: "kep-airport-outline",
        type: "line",
        source: "kep-airport",
        paint: {
          "line-color": "#bca2a2",
          "line-width": 3
        }
      });

      // =========================
      // 5. CLICK VÀO Ô LƯỚI
      // =========================

      map.on("click", "grid-fill", (event) => {
        const feature = event.features?.[0];

        if (!feature) return;

        const props = feature.properties;

        new Popup()
          .setLngLat(event.lngLat)
          .setHTML(`
            <div style="font-size:14px">
              <strong>Ô: ${props?.id}</strong>
              <hr/>
              Hàng: ${props?.row}<br/>
              Cột: ${props?.col}<br/>
              Kinh độ Tây: ${Number(props?.west).toFixed(6)}<br/>
              Kinh độ Đông: ${Number(props?.east).toFixed(6)}<br/>
              Vĩ độ Nam: ${Number(props?.south).toFixed(6)}<br/>
              Vĩ độ Bắc: ${Number(props?.north).toFixed(6)}
            </div>
          `)
          .addTo(map);
      });

      // =========================
      // 6. CLICK BẢN ĐỒ TẠO ĐIỂM
      // =========================

      map.on("click", (event) => {
        const newPoint: Point = {
          lng: event.lngLat.lng,
          lat: event.lngLat.lat,
        };

        setPoints((prev) => {
          const updated = [...prev, newPoint];

          updateRoute(map, updated);

          return updated;
        });

        // Popup thông tin điểm vừa chọn
        new Popup()
          .setLngLat(event.lngLat)
          .setText(
            `P${points.length + 1} | Longitude: ${newPoint.lng.toFixed(6)} | Latitude: ${newPoint.lat.toFixed(6)}`
          )
          .addTo(map);
      });

      // =========================
      // 7. HOVER Ô LƯỚI
      // =========================

      map.on("mouseenter", "grid-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "grid-fill", () => {
        map.getCanvas().style.cursor = "crosshair";
      });

      console.log("Đã tạo 42 ô và chức năng nối điểm!");
    });

    map.on("error", (event) => {
      console.error("Map error:", event.error);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
      }}
    >
      {/* BẢN ĐỒ */}
      <div
        ref={mapContainer}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#eee",
          borderRadius: "8px",
        }}
      />

      {/* BẢNG ĐIỀU KHIỂN */}
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

        {/* DANH SÁCH TỌA ĐỘ */}
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
