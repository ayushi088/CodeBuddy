"""Attention detection utilities using MediaPipe FaceMesh."""

from __future__ import annotations

import cv2
import mediapipe as mp
from math import dist
from collections import deque
from typing import Any

EAR_THRESHOLD = 0.24
EYE_STATE_WINDOW = 5
EYE_STATE_MIN_OPEN = 3
EAR_HISTORY_WINDOW = 30
EAR_OPEN_FLOOR = 0.16
EAR_DYNAMIC_FACTOR = 0.72
EAR_HYSTERESIS_MARGIN = 0.015
LANDMARK_MISS_GRACE_FRAMES = 8
EAR_BASELINE_MIN = 0.12
EAR_OPEN_RATIO = 0.60
EAR_CLOSE_RATIO = 0.48
MIN_EYE_INPUT_WIDTH = 320

# Left and right eye landmarks for Eye Aspect Ratio (EAR).
LEFT_EYE_LANDMARKS = (33, 160, 158, 133, 153, 144)
RIGHT_EYE_LANDMARKS = (362, 385, 387, 263, 373, 380)

_face_mesh = None
_fallback_face_mesh = None
_eye_open_history: deque[bool] = deque(maxlen=EYE_STATE_WINDOW)
_ear_history: deque[float] = deque(maxlen=EAR_HISTORY_WINDOW)
_landmark_miss_count = 0
_last_smoothed_eyes_open = True

try:
    if hasattr(mp, "solutions") and hasattr(mp.solutions, "face_mesh"):
        _face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.35,
        )

        # Secondary detector with less strict settings to recover difficult frames.
        _fallback_face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=False,
            min_detection_confidence=0.25,
        )
except Exception:
    _face_mesh = None
    _fallback_face_mesh = None


def _compute_eye_aspect_ratio(landmarks, eye_indices: tuple[int, int, int, int, int, int]) -> float:
    p1 = landmarks[eye_indices[0]]
    p2 = landmarks[eye_indices[1]]
    p3 = landmarks[eye_indices[2]]
    p4 = landmarks[eye_indices[3]]
    p5 = landmarks[eye_indices[4]]
    p6 = landmarks[eye_indices[5]]

    horizontal = dist((p1.x, p1.y), (p4.x, p4.y))
    if horizontal <= 1e-6:
        return 0.0

    vertical_1 = dist((p2.x, p2.y), (p6.x, p6.y))
    vertical_2 = dist((p3.x, p3.y), (p5.x, p5.y))
    return (vertical_1 + vertical_2) / (2.0 * horizontal)


def _compute_open_threshold() -> float:
    """Compute an adaptive EAR threshold from recent frames."""
    if not _ear_history:
        return EAR_THRESHOLD

    # Use the top recent EAR values as an approximation of the user's open-eye baseline.
    sorted_ears = sorted(_ear_history, reverse=True)
    baseline_sample_count = max(3, min(len(sorted_ears), 8))
    baseline = sum(sorted_ears[:baseline_sample_count]) / baseline_sample_count
    dynamic_threshold = baseline * EAR_DYNAMIC_FACTOR
    return max(EAR_OPEN_FLOOR, min(EAR_THRESHOLD, dynamic_threshold))


def _compute_baseline_ear() -> float:
    """Estimate open-eye EAR baseline from top recent measurements."""
    if not _ear_history:
        return EAR_THRESHOLD

    sorted_ears = sorted(_ear_history, reverse=True)
    baseline_sample_count = max(3, min(len(sorted_ears), 8))
    baseline = sum(sorted_ears[:baseline_sample_count]) / baseline_sample_count
    return max(EAR_BASELINE_MIN, baseline)


def _prepare_eye_input(face_bgr):
    """Upscale small crops to improve FaceMesh landmark stability."""
    if face_bgr is None or face_bgr.size == 0:
        return face_bgr

    height, width = face_bgr.shape[:2]
    if width >= MIN_EYE_INPUT_WIDTH:
        return face_bgr

    scale = MIN_EYE_INPUT_WIDTH / max(width, 1)
    resized_height = max(1, int(height * scale))
    return cv2.resize(face_bgr, (MIN_EYE_INPUT_WIDTH, resized_height), interpolation=cv2.INTER_CUBIC)


def _extract_landmarks(rgb_face) -> Any:
    """Run FaceMesh with fallback settings and return first face landmarks if present."""
    if _face_mesh is not None:
        primary_results = _face_mesh.process(rgb_face)
        if primary_results.multi_face_landmarks:
            return primary_results.multi_face_landmarks[0].landmark

    if _fallback_face_mesh is not None:
        fallback_results = _fallback_face_mesh.process(rgb_face)
        if fallback_results.multi_face_landmarks:
            return fallback_results.multi_face_landmarks[0].landmark

    return None


def detect_eye_metrics(face_bgr) -> dict:
    """Return eye metrics derived from FaceMesh landmarks for one frame."""
    global _landmark_miss_count
    global _last_smoothed_eyes_open

    if face_bgr is None or face_bgr.size == 0:
        return {
            "attention": "Distracted",
            "eyes_open": False,
            "blink_detected": False,
            "ear": 0.0,
            "eye_landmarks_detected": False,
        }

    if _face_mesh is None:
        return {
            "attention": "Distracted",
            "eyes_open": False,
            "blink_detected": False,
            "ear": 0.0,
            "eye_landmarks_detected": False,
        }

    try:
        prepared_face = _prepare_eye_input(face_bgr)
        rgb_face = cv2.cvtColor(prepared_face, cv2.COLOR_BGR2RGB)
        landmarks = _extract_landmarks(rgb_face)
        if landmarks is None:
            _landmark_miss_count += 1
            inferred_open = _last_smoothed_eyes_open if _landmark_miss_count <= LANDMARK_MISS_GRACE_FRAMES else False
            return {
                "attention": "Focused" if inferred_open else "Distracted",
                "eyes_open": inferred_open,
                "blink_detected": False,
                "ear": 0.0,
                "eye_landmarks_detected": False,
            }

        _landmark_miss_count = 0
        left_ear = _compute_eye_aspect_ratio(landmarks, LEFT_EYE_LANDMARKS)
        right_ear = _compute_eye_aspect_ratio(landmarks, RIGHT_EYE_LANDMARKS)
        ear = (left_ear + right_ear) / 2.0

        _ear_history.append(ear)
        baseline_ear = _compute_baseline_ear()
        ear_ratio = ear / max(baseline_ear, 1e-6)
        open_threshold = _compute_open_threshold()
        close_threshold = max(EAR_OPEN_FLOOR, open_threshold - EAR_HYSTERESIS_MARGIN)

        # Apply hysteresis to avoid rapid flips around the decision boundary.
        previous_state = _eye_open_history[-1] if _eye_open_history else True
        open_signal = ear >= open_threshold or ear_ratio >= EAR_OPEN_RATIO
        close_signal = ear <= close_threshold and ear_ratio <= EAR_CLOSE_RATIO

        if open_signal:
            raw_eyes_open = True
        elif close_signal:
            raw_eyes_open = False
        else:
            raw_eyes_open = previous_state

        _eye_open_history.append(raw_eyes_open)
        eyes_open = sum(_eye_open_history) >= EYE_STATE_MIN_OPEN
        blink_detected = _last_smoothed_eyes_open and not eyes_open
        _last_smoothed_eyes_open = eyes_open

        return {
            "attention": "Focused" if eyes_open else "Distracted",
            "eyes_open": eyes_open,
            "blink_detected": blink_detected,
            "ear": ear,
            "eye_landmarks_detected": True,
            "eye_open_threshold": open_threshold,
            "eye_baseline_ear": baseline_ear,
            "eye_ear_ratio": ear_ratio,
        }
    except Exception:
        return {
            "attention": "Distracted",
            "eyes_open": False,
            "blink_detected": False,
            "ear": 0.0,
            "eye_landmarks_detected": False,
        }


def detect_attention(face_bgr) -> str:
    """Backward-compatible attention helper."""
    return str(detect_eye_metrics(face_bgr).get("attention", "Distracted"))
