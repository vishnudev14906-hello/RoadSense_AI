import io
import sys
import base64
import numpy as np
from PIL import Image, ImageOps
from typing import Dict, Any, List, Tuple, Optional, Union

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
SUPPORTED_FORMATS = ["JPEG", "JPG", "PNG", "MPO", "WEBP"]
MIN_ASPHALT_COVERAGE_PCT = 8.0
BLUR_VARIANCE_THRESHOLD = 8.0
MAX_INGEST_DIMENSION = 1024

FEATURE_COLUMNS = [
    "pothole_count",
    "pothole_area_ratio",
    "crack_area_ratio",
    "damage_area_ratio",
    "damage_severity",
    "pothole_detected",
    "crack_detected",
    "avg_confidence"
]


def decode_and_validate_image(image_input: Union[Image.Image, str, bytes]) -> Tuple[Optional[Image.Image], Optional[str]]:
    """
    Decodes an image from PIL Image, base64 string, data URL, or raw bytes and validates size and format.
    Corrects mobile camera EXIF orientation and downscales full-resolution images before NumPy processing.
    Returns (PIL Image, error_message).
    """
    try:
        if isinstance(image_input, Image.Image):
            try:
                img = ImageOps.exif_transpose(image_input)
            except Exception:
                img = image_input
            if img.mode != 'RGB':
                img = img.convert('RGB')
            if max(img.size) > MAX_INGEST_DIMENSION:
                img.thumbnail((MAX_INGEST_DIMENSION, MAX_INGEST_DIMENSION), Image.Resampling.LANCZOS)
            return img, None

        if isinstance(image_input, str):
            if image_input.startswith("http://") or image_input.startswith("https://"):
                import urllib.request
                req = urllib.request.Request(image_input, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
                image_bytes = urllib.request.urlopen(req, timeout=10).read()
            elif "," in image_input:
                header, encoded = image_input.split(",", 1)
                image_bytes = base64.b64decode(encoded)
            else:
                padded = image_input + "=" * ((4 - len(image_input) % 4) % 4)
                image_bytes = base64.b64decode(padded)
        else:
            image_bytes = image_input

        if len(image_bytes) > MAX_FILE_SIZE_BYTES:
            return None, f"Image file size ({len(image_bytes)/(1024*1024):.1f}MB) exceeds maximum allowed 15MB."

        raw_img = Image.open(io.BytesIO(image_bytes))
        
        # 1. Correct mobile camera orientation via EXIF metadata
        try:
            img = ImageOps.exif_transpose(raw_img)
        except Exception:
            img = raw_img

        fmt = (raw_img.format or "").upper()
        if fmt not in SUPPORTED_FORMATS and raw_img.format is not None:
            return None, f"Unsupported image format '{fmt}'. Supported formats: JPG, JPEG, PNG, WEBP."

        if img.mode != 'RGB':
            img = img.convert('RGB')

        # 2. Limit maximum dimension to 1024px to prevent large mobile images from causing RAM spikes/OOM
        if max(img.size) > MAX_INGEST_DIMENSION:
            img.thumbnail((MAX_INGEST_DIMENSION, MAX_INGEST_DIMENSION), Image.Resampling.LANCZOS)

        return img, None
    except Exception as e:
        return None, f"Invalid image format or corrupted file: {str(e)}"


def compute_laplacian_variance(gray: np.ndarray) -> float:
    """Computes Laplacian gradient variance to measure image sharpness/focus."""
    padded = np.pad(gray, 1, mode='edge')
    laplacian = (
        padded[2:, 1:-1] + padded[:-2, 1:-1] +
        padded[1:-1, 2:] + padded[1:-1, :-2] -
        4.0 * padded[1:-1, 1:-1]
    )
    return float(np.var(laplacian))


def rgb_to_hsv_fast(rgb_arr: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Fast vectorized RGB to HSV conversion (values normalized 0..1)."""
    r = rgb_arr[:, :, 0] / 255.0
    g = rgb_arr[:, :, 1] / 255.0
    b = rgb_arr[:, :, 2] / 255.0

    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    delta = max_c - min_c

    v = max_c
    s = np.zeros_like(max_c)
    non_zero = max_c > 1e-5
    s[non_zero] = delta[non_zero] / max_c[non_zero]

    h = np.zeros_like(max_c)
    mask_r = (max_c == r) & (delta > 1e-5)
    mask_g = (max_c == g) & (delta > 1e-5)
    mask_b = (max_c == b) & (delta > 1e-5)

    h[mask_r] = ((g[mask_r] - b[mask_r]) / delta[mask_r]) % 6.0
    h[mask_g] = ((b[mask_g] - r[mask_g]) / delta[mask_g]) + 2.0
    h[mask_b] = ((r[mask_b] - g[mask_b]) / delta[mask_b]) + 4.0
    h = (h / 6.0) % 1.0

    return h, s, v


class RoadFeatureExtractor:
    """
    Dedicated Feature Extraction Layer for Road Pavement Damage Analysis.
    Extracts physically measurable features directly from image analysis:
    - pothole_count
    - pothole_area_ratio
    - crack_area_ratio
    - damage_area_ratio
    - damage_severity
    - pothole_detected
    - crack_detected
    - avg_confidence
    """

    @classmethod
    def extract_features(
        cls,
        img: Image.Image,
        cnn_damage_class: Optional[str] = None,
        cnn_confidence: Optional[float] = None
    ) -> Dict[str, Any]:
        # Normalize processing resolution (640x480 max) for uniform physical feature estimation
        img_norm = img.copy()
        img_norm.thumbnail((640, 480))
        width, height = img_norm.size
        total_pixels = width * height

        rgb_arr = np.array(img_norm, dtype=np.float32)
        r_chan = rgb_arr[:, :, 0]
        g_chan = rgb_arr[:, :, 1]
        b_chan = rgb_arr[:, :, 2]

        h_arr, s_arr, v_arr = rgb_to_hsv_fast(rgb_arr)
        gray = 0.2989 * r_chan + 0.5870 * g_chan + 0.1140 * b_chan

        # 1. Blurriness Check (Only reject extreme blur when there is almost zero texture)
        blur_var = compute_laplacian_variance(gray)
        is_blurry = blur_var < BLUR_VARIANCE_THRESHOLD and float(np.std(gray)) < 3.0

        # 2. Non-Road Elements Segmentation
        y_coords = np.arange(height)[:, None]
        upper_third = y_coords < (height * 0.35)
        sky_mask = upper_third & (((h_arr >= 0.50) & (h_arr <= 0.75) & (s_arr > 0.15)) | (v_arr > 0.92))

        # Roadside vegetation
        veg_mask = ((h_arr >= 0.20) & (h_arr <= 0.45) & (s_arr > 0.25)) | \
                   ((g_chan > r_chan + 15.0) & (g_chan > b_chan + 15.0) & (g_chan > 40.0))

        # Traffic Cones & Safety Barricades
        cone_barrel_mask = (s_arr > 0.55) & ((h_arr < 0.12) | (h_arr > 0.88)) & (v_arr > 0.50)
        non_road_objects = sky_mask | veg_mask | cone_barrel_mask

        # 3. Asphalt Pavement Surface Isolation
        asphalt_mask = (gray >= 15) & (gray <= 240) & (~non_road_objects)
        asphalt_pixel_count = int(np.sum(asphalt_mask))
        asphalt_coverage_pct = float((asphalt_pixel_count / total_pixels) * 100) if total_pixels > 0 else 0.0

        mean_saturation = float(np.mean(s_arr))
        is_non_road = asphalt_coverage_pct < MIN_ASPHALT_COVERAGE_PCT or (mean_saturation > 0.65 and float(np.std(gray)) < 5.0)

        if is_blurry or is_non_road:
            rejection_reason = "The image is too blurry to extract pavement features." if is_blurry else "Image does not appear to contain a supported asphalt roadway pavement surface."
            return {
                "is_valid_road": False,
                "rejection_reason": rejection_reason,
                "asphalt_coverage_pct": round(asphalt_coverage_pct, 1),
                "blur_variance": round(blur_var, 1),
                "measurable_features": {
                    "pothole_count": 0,
                    "pothole_area_ratio": 0.0,
                    "crack_area_ratio": 0.0,
                    "damage_area_ratio": 0.0,
                    "damage_severity": 0.0,
                    "pothole_detected": 0,
                    "crack_detected": 0,
                    "avg_confidence": 0.0
                },
                "detections": [],
                "detected_damage_type": "None / Out-of-Domain",
                "damage_severity_label": "None"
            }

        # 4. Pavement Defect Extraction (Within asphalt mask)
        road_gray = gray[asphalt_mask]
        road_mean = float(np.mean(road_gray)) if len(road_gray) > 0 else 128.0
        road_std = float(np.std(road_gray)) if len(road_gray) > 0 else 20.0

        grad_y = np.abs(np.diff(gray, axis=0, append=gray[-1:, :]))
        grad_x = np.abs(np.diff(gray, axis=1, append=gray[:, -1:]))
        grad_mag = np.sqrt(grad_x**2 + grad_y**2)

        # Cavity (Pothole) Detection:
        cavity_threshold = max(15.0, road_mean - 1.95 * max(6.0, road_std))
        cavity_dark_mask = asphalt_mask & (gray < cavity_threshold) & (grad_mag > 10.0)

        # Cracks Detection:
        crack_grad_thresh = max(14.0, road_mean * 0.15 + road_std * 1.2)
        crack_candidate_mask = asphalt_mask & (grad_mag > crack_grad_thresh) & (gray < road_mean - 0.3 * road_std) & (~cavity_dark_mask)

        # Spatial Grid Localization for Feature Aggregation
        grid_rows = 6
        grid_cols = 8
        cell_h = height // grid_rows
        cell_w = width // grid_cols

        detections = []
        det_id = 1
        pothole_count = 0
        severe_defect_count = 0
        crack_cell_count = 0
        confidences = []

        for r in range(grid_rows):
            for c in range(grid_cols):
                y1 = r * cell_h
                y2 = (r + 1) * cell_h if r < grid_rows - 1 else height
                x1 = c * cell_w
                x2 = (c + 1) * cell_w if c < grid_cols - 1 else width

                cell_asphalt = asphalt_mask[y1:y2, x1:x2]
                cell_asphalt_sum = int(np.sum(cell_asphalt))
                cell_total_pixels = (y2 - y1) * (x2 - x1)

                if cell_asphalt_sum < 0.15 * cell_total_pixels:
                    continue

                cell_cavity = cavity_dark_mask[y1:y2, x1:x2]
                cell_crack = crack_candidate_mask[y1:y2, x1:x2]
                cell_gray = gray[y1:y2, x1:x2]
                cell_gx = grad_x[y1:y2, x1:x2]
                cell_gy = grad_y[y1:y2, x1:x2]

                cavity_ratio = float(np.sum(cell_cavity) / cell_asphalt_sum)
                crack_ratio = float(np.sum(cell_crack) / cell_asphalt_sum)
                cell_contrast = float(np.std(cell_gray[cell_asphalt])) if cell_asphalt_sum > 10 else 0.0

                px = round((x1 / width) * 100, 1)
                py = round((y1 / height) * 100, 1)
                pw = round(((x2 - x1) / width) * 100, 1)
                ph = round(((y2 - y1) / height) * 100, 1)

                # Check directional linearity
                mean_gx = float(np.mean(cell_gx[cell_asphalt])) if cell_asphalt_sum > 0 else 0.0
                mean_gy = float(np.mean(cell_gy[cell_asphalt])) if cell_asphalt_sum > 0 else 0.0
                is_linear_fissure = (mean_gx > mean_gy * 1.30) or (mean_gy > mean_gx * 1.30)

                # 1. Pothole Cavitation Check (2D cavity density with high local contrast)
                if cavity_ratio >= 0.05 and not is_linear_fissure and cell_contrast >= 10.0:
                    is_severe = cavity_ratio >= 0.14 or cell_contrast >= 22.0
                    if is_severe:
                        severe_defect_count += 1
                        label = "Pothole (Severe Cavity)"
                        conf = min(98.5, round(88.0 + cavity_ratio * 30.0, 1))
                        color = "#EF4444"
                    else:
                        pothole_count += 1
                        label = "Pothole (Moderate)"
                        conf = min(94.0, round(82.0 + cavity_ratio * 25.0, 1))
                        color = "#F97316"

                    confidences.append(conf)
                    if len(detections) < 14:
                        detections.append({
                            "id": det_id,
                            "label": label,
                            "confidence": conf,
                            "x": px + 2,
                            "y": py + 2,
                            "w": max(10.0, pw - 4),
                            "h": max(10.0, ph - 4),
                            "color": color
                        })
                        det_id += 1

                # 2. Crack / Fissure Check
                elif (crack_ratio >= 0.04 or (cavity_ratio >= 0.04 and is_linear_fissure)) and cell_contrast >= 6.0:
                    if crack_ratio >= 0.12 or (cell_contrast >= 18.0 and crack_ratio >= 0.07):
                        severe_defect_count += 1
                        label = "Alligator Crack (Structural Fatigue)"
                        conf = min(96.5, round(84.0 + crack_ratio * 35.0, 1))
                        color = "#EF4444"
                    elif mean_gx > mean_gy * 1.20:
                        crack_cell_count += 1
                        label = "Longitudinal Crack"
                        conf = min(94.0, round(80.0 + crack_ratio * 35.0, 1))
                        color = "#F59E0B"
                    elif mean_gy > mean_gx * 1.20:
                        crack_cell_count += 1
                        label = "Transverse Crack"
                        conf = min(92.0, round(78.0 + crack_ratio * 35.0, 1))
                        color = "#F97316"
                    else:
                        crack_cell_count += 1
                        label = "Surface Fatigue Crack"
                        conf = min(90.0, round(75.0 + crack_ratio * 30.0, 1))
                        color = "#EAB308"

                    confidences.append(conf)
                    if len(detections) < 14:
                        detections.append({
                            "id": det_id,
                            "label": label,
                            "confidence": conf,
                            "x": px + 3,
                            "y": py + 3,
                            "w": max(12.0, pw - 6),
                            "h": max(8.0, ph - 6),
                            "color": color
                        })
                        det_id += 1

        # Calculate exact pixel area ratios over segmented asphalt surface
        denom = max(1, asphalt_pixel_count)
        pothole_pixels = int(np.sum(cavity_dark_mask))
        crack_pixels = int(np.sum(crack_candidate_mask))
        total_damaged_pixels = int(np.sum(cavity_dark_mask | crack_candidate_mask))

        raw_pothole_area_ratio = round(float(pothole_pixels / denom), 4)
        raw_crack_area_ratio = round(float(crack_pixels / denom), 4)
        raw_damage_area_ratio = round(float(total_damaged_pixels / denom), 4)

        total_potholes = pothole_count + severe_defect_count
        pothole_detected = 1 if total_potholes > 0 else 0
        crack_detected = 1 if (crack_cell_count > 0 or raw_crack_area_ratio > 0.005) else 0

        damage_severity = round(float(np.clip((raw_damage_area_ratio * 2.5) + (raw_pothole_area_ratio * 3.0) + (total_potholes * 0.04), 0.0, 1.0)), 3)

        # Average confidence
        if confidences:
            avg_confidence = round(float(np.mean(confidences)), 1)
        elif cnn_confidence is not None:
            avg_confidence = round(float(cnn_confidence * 100), 1)
        else:
            avg_confidence = 96.5

        # Damage type classification label
        if total_potholes >= 10 or (total_potholes >= 4 and crack_detected and damage_severity >= 0.65):
            detected_damage_type = "Potholes & Structural Cracking"
            damage_severity_label = "Severe"
        elif total_potholes >= 4:
            detected_damage_type = "Potholes (Cavitation Pits)"
            damage_severity_label = "High"
        elif total_potholes > 0:
            detected_damage_type = "Minor Pothole Cavities"
            damage_severity_label = "Moderate"
        elif crack_detected and damage_severity >= 0.45:
            detected_damage_type = "Structural Alligator Cracking"
            damage_severity_label = "High"
        elif crack_detected:
            detected_damage_type = "Surface & Transverse Cracks"
            damage_severity_label = "Moderate"
        else:
            detected_damage_type = "Normal / Optimal Road Surface"
            damage_severity_label = "Low"
            if not detections:
                detections.append({
                    "id": 1,
                    "label": "Surface Integrity: Optimal Road Pavement",
                    "confidence": avg_confidence,
                    "x": 15.0,
                    "y": 25.0,
                    "w": 70.0,
                    "h": 55.0,
                    "color": "#10B981"
                })

        measurable_features = {
            "pothole_count": total_potholes,
            "pothole_area_ratio": raw_pothole_area_ratio,
            "crack_area_ratio": raw_crack_area_ratio,
            "damage_area_ratio": raw_damage_area_ratio,
            "damage_severity": damage_severity,
            "pothole_detected": pothole_detected,
            "crack_detected": crack_detected,
            "avg_confidence": avg_confidence
        }

        return {
            "is_valid_road": True,
            "rejection_reason": None,
            "asphalt_coverage_pct": round(asphalt_coverage_pct, 1),
            "blur_variance": round(blur_var, 1),
            "measurable_features": measurable_features,
            "detections": detections,
            "detected_damage_type": detected_damage_type,
            "damage_severity_label": damage_severity_label,
            "total_damaged_area_pct": round(raw_damage_area_ratio * 100, 2)
        }

road_feature_extractor = RoadFeatureExtractor()
