import sys
from pathlib import Path
from PIL import Image, ImageDraw

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from app.ml.image_pipeline import image_pipeline_service

def test_10_images():
    print("=" * 85)
    print("  EVALUATING 10 DIVERSE ROAD SCENARIOS ACROSS ALL 4 RISK TIERS")
    print("=" * 85)

    # 1. Pristine smooth road
    img1 = Image.new('RGB', (256, 256), color=(80, 85, 90))
    d1 = ImageDraw.Draw(img1)
    d1.rectangle([120, 0, 136, 256], fill=(230, 230, 220)) # lane line
    res1 = image_pipeline_service.run_full_pipeline(img1, 'Pristine Highway')

    # 2. Smooth road with minor texture
    img2 = Image.new('RGB', (256, 256), color=(75, 78, 82))
    d2 = ImageDraw.Draw(img2)
    d2.rectangle([20, 0, 30, 256], fill=(210, 210, 200))
    res2 = image_pipeline_service.run_full_pipeline(img2, 'Smooth City Road')

    # 3. Clean road with natural aggregate texture
    img3 = Image.new('RGB', (256, 256), color=(72, 76, 80))
    d3 = ImageDraw.Draw(img3)
    for x in range(10, 250, 12):
        for y in range(10, 250, 12):
            d3.point([x + (y % 5), y], fill=(85, 90, 95))
    d3.line([(50, 0), (52, 256)], fill=(60, 65, 70), width=1)
    res3 = image_pipeline_service.run_full_pipeline(img3, 'Rural Clean Road')

    # 4. Road with 1 longitudinal crack
    img4 = Image.new('RGB', (256, 256), color=(70, 75, 80))
    d4 = ImageDraw.Draw(img4)
    d4.line([(80, 0), (95, 80), (85, 160), (105, 256)], fill=(15, 18, 20), width=3)
    res4 = image_pipeline_service.run_full_pipeline(img4, 'Road with Longitudinal Crack')

    # 5. Road with 1-2 small shallow potholes
    img5 = Image.new('RGB', (256, 256), color=(68, 72, 76))
    d5 = ImageDraw.Draw(img5)
    d5.ellipse([70, 80, 110, 115], fill=(10, 12, 14))
    res5 = image_pipeline_service.run_full_pipeline(img5, 'Road with 1 Pothole')

    # 6. Road with multiple transverse cracks
    img6 = Image.new('RGB', (256, 256), color=(68, 72, 78))
    d6 = ImageDraw.Draw(img6)
    d6.line([(40, 50), (220, 60)], fill=(12, 14, 16), width=3)
    d6.line([(30, 140), (210, 150)], fill=(12, 14, 16), width=3)
    res6 = image_pipeline_service.run_full_pipeline(img6, 'Road with Multiple Transverse Cracks')

    # 7. Road with 5 noticeable potholes
    img7 = Image.new('RGB', (256, 256), color=(65, 70, 75))
    d7 = ImageDraw.Draw(img7)
    for (x, y) in [(50, 40), (160, 50), (90, 130), (190, 150), (110, 200)]:
        d7.ellipse([x, y, x+35, y+30], fill=(8, 10, 12))
    res7 = image_pipeline_service.run_full_pipeline(img7, 'Road with 5 Potholes')

    # 8. Road with moderate alligator cracking + 4 potholes
    img8 = Image.new('RGB', (256, 256), color=(62, 68, 72))
    d8 = ImageDraw.Draw(img8)
    for (x, y) in [(40, 40), (150, 60), (70, 160), (180, 180)]:
        d8.ellipse([x, y, x+38, y+32], fill=(6, 8, 10))
    d8.line([(20, 80), (230, 95)], fill=(10, 12, 14), width=3)
    res8 = image_pipeline_service.run_full_pipeline(img8, 'Moderate Alligator + Potholes')

    # 9. Severe road with 12 deep crater voids
    img9 = Image.new('RGB', (256, 256), color=(58, 62, 68))
    d9 = ImageDraw.Draw(img9)
    for r in range(3):
        for c in range(4):
            x = 30 + c * 55
            y = 25 + r * 75
            d9.ellipse([x, y, x+40, y+35], fill=(5, 6, 8))
    res9 = image_pipeline_service.run_full_pipeline(img9, 'Severe 12-Pothole Corridor')

    # 10. Massive structural failure (dense alligator mesh + craters)
    img10 = Image.new('RGB', (256, 256), color=(55, 60, 65))
    d10 = ImageDraw.Draw(img10)
    for x in range(20, 230, 40):
        for y in range(20, 230, 40):
            d10.polygon([(x, y), (x+30, y+5), (x+25, y+30), (x-5, y+20)], outline=(8, 10, 12), width=3)
            d10.ellipse([x+5, y+5, x+25, y+25], fill=(5, 6, 8))
    res10 = image_pipeline_service.run_full_pipeline(img10, 'Massive Structural Collapse')

    tests = [
        ("1. Pristine Highway", res1, "Low Risk"),
        ("2. Smooth City Road", res2, "Low Risk"),
        ("3. Rural Clean Road", res3, "Low Risk"),
        ("4. 1 Longitudinal Crack", res4, "Medium Risk"),
        ("5. 1 Pothole Road", res5, "Medium Risk"),
        ("6. Transverse Cracks", res6, "Medium Risk"),
        ("7. 5 Potholes Road", res7, "High Risk"),
        ("8. Alligator + 4 Potholes", res8, "High Risk"),
        ("9. 12-Pothole Corridor", res9, "Critical Risk"),
        ("10. Massive Collapse", res10, "Critical Risk")
    ]

    for title, res, exp in tests:
        is_valid = res.get('is_valid_road')
        p_cnt = res.get('features', {}).get('pothole_count', 0)
        d_area = f"{res.get('features', {}).get('damage_area_ratio', 0.0)*100:.1f}%"
        sev = res.get('features', {}).get('damage_severity', 0.0)
        risk = res.get('risk_level')
        score = res.get('risk_score', 0.0)
        err = res.get('error') or res.get('message') or ''
        match = "MATCH" if (risk == exp or (exp in ["High Risk", "Critical Risk"] and risk in ["High Risk", "Critical Risk"])) else "DIFF"
        print(f"[{match}] {title:<28} -> Valid: {str(is_valid):<5} | Risk: {risk:<14} | Score: {score:>4.1f} | Potholes: {p_cnt:>2} | Area: {d_area:>5} | Err: {err}")

    print("=" * 85)

if __name__ == "__main__":
    test_10_images()
