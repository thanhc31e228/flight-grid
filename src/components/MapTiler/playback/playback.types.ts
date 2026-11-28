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
  elapsedTime: number; // ms tính từ lúc bấm Phát (mốc 0 = lúc bắt đầu ghi)
  totalTime: number;
  speedMultiplier: number;
  aircrafts: AircraftProgress[];
};

// Một máy bay tham gia bài tập
export type ExerciseEntry = {
  aircraft: AirCraft;

  // Thời điểm xuất hiện (ms) tính từ mốc 0 của bài tập (= lúc bấm "Bắt đầu ghi").
  // Tự ghi khi click tạo máy bay lúc đang ghi, hoặc nhập tay "xuất hiện từ phút".
  startOffset?: number;

  // Thời điểm kết thúc (ms) tính từ lúc bài tập bắt đầu.
  // Tới mốc này máy bay biến mất (vệt bay vẫn giữ lại).
  // Không truyền thì bay hết đường rồi đứng yên ở điểm cuối.
  endOffset?: number;

  // Đường đã bo góc (chính là đường đang vẽ trên map).
  // Không truyền thì bay thẳng giữa các waypoint.
  path?: [number, number][];

  // Xuất hiện khi máy bay khác bay tới point thứ pointIndex.
  // Có field này thì nó ghi đè startOffset.
  // pointIndex tính theo số chặng đã bay: 3 chặng x 30s = 1p30s.
  appearAfter?: {
    aircraftId: string;
    pointIndex: number;
    // ms cộng thêm (tùy chọn), mặc định 0
    delay?: number;
  };
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
  /** Nhảy tới vị trí progress (0..1), giữ nguyên trạng thái playing/paused */
  seekTo: (progress: number) => void;
};
