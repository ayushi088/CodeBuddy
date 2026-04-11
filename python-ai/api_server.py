"""FastAPI server for StudyBuddy AI analysis endpoints."""

from __future__ import annotations

import base64
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from ultralytics import YOLO

from utils.emotion import detect_emotion
from utils.eye import detect_eye_metrics
from utils.recognition import verify_user

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "best.pt"
REFERENCE_IMAGE_PATH = BASE_DIR / "model" / "user.jpg"
CONFIDENCE_THRESHOLD = 0.35


class FrameData(BaseModel):
    image: str
    user_id: Optional[str] = None


app = FastAPI(title="StudyBuddy AI Engine", version="2.0.0")
_model: Optional[YOLO] = None


def _load_model() -> YOLO:
    global _model
    if _model is not None:
        return _model

    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"YOLO model not found at: {MODEL_PATH}")

    _model = YOLO(str(MODEL_PATH))
    return _model


def _decode_base64_image(image_data: str) -> np.ndarray:
    if not image_data:
        raise ValueError("Empty image data")

    if "," in image_data:
        image_data = image_data.split(",", 1)[1]

    raw = base64.b64decode(image_data)
    arr = np.frombuffer(raw, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Invalid image payload")
    return frame


def _safe_crop(
    frame: np.ndarray,
    x1: int,
    y1: int,
    x2: int,
    y2: int,
    padding_ratio: float = 0.0,
) -> Optional[np.ndarray]:
    height, width = frame.shape[:2]

    if padding_ratio > 0:
        pad_x = int((x2 - x1) * padding_ratio)
        pad_y = int((y2 - y1) * padding_ratio)
        x1 -= pad_x
        y1 -= pad_y
        x2 += pad_x
        y2 += pad_y

    x1 = max(0, min(x1, width - 1))
    y1 = max(0, min(y1, height - 1))
    x2 = max(1, min(x2, width))
    y2 = max(1, min(y2, height))

    if x2 <= x1 or y2 <= y1:
        return None
    return frame[y1:y2, x1:x2]


def _absent_response() -> dict:
    return {
        "face_detected": False,
        "eyes_open": False,
        "eye_contact": False,
        "eye_contact_score": 0.0,
        "emotion": "unknown",
        "emotion_confidence": 0.0,
        "focus_score": 0.0,
        "is_looking_away": True,
        "head_pose": {"yaw": 0.0, "pitch": 0.0, "roll": 0.0},
        "alerts": [{"type": "critical", "message": "Face not detected", "code": "NO_FACE"}],
        "liveness_check": False,
        "blink_detected": False,
        "status": "Absent",
    }


def _analysis_error_response(message: str) -> dict:
    response = _absent_response()
    response["status"] = "Analyzing"
    response["alerts"] = [
        {
            "type": "warning",
            "message": message,
            "code": "ANALYSIS_ERROR",
        }
    ]
    return response


def _build_response(
    face_crop: np.ndarray,
    frame_shape: tuple[int, int],
    bbox: tuple[int, int, int, int],
    eye_metrics: dict,
) -> dict:
    emotion, emotion_conf = detect_emotion(face_crop)
    attention = str(eye_metrics.get("attention", "Distracted"))
    eyes_open = bool(eye_metrics.get("eyes_open", False))
    blink_detected = bool(eye_metrics.get("blink_detected", False))
    eye_landmarks_detected = bool(eye_metrics.get("eye_landmarks_detected", False))

    frame_height, frame_width = frame_shape
    x1, y1, x2, y2 = bbox
    face_width = max(0, x2 - x1)
    face_height = max(0, y2 - y1)
    frame_area = max(1, frame_width * frame_height)
    face_area_ratio = float((face_width * face_height) / frame_area)

    # Liveness heuristic: tiny faces with missing eye landmarks are typically
    # replay/photo attacks or subjects too far for reliable verification.
    spoof_suspected = (
        (face_area_ratio < 0.10 and not eye_landmarks_detected)
        or (face_area_ratio < 0.14 and not eye_landmarks_detected and not blink_detected and not eyes_open)
    )

    has_reference = REFERENCE_IMAGE_PATH.exists()
    is_verified = verify_user(face_crop, str(REFERENCE_IMAGE_PATH)) if has_reference else False

    if spoof_suspected:
        status = "Spoof Suspected"
    elif not has_reference:
        status = "Focused" if attention == "Focused" else "Distracted"
    elif not is_verified:
        status = "Unknown User"
    elif attention == "Focused":
        status = "Focused"
    else:
        status = "Distracted"

    eye_contact = attention == "Focused" and eyes_open
    eye_contact_score = 0.9 if eye_contact else 0.3
    is_looking_away = not eye_contact

    if status == "Spoof Suspected":
        focus_score = 10.0
    elif status == "Unknown User":
        focus_score = 20.0
    elif not eyes_open:
        focus_score = 25.0
    elif eye_contact:
        focus_score = 85.0
    else:
        focus_score = 45.0

    alerts = []
    if status == "Spoof Suspected":
        alerts.append(
            {
                "type": "critical",
                "message": "Possible photo/replay spoof detected",
                "code": "SPOOF_SUSPECTED",
            }
        )
    elif status == "Unknown User":
        alerts.append(
            {
                "type": "warning",
                "message": "Face does not match reference user",
                "code": "UNKNOWN_USER",
            }
        )
    elif is_looking_away:
        alerts.append(
            {
                "type": "warning",
                "message": "Looking away from screen detected",
                "code": "LOOKING_AWAY",
            }
        )

    if eye_landmarks_detected and not eyes_open:
        alerts.append(
            {
                "type": "warning",
                "message": "Eyes appear closed",
                "code": "EYES_CLOSED",
            }
        )

    if face_area_ratio < 0.10:
        alerts.append(
            {
                "type": "warning",
                "message": "Face appears too small or far for reliable verification",
                "code": "FACE_TOO_SMALL",
            }
        )

    return {
        "face_detected": True,
        "face_bbox": {
            "x1": int(x1),
            "y1": int(y1),
            "x2": int(x2),
            "y2": int(y2),
        },
        "face_area_ratio": face_area_ratio,
        "eyes_open": eyes_open,
        "eye_landmarks_detected": eye_landmarks_detected,
        "eye_contact": eye_contact,
        "eye_contact_score": eye_contact_score,
        "emotion": emotion.lower(),
        "emotion_confidence": float(emotion_conf),
        "focus_score": focus_score,
        "is_looking_away": is_looking_away,
        "head_pose": {"yaw": 0.0, "pitch": 0.0, "roll": 0.0},
        "alerts": alerts,
        "liveness_check": not spoof_suspected,
        "blink_detected": blink_detected,
        "status": status,
        "attention": attention,
        "verified": is_verified,
    }


@app.on_event("startup")
def _startup() -> None:
    _load_model()


@app.get("/health")
def health() -> dict:
    return {"status": "healthy", "model": str(MODEL_PATH), "reference": str(REFERENCE_IMAGE_PATH)}


@app.post("/analyze")
def analyze(payload: FrameData) -> dict:
    try:
        frame = _decode_base64_image(payload.image)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {exc}") from exc

    try:
        model = _load_model()
        detections = model.predict(source=frame, conf=CONFIDENCE_THRESHOLD, verbose=False)
    except Exception as exc:
        print(f"AI analyze inference error: {exc}")
        return _analysis_error_response("AI inference temporarily unavailable")

    if not detections or len(detections) == 0 or detections[0].boxes is None or len(detections[0].boxes) == 0:
        return _absent_response()

    try:
        best_box = max(detections[0].boxes, key=lambda box: float(box.conf[0]))
        x1, y1, x2, y2 = best_box.xyxy[0].int().tolist()
        face_crop = _safe_crop(frame, x1, y1, x2, y2)
        eye_crop = _safe_crop(frame, x1, y1, x2, y2, padding_ratio=0.18)

        if face_crop is None or face_crop.size == 0:
            return _absent_response()

        if eye_crop is not None and eye_crop.size > 0:
            face_crop_for_eyes = eye_crop
        else:
            face_crop_for_eyes = face_crop

        frame_height, frame_width = frame.shape[:2]
        eye_metrics = detect_eye_metrics(face_crop_for_eyes)
        if not bool(eye_metrics.get("eye_landmarks_detected", False)):
            eye_metrics = detect_eye_metrics(face_crop)
        if not bool(eye_metrics.get("eye_landmarks_detected", False)):
            eye_metrics = detect_eye_metrics(frame)
        response = _build_response(face_crop, (frame_height, frame_width), (x1, y1, x2, y2), eye_metrics)
        return response
    except Exception as exc:
        print(f"AI analyze post-processing error: {exc}")
        return _analysis_error_response("AI analysis temporarily unavailable")


def run_server(host: str = "0.0.0.0", port: int = 8000) -> None:
    uvicorn.run("api_server:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    run_server()
