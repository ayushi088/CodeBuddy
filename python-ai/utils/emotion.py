"""Emotion detection utilities using FER."""

from __future__ import annotations

import importlib
from typing import Tuple

import cv2

_emotion_detector = None
_fer_available = False

try:
    fer_module = importlib.import_module("fer")
    _emotion_detector = fer_module.FER(mtcnn=False)
    _fer_available = True
except Exception:
    _emotion_detector = None
    _fer_available = False


def detect_emotion(face_bgr) -> Tuple[str, float]:
    """Return top emotion label and confidence for a cropped face image."""
    if face_bgr is None or face_bgr.size == 0:
        return "Unknown", 0.0

    if not _fer_available or _emotion_detector is None:
        return "Unknown", 0.0

    try:
        face_rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
        detections = _emotion_detector.detect_emotions(face_rgb)
        if not detections:
            return "Neutral", 0.0

        emotions = detections[0].get("emotions", {})
        if not emotions:
            return "Unknown", 0.0

        label, confidence = max(emotions.items(), key=lambda item: item[1])
        return label.capitalize(), float(confidence)
    except Exception:
        return "Unknown", 0.0
