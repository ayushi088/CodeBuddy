"""
AI Study Buddy - Python AI Engine
Face Detection, Eye Tracking, Emotion Detection, Liveness Check
Using MediaPipe and OpenCV
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import cv2
import numpy as np
import mediapipe as mp
import base64
from typing import Optional
import math

app = FastAPI(title="Study Buddy AI Engine", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MediaPipe
mp_face_mesh = mp.solutions.face_mesh
mp_face_detection = mp.solutions.face_detection

face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

face_detection = mp_face_detection.FaceDetection(
    model_selection=1,
    min_detection_confidence=0.5
)


class FrameData(BaseModel):
    """Request model for frame analysis"""
    image: str  # Base64 encoded image
    user_id: Optional[str] = None


class AnalysisResult(BaseModel):
    """Response model for frame analysis"""
    face_detected: bool
    eye_contact: bool
    eye_contact_score: float
    emotion: str
    emotion_confidence: float
    focus_score: float
    is_looking_away: bool
    head_pose: dict
    alerts: list
    liveness_check: bool
    blink_detected: bool


# Eye landmark indices for MediaPipe Face Mesh
LEFT_EYE_INDICES = [362, 385, 387, 263, 373, 380]
RIGHT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
LEFT_IRIS_INDICES = [474, 475, 476, 477]
RIGHT_IRIS_INDICES = [469, 470, 471, 472]

# Face oval for head pose estimation
FACE_OVAL_INDICES = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 
                     397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 
                     172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]


def decode_image(base64_string: str) -> np.ndarray:
    """Decode base64 image to numpy array"""
    # Remove data URL prefix if present
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    img_bytes = base64.b64decode(base64_string)
    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    return image


def calculate_ear(eye_landmarks: list, landmarks: list, w: int, h: int) -> float:
    """Calculate Eye Aspect Ratio for blink detection"""
    def get_point(idx):
        return np.array([landmarks[idx].x * w, landmarks[idx].y * h])
    
    # Get the 6 eye landmarks
    p1 = get_point(eye_landmarks[0])
    p2 = get_point(eye_landmarks[1])
    p3 = get_point(eye_landmarks[2])
    p4 = get_point(eye_landmarks[3])
    p5 = get_point(eye_landmarks[4])
    p6 = get_point(eye_landmarks[5])
    
    # Calculate distances
    vertical1 = np.linalg.norm(p2 - p6)
    vertical2 = np.linalg.norm(p3 - p5)
    horizontal = np.linalg.norm(p1 - p4)
    
    # EAR formula
    ear = (vertical1 + vertical2) / (2.0 * horizontal)
    return ear


def calculate_gaze_ratio(iris_indices: list, eye_indices: list, landmarks: list, w: int, h: int) -> float:
    """Calculate gaze ratio to determine eye direction"""
    def get_point(idx):
        return np.array([landmarks[idx].x * w, landmarks[idx].y * h])
    
    # Get iris center
    iris_points = [get_point(idx) for idx in iris_indices]
    iris_center = np.mean(iris_points, axis=0)
    
    # Get eye corners
    eye_left = get_point(eye_indices[0])
    eye_right = get_point(eye_indices[3])
    
    # Calculate horizontal position ratio
    eye_width = np.linalg.norm(eye_right - eye_left)
    iris_pos = np.linalg.norm(iris_center - eye_left)
    
    gaze_ratio = iris_pos / eye_width if eye_width > 0 else 0.5
    return gaze_ratio


def estimate_head_pose(landmarks: list, w: int, h: int) -> dict:
    """Estimate head pose (yaw, pitch, roll) from face landmarks"""
    # Key points for pose estimation
    nose_tip = np.array([landmarks[1].x * w, landmarks[1].y * h])
    chin = np.array([landmarks[152].x * w, landmarks[152].y * h])
    left_eye = np.array([landmarks[33].x * w, landmarks[33].y * h])
    right_eye = np.array([landmarks[263].x * w, landmarks[263].y * h])
    left_mouth = np.array([landmarks[61].x * w, landmarks[61].y * h])
    right_mouth = np.array([landmarks[291].x * w, landmarks[291].y * h])
    
    # Calculate face center
    face_center = (left_eye + right_eye) / 2
    
    # Yaw (horizontal rotation)
    eye_distance = np.linalg.norm(right_eye - left_eye)
    nose_offset = nose_tip[0] - face_center[0]
    yaw = (nose_offset / eye_distance) * 60  # Scale to degrees
    
    # Pitch (vertical rotation)
    vertical_distance = np.linalg.norm(chin - face_center)
    nose_vertical_offset = nose_tip[1] - face_center[1]
    pitch = (nose_vertical_offset / vertical_distance) * 60
    
    # Roll (head tilt)
    dy = right_eye[1] - left_eye[1]
    dx = right_eye[0] - left_eye[0]
    roll = math.degrees(math.atan2(dy, dx))
    
    return {
        "yaw": float(yaw),
        "pitch": float(pitch),
        "roll": float(roll)
    }


def detect_emotion(landmarks: list, w: int, h: int) -> tuple:
    """Simple emotion detection based on facial landmarks"""
    # Get key facial points
    left_mouth = np.array([landmarks[61].x * w, landmarks[61].y * h])
    right_mouth = np.array([landmarks[291].x * w, landmarks[291].y * h])
    top_lip = np.array([landmarks[13].x * w, landmarks[13].y * h])
    bottom_lip = np.array([landmarks[14].x * w, landmarks[14].y * h])
    
    left_eyebrow = np.array([landmarks[70].x * w, landmarks[70].y * h])
    right_eyebrow = np.array([landmarks[300].x * w, landmarks[300].y * h])
    left_eye_top = np.array([landmarks[159].x * w, landmarks[159].y * h])
    right_eye_top = np.array([landmarks[386].x * w, landmarks[386].y * h])
    
    # Calculate ratios
    mouth_width = np.linalg.norm(right_mouth - left_mouth)
    mouth_height = np.linalg.norm(bottom_lip - top_lip)
    mouth_ratio = mouth_height / mouth_width if mouth_width > 0 else 0
    
    # Eyebrow raise detection
    left_brow_height = left_eyebrow[1] - left_eye_top[1]
    right_brow_height = right_eyebrow[1] - right_eye_top[1]
    avg_brow_height = (left_brow_height + right_brow_height) / 2
    
    # Simple emotion classification
    if mouth_ratio > 0.4:  # Open mouth
        return "surprised", 0.7
    elif mouth_ratio > 0.2 and avg_brow_height < -5:
        return "happy", 0.8
    elif avg_brow_height > 5:
        return "focused", 0.75
    elif mouth_ratio < 0.05:
        return "neutral", 0.6
    else:
        return "focused", 0.65


def calculate_focus_score(
    face_detected: bool,
    eye_contact: bool,
    eye_contact_score: float,
    emotion: str,
    head_pose: dict,
    blink_rate_normal: bool = True
) -> float:
    """Calculate overall focus score (0-100)"""
    if not face_detected:
        return 0.0
    
    score = 0.0
    
    # Face detection contributes 20 points
    score += 20.0
    
    # Eye contact contributes up to 40 points
    score += eye_contact_score * 40
    
    # Head pose contributes up to 25 points
    yaw_penalty = min(abs(head_pose["yaw"]) / 30, 1) * 15
    pitch_penalty = min(abs(head_pose["pitch"]) / 30, 1) * 10
    score += 25 - yaw_penalty - pitch_penalty
    
    # Emotion contributes up to 15 points
    emotion_scores = {
        "focused": 15,
        "neutral": 12,
        "happy": 10,
        "surprised": 5,
        "confused": 3,
        "tired": 2
    }
    score += emotion_scores.get(emotion, 8)
    
    return min(max(score, 0), 100)


def generate_alerts(
    face_detected: bool,
    is_looking_away: bool,
    head_pose: dict,
    blink_detected: bool,
    focus_score: float
) -> list:
    """Generate focus alerts based on analysis"""
    alerts = []
    
    if not face_detected:
        alerts.append({
            "type": "critical",
            "message": "Face not detected - Please position yourself in front of the camera",
            "code": "NO_FACE"
        })
        return alerts
    
    if is_looking_away:
        alerts.append({
            "type": "warning",
            "message": "Looking away from screen detected",
            "code": "LOOKING_AWAY"
        })
    
    if abs(head_pose["yaw"]) > 25:
        direction = "right" if head_pose["yaw"] > 0 else "left"
        alerts.append({
            "type": "info",
            "message": f"Head turned {direction} - Please face the screen",
            "code": "HEAD_TURNED"
        })
    
    if head_pose["pitch"] > 20:
        alerts.append({
            "type": "info",
            "message": "Looking down detected",
            "code": "LOOKING_DOWN"
        })
    elif head_pose["pitch"] < -20:
        alerts.append({
            "type": "info",
            "message": "Looking up detected",
            "code": "LOOKING_UP"
        })
    
    if focus_score < 30:
        alerts.append({
            "type": "warning",
            "message": "Low focus detected - Take a short break if needed",
            "code": "LOW_FOCUS"
        })
    
    return alerts


# Blink tracking state
blink_history = []
EAR_THRESHOLD = 0.2


@app.post("/analyze", response_model=AnalysisResult)
async def analyze_frame(data: FrameData):
    """Analyze a single frame for focus metrics"""
    global blink_history
    
    try:
        # Decode image
        image = decode_image(data.image)
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
        
        h, w = image.shape[:2]
        
        # Convert to RGB for MediaPipe
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Process with Face Mesh
        results = face_mesh.process(rgb_image)
        
        if not results.multi_face_landmarks:
            return AnalysisResult(
                face_detected=False,
                eye_contact=False,
                eye_contact_score=0.0,
                emotion="unknown",
                emotion_confidence=0.0,
                focus_score=0.0,
                is_looking_away=True,
                head_pose={"yaw": 0, "pitch": 0, "roll": 0},
                alerts=[{
                    "type": "critical",
                    "message": "Face not detected",
                    "code": "NO_FACE"
                }],
                liveness_check=False,
                blink_detected=False
            )
        
        landmarks = results.multi_face_landmarks[0].landmark
        
        # Calculate Eye Aspect Ratio for blink detection
        left_ear = calculate_ear(LEFT_EYE_INDICES, landmarks, w, h)
        right_ear = calculate_ear(RIGHT_EYE_INDICES, landmarks, w, h)
        avg_ear = (left_ear + right_ear) / 2
        
        # Blink detection
        blink_detected = avg_ear < EAR_THRESHOLD
        blink_history.append(blink_detected)
        if len(blink_history) > 30:
            blink_history.pop(0)
        
        # Liveness check (based on blink detection)
        liveness_check = any(blink_history) if len(blink_history) > 10 else True
        
        # Calculate gaze direction
        left_gaze = calculate_gaze_ratio(LEFT_IRIS_INDICES, LEFT_EYE_INDICES, landmarks, w, h)
        right_gaze = calculate_gaze_ratio(RIGHT_IRIS_INDICES, RIGHT_EYE_INDICES, landmarks, w, h)
        avg_gaze = (left_gaze + right_gaze) / 2
        
        # Eye contact detection (gaze ratio near center = 0.5)
        eye_contact_score = 1.0 - abs(avg_gaze - 0.5) * 2
        eye_contact_score = max(0, min(1, eye_contact_score))
        eye_contact = eye_contact_score > 0.6
        is_looking_away = eye_contact_score < 0.4
        
        # Head pose estimation
        head_pose = estimate_head_pose(landmarks, w, h)
        
        # Emotion detection
        emotion, emotion_confidence = detect_emotion(landmarks, w, h)
        
        # Calculate focus score
        focus_score = calculate_focus_score(
            face_detected=True,
            eye_contact=eye_contact,
            eye_contact_score=eye_contact_score,
            emotion=emotion,
            head_pose=head_pose
        )
        
        # Generate alerts
        alerts = generate_alerts(
            face_detected=True,
            is_looking_away=is_looking_away,
            head_pose=head_pose,
            blink_detected=blink_detected,
            focus_score=focus_score
        )
        
        return AnalysisResult(
            face_detected=True,
            eye_contact=eye_contact,
            eye_contact_score=float(eye_contact_score),
            emotion=emotion,
            emotion_confidence=float(emotion_confidence),
            focus_score=float(focus_score),
            is_looking_away=is_looking_away,
            head_pose=head_pose,
            alerts=alerts,
            liveness_check=liveness_check,
            blink_detected=blink_detected
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Study Buddy AI Engine",
        "version": "1.0.0",
        "endpoints": {
            "/analyze": "POST - Analyze frame for focus metrics",
            "/health": "GET - Health check"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
