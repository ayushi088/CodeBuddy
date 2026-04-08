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
from utils.eye import detect_attention
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


def _safe_crop(frame: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> Optional[np.ndarray]:
    height, width = frame.shape[:2]
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


def _build_response(face_crop: np.ndarray) -> dict:
    emotion, emotion_conf = detect_emotion(face_crop)
    attention = detect_attention(face_crop)

    has_reference = REFERENCE_IMAGE_PATH.exists()
    is_verified = verify_user(face_crop, str(REFERENCE_IMAGE_PATH)) if has_reference else False

    if not has_reference:
        status = "Focused" if attention == "Focused" else "Distracted"
    elif not is_verified:
        status = "Unknown User"
    elif attention == "Focused":
        status = "Focused"
    else:
        status = "Distracted"

    eye_contact = attention == "Focused"
    eye_contact_score = 0.9 if eye_contact else 0.3
    is_looking_away = not eye_contact

    if status == "Unknown User":
        focus_score = 20.0
    elif eye_contact:
        focus_score = 85.0
    else:
        focus_score = 45.0

    alerts = []
    if status == "Unknown User":
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

    return {
        "face_detected": True,
        "eye_contact": eye_contact,
        "eye_contact_score": eye_contact_score,
        "emotion": emotion.lower(),
        "emotion_confidence": float(emotion_conf),
        "focus_score": focus_score,
        "is_looking_away": is_looking_away,
        "head_pose": {"yaw": 0.0, "pitch": 0.0, "roll": 0.0},
        "alerts": alerts,
        "liveness_check": True,
        "blink_detected": False,
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

    model = _load_model()
    detections = model.predict(source=frame, conf=CONFIDENCE_THRESHOLD, verbose=False)

    if not detections or len(detections) == 0 or detections[0].boxes is None or len(detections[0].boxes) == 0:
        return _absent_response()

    best_box = max(detections[0].boxes, key=lambda box: float(box.conf[0]))
    x1, y1, x2, y2 = best_box.xyxy[0].int().tolist()
    face_crop = _safe_crop(frame, x1, y1, x2, y2)

    if face_crop is None or face_crop.size == 0:
        return _absent_response()

    return _build_response(face_crop)


def run_server(host: str = "0.0.0.0", port: int = 8000) -> None:
    uvicorn.run("api_server:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    run_server()
