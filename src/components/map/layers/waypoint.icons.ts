import type { Map as MapLibreMap } from "maplibre-gl";

/** Thêm icon SDF (màu thật lấy từ `icon-color`, nên vẽ bằng màu trắng). */
function addSdfImage(
  map: MapLibreMap,
  name: string,
  size: number,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
) {
  if (map.hasImage(name)) return;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  draw(ctx, size);

  map.addImage(name, ctx.getImageData(0, 0, size, size), { sdf: true });
}

function addWaypointCircleImage(map: MapLibreMap) {
  addSdfImage(map, "waypoint-circle", 50, (ctx, size) => {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 12, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function addWaypointPlaneImage(map: MapLibreMap) {
  addSdfImage(map, "waypoint-plane", 64, (ctx, size) => {
    const c = size / 2;

    // Nửa trên của máy bay (mũi tại x = 28), sẽ xoay để mũi hướng lên trên
    const half: [number, number][] = [
      [28, 0],
      [22, -3],
      [6, -4],
      [-6, -27],
      [-12, -27],
      [-9, -4],
      [-20, -3],
      [-25, -11],
      [-29, -11],
      [-28, 0],
    ];
    // Lật đối xứng để có nửa dưới
    const lower = half
      .slice(1, -1)
      .reverse()
      .map(([x, y]): [number, number] => [x, -y]);

    ctx.fillStyle = "#ffffff"; // SDF: màu thật lấy từ icon-color
    ctx.beginPath();
    [...half, ...lower].forEach(([x, y], i) => {
      // (x, y) -> (y, -x): xoay 90° để mũi hướng lên trên
      const px = c + y;
      const py = c - x;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
  });
}

function addWaypointTickImage(map: MapLibreMap) {
  addSdfImage(map, "waypoint-tick", 64, (ctx, size) => {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2); // gốc vạch tại tâm
    ctx.lineTo(size - 4, size / 2); // đầu vạch bên phải
    ctx.stroke();
  });
}

/** Đăng ký toàn bộ icon waypoint (vòng tròn, vạch, máy bay). */
export function addWaypointImages(map: MapLibreMap) {
  addWaypointCircleImage(map);
  addWaypointTickImage(map);
  addWaypointPlaneImage(map);
}
