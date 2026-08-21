import sys
import io
import json
import base64
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
from fastapi.testclient import TestClient

# Add paths
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from app.main import app

client = TestClient(app)

def create_normal_road_image() -> str:
    """Creates a normal smooth asphalt road image."""
    img = Image.new('RGB', (128, 128), color=(75, 80, 85))
    draw = ImageDraw.Draw(img)
    draw.rectangle([58, 0, 70, 128], fill=(230, 230, 220)) # White lane line
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

def create_crack_road_image() -> str:
    """Creates a road image with linear cracks."""
    img = Image.new('RGB', (128, 128), color=(70, 75, 80))
    draw = ImageDraw.Draw(img)
    draw.line([(30, 0), (45, 40), (40, 80), (60, 128)], fill=(15, 18, 20), width=3)
    draw.line([(80, 20), (95, 70), (85, 128)], fill=(18, 20, 22), width=2)
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

def create_pothole_road_image() -> str:
    """Creates a road image with pothole cavitation pits."""
    img = Image.new('RGB', (128, 128), color=(68, 72, 78))
    draw = ImageDraw.Draw(img)
    draw.ellipse([35, 40, 95, 90], fill=(12, 14, 16))
    draw.ellipse([42, 48, 88, 82], fill=(6, 8, 10))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

def create_severe_damage_image() -> str:
    """Creates a road image with severe alligator cracking and multiple craters."""
    img = Image.new('RGB', (128, 128), color=(65, 70, 75))
    draw = ImageDraw.Draw(img)
    # Polygonal alligator mesh
    for x in range(10, 120, 30):
        for y in range(10, 120, 30):
            draw.polygon([(x, y), (x+25, y+5), (x+20, y+25), (x-5, y+20)], outline=(12, 14, 16), width=2)
    # Deep cavitation void
    draw.ellipse([30, 30, 85, 80], fill=(10, 12, 14))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

def create_blurry_image() -> str:
    """Creates an extremely blurry image."""
    img = Image.new('RGB', (128, 128), color=(70, 75, 80))
    draw = ImageDraw.Draw(img)
    draw.ellipse([35, 40, 95, 90], fill=(12, 14, 16))
    img = img.filter(ImageFilter.GaussianBlur(radius=15))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

def create_non_road_image() -> str:
    """Creates a high-saturation non-road image (e.g. bright blue/green object)."""
    img = Image.new('RGB', (128, 128), color=(0, 220, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle([20, 20, 100, 100], fill=(255, 50, 50))
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def run_all_api_tests():
    print("\n" + "="*70)
    print("  ROADSENSE AI - COMPREHENSIVE ENDPOINT & ML PIPELINE VERIFICATION")
    print("="*70)

    # 1. Health Endpoint
    print("\n[TEST 1/11] GET /health & /api/health...")
    resp = client.get("/health")
    assert resp.status_code == 200, f"Health check failed: {resp.text}"
    health_data = resp.json()
    print(f"  -> Health Status: {health_data.get('status')}")
    print(f"  -> Models Ready: {health_data.get('models_ready')}")
    assert health_data.get("models_ready", {}).get("random_forest_pipeline") is True
    assert health_data.get("models_ready", {}).get("custom_road_cnn") is True

    # 2. Roads List Endpoint
    print("\n[TEST 2/11] GET /roads & /api/roads...")
    resp = client.get("/roads")
    assert resp.status_code == 200
    roads = resp.json()
    print(f"  -> Successfully retrieved {len(roads)} real-world verified road corridors.")
    assert len(roads) > 0

    # 3. Tabular XGBoost Inference (Workflow B)
    print("\n[TEST 3/11] POST /predict-risk (Tabular XGBoost Inference)...")
    payload = {
        "pothole_count": 18,
        "average_pothole_depth_cm": 9.5,
        "total_crack_length_m": 65.0,
        "pavement_age_years": 10.0,
        "traffic_volume": "High",
        "rainfall": "Heavy",
        "road_length_km": 12.0,
        "road_name": "NH-44 Bengaluru-Salem Expressway Section",
        "save_prediction": False
    }
    resp = client.post("/predict-risk", json=payload)
    assert resp.status_code == 200, f"Predict risk failed: {resp.text}"
    pred_data = resp.json()
    print(f"  -> Predicted Risk Level: {pred_data.get('risk_level')}")
    print(f"  -> Risk Score:           {pred_data.get('risk_score')}/100")
    print(f"  -> Measured Confidence:  {pred_data.get('confidence')}%")
    print(f"  -> Priority:             {pred_data.get('priority')}")
    assert pred_data.get("risk_level") in ["Low Risk", "Medium Risk", "High Risk", "Critical Risk"]

    # 4. Pipeline Workflow A: Normal Road Image
    print("\n[TEST 4/11] POST /detect-road-image (Normal / Intact Road Image)...")
    resp_norm = client.post("/detect-road-image", json={"image_base64": create_normal_road_image()})
    assert resp_norm.status_code == 200
    data_norm = resp_norm.json()
    print(f"  -> Risk Level:      {data_norm.get('risk_level')}")
    print(f"  -> Damage Type:     {data_norm.get('damage_type')}")
    print(f"  -> Damage Severity: {data_norm.get('damage_severity')}")
    print(f"  -> Features:        {data_norm.get('features')}")
    assert data_norm.get("is_valid_road") is True
    assert data_norm.get("risk_level") in ["Low Risk", "Low", "Medium Risk", "Medium"]

    # 5. Pipeline Workflow A: Crack Road Image
    print("\n[TEST 5/11] POST /detect-road-image (Road with Cracks)...")
    resp_crack = client.post("/detect-road-image", json={"image_base64": create_crack_road_image()})
    assert resp_crack.status_code == 200
    data_crack = resp_crack.json()
    print(f"  -> Risk Level:      {data_crack.get('risk_level')}")
    print(f"  -> Damage Type:     {data_crack.get('damage_type')}")
    print(f"  -> Features:        {data_crack.get('features')}")
    assert data_crack.get("is_valid_road") is True

    # 6. Pipeline Workflow A: Pothole Road Image
    print("\n[TEST 6/11] POST /detect-road-image (Road with Potholes)...")
    resp_pot = client.post("/detect-road-image", json={"image_base64": create_pothole_road_image()})
    assert resp_pot.status_code == 200
    data_pot = resp_pot.json()
    print(f"  -> Risk Level:      {data_pot.get('risk_level')}")
    print(f"  -> Damage Type:     {data_pot.get('damage_type')}")
    print(f"  -> Features:        {data_pot.get('features')}")
    assert data_pot.get("is_valid_road") is True
    assert data_pot.get("risk_level") in ["High Risk", "Critical Risk", "High", "Critical", "Medium Risk"]

    # 7. Pipeline Workflow A: Severe Road Damage Image
    print("\n[TEST 7/11] POST /detect-road-image (Severe Structural Damage Image)...")
    resp_sev = client.post("/detect-road-image", json={"image_base64": create_severe_damage_image()})
    assert resp_sev.status_code == 200
    data_sev = resp_sev.json()
    print(f"  -> Risk Level:      {data_sev.get('risk_level')}")
    print(f"  -> Damage Type:     {data_sev.get('damage_type')}")
    print(f"  -> Priority:        {data_sev.get('priority')}")
    assert data_sev.get("is_valid_road") is True
    assert data_sev.get("risk_level") in ["Critical Risk", "High Risk"]

    # 8. Out-of-Distribution / Non-Road Image Rejection
    print("\n[TEST 8/11] POST /detect-road-image (Non-Road / OOD Image)...")
    resp_nr = client.post("/detect-road-image", json={"image_base64": create_non_road_image()})
    assert resp_nr.status_code == 200
    data_nr = resp_nr.json()
    print(f"  -> Is Valid Road:   {data_nr.get('is_valid_road')}")
    print(f"  -> Message:         {data_nr.get('message')}")
    assert data_nr.get("is_valid_road") is False
    assert "Unable to reliably analyze this image as a road-condition image." in (data_nr.get("message") or "")

    # 9. Blurry Image Rejection
    print("\n[TEST 9/11] POST /detect-road-image (Blurry Image)...")
    resp_blur = client.post("/detect-road-image", json={"image_base64": create_blurry_image()})
    assert resp_blur.status_code == 200
    data_blur = resp_blur.json()
    print(f"  -> Is Valid Road:   {data_blur.get('is_valid_road')}")
    print(f"  -> Message:         {data_blur.get('message')}")
    assert data_blur.get("is_valid_road") is False
    assert "Unable to reliably analyze this image as a road-condition image." in (data_blur.get("message") or "")

    # 10. Multipart File Upload (/detect-road-image/file)
    print("\n[TEST 10/11] POST /detect-road-image/file (Direct File Upload)...")
    img_b64 = create_pothole_road_image()
    header, b64_str = img_b64.split(",", 1)
    raw_bytes = base64.b64decode(b64_str)
    files = {"file": ("inspection_photo.jpg", raw_bytes, "image/jpeg")}
    resp_file = client.post("/detect-road-image/file", files=files, data={"road_name": "Field Survey Aerial Capture"})
    assert resp_file.status_code == 200
    data_file = resp_file.json()
    print(f"  -> Multipart File Processed: {data_file.get('damage_type')} -> Risk: {data_file.get('risk_level')}")
    assert data_file.get("is_valid_road") is True

    # 11. Model Evaluation Metrics
    print("\n[TEST 11/11] GET /model-evaluation (Authentic Measured Performance)...")
    resp_eval = client.get("/model-evaluation")
    assert resp_eval.status_code == 200
    eval_data = resp_eval.json()
    print(f"  -> Tabular XGB Test Accuracy: {eval_data.get('random_forest', {}).get('test_metrics', {}).get('accuracy') * 100:.2f}%")
    print(f"  -> Custom CNN Test Accuracy:  {eval_data.get('custom_cnn', {}).get('test_metrics', {}).get('accuracy') * 100:.2f}%")

    print("\n" + "="*70)
    print("  ALL 11 TESTS PASSED PERFECTLY! ZERO FAILURES.")
    print("="*70 + "\n")

if __name__ == "__main__":
    run_all_api_tests()
