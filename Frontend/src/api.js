export const getApiBase = () => {
  let rawBase = (import.meta.env?.VITE_API_BASE_URL || "").trim();
  if (rawBase) {
    rawBase = rawBase.replace(/\/+$/, "");
    if (!rawBase.endsWith("/api")) {
      rawBase = `${rawBase}/api`;
    }
    return rawBase;
  }
  if (import.meta.env?.PROD) {
    return "https://roadsense-ai-ziky.onrender.com/api";
  }
  return "http://127.0.0.1:8000/api";
};

const API_BASE = getApiBase();

export const getStoredToken = () => {
  try {
    return localStorage.getItem('roadsense_token') || sessionStorage.getItem('roadsense_token') || null;
  } catch {
    return null;
  }
};

export const getAuthHeaders = (extra = {}) => {
  const token = getStoredToken();
  const headers = { ...extra };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // --- Auth ---
  async login(email, password, remember_me = false) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, remember_me }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Invalid email or password");
    }
    return res.json();
  },

  async register(name, email, password, role = "Inspector") {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Registration failed");
    }
    return res.json();
  },

  async getMe(token) {
    const headers = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}/auth/me`, { headers });
    if (!res.ok) {
      throw new Error("Failed to fetch authenticated user profile");
    }
    return res.json();
  },

  async logout(token) {
    const headers = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers
    });
    return res.json().catch(() => ({}));
  },

  async forgotPassword(email) {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Password reset request failed");
    }
    return res.json();
  },

  async resetPassword(email, new_password, reset_token) {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, new_password, reset_token }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Password reset failed");
    }
    return res.json();
  },

  async getGoogleAuthUrl() {
    const res = await fetch(`${API_BASE}/auth/google`);
    if (!res.ok) throw new Error("Failed to retrieve Google OAuth URL");
    return res.json();
  },

  async googleAuth(data) {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Google authentication failed");
    }
    return res.json();
  },

  // --- Roads Management ---
  async getRoads(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append("search", params.search);
    if (params.state && params.state !== "All") query.append("state", params.state);
    if (params.district && params.district !== "All") query.append("district", params.district);
    if (params.city && params.city !== "All") query.append("city", params.city);
    if (params.location && params.location !== "All") query.append("location", params.location);
    if (params.surface_type && params.surface_type !== "All") query.append("surface_type", params.surface_type);
    if (params.verification_status && params.verification_status !== "All") query.append("verification_status", params.verification_status);
    if (params.risk_level && params.risk_level !== "All") query.append("risk_level", params.risk_level);
    if (params.traffic_volume && params.traffic_volume !== "All") query.append("traffic_volume", params.traffic_volume);
    if (params.traffic_density && params.traffic_density !== "All") query.append("traffic_density", params.traffic_density);

    const res = await fetch(`${API_BASE}/roads?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch roads");
    return res.json();
  },

  async getRoadFilters() {
    const res = await fetch(`${API_BASE}/roads/filters`);
    if (!res.ok) throw new Error("Failed to fetch road filters");
    return res.json();
  },

  async getRoadImages() {
    const res = await fetch(`${API_BASE}/roads/images`);
    if (!res.ok) throw new Error("Failed to fetch road damage images");
    return res.json();
  },

  async getRoad(id) {
    const res = await fetch(`${API_BASE}/roads/${id}`);
    if (!res.ok) throw new Error("Failed to fetch road details");
    return res.json();
  },

  async createRoad(data) {
    const res = await fetch(`${API_BASE}/roads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to create road");
    }
    return res.json();
  },

  async updateRoad(id, data) {
    const res = await fetch(`${API_BASE}/roads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to update road");
    }
    return res.json();
  },

  async deleteRoad(id) {
    const res = await fetch(`${API_BASE}/roads/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete road");
    return res.json();
  },

  // --- Core Assessment & Prediction ---
  async predict(data) {
    const res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to run AI prediction");
    }
    return res.json();
  },

  async predictRoad(data) {
    return this.predict(data);
  },

  async predictImagePipeline(data) {
    const res = await fetch(`${API_BASE}/predict-image-pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to execute Road Image Risk Pipeline");
    }
    return res.json();
  },

  async detectRoadImage(data) {
    const res = await fetch(`${API_BASE}/detect-road-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to analyze road image");
    }
    return res.json();
  },

  async detectRoadImageFile(formData) {
    const res = await fetch(`${API_BASE}/detect-road-image/file`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to analyze road image file");
    }
    return res.json();
  },

  async scanImage(data) {
    const res = await fetch(`${API_BASE}/scan-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to analyze road image");
    }
    return res.json();
  },

  async detectImage(data) {
    const res = await fetch(`${API_BASE}/detect-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to detect road image damage");
    }
    return res.json();
  },

  async getCombinedAssessment(data) {
    const res = await fetch(`${API_BASE}/combined-assessment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to synthesize combined road assessment");
    }
    return res.json();
  },

  async getModelEvaluation() {
    const res = await fetch(`${API_BASE}/model-evaluation`);
    if (!res.ok) throw new Error("Failed to fetch model evaluation metrics");
    return res.json();
  },

  async getRecommendation(params = {}) {
    const query = new URLSearchParams(params);
    const res = await fetch(`${API_BASE}/recommendation?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch recommendation");
    return res.json();
  },

  async getPredictions(params = {}) {
    const query = new URLSearchParams();
    if (params.limit) query.append("limit", params.limit);
    if (params.risk_level && params.risk_level !== "All") query.append("risk_level", params.risk_level);

    const res = await fetch(`${API_BASE}/predictions?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch predictions");
    return res.json();
  },

  async getPrioritization(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append("search", params.search);
    if (params.location && params.location !== "All") query.append("location", params.location);
    if (params.min_risk && params.min_risk !== "All") query.append("min_risk", params.min_risk);

    const res = await fetch(`${API_BASE}/modules/maintenance-recommendation/prioritized-queue?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch prioritization queue");
    return res.json();
  },

  // --- Dashboard Stats & Charts ---
  async getDashboardStats() {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    if (!res.ok) throw new Error("Failed to fetch dashboard stats");
    return res.json();
  },

  async getDashboardCharts() {
    const res = await fetch(`${API_BASE}/dashboard/charts`);
    if (!res.ok) throw new Error("Failed to fetch dashboard charts");
    return res.json();
  },

  async reseedDatabase() {
    const res = await fetch(`${API_BASE}/seed`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to reseed database");
    return res.json();
  },

  getDatabaseJsonExportUrl() {
    return `${API_BASE}/database/export-json`;
  },

  async importDatabaseJson(data) {
    const res = await fetch(`${API_BASE}/database/import-json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to import database JSON");
    return res.json();
  },

  // ==========================================
  // --- 6 CORE ARCHITECTURE MODULE API METHODS ---
  // ==========================================

  // Module System Overview
  async getModulesDirectory() {
    const res = await fetch(`${API_BASE}/modules`);
    if (!res.ok) throw new Error("Failed to fetch modules directory");
    return res.json();
  },

  // 1. Road Data Collection Module
  dataCollection: {
    async getSummary() {
      const res = await fetch(`${API_BASE}/modules/data-collection/summary`);
      if (!res.ok) throw new Error("Failed to fetch data collection summary");
      return res.json();
    },
    async submitManual(data) {
      const res = await fetch(`${API_BASE}/modules/data-collection/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to submit manual road telemetry");
      return res.json();
    },
    async submitBatch(entries) {
      const res = await fetch(`${API_BASE}/modules/data-collection/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) throw new Error("Failed to submit batch telemetry");
      return res.json();
    },
    async simulateIoT(data) {
      const res = await fetch(`${API_BASE}/modules/data-collection/iot-simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to run IoT sensor stream ingestion");
      return res.json();
    }
  },

  // 2. Data Preprocessing Module
  preprocessing: {
    async getPipelineInfo() {
      const res = await fetch(`${API_BASE}/modules/preprocessing/pipeline-info`);
      if (!res.ok) throw new Error("Failed to fetch preprocessing pipeline documentation");
      return res.json();
    },
    async inspectTransformation(data) {
      const res = await fetch(`${API_BASE}/modules/preprocessing/inspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to inspect preprocessing steps");
      return res.json();
    }
  },

  // 3. Road Risk Prediction Module
  riskPrediction: {
    async getModelInfo() {
      const res = await fetch(`${API_BASE}/modules/risk-prediction/model-info`);
      if (!res.ok) throw new Error("Failed to fetch model info");
      return res.json();
    },
    async predict(data) {
      const res = await fetch(`${API_BASE}/modules/risk-prediction/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to run ML prediction");
      return res.json();
    },
    async simulateWhatIf(data) {
      const res = await fetch(`${API_BASE}/modules/risk-prediction/what-if`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to simulate what-if sensitivity scenario");
      return res.json();
    }
  },

  // 4. Risk Classification Module
  riskClassification: {
    async getTierMatrix() {
      const res = await fetch(`${API_BASE}/modules/risk-classification/tier-matrix`);
      if (!res.ok) throw new Error("Failed to fetch tier definitions");
      return res.json();
    },
    async getMetrics() {
      const res = await fetch(`${API_BASE}/modules/risk-classification/metrics`);
      if (!res.ok) throw new Error("Failed to fetch classification metrics");
      return res.json();
    },
    async classifyScore(score) {
      const res = await fetch(`${API_BASE}/modules/risk-classification/classify-score?score=${score}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to classify score");
      return res.json();
    }
  },

  // 5. AI Maintenance Recommendation Module
  maintenanceRecommendation: {
    async getRules() {
      const res = await fetch(`${API_BASE}/modules/maintenance-recommendation/rules`);
      if (!res.ok) throw new Error("Failed to fetch recommendation rules");
      return res.json();
    },
    async getQueue(params = {}) {
      const query = new URLSearchParams();
      if (params.location && params.location !== "All") query.append("location", params.location);
      if (params.priority && params.priority !== "All") query.append("priority", params.priority);
      const res = await fetch(`${API_BASE}/modules/maintenance-recommendation/prioritized-queue?${query.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch maintenance prioritization queue");
      return res.json();
    },
    async optimizeBudget(totalBudgetLakhs = 50.0) {
      const res = await fetch(`${API_BASE}/modules/maintenance-recommendation/budget-optimizer?total_budget_lakhs=${totalBudgetLakhs}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to run budget optimization");
      return res.json();
    }
  },

  // 6. Road Risk Monitoring & Reporting Module
  monitoringReporting: {
    async getKPIs() {
      const res = await fetch(`${API_BASE}/modules/monitoring-reporting/kpis`);
      if (!res.ok) throw new Error("Failed to fetch monitoring KPIs");
      return res.json();
    },
    async getGISHazards() {
      const res = await fetch(`${API_BASE}/modules/monitoring-reporting/gis-hazards`);
      if (!res.ok) throw new Error("Failed to fetch GIS hazard points");
      return res.json();
    },
    async getAuditReport(roadId) {
      const res = await fetch(`${API_BASE}/modules/monitoring-reporting/audit-report/${roadId}`);
      if (!res.ok) throw new Error("Failed to generate civil audit report");
      return res.json();
    },
    getExportCsvUrl() {
      return `${API_BASE}/modules/monitoring-reporting/export-csv`;
    },
  }
};
