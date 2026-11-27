import type { AirCraft } from "../types/map.types";

import type {
  PlaybackController,
  PlaybackOptions,
  PlaybackState,
} from "./playback.types";

type Coord = [number, number];

const DEFAULT_SEGMENT_DURATION = 10_000; // 10 giây / chặng

// Giới hạn delta mỗi frame: tab bị ẩn / lag xong quay lại sẽ không bị nhảy cóc
const MAX_FRAME_DELTA = 100;

// Chỉ đẩy state ra UI ~10 lần/giây (vị trí máy bay vẫn cập nhật mỗi frame)
const STATE_EMIT_INTERVAL = 100;

// Hệ số làm mượt góc xoay icon (0..1, càng nhỏ càng mượt)
const BEARING_SMOOTHING = 0.25;

// Tính hướng bay giữa 2 điểm (độ)
function calculateBearing(from: Coord, to: Coord): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(from[1]);
  const lat2 = toRad(to[1]);
  const dLng = toRad(to[0] - from[0]);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Nội suy góc theo đường ngắn nhất (tránh xoay vòng 359° -> 0°)
function lerpAngle(from: number, to: number, t: number): number {
  const diff = ((to - from + 540) % 360) - 180;
  return (from + diff * t + 360) % 360;
}

// Khoảng cách phẳng có hiệu chỉnh cos(lat) - đủ chính xác cho đoạn ngắn
function planarDistance(a: Coord, b: Coord): number {
  const k = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return Math.hypot((b[0] - a[0]) * k, b[1] - a[1]);
}

// Tìm đỉnh k lớn nhất thỏa times[k] <= t (k <= length - 2)
function findIndex(times: number[], t: number): number {
  let lo = 0;
  let hi = times.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (times[mid] <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

// Dựng timeline: mỗi đỉnh của đường bay có một mốc thời gian.
// Mỗi chặng giữa 2 waypoint vẫn đúng segmentDuration, bên trong chặng chia
// thời gian theo độ dài cung -> tốc độ đều, đi hết các đoạn bo góc.
function buildTimeline(
  waypoints: Coord[],
  path: Coord[] | undefined,
  segmentDuration: number,
) {
  const coords = path && path.length >= 2 ? path : waypoints;

  // 1. Với mỗi waypoint, tìm đỉnh của path gần nhất (đi tuần tự, không quay lại)
  const anchors: number[] = [0];
  let searchFrom = 0;

  for (let i = 1; i < waypoints.length - 1; i++) {
    let best = searchFrom;
    let bestDist = Infinity;

    for (let k = searchFrom; k < coords.length; k++) {
      const d = planarDistance(coords[k], waypoints[i]);
      if (d < bestDist) {
        bestDist = d;
        best = k;
      }
    }

    anchors.push(best);
    searchFrom = best;
  }
  anchors.push(coords.length - 1);

  // 2. Gán thời gian cho từng đỉnh trong mỗi chặng
  const times: number[] = new Array(coords.length).fill(0);

  for (let s = 0; s < anchors.length - 1; s++) {
    const a = anchors[s];
    const b = anchors[s + 1];
    const startTime = s * segmentDuration;

    const cumulative: number[] = [0];
    let length = 0;
    for (let k = a + 1; k <= b; k++) {
      length += planarDistance(coords[k - 1], coords[k]);
      cumulative.push(length);
    }

    for (let k = a; k <= b; k++) {
      const ratio =
        length === 0
          ? (k - a) / Math.max(b - a, 1)
          : cumulative[k - a] / length;
      times[k] = startTime + ratio * segmentDuration;
    }
  }

  return { coords, times };
}

export function createAircraftPlayback(
  aircraft: AirCraft,
  options: PlaybackOptions = {},
): PlaybackController {
  const points = aircraft.points;

  const segmentDuration = options.segmentDuration ?? DEFAULT_SEGMENT_DURATION;
  const totalTime = Math.max(0, points.length - 1) * segmentDuration;

  const timeline =
    points.length >= 2
      ? buildTimeline(
          points.map((p) => [p.lng, p.lat] as Coord),
          options.path,
          segmentDuration,
        )
      : { coords: [] as Coord[], times: [] as number[] };

  let speedMultiplier = options.speedMultiplier ?? 1;

  let status: PlaybackState["status"] = "idle";
  let currentPointIndex = 0;
  let elapsedTime = 0;

  let frameId: number | null = null;
  let previousFrameTime: number | null = null;
  let lastStateEmit = 0;
  let displayBearing: number | null = null;

  function getState(): PlaybackState {
    return {
      status,
      currentPointIndex,
      progress: totalTime === 0 ? 0 : Math.min(elapsedTime / totalTime, 1),
      elapsedTime,
      totalTime,
      speedMultiplier,
    };
  }

  function emitState() {
    options.onStateChange?.(getState());
  }

  function emitPosition() {
    if (points.length === 0) return;

    if (points.length === 1) {
      options.onPositionChange?.(points[0], 0, []);
      return;
    }

    const { coords, times } = timeline;
    const t = Math.min(elapsedTime, totalTime);

    const k = findIndex(times, t);
    const from = coords[k];
    const to = coords[k + 1];

    const span = times[k + 1] - times[k];
    const ratio =
      span > 0 ? Math.min(Math.max((t - times[k]) / span, 0), 1) : 1;

    const position: Coord = [
      from[0] + (to[0] - from[0]) * ratio,
      from[1] + (to[1] - from[1]) * ratio,
    ];

    // Hướng bay: lấy theo đoạn nhỏ hiện tại rồi làm mượt
    if (planarDistance(from, to) > 0) {
      const target = calculateBearing(from, to);
      displayBearing =
        displayBearing === null
          ? target
          : lerpAngle(displayBearing, target, BEARING_SMOOTHING);
    }

    currentPointIndex =
      t >= totalTime
        ? points.length - 1
        : Math.min(Math.floor(t / segmentDuration), points.length - 1);

    // Đường đã đi: các đỉnh phía trước + vị trí hiện tại
    const trail = coords.slice(0, k + 1);
    trail.push(position);

    options.onPositionChange?.(
      { lng: position[0], lat: position[1] },
      displayBearing ?? 0,
      trail,
    );
  }

  function finish() {
    elapsedTime = totalTime;
    currentPointIndex = Math.max(0, points.length - 1);

    status = "completed";
    frameId = null;
    previousFrameTime = null;

    emitPosition();
    emitState();

    options.onComplete?.();
  }

  function animate(now: number) {
    if (status !== "playing") return;

    if (previousFrameTime === null) {
      previousFrameTime = now;
    }

    const delta = Math.min(now - previousFrameTime, MAX_FRAME_DELTA);
    previousFrameTime = now;

    elapsedTime += delta * speedMultiplier;

    if (elapsedTime >= totalTime) {
      finish();
      return;
    }

    emitPosition();

    if (now - lastStateEmit >= STATE_EMIT_INTERVAL) {
      lastStateEmit = now;
      emitState();
    }

    frameId = requestAnimationFrame(animate);
  }

  function cancelFrame() {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }

    previousFrameTime = null;
  }

  function play() {
    if (points.length === 0 || status === "playing") return;

    elapsedTime = 0;
    currentPointIndex = 0;
    displayBearing = null;

    if (points.length === 1) {
      status = "completed";
      emitPosition();
      emitState();
      options.onComplete?.();
      return;
    }

    status = "playing";
    emitPosition();
    emitState();

    frameId = requestAnimationFrame(animate);
  }

  function pause() {
    if (status !== "playing") return;

    status = "paused";
    cancelFrame();
    emitState();
  }

  function resume() {
    if (status !== "paused") return;

    status = "playing";
    previousFrameTime = null;
    emitState();

    frameId = requestAnimationFrame(animate);
  }

  function stop() {
    cancelFrame();

    elapsedTime = 0;
    currentPointIndex = 0;
    displayBearing = null;
    status = "idle";

    // Không emitPosition ở đây: để nơi gọi tự dọn máy bay / trail
    emitState();
  }

  function replay() {
    cancelFrame();

    elapsedTime = 0;
    currentPointIndex = 0;
    status = "idle";

    play();
  }

  function setSpeed(speed: number) {
    if (speed <= 0) return;

    speedMultiplier = speed;
    emitState();
  }

  return {
    play,
    pause,
    resume,
    stop,
    replay,
    setSpeed,
    getState,
  };
}
