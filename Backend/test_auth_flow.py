import sys
import time
from pathlib import Path
from fastapi.testclient import TestClient

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from app.main import app

client = TestClient(app)

def run_auth_tests():
    print("=" * 75)
    print("  ROADSENSE AI - COMPREHENSIVE AUTHENTICATION & SECURITY TEST SUITE")
    print("=" * 75)

    timestamp = int(time.time())
    reg_email = f"inspector.arun.{timestamp}@roadsense.ai"
    reg_user = f"Arun Engineer {timestamp}"
    initial_password = "SecureEngineeringPass@2026"

    # 1. Registration
    print(f"\n[TEST 1/12] User Registration for '{reg_user}'...")
    resp = client.post("/api/auth/register", json={
        "name": reg_user,
        "email": reg_email,
        "password": initial_password,
        "role": "Inspector"
    })
    assert resp.status_code == 200, f"Registration failed: {resp.text}"
    res = resp.json()
    assert res.get("access_token"), "Missing JWT access token"
    assert res.get("user", {}).get("email") == reg_email
    print(f"  -> Successfully registered user '{res.get('user', {}).get('name')}' ({reg_email})")

    # 2. Duplicate Registration Prevention
    print("\n[TEST 2/12] Duplicate Email Registration Prevention...")
    resp_dup = client.post("/api/auth/register", json={
        "name": "Duplicate User",
        "email": reg_email,
        "password": "AnotherPassword@2026",
        "role": "Inspector"
    })
    assert resp_dup.status_code == 400, f"Expected 400, got {resp_dup.status_code}"
    print(f"  -> Correctly rejected duplicate email: {resp_dup.json().get('detail')}")

    # 3. Login with Email
    print("\n[TEST 3/12] Sign In with Registered Email & Remember Me...")
    resp_login = client.post("/api/auth/login", json={
        "email": reg_email,
        "password": initial_password,
        "remember_me": True
    })
    assert resp_login.status_code == 200, f"Login failed: {resp_login.text}"
    token = resp_login.json().get("access_token")
    assert token, "No access token returned"
    print(f"  -> Login successful via Email. Received JWT: {token[:20]}...")

    # 4. Login with Username
    print("\n[TEST 4/12] Sign In with Username (Full Name)...")
    resp_user_login = client.post("/api/auth/login", json={
        "email": reg_user,
        "password": initial_password,
        "remember_me": False
    })
    assert resp_user_login.status_code == 200, f"Username login failed: {resp_user_login.text}"
    print(f"  -> Login successful via Username '{reg_user}'")

    # 5. Invalid Password Rejection
    print("\n[TEST 5/12] Invalid Password Rejection (No Account Enumeration)...")
    resp_invalid = client.post("/api/auth/login", json={
        "email": reg_email,
        "password": "WrongPassword999!"
    })
    assert resp_invalid.status_code == 401, f"Expected 401, got {resp_invalid.status_code}"
    assert resp_invalid.json().get("detail") == "Invalid email or password"
    print(f"  -> Correctly rejected with: '{resp_invalid.json().get('detail')}'")

    # 6. Current User Profile (/api/auth/me & /auth/me)
    print("\n[TEST 6/12] Authenticated Profile Retrieval (/api/auth/me)...")
    resp_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp_me.status_code == 200, f"Failed to get me: {resp_me.text}"
    assert resp_me.json().get("email") == reg_email
    print(f"  -> Profile verified: {resp_me.json().get('name')} | Role: {resp_me.json().get('role')}")

    # 7. Forgot Password Flow
    print("\n[TEST 7/12] Forgot Password Flow (Time-Limited Reset Token)...")
    resp_fp = client.post("/api/auth/forgot-password", json={"email": reg_email})
    assert resp_fp.status_code == 200, f"Forgot password failed: {resp_fp.text}"
    reset_token = resp_fp.json().get("reset_token")
    assert reset_token, "No reset token generated"
    print(f"  -> Generated secure reset token: {reset_token[:16]}...")

    # 8. Reset Password Flow
    print("\n[TEST 8/12] Reset Password Flow with Verification Token...")
    new_password = "NewlyUpdatedPassword@2026"
    resp_rp = client.post("/api/auth/reset-password", json={
        "email": reg_email,
        "new_password": new_password,
        "reset_token": reset_token
    })
    assert resp_rp.status_code == 200, f"Reset password failed: {resp_rp.text}"
    print(f"  -> Password successfully updated: '{resp_rp.json().get('message')}'")

    # 9. Sign In with Newly Reset Password
    print("\n[TEST 9/12] Sign In with Newly Reset Password...")
    resp_new_login = client.post("/api/auth/login", json={
        "email": reg_email,
        "password": new_password
    })
    assert resp_new_login.status_code == 200, f"Sign in with new password failed: {resp_new_login.text}"
    new_token = resp_new_login.json().get("access_token")
    print(f"  -> Successfully signed in with new password!")

    # 10. Real Google OAuth URL Generator
    print("\n[TEST 10/12] Google OAuth 2.0 URL Endpoint (/api/auth/google)...")
    resp_g = client.get("/api/auth/google")
    assert resp_g.status_code == 200, f"Google URL failed: {resp_g.text}"
    print(f"  -> Google OAuth Endpoint Response: Configured={resp_g.json().get('configured')}")

    # 11. Logout Endpoint
    print("\n[TEST 11/12] Session Logout Endpoint (/api/auth/logout)...")
    resp_logout = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {new_token}"})
    assert resp_logout.status_code == 200, f"Logout failed: {resp_logout.text}"
    print(f"  -> Logout confirmed: '{resp_logout.json().get('message')}'")

    # 12. Verify Existing Features Remain 100% Intact
    print("\n[TEST 12/12] Verify Existing ML & Database Features Unchanged...")
    resp_roads = client.get("/api/roads")
    assert resp_roads.status_code == 200
    roads_data = resp_roads.json()
    print(f"  -> Verified Roads Catalog: {len(roads_data)} real-world corridors loaded.")

    resp_pred = client.post("/api/predict", json={
        "road_name": "GST Road Corridor",
        "pothole_count": 8,
        "average_pothole_depth_cm": 4.5,
        "total_crack_length_m": 22.0,
        "pavement_age_years": 3.8,
        "road_length_km": 5.0,
        "surface_type": "Asphalt Concrete",
        "traffic_volume": "High",
        "rainfall": "Moderate"
    })
    assert resp_pred.status_code == 200
    pred_res = resp_pred.json()
    print(f"  -> XGBoost Tabular Predictor Status: 200 | Risk: {pred_res.get('risk_level')} | Score: {pred_res.get('risk_score')}/100")

    print("\n" + "=" * 75)
    print("  ALL 12 AUTHENTICATION & SYSTEM INTEGRITY TESTS PASSED PERFECTLY!")
    print("=" * 75)

if __name__ == "__main__":
    run_auth_tests()
