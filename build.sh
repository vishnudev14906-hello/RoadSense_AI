#!/usr/bin/env bash
set -e

echo "=== [RoadSense AI] Automated Build Started ==="

# Upgrade pip
python -m pip install --upgrade pip setuptools wheel

# Install PyTorch CPU (Only ~180MB, strictly avoids 2.5GB CUDA dependencies to fit inside Render 512MB RAM)
echo "=== [RoadSense AI] Installing PyTorch CPU wheel ==="
pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu || echo "[WARN] PyTorch install skipped; continuing with resilient vision fallback."

# Install Application Requirements
echo "=== [RoadSense AI] Installing Core Production Requirements ==="
pip install --no-cache-dir -r requirements.txt

echo "=== [RoadSense AI] Build Finished Successfully ==="
