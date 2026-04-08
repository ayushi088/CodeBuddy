"""Attention detection utilities using MediaPipe FaceMesh."""

from __future__ import annotations

import cv2
import mediapipe as mp

_face_mesh = None

try:
    if hasattr(mp, "solutions") and hasattr(mp.solutions, "face_mesh"):
        _face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
        )
except Exception:
    _face_mesh = None


def detect_attention(face_bgr) -> str:
    """Return Focused when landmarks are present, otherwise Distracted."""
    if face_bgr is None or face_bgr.size == 0:
        return "Distracted"

    if _face_mesh is None:
        return "Distracted"

    try:
        rgb_face = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
        results = _face_mesh.process(rgb_face)
        if results.multi_face_landmarks:
            return "Focused"
        return "Distracted"
    except Exception:
        return "Distracted"
