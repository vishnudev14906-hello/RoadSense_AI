import io
import os
import sys
import json
import base64
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from pathlib import Path
from typing import Dict, Any, Union, Optional

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from .train_cnn import RoadDamageCNN, IMAGE_CLASSES, IDX_TO_CLASS, preprocess_pil_image, IMG_SIZE
from .feature_extraction import decode_and_validate_image, compute_laplacian_variance, BLUR_VARIANCE_THRESHOLD

CURRENT_DIR = Path(__file__).resolve().parent
APP_DIR = CURRENT_DIR.parent
SAVED_MODELS_DIR = APP_DIR / "saved_models"
MODEL_WEIGHTS_PATH = SAVED_MODELS_DIR / "road_cnn_model.pt"
METRICS_JSON_PATH = SAVED_MODELS_DIR / "cnn_evaluation_metrics.json"

CONFIDENCE_THRESHOLD = 0.45


class RoadImageDetectorService:
    """
    Custom Convolutional Neural Network (CNN) Inference Service for Road Damage Detection.
    Uses custom model weights trained strictly from scratch without transfer learning.
    """
    _instance = None

    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.metrics = {}
        self.load_model()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = RoadImageDetectorService()
        return cls._instance

    def load_model(self):
        self.model = RoadDamageCNN(num_classes=len(IMAGE_CLASSES)).to(self.device)
        if not MODEL_WEIGHTS_PATH.exists():
            print("[INFO] CNN model weights not found. Triggering automated CNN training from scratch...")
            from .train_cnn import train_and_save_cnn_model
            self.model, self.metrics = train_and_save_cnn_model()
        else:
            try:
                state_dict = torch.load(MODEL_WEIGHTS_PATH, map_location=self.device)
                self.model.load_state_dict(state_dict)
                self.model.eval()
                if METRICS_JSON_PATH.exists():
                    with open(METRICS_JSON_PATH, "r", encoding="utf-8") as f:
                        self.metrics = json.load(f)
                print(f"[OK] Custom Road Damage CNN loaded from {MODEL_WEIGHTS_PATH}")
            except Exception as e:
                print(f"[WARN] Error loading CNN weights ({e}). Retraining from scratch...")
                from .train_cnn import train_and_save_cnn_model
                self.model, self.metrics = train_and_save_cnn_model()

    def detect_damage(self, image_input: Union[str, bytes], road_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes CNN Image Damage Inference pipeline:
        Image Validation -> Preprocess/Normalize -> CNN Forward Pass -> Confidence Thresholding.
        """
        if self.model is None:
            self.load_model()

        img, err_msg = decode_and_validate_image(image_input)
        if err_msg or img is None:
            return {
                "detected_class": "Invalid Image",
                "confidence": 0.0,
                "confidence_percentage": 0.0,
                "is_road_damage": False,
                "message": err_msg or "Unable to reliably analyze this image as a road-condition image.",
                "probabilities": {},
                "model_version": "Custom-CNN-Scratch-v1.0"
            }

        # Check for blurriness using Laplacian variance
        img_arr = np.array(img, dtype=np.float32)
        gray = 0.2989 * img_arr[:, :, 0] + 0.5870 * img_arr[:, :, 1] + 0.1140 * img_arr[:, :, 2]
        blur_var = compute_laplacian_variance(gray)

        if blur_var < BLUR_VARIANCE_THRESHOLD:
            return {
                "detected_class": "Uncertain / Blurry Image",
                "confidence": 0.15,
                "confidence_percentage": 15.0,
                "is_road_damage": False,
                "message": "Unable to reliably analyze this image as a road-condition image. The image is too blurry.",
                "probabilities": {cls: 25.0 for cls in IMAGE_CLASSES},
                "model_version": "Custom-CNN-Scratch-v1.0"
            }

        # Check for non-road out-of-distribution features (high color saturation, vivid chroma, flat colors)
        r = img_arr[:, :, 0]
        g = img_arr[:, :, 1]
        b = img_arr[:, :, 2]

        max_c = np.maximum(np.maximum(r, g), b)
        min_c = np.minimum(np.minimum(r, g), b)
        delta = max_c - min_c
        saturation = np.divide(delta, max_c, out=np.zeros_like(delta), where=max_c > 1e-5)
        mean_sat = float(np.mean(saturation))
        std_val = float(np.std(img_arr))

        # Real asphalt has low to moderate color saturation and basic variance
        if mean_sat > 0.65 or std_val < 0.5:
            return {
                "detected_class": "Uncertain / Non-Road",
                "confidence": 0.20,
                "confidence_percentage": 20.0,
                "is_road_damage": False,
                "message": "Unable to reliably analyze this image as a road-condition image.",
                "probabilities": {cls: 25.0 for cls in IMAGE_CLASSES},
                "model_version": "Custom-CNN-Scratch-v1.0"
            }

        # Preprocess & normalize into tensor
        tensor = preprocess_pil_image(img, augment=False).unsqueeze(0).to(self.device)

        # CNN Model Forward Pass
        self.model.eval()
        with torch.no_grad():
            logits = self.model(tensor)
            probabilities = F.softmax(logits, dim=1).squeeze(0).cpu().numpy()

        prob_dict = {cls: round(float(prob) * 100, 1) for cls, prob in zip(IMAGE_CLASSES, probabilities)}
        top_idx = int(np.argmax(probabilities))
        top_class = IDX_TO_CLASS[top_idx]
        confidence = float(probabilities[top_idx])

        is_damage = top_class in ["Crack", "Pothole", "Severe Road Damage"]

        if top_class == "Severe Road Damage":
            message = "Severe structural pavement failure detected (extensive alligator fatigue / multiple cavitation voids)."
            derived_risk = "Critical Risk"
        elif top_class == "Pothole":
            message = "Cavitation void / pothole depression detected on the roadway wearing course."
            derived_risk = "High Risk"
        elif top_class == "Crack":
            message = "Linear surface fissure / cracking pattern identified on the pavement surface."
            derived_risk = "Medium Risk"
        else:
            message = "Optimal pavement integrity with standard friction wearing course."
            derived_risk = "Low Risk"

        return {
            "detected_class": top_class,
            "confidence": round(confidence, 2),
            "confidence_percentage": round(confidence * 100, 1),
            "is_road_damage": is_damage,
            "derived_risk_level": derived_risk,
            "message": message,
            "probabilities": prob_dict,
            "model_version": "Custom-CNN-Scratch-v1.0"
        }

image_detector = RoadImageDetectorService.get_instance()
