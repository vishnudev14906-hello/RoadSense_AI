import io
import sys
import base64
import numpy as np
from PIL import Image
from typing import Dict, Any, List, Tuple, Optional, Union

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
SUPPORTED_FORMATS = ["JPEG", "JPG", "PNG", "MPO", "WEBP"]
MIN_ASPHALT_COVERAGE_PCT = 10.0
BLUR_VARIANCE_THRESHOLD = 15.0  # Laplacian variance threshold for blurriness

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
    Returns (PIL Image, error_message).
    """
    try:
        if isinstance(image_input, Image.Image):
            return image_input.convert('RGB'), None

        if isinstance(image_input, str):
            if image_input.startswith("http://") or image_input.startswith("https://"):
                import urllib.request
                req = urllib.request.Request(image_input, headers={'User-Agent': 'Mozilla/5.0'})
                image_bytes = urllib.request.urlopen(req, timeout=8).read()
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

        img = Image.open(io.BytesIO(image_bytes))
        fmt = (img.format or "").upper()
        if fmt not in SUPPORTED_FORMATS and img.format is not None:
            return None, f"Unsupported image format '{fmt}'. Supported formats: JPG, JPEG, PNG, WEBP."

        if img.mode != 'RGB':
            img = img.convert('RGB')

        return img, None
    except Exception as e:
        return None, f"Invalid image format or corrupted file: {str(e)}"


def compute_laplacian_variance(gray: np.ndarray) -> float:
    """
    Computes Laplacian gradient variance to measure image sharpness/focus.
    Low variance indicates an out-of-focus or severely blurred photo.
    """
    # 3x3 Discrete Laplacian kernel convolution approximation using vector diffs
    # L(x, y) = gray(x+1, y) + gray(x-1, y) + gray(x, y+1) + gray(x, y-1) - 4*gray(x, y)
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

        # 1. Blurriness Check
        blur_var = compute_laplacian_variance(gray)
        is_blurry = blur_var < BLUR_VARIANCE_THRESHOLD

        # 2. Multi-Layer Non-Road Elements Segmentation
        y_coords = np.arange(height)[:, None]
        # A. Sky & Upper Atmosphere
        upper_third = y_coords < (height * 0.40)
        sky_mask = upper_third & (((h_arr >= 0.48) & (h_arr <= 0.76) & (s_arr > 0.10)) | (v_arr > 0.85))

        # B. Roadside Vegetation, Grass, Trees & Mud Shoulders
        veg_mask = ((h_arr >= 0.17) & (h_arr <= 0.48) & (s_arr > 0.14)) | \
                   ((g_chan > r_chan + 6.0) & (g_chan > b_chan + 6.0) & (g_chan > 30.0))
        dirt_shoulder_mask = ((h_arr >= 0.06) & (h_arr <= 0.15) & (s_arr > 0.30) & (v_arr > 0.40))

        # C. Vehicles, Metallic Sheen, Windows, Headlamps & Vehicle Paint
        vehicle_bright_mask = (v_arr > 0.92) & (s_arr < 0.20) & (gray > 220)
        vehicle_paint_mask = (s_arr > 0.45) & (v_arr > 0.35)

        # D. Traffic Infrastructure (Cones, Barrels, Safety Barricades, Signboards, Bollards)
        cone_barrel_mask = (s_arr > 0.28) & ((h_arr < 0.16) | (h_arr > 0.85) | (r_chan > g_chan + 25.0))

        # E. Thermoplastic Road Markings (White/Yellow Lane Lines, Zebra Crossings, Arrows)
        white_markings = (gray > 175) & (s_arr < 0.25)
        yellow_markings = (h_arr >= 0.10) & (h_arr <= 0.17) & (s_arr > 0.35) & (gray > 150)
        road_markings_mask = white_markings | yellow_markings

        # Union of non-road elements
        non_road_objects = (
            veg_mask | sky_mask | vehicle_bright_mask | vehicle_paint_mask |
            cone_barrel_mask | dirt_shoulder_mask | road_markings_mask
        )

        # 3. Asphalt Pavement Surface Isolation
        asphalt_mask = ((gray < 75.0) | (s_arr < 0.40)) & (gray >= 3) & (gray <= 225) & (~non_road_objects)
        asphalt_pixel_count = int(np.sum(asphalt_mask))
        asphalt_coverage_pct = float((asphalt_pixel_count / total_pixels) * 100) if total_pixels > 0 else 0.0

        # Out-of-domain check
        mean_saturation = float(np.mean(s_arr))
        is_non_road = asphalt_coverage_pct < MIN_ASPHALT_COVERAGE_PCT or mean_saturation > 0.48

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

        # Potholes: Distinct deep cavitation pits noticeably darker than local asphalt
        cavity_threshold = max(45.0, min(road_mean - 1.20 * max(8.0, road_std), 85.0))
        cavity_dark_mask = asphalt_mask & (gray < cavity_threshold) & ((gray < 65.0) | (s_arr < 0.30))

        # Cracks: High-contrast structural gradients darker than surrounding asphalt
        grad_y = np.abs(np.diff(gray, axis=0, append=gray[-1:, :]))
        grad_x = np.abs(np.diff(gray, axis=1, append=gray[:, -1:]))
        grad_mag = np.sqrt(grad_x**2 + grad_y**2)
        crack_grad_thresh = max(12.0, 1.20 * max(6.0, road_std))
        crack_candidate_mask = asphalt_mask & (grad_mag > crack_grad_thresh) & (gray < road_mean + 5.0) & (~non_road_objects)

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

                if cell_asphalt_sum < 0.20 * cell_total_pixels:
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
                mean_gx = float(np.mean(cell_gx[cell_asphalt]))
                mean_gy = float(np.mean(cell_gy[cell_asphalt]))
                is_linear_fissure = (mean_gx > mean_gy * 1.35) or (mean_gy > mean_gx * 1.35)

                # 1. Pothole Cavitation Check (Requires 2D non-linear cavity density and high contrast)
                if cavity_ratio >= 0.08 and not is_linear_fissure and (cell_contrast >= 7.5 or cavity_ratio >= 0.18):
                    is_severe = cavity_ratio >= 0.22 or cell_contrast >= 22.0
                    if is_severe:
                        severe_defect_count += 1
                        label = "Pothole (Severe Cavity)"
                        conf = min(98.5, round(88.0 + cavity_ratio * 25.0, 1))
                        color = "#EF4444"
                    else:
                        pothole_count += 1
                        label = "Pothole (Moderate)"
                        conf = min(94.0, round(82.0 + cavity_ratio * 20.0, 1))
                        color = "#F97316"

                    confidences.append(conf)
                    if len(detections) < 12:
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

                # 2. Crack / Fissure Check (Directional linear gradients or high gradient contrast)
                elif (crack_ratio >= 0.05 or (cavity_ratio >= 0.05 and is_linear_fissure)) and (cell_contrast >= 5.0 or crack_ratio >= 0.12):
                    if crack_ratio >= 0.20 or cavity_ratio >= 0.20:
                        severe_defect_count += 1
                        label = "Alligator Crack (Structural Fatigue)"
                        conf = min(96.5, round(84.0 + crack_ratio * 30.0, 1))
                        color = "#EF4444"
                    elif mean_gx > mean_gy * 1.25:
                        crack_cell_count += 1
                        label = "Longitudinal Crack"
                        conf = min(94.0, round(80.0 + crack_ratio * 30.0, 1))
                        color = "#F59E0B"
                    elif mean_gy > mean_gx * 1.25:
                        crack_cell_count += 1
                        label = "Transverse Crack"
                        conf = min(92.0, round(78.0 + crack_ratio * 30.0, 1))
                        color = "#F97316"
                    else:
                        crack_cell_count += 1
                        label = "Surface Fatigue Crack"
                        conf = min(90.0, round(75.0 + crack_ratio * 25.0, 1))
                        color = "#EAB308"

                    confidences.append(conf)
                    if len(detections) < 12:
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
        pothole_pixels = int(np.sum(cavity_dark_mask))
        crack_pixels = int(np.sum(crack_candidate_mask))
        total_damaged_pixels = int(np.sum(cavity_dark_mask | crack_candidate_mask))

        denom = max(1, asphalt_pixel_count)
        pothole_area_ratio = round(min(1.0, float(pothole_pixels / denom)), 4)
        crack_area_ratio = round(min(1.0, float(crack_pixels / denom)), 4)
        damage_area_ratio = round(min(1.0, float(total_damaged_pixels / denom)), 4)

        # Measured physical pothole count
        raw_pothole_count = pothole_count + severe_defect_count
        if raw_pothole_count == 0 and pothole_area_ratio > 0.008:
            total_potholes = max(1, int(round(pothole_area_ratio * 60)))
        else:
            total_potholes = raw_pothole_count

        pothole_detected = 1 if (total_potholes > 0 or pothole_area_ratio > 0.006) else 0
        crack_detected = 1 if (crack_cell_count > 0 or crack_area_ratio > 0.006) else 0

        # Continuous damage severity index calculation (0.0 to 1.0)
        base_severity = min(1.0, (damage_area_ratio * 1.8) + (pothole_area_ratio * 2.2) + (total_potholes * 0.025) + (crack_area_ratio * 1.2))
        if total_potholes == 0 and crack_detected == 0 and damage_area_ratio < 0.020:
            damage_severity = round(float(min(0.12, base_severity)), 3)
            pothole_area_ratio = 0.0
            crack_area_ratio = min(0.005, crack_area_ratio)
            damage_area_ratio = min(0.005, damage_area_ratio)
        else:
            damage_severity = round(float(min(1.0, base_severity)), 3)

        # Average confidence
        if confidences:
            avg_confidence = round(float(np.mean(confidences)), 1)
        elif cnn_confidence is not None:
            avg_confidence = round(float(cnn_confidence * 100), 1)
        else:
            avg_confidence = 98.5

        # Damage type classification label
        if total_potholes >= 4 and (crack_detected or severe_defect_count > 0):
            detected_damage_type = "Potholes & Structural Cracking"
            damage_severity_label = "Severe" if damage_severity >= 0.70 else "High"
        elif total_potholes > 0 and total_potholes < 4:
            detected_damage_type = "Minor Pothole Cavities"
            damage_severity_label = "Moderate" if damage_severity >= 0.35 else "Minor"
        elif total_potholes >= 4:
            detected_damage_type = "Potholes (Cavitation Pits)"
            damage_severity_label = "Severe" if severe_defect_count > 0 else "Moderate"
        elif crack_detected and damage_area_ratio > 0.10:
            detected_damage_type = "Structural Alligator Cracking"
            damage_severity_label = "High" if damage_severity >= 0.55 else "Moderate"
        elif crack_detected:
            detected_damage_type = "Surface & Transverse Cracks"
            damage_severity_label = "Moderate" if damage_severity >= 0.30 else "Minor"
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
            "pothole_area_ratio": pothole_area_ratio,
            "crack_area_ratio": crack_area_ratio,
            "damage_area_ratio": damage_area_ratio,
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
            "total_damaged_area_pct": round(damage_area_ratio * 100, 2)
        }

road_feature_extractor = RoadFeatureExtractor()
