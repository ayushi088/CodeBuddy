"""Face recognition utilities using DeepFace."""

from __future__ import annotations

import importlib
from pathlib import Path

_deepface_available = False
DeepFace = None

try:
    deepface_module = importlib.import_module("deepface")
    DeepFace = deepface_module.DeepFace
    _deepface_available = True
except Exception:
    DeepFace = None
    _deepface_available = False


def verify_user(face_bgr, reference_image: str) -> bool:
    """Compare cropped face with reference image and return verification status."""
    if face_bgr is None or face_bgr.size == 0:
        return False

    if not _deepface_available or DeepFace is None:
        return False

    if not Path(reference_image).exists():
        return False

    try:
        result = DeepFace.verify(
            img1_path=face_bgr,
            img2_path=reference_image,
            detector_backend="skip",
            enforce_detection=False,
            model_name="VGG-Face",
            distance_metric="cosine",
            silent=True,
        )
        return bool(result.get("verified", False))
    except Exception:
        return False
