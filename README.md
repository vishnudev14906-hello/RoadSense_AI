# RoadSense AI 🚗🚦

RoadSense AI is an intelligent road condition analysis and risk-aware routing platform featuring a FastAPI/Python backend for image analysis and risk estimation, paired with a React + Vite interactive map frontend.

---

## 🚀 Terminal Auto-Commit & Push

To automatically stage, commit, and push your changes to GitHub whenever you edit code, run the included terminal watcher:

### Quick Start (PowerShell)

```powershell
.\autocommit.ps1
```

Or run the batch launcher from any command prompt / terminal:

```cmd
.\autocommit.bat
```

### Options & Flags

| Flag | Description | Default | Example |
| :--- | :--- | :--- | :--- |
| `-Interval <sec>` | Polling interval in seconds | `20` | `.\autocommit.ps1 -Interval 15` |
| `-Debounce <sec>` | Delay to let multi-file saves settle before committing | `5` | `.\autocommit.ps1 -Debounce 3` |
| `-Once` | Commit & push current changes once, then exit | `false` | `.\autocommit.ps1 -Once` |
| `-Message <text>` | Specify a custom commit message prefix | Auto-generated | `.\autocommit.ps1 -Once -Message "Update UI components"` |
| `-NoPush` | Commit changes locally without pushing to GitHub | `false` | `.\autocommit.ps1 -NoPush` |
| `-Branch <name>` | Target branch to push to | Current branch | `.\autocommit.ps1 -Branch main` |

> **Stop Watcher:** Press <kbd>Ctrl</kbd> + <kbd>C</kbd> anytime in your terminal to stop.

---

## 🛠️ Project Structure

```
RoadSense AI/
├── Backend/              # FastAPI Python backend & ML risk analysis
│   ├── app/              # Application logic & routes
│   ├── main.py           # FastAPI entrypoint
│   └── requirements.txt  # Python dependencies
├── Frontend/             # React + Vite frontend
│   ├── src/              # React components & UI
│   └── package.json      # Node.js dependencies & scripts
├── autocommit.ps1        # PowerShell auto-commit & push watcher
├── autocommit.bat        # Convenience launcher
└── README.md
```

---

## 💻 Development Setup

### Backend (FastAPI)
```powershell
cd Backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

### Frontend (React + Vite)
```powershell
cd Frontend
npm install
npm run dev
```
