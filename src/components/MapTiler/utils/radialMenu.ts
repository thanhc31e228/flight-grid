import type { Map as MapLibreMap } from "maplibre-gl";

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

  const radius = 85;
  const hoverThreshold = 20;

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

  // CSS
  const style = document.createElement("style");
  style.textContent = `
    .radial-menu-item {
      position: absolute;
      width: 66px;
      height: 66px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(25, 35, 50, 0.95);
      color: white;
      border: 1px solid rgba(255,255,255,0.35);
      font-size: 12px;
      font-weight: 600;
      transform: translate(-50%, -50%);
      transition: background 0.12s, scale 0.12s, border 0.12s;
      white-space: nowrap;
    }

    .radial-menu-item.active {
      background: #2196f3;
      border: 2px solid white;
      scale: 1.15;
      box-shadow: 0 0 12px rgba(33,150,243,0.8);
    }

    .radial-menu-center {
      position: absolute;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: white;
      transform: translate(-50%, -50%);
    }
  `;

  document.head.appendChild(style);

  const buttons: HTMLDivElement[] = [];

  // Tạo các mục menu theo hình tròn
  items.forEach((item, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / items.length;

    const button = document.createElement("div");
    button.className = "radial-menu-item";
    button.textContent = item.label;

    button.style.left = `${Math.cos(angle) * radius}px`;
    button.style.top = `${Math.sin(angle) * radius}px`;

    menu.appendChild(button);
    buttons.push(button);
  });

  const centerPoint = document.createElement("div");
  centerPoint.className = "radial-menu-center";
  menu.appendChild(centerPoint);

  function showMenu() {
    if (!lastPointer || isOpen) return;

    center = { ...lastPointer };
    menu.style.left = `${center.x}px`;
    menu.style.top = `${center.y}px`;
    menu.style.display = "block";

    isOpen = true;
    activeIndex = -1;
  }

  function hideMenu() {
    menu.style.display = "none";
    isOpen = false;
    activeIndex = -1;

    buttons.forEach((button) => {
      button.classList.remove("active");
    });
  }
  function selectMenu() {
    if (!isOpen || activeIndex < 0) {
      hideMenu();
      return;
    }

    const selectedItem = items[activeIndex];

    if (!selectedItem || !center) {
      hideMenu();
      return;
    }

    const selectedPoint = { ...center };

    // Đóng menu trước khi thực hiện action
    hideMenu();

    // Callback trả về item được chọn
    options.onSelect(selectedItem, selectedPoint);
  }
  function updateHover(mouseX: number, mouseY: number) {
    if (!center || !isOpen) return;

    const dx = mouseX - center.x;
    const dy = mouseY - center.y;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < hoverThreshold) {
      activeIndex = -1;
    } else {
      // Góc bắt đầu từ hướng trên và chạy theo chiều kim đồng hồ
      const angle = Math.atan2(dy, dx) + Math.PI / 2;
      const normalizedAngle = (angle + Math.PI * 2) % (Math.PI * 2);

      const sectorSize = (Math.PI * 2) / items.length;

      activeIndex = Math.round(normalizedAngle / sectorSize) % items.length;
    }

    buttons.forEach((button, index) => {
      button.classList.toggle("active", index === activeIndex);
    });
  }

  function onMouseMove(e: MouseEvent) {
    const rect = container.getBoundingClientRect();

    lastPointer = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    if (e.ctrlKey && !isOpen) {
      showMenu();
    }

    updateHover(lastPointer.x, lastPointer.y);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "Control" || e.repeat) return;

    showMenu();
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.key === "Control") {
      selectMenu();
    }
  }

  function onBlur() {
    hideMenu();
  }

  container.addEventListener("mousemove", onMouseMove);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  return () => {
    container.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);

    menu.remove();
    style.remove();
  };
}
