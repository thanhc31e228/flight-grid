import type { Point } from "../types/map.types";

export type PlaybackStatus = "idle" | "playing" | "paused" | "completed";

export type PlaybackState = {
  status: PlaybackStatus;
  currentPointIndex: number;
  progress: number;
  elapsedTime: number;
  totalTime: number;
  speedMultiplier: number;
};

export type PlaybackOptions = {
  segmentDuration?: number;
  speedMultiplier?: number;

  // Đường đã bo góc (chính là đường đang vẽ trên map).
  // Không truyền thì bay thẳng giữa các waypoint.
  path?: [number, number][];

  // trail: các tọa độ đã đi qua + vị trí hiện tại
  onPositionChange?: (
    position: Point,
    bearing: number,
    trail: [number, number][],
  ) => void;

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
