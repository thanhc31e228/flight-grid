import {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
} from "react";

import {
  Map as MapLibreMap,
  Marker,
  Popup,
  NavigationControl,
} from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

import { API_KEY, CENTER } from "../map.constants";

import { Point } from "../types/map.types";

import { createGrid } from "../utils/createGrid";

import { updateRoute } from "../utils/updateRoute";

// Hook quản lý toàn bộ hoạt động của bản đồ
export function useMap(
  points: Point[],
  setPoints: Dispatch<SetStateAction<Point[]>>
) {
  // DOM chứa bản đồ
  const mapContainer = useRef<HTMLDivElement>(null);

  // Lưu instance của MapLibre
  const mapRef = useRef<MapLibreMap | null>(null);

  // Lưu danh sách điểm mới nhất
  // Giúp tránh lỗi dữ liệu cũ trong event listener
  const pointsRef = useRef<Point[]>(points);

  // Đồng bộ pointsRef khi dữ liệu thay đổi từ bên ngoài
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    // Kiểm tra vùng chứa bản đồ và API Key
    if (!mapContainer.current || !API_KEY) {
      console.error("Không tìm thấy MapTiler API Key");
      return;
    }

    // =================================
    // 1. KHỞI TẠO BẢN ĐỒ
    // =================================

    const map = new MapLibreMap({
      container: mapContainer.current,

      style: `https://api.maptiler.com/maps/streets-v4/style.json?key=${API_KEY}`,

      center: CENTER,

      zoom: 12,
    });

    mapRef.current = map;

    // Thêm nút phóng to, thu nhỏ bản đồ
    map.addControl(
      new NavigationControl(),
      "top-right"
    );

    // Chờ bản đồ tải xong mới thêm các layer
    map.on("load", () => {

      // =================================
      // 2. TẠO LƯỚI 42 Ô
      // =================================

      map.addSource("grid-source", {
        type: "geojson",
        data: createGrid() as any,
      });

      // Layer màu nền các ô
      map.addLayer({
        id: "grid-fill",
        type: "fill",
        source: "grid-source",

        paint: {
          "fill-color": "#3388ff",
          "fill-opacity": 0.12,
        },
      });

      // Layer đường viền các ô
      map.addLayer({
        id: "grid-outline",
        type: "line",
        source: "grid-source",

        paint: {
          "line-color": "#0066ff",
          "line-width": 2,
        },
      });

      // =================================
      // 3. TẠO NGUỒN DỮ LIỆU ĐƯỜNG ĐI
      // =================================

      map.addSource("route-source", {
        type: "geojson",

        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      // Layer hiển thị đường nối
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

      // =================================
      // 4. TẠO NGUỒN DỮ LIỆU CÁC ĐIỂM
      // =================================

      map.addSource("points-source", {
        type: "geojson",

        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      // Layer hình tròn đánh dấu điểm
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

      // Layer hiển thị tên P1, P2, P3...
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

      // =================================
      // 5. ĐÁNH DẤU VỊ TRÍ HÀ NỘI
      // =================================

      new Marker({ color: "red" })
        .setLngLat(CENTER)
        .setPopup(
          new Popup().setText("Hà Nội")
        )
        .addTo(map);

      // =================================
      // 6. CLICK VÀO Ô LƯỚI
      // =================================

      map.on("click", "grid-fill", (event) => {
        const feature = event.features?.[0];

        if (!feature) return;

        const props = feature.properties;

        // Hiển thị thông tin ô được chọn
        new Popup()
          .setLngLat(event.lngLat)
          .setText(
            [
              `Ô: ${props?.id}`,
              `Hàng: ${props?.row}`,
              `Cột: ${props?.col}`,
              `Kinh độ Tây: ${Number(props?.west).toFixed(6)}`,
              `Kinh độ Đông: ${Number(props?.east).toFixed(6)}`,
              `Vĩ độ Nam: ${Number(props?.south).toFixed(6)}`,
              `Vĩ độ Bắc: ${Number(props?.north).toFixed(6)}`,
            ].join("\n")
          )
          .addTo(map);
      });

      // =================================
      // 7. CLICK BẢN ĐỒ ĐỂ TẠO ĐIỂM
      // =================================

      map.on("click", (event) => {

        // Nếu click trúng ô lưới thì không tạo điểm tuyến đường
        const clickedGrid = map.queryRenderedFeatures(
          event.point,
          {
            layers: ["grid-fill"],
          }
        );

        if (clickedGrid.length > 0) return;

        // Lấy tọa độ vị trí vừa click
        const newPoint: Point = {
          lng: event.lngLat.lng,
          lat: event.lngLat.lat,
        };

        // Tạo danh sách điểm mới
        const updatedPoints = [
          ...pointsRef.current,
          newPoint,
        ];

        // Cập nhật ref trước để tránh dữ liệu cũ
        pointsRef.current = updatedPoints;

        // Cập nhật state React
        setPoints(updatedPoints);

        // Cập nhật đường nối trên bản đồ
        updateRoute(map, updatedPoints);

        // Số thứ tự điểm vừa tạo
        const pointName = `P${updatedPoints.length}`;

        // Hiển thị thông tin điểm
        new Popup()
          .setLngLat(event.lngLat)
          .setText(
            `${pointName} | Longitude: ${newPoint.lng.toFixed(6)} | Latitude: ${newPoint.lat.toFixed(6)}`
          )
          .addTo(map);
      });

      // =================================
      // 8. HIỆU ỨNG KHI DI CHUỘT VÀO Ô
      // =================================

      map.on("mouseenter", "grid-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "grid-fill", () => {
        map.getCanvas().style.cursor = "crosshair";
      });

      // Nếu đã có dữ liệu điểm từ trước thì hiển thị lại
      if (pointsRef.current.length > 0) {
        updateRoute(map, pointsRef.current);
      }

      console.log("Đã khởi tạo bản đồ và 42 ô lưới!");
    });

    // =================================
    // 9. BẮT LỖI BẢN ĐỒ
    // =================================

    map.on("error", (event) => {
      console.error("Map error:", event.error);
    });

    // =================================
    // 10. HỦY BẢN ĐỒ KHI COMPONENT UNMOUNT
    // =================================

    return () => {
      map.remove();
      mapRef.current = null;
    };

  }, []);

  // Trả về ref để component chính gắn vào DOM
  return {
    mapContainer,
    mapRef,
  };
}