import {
  AircraftFrame,
  AircraftPlaybackStatus,
  ExerciseEntry,
} from "./playback.types";

type Coord = [number, number];

// Hệ số làm mượt góc xoay icon (0..1, càng nhỏ càng mượt)
const BEARING_SMOOTHING = 0.9;

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

// Một máy bay trong bài tập: nhận thời gian của bài tập -> trả về frame
export type AircraftTrack = {
  id: string;
  // Mốc kết thúc của máy bay (ms, tính từ lúc bài tập bắt đầu)
  endTime: number;
  sample: (elapsed: number) => AircraftFrame;
  reset: () => void;
};

export function createAircraftTrack(
  entry: ExerciseEntry,
  segmentDuration: number,
): AircraftTrack | null {
  const { aircraft } = entry;
  const points = aircraft.points;

  if (points.length === 0) return null;

  const id = String(aircraft.id);
  const color = aircraft.color ?? "red";

  const startOffset = Math.max(0, entry.startOffset ?? 0);
  const endOffset =
    entry.endOffset === undefined
      ? null
      : Math.max(entry.endOffset, startOffset);

  const duration = Math.max(0, points.length - 1) * segmentDuration;
  const endTime = endOffset ?? startOffset + duration;

  const timeline =
    points.length >= 2
      ? buildTimeline(
          points.map((p) => [p.lng, p.lat] as Coord),
          entry.path,
          segmentDuration,
        )
      : { coords: [] as Coord[], times: [] as number[] };

  // Frame "chưa xuất hiện" dùng chung, không cần tạo mới mỗi frame
  const waitingFrame: AircraftFrame = {
    id,
    color,
    status: "waiting",
    visible: false,
    position: null,
    bearing: 0,
    trail: [],
    currentPointIndex: 0,
    progress: 0,
  };

  let displayBearing: number | null = null;

  // Sau khi bay xong, frame không đổi nữa -> cache lại, không tính lại mỗi frame
  let frozenShown: AircraftFrame | null = null;
  let frozenHidden: AircraftFrame | null = null;

  // t: thời gian bay của riêng máy bay này (0..duration)
  function build(
    t: number,
    status: AircraftPlaybackStatus,
    visible: boolean,
  ): AircraftFrame {
    if (points.length === 1) {
      return {
        id,
        color,
        status,
        visible,
        position: points[0],
        bearing: 0,
        trail: [],
        currentPointIndex: 0,
        progress: 1,
      };
    }

    const { coords, times } = timeline;

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

    const currentPointIndex =
      t >= duration
        ? points.length - 1
        : Math.min(Math.floor(t / segmentDuration), points.length - 1);

    // Đường đã đi: các đỉnh phía trước + vị trí hiện tại
    const trail = coords.slice(0, k + 1);
    trail.push(position);

    return {
      id,
      color,
      status,
      visible,
      position: { lng: position[0], lat: position[1] },
      bearing: displayBearing ?? 0,
      trail,
      currentPointIndex,
      progress: duration === 0 ? 1 : Math.min(t / duration, 1),
    };
  }

  function sample(elapsed: number): AircraftFrame {
    // Chưa đến giờ xuất hiện
    if (elapsed < startOffset) return waitingFrame;

    // Quá thời gian kết thúc: ẩn máy bay, giữ nguyên vệt bay
    const ended = endOffset !== null && elapsed >= endOffset;
    const visible = !ended;

    const localTime = Math.min(elapsed, endOffset ?? Infinity) - startOffset;
    const t = Math.min(Math.max(localTime, 0), duration);
    const done = ended || t >= duration;

    if (done) {
      if (visible) return (frozenShown ??= build(t, "completed", true));
      return (frozenHidden ??= build(t, "completed", false));
    }

    return build(t, "flying", true);
  }

  function reset() {
    displayBearing = null;
    frozenShown = null;
    frozenHidden = null;
  }

  return { id, endTime, sample, reset };
}
