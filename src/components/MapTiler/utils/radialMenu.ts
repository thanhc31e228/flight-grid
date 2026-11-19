import type { Map as MapLibreMap } from "maplibre-gl";
import { LngLat } from "maplibre-gl";
import { CENTER } from "../map.constants";
type RadialMenuItem = {
  label: string;
  value: string;
};

type RadialMenuOptions = {
  onSelect: (
    item: RadialMenuItem,
    point: {
      x: number;
      y: number;
    },
  ) => void;
};

export function setupRadialMenu(
  map: MapLibreMap,
  items: RadialMenuItem[],
  options: RadialMenuOptions,
) {
  const container = map.getContainer();

  let lastPointer: { x: number; y: number } | null = null;
  let center: { x: number; y: number } | null = null;

  let activeIndex = -1;
  let isOpen = false;
  let isCtrlPressed = false;
  let isBlocked = false;
  const radius = 85;
  const hoverThreshold = 20;

  // =========================
  // CREATE MENU
  // =========================

  const menu = document.createElement("div");
  menu.className = "radial-menu";

  Object.assign(menu.style, {
    position: "absolute",
    width: "1px",
    height: "1px",
    display: "none",
    zIndex: "9999",
    pointerEvents: "none",
  });

  container.appendChild(menu);

  const buttons: HTMLDivElement[] = [];

  // =========================
  // HIDE MENU
  // =========================

  function hideMenu() {
    menu.style.display = "none";
    menu.style.pointerEvents = "none";

    isOpen = false;
    activeIndex = -1;

    buttons.forEach((button) => {
      button.classList.remove("active");
    });
  }

  // =========================
  // SELECT MENU
  // =========================
  function calculateDistanceFromOrigin(point: { x: number; y: number }) {
    // Chuyển vị trí mở menu từ pixel sang tọa độ địa lý
    const target = map.unproject([point.x, point.y]);

    // Tọa độ gốc
    const originLngLat = new LngLat(CENTER[0], CENTER[1]);

    // Tính khoảng cách mét -> km
    const distanceKm = originLngLat.distanceTo(target) / 1000;

    return {
      distanceKm,
      distanceMeters: distanceKm * 1000,
      targetLng: target.lng,
      targetLat: target.lat,
    };
  }
  function selectMenu(index: number = activeIndex) {
    if (!isOpen || index < 0 || index >= items.length) {
      hideMenu();
      return;
    }

    const selectedItem = items[index];
    const selectedPoint = center ? { ...center } : null;

    if (!selectedPoint) {
      hideMenu();
      return;
    }

    // Xử lý riêng menu info
    // Xử lý riêng menu info
    // Xử lý riêng menu info
    if (selectedItem.value === "info") {
      const result = calculateDistanceFromOrigin(selectedPoint);

      console.log("===== INFO =====");
      console.log("Tọa độ gốc:", origin);
      console.log("Tọa độ đích:", [result.targetLng, result.targetLat]);
      console.log("Cự ly:", result.distanceKm.toFixed(3), "km");
      console.log("Cự ly:", result.distanceMeters.toFixed(1), "m");
    }
    isBlocked = true;
    hideMenu();

    options.onSelect(selectedItem, selectedPoint);
  }

  // =========================
  // CREATE MENU ITEMS
  // =========================

  items.forEach((item, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / items.length;

    const button = document.createElement("div");

    button.className = "radial-menu-item";
    button.textContent = item.label;

    button.style.left = `${Math.cos(angle) * radius}px`;
    button.style.top = `${Math.sin(angle) * radius}px`;

    // CLICK MENU
    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      selectMenu(index);
    });

    // Không để MapLibre nhận sự kiện chuột của menu
    button.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });

    button.addEventListener("mouseup", (e) => {
      e.stopPropagation();
    });

    button.addEventListener("dblclick", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    menu.appendChild(button);
    buttons.push(button);
  });

  // =========================
  // CENTER POINT
  // =========================

  const centerPoint = document.createElement("div");

  centerPoint.className = "radial-menu-center";

  menu.appendChild(centerPoint);

  // =========================
  // SHOW MENU
  // =========================

  function showMenu() {
    if (
      !lastPointer ||
      isOpen ||
      isBlocked ||
      !isCtrlPressed ||
      items.length === 0
    ) {
      return;
    }

    center = { ...lastPointer };

    menu.style.left = `${center.x}px`;
    menu.style.top = `${center.y}px`;
    menu.style.display = "block";
    menu.style.pointerEvents = "auto";

    isOpen = true;
    activeIndex = -1;
  }

  // =========================
  // UPDATE HOVER
  // =========================

  function updateHover(mouseX: number, mouseY: number) {
    if (!center || !isOpen) return;

    const dx = mouseX - center.x;
    const dy = mouseY - center.y;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < hoverThreshold) {
      activeIndex = -1;
    } else {
      // Góc bắt đầu từ hướng trên
      // Chạy theo chiều kim đồng hồ

      const angle = Math.atan2(dy, dx) + Math.PI / 2;

      const normalizedAngle = (angle + Math.PI * 2) % (Math.PI * 2);

      const sectorSize = (Math.PI * 2) / items.length;

      activeIndex = Math.round(normalizedAngle / sectorSize) % items.length;
    }

    buttons.forEach((button, index) => {
      button.classList.toggle("active", index === activeIndex);
    });
  }

  // =========================
  // MOUSE MOVE
  // =========================

  function onMouseMove(e: MouseEvent) {
    const rect = container.getBoundingClientRect();

    lastPointer = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    if (isCtrlPressed && !isBlocked && !isOpen) {
      showMenu();
    }

    updateHover(lastPointer.x, lastPointer.y);
  }

  // =========================
  // KEY DOWN
  // =========================

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "Control" || e.repeat) return;

    isCtrlPressed = true;
    isBlocked = false;

    showMenu();
  }
  // =========================
  // KEY UP
  // =========================

  function onKeyUp(e: KeyboardEvent) {
    if (e.key !== "Control") return;

    isCtrlPressed = false;

    if (isOpen) {
      selectMenu();
    }

    // Chỉ cho phép mở lại ở lần nhấn Ctrl tiếp theo
    isBlocked = false;
  }

  // =========================
  // BLUR
  // =========================

  function onBlur() {
    isCtrlPressed = false;
    isBlocked = false;
    hideMenu();
  }

  // =========================
  // EVENT LISTENERS
  // =========================

  container.addEventListener("mousemove", onMouseMove);

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  // =========================
  // CLEANUP
  // =========================

  return () => {
    container.removeEventListener("mousemove", onMouseMove);

    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
    menu.remove();
  };
}
