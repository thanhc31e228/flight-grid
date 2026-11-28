import type { AirCraft, Point } from "../types/map.types";

export type PlaybackStatus = "idle" | "playing" | "paused" | "completed";

// Trạng thái của TỪNG máy bay trong bài tập
// waiting: chưa đến giờ xuất hiện | flying: đang bay | completed: đã bay xong / đã kết thúc
export type AircraftPlaybackStatus = "waiting" | "flying" | "completed";

// Một "khung hình" của một máy bay tại thời điểm hiện tại của bài tập
export type AircraftFrame = {
  id: string;
  color: string;
  status: AircraftPlaybackStatus;

  // false: không vẽ icon máy bay (chưa xuất hiện hoặc đã qua thời gian kết thúc)
  visible: boolean;
  position: Point | null;
  bearing: number;

  // Các tọa độ đã đi qua + vị trí hiện tại
  trail: [number, number][];

  currentPointIndex: number;
  progress: number; // 0..1 của riêng máy bay này
};

export type AircraftProgress = Pick<
  AircraftFrame,
  "id" | "status" | "currentPointIndex" | "progress"
>;

export type PlaybackState = {
  status: PlaybackStatus;
  progress: number; // tiến độ cả bài tập
  elapsedTime: number; // ms tính từ lúc máy bay đầu tiên cất cánh
  totalTime: number;
  speedMultiplier: number;
  aircrafts: AircraftProgress[];
};

// Một máy bay tham gia bài tập
export type ExerciseEntry = {
  aircraft: AirCraft;

  // Thời điểm xuất hiện (ms) tính từ lúc bài tập bắt đầu.
  // Máy bay đầu tiên = 0, các máy bay sau = thời gian xuất hiện tương ứng.
  startOffset?: number;

  // Thời điểm kết thúc (ms) tính từ lúc bài tập bắt đầu.
  // Tới mốc này máy bay biến mất (vệt bay vẫn giữ lại).
  // Không truyền thì bay hết đường rồi đứng yên ở điểm cuối.
  endOffset?: number;

  // Đường đã bo góc (chính là đường đang vẽ trên map).
  // Không truyền thì bay thẳng giữa các waypoint.
  path?: [number, number][];
};

export type ExercisePlaybackOptions = {
  segmentDuration?: number;
  speedMultiplier?: number;

  // Gọi 1 lần mỗi frame với frame của TẤT CẢ máy bay -> setData 1 lần cho map
  onFrame?: (frames: AircraftFrame[]) => void;

  onStateChange?: (state: PlaybackState) => void;
  onComplete?: () => void;
};

export type PlaybackController = {
  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  replay: () => void;
  setSpeed: (speed: number) => void;
  getState: () => PlaybackState;
};
