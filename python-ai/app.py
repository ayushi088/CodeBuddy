"""Real-time StudyBuddy monitoring app using YOLOv8, FER, MediaPipe, and DeepFace."""

from __future__ import annotations

import time
from concurrent.futures import Future, ThreadPoolExecutor
from pathlib import Path
from typing import Dict, List, Tuple

import cv2
from ultralytics import YOLO

from utils.emotion import detect_emotion
from utils.eye import detect_attention
from utils.recognition import verify_user

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "best.pt"
REFERENCE_IMAGE_PATH = BASE_DIR / "model" / "user.jpg"

CAMERA_INDEX = 0
CONFIDENCE_THRESHOLD = 0.35
ANALYSIS_INTERVAL = 4
MAX_ANALYSIS_WORKERS = 2


def _safe_crop(frame, x1: int, y1: int, x2: int, y2: int):
    """Crop a face region safely from frame bounds."""
    height, width = frame.shape[:2]
    x1 = max(0, min(x1, width - 1))
    y1 = max(0, min(y1, height - 1))
    x2 = max(1, min(x2, width))
    y2 = max(1, min(y2, height))

    if x2 <= x1 or y2 <= y1:
        return None
    return frame[y1:y2, x1:x2]


def analyze_face(face_crop, reference_image: str) -> Dict[str, object]:
    """Run emotion, attention, and recognition for one cropped face."""
    emotion, emotion_conf = detect_emotion(face_crop)
    attention = detect_attention(face_crop)
    is_user = verify_user(face_crop, reference_image)

    if not is_user:
        status = "Unknown User"
    elif attention == "Focused":
        status = "Focused"
    else:
        status = "Distracted"

    return {
        "emotion": emotion,
        "emotion_confidence": float(emotion_conf),
        "attention": attention,
        "verified": is_user,
        "status": status,
    }


def _default_face_result() -> Dict[str, object]:
    return {
        "emotion": "Analyzing",
        "emotion_confidence": 0.0,
        "attention": "Analyzing",
        "verified": False,
        "status": "Analyzing",
    }


def _draw_face_overlay(frame, box: Tuple[int, int, int, int], result: Dict[str, object]) -> None:
    x1, y1, x2, y2 = box

    status = str(result.get("status", "Unknown"))
    verified = bool(result.get("verified", False))
    emotion = str(result.get("emotion", "Unknown"))
    conf = float(result.get("emotion_confidence", 0.0))
    attention = str(result.get("attention", "Unknown"))

    if status == "Unknown User":
        color = (0, 0, 255)
    elif attention == "Focused":
        color = (0, 220, 0)
    else:
        color = (0, 180, 255)

    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

    label_lines = [
        f"Status: {status}",
        f"Emotion: {emotion} ({conf:.2f})",
        f"Attention: {attention}",
        f"User: {'Verified' if verified else 'Unverified'}",
    ]

    start_y = max(20, y1 - 10)
    for idx, line in enumerate(label_lines):
        y = start_y + idx * 18
        cv2.putText(frame, line, (x1, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2, cv2.LINE_AA)


def main() -> None:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"YOLO model not found at: {MODEL_PATH}")

    if not REFERENCE_IMAGE_PATH.exists():
        print(f"Warning: Reference image not found at: {REFERENCE_IMAGE_PATH}")
        print("User verification will remain Unverified until model/user.jpg is added.")

    model = YOLO(str(MODEL_PATH))

    camera = cv2.VideoCapture(CAMERA_INDEX)
    if not camera.isOpened():
        raise RuntimeError("Could not open webcam. Check camera permissions or index.")

    print("Press ESC to exit...")

    frame_count = 0
    last_fps_time = time.time()
    fps = 0.0

    face_cache: Dict[int, Dict[str, object]] = {}
    pending_jobs: Dict[int, Future] = {}

    with ThreadPoolExecutor(max_workers=MAX_ANALYSIS_WORKERS) as executor:
        try:
            while True:
                grabbed, frame = camera.read()
                if not grabbed:
                    print("Warning: Failed to read frame from webcam.")
                    continue

                frame_count += 1
                now = time.time()
                elapsed = now - last_fps_time
                if elapsed >= 1.0:
                    fps = frame_count / elapsed
                    frame_count = 0
                    last_fps_time = now

                detections = model.predict(
                    source=frame,
                    conf=CONFIDENCE_THRESHOLD,
                    verbose=False,
                )

                boxes: List[Tuple[int, int, int, int]] = []
                if detections and len(detections) > 0 and detections[0].boxes is not None:
                    for box in detections[0].boxes:
                        x1, y1, x2, y2 = box.xyxy[0].int().tolist()
                        boxes.append((x1, y1, x2, y2))

                if not boxes:
                    cv2.putText(
                        frame,
                        "Status: Absent",
                        (20, 35),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.9,
                        (0, 0, 255),
                        2,
                        cv2.LINE_AA,
                    )
                else:
                    stale_keys = set(face_cache.keys()) - set(range(len(boxes)))
                    for key in stale_keys:
                        face_cache.pop(key, None)
                        pending_jobs.pop(key, None)

                    for idx, (x1, y1, x2, y2) in enumerate(boxes):
                        face_crop = _safe_crop(frame, x1, y1, x2, y2)
                        if face_crop is None:
                            continue

                        run_heavy_analysis = frame_count % ANALYSIS_INTERVAL == 0
                        if run_heavy_analysis and idx not in pending_jobs:
                            pending_jobs[idx] = executor.submit(
                                analyze_face,
                                face_crop.copy(),
                                str(REFERENCE_IMAGE_PATH),
                            )

                        if idx in pending_jobs and pending_jobs[idx].done():
                            try:
                                face_cache[idx] = pending_jobs[idx].result()
                            except Exception:
                                face_cache[idx] = _default_face_result()
                            finally:
                                pending_jobs.pop(idx, None)

                        result = face_cache.get(idx, _default_face_result())
                        _draw_face_overlay(frame, (x1, y1, x2, y2), result)

                cv2.putText(
                    frame,
                    f"FPS: {fps:.1f}",
                    (20, 70),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    (255, 255, 255),
                    2,
                    cv2.LINE_AA,
                )

                cv2.imshow("StudyBuddy AI Monitor", frame)

                key = cv2.waitKey(1) & 0xFF
                if key == 27:  # ESC
                    break
        finally:
            camera.release()
            cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
