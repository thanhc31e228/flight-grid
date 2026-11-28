import { createAircraftTrack, type AircraftTrack } from "./aircraft.playback";
import {
  AircraftFrame,
  ExerciseEntry,
  ExercisePlaybackOptions,
  PlaybackController,
  PlaybackState,
} from "./playback.types";

const DEFAULT_SEGMENT_DURATION = 10_000; // 10 giây / chặng

// Giới hạn delta mỗi frame: tab bị ẩn / lag xong quay lại sẽ không bị nhảy cóc
const MAX_FRAME_DELTA = 100;

// Chỉ đẩy state ra UI ~10 lần/giây (vị trí máy bay vẫn cập nhật mỗi frame)
const STATE_EMIT_INTERVAL = 100;

// Một đồng hồ chung cho cả bài tập: mọi máy bay bay theo cùng thời gian,
// máy bay nào có startOffset thì chỉ xuất hiện khi đồng hồ chạm mốc đó.
export function createExercisePlayback(
  entries: ExerciseEntry[],
  options: ExercisePlaybackOptions = {},
): PlaybackController {
  const segmentDuration = options.segmentDuration ?? DEFAULT_SEGMENT_DURATION;

  const tracks = entries
    .map((entry) => createAircraftTrack(entry, segmentDuration))
    .filter((track): track is AircraftTrack => track !== null);

  // Bài tập kết thúc khi máy bay cuối cùng kết thúc
  const totalTime = tracks.reduce((max, t) => Math.max(max, t.endTime), 0);

  let speedMultiplier = options.speedMultiplier ?? 1;

  let status: PlaybackState["status"] = "idle";
  let elapsedTime = 0;

  let frameId: number | null = null;
  let previousFrameTime: number | null = null;
  let lastStateEmit = 0;
  let lastFrames: AircraftFrame[] = [];

  function getState(): PlaybackState {
    return {
      status,
      progress: totalTime === 0 ? 0 : Math.min(elapsedTime / totalTime, 1),
      elapsedTime,
      totalTime,
      speedMultiplier,
      aircrafts: lastFrames.map((f) => ({
        id: f.id,
        status: f.status,
        currentPointIndex: f.currentPointIndex,
        progress: f.progress,
      })),
    };
  }

  function emitState() {
    options.onStateChange?.(getState());
  }

  function emitFrame() {
    const t = Math.min(elapsedTime, totalTime);
    lastFrames = tracks.map((track) => track.sample(t));
    options.onFrame?.(lastFrames);
  }

  function resetTracks() {
    tracks.forEach((track) => track.reset());
  }

  function finish() {
    elapsedTime = totalTime;

    status = "completed";
    frameId = null;
    previousFrameTime = null;

    emitFrame();
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

    emitFrame();

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
    if (tracks.length === 0 || status === "playing") return;

    elapsedTime = 0;
    resetTracks();

    // Không có chặng bay nào (toàn máy bay 1 điểm): hiện luôn rồi kết thúc
    if (totalTime === 0) {
      status = "completed";
      emitFrame();
      emitState();
      options.onComplete?.();
      return;
    }

    status = "playing";
    emitFrame();
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
    resetTracks();
    lastFrames = [];
    status = "idle";

    // Không emitFrame ở đây: để nơi gọi tự dọn máy bay / trail
    emitState();
  }

  function replay() {
    cancelFrame();

    elapsedTime = 0;
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
