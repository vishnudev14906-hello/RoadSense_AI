import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Cpu, 
  Wrench, 
  ShieldAlert, 
  Clock, 
  IndianRupee, 
  Save, 
  FileText, 
  Sliders, 
  RotateCcw,
  CheckCircle2,
  AlertOctagon,
  Activity,
  Timer,
  Search,
  Milestone,
  MapPin,
  Layers,
  HelpCircle,
  Car,
  Building2,
  Navigation,
  Camera,
  Upload,
  Scan,
  Eye,
  ArrowRight,
  ImageIcon,
  X
} from 'lucide-react';
import { RiskGauge } from '../components/Charts';
import RiskBadge from '../components/RiskBadge';
import { api } from '../api';
import { formatDateTime, formatTime } from '../utils/dateUtils';
import { SAMPLE_INSPECTION_SCENARIOS } from '../utils/sampleScenarios';
import { DEFAULT_ROADS } from '../data/roadsData';
import { compressImageForUpload, validateRoadImageClient, analyzeRoadDamageFromImage } from '../utils/imageUtils';
import { calculateLiveRoadRisk } from '../utils/civilRiskEngine';

const CITIES = [
  'All Municipalities',
  'Coimbatore',
  'Chennai',
  'Bengaluru',
  'Mumbai',
  'Hyderabad',
  'Kochi',
  'Delhi NCR',
  'Salem',
  'Madurai',
  'Tirupur',
  'Trichy'
];

export default function Predictor({ onOpenReport, initialParams }) {
  // Mode switcher: 'telemetry' (Manual/Corridor Telemetry Inputs) vs 'image' (Inspection Photo Inputs)
  const [activeInputMode, setActiveInputMode] = useState('telemetry');

  // --- 1. Road Telemetry State ---
  const [availableRoads, setAvailableRoads] = useState(DEFAULT_ROADS);
  const [selectedCity, setSelectedCity] = useState('All Municipalities');
  const [selectedRoadId, setSelectedRoadId] = useState('');
  const [roadSearchTerm, setRoadSearchTerm] = useState('');
  const [loadingRoads, setLoadingRoads] = useState(false);

  const [telemetryParams, setTelemetryParams] = useState({
    road_name: 'NH-47 Avinashi Expressway Corridor (Peelamedu)',
    location: 'Coimbatore',
    road_length: 14.5,
    pothole_count: 28,
    pothole_depth: 14.5,
    crack_length: 98.0,
    road_age: 14.2,
    traffic_density: 'Very High',
    rainfall: 'Heavy',
    latitude: 11.0285,
    longitude: 77.0118,
    save_prediction: false
  });

  const [telemetryPrediction, setTelemetryPrediction] = useState(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const [telemetrySaveSuccess, setTelemetrySaveSuccess] = useState(false);
  const [telemetrySavedTime, setTelemetrySavedTime] = useState(null);

  // --- 2. Road Image Input State ---
  const [selectedScenario, setSelectedScenario] = useState(SAMPLE_INSPECTION_SCENARIOS[0]);
  const [customImage, setCustomImage] = useState(null);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [isScanningImage, setIsScanningImage] = useState(false);
  const fileInputRef = useRef(null);

  const initTele = SAMPLE_INSPECTION_SCENARIOS[0].telemetry;
  const [imageParams, setImageParams] = useState({
    road_name: SAMPLE_INSPECTION_SCENARIOS[0].road_name,
    location: SAMPLE_INSPECTION_SCENARIOS[0].location,
    road_length: 5.0,
    pothole_count: Number(initTele.pothole_count !== undefined ? initTele.pothole_count : 24),
    pothole_depth: Number(initTele.average_pothole_depth_cm !== undefined ? initTele.average_pothole_depth_cm : 13.5),
    crack_length: Number(initTele.total_crack_length_m !== undefined ? initTele.total_crack_length_m : 85.0),
    road_age: Number(initTele.pavement_age_years !== undefined ? initTele.pavement_age_years : 12.5),
    traffic_density: initTele.traffic_volume || 'Very High',
    rainfall: initTele.rainfall || 'Heavy',
    latitude: null,
    longitude: null,
    save_prediction: false
  });

  const [imagePrediction, setImagePrediction] = useState(null);
  const [imageValidationError, setImageValidationError] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [imageSaveSuccess, setImageSaveSuccess] = useState(false);
  const [imageSavedTime, setImageSavedTime] = useState(null);

  // Fetch available real roads from database on mount
  useEffect(() => {
    loadAvailableRoads();
    // Also trigger default initial prediction for Image mode
    runImageInference({
      road_name: SAMPLE_INSPECTION_SCENARIOS[0].road_name,
      location: SAMPLE_INSPECTION_SCENARIOS[0].location,
      road_length: 5.0,
      pothole_count: Number(initTele.pothole_count !== undefined ? initTele.pothole_count : 24),
      pothole_depth: Number(initTele.average_pothole_depth_cm !== undefined ? initTele.average_pothole_depth_cm : 13.5),
      crack_length: Number(initTele.total_crack_length_m !== undefined ? initTele.total_crack_length_m : 85.0),
      road_age: Number(initTele.pavement_age_years !== undefined ? initTele.pavement_age_years : 12.5),
      traffic_density: initTele.traffic_volume || 'Very High',
      rainfall: initTele.rainfall || 'Heavy',
      save_prediction: false
    }, false);
  }, []);

  const loadAvailableRoads = async () => {
    try {
      const roads = await api.getRoads();
      const loadedRoads = (roads && roads.length > 0) ? roads : DEFAULT_ROADS;
      setAvailableRoads(loadedRoads);

      // Handle initial parameter selection or default to first real corridor
      if (initialParams && (initialParams.road_name || initialParams.road_id || initialParams.id)) {
        handleIncomingParams(initialParams, loadedRoads);
      } else if (!initialParams && loadedRoads.length > 0) {
        const firstRoad = loadedRoads[0];
        setSelectedRoadId(String(firstRoad.id));
        if (firstRoad.location) setSelectedCity(firstRoad.location);
        applyTelemetryRoadParams(firstRoad);
      } else {
        runTelemetryInference(telemetryParams, false);
      }
    } catch (err) {
      console.warn("Using default verified roads in predictor:", err);
      if (initialParams) {
        handleIncomingParams(initialParams, DEFAULT_ROADS);
      } else {
        runTelemetryInference(telemetryParams, false);
      }
    } finally {
      setLoadingRoads(false);
    }
  };

  const handleIncomingParams = (initData, loadedRoads = availableRoads) => {
    if (initData.sourceMode === 'image') {
      setActiveInputMode('image');
      const p_c = Number(initData.pothole_count !== undefined ? initData.pothole_count : 0);
      const p_d = Number(initData.pothole_depth !== undefined ? initData.pothole_depth : (initData.average_pothole_depth_cm !== undefined ? initData.average_pothole_depth_cm : 0.0));
      const c_l = Number(initData.crack_length !== undefined ? initData.crack_length : (initData.total_crack_length_m !== undefined ? initData.total_crack_length_m : 0.0));
      const r_a = Number(initData.road_age !== undefined ? initData.road_age : (initData.pavement_age_years !== undefined ? initData.pavement_age_years : 1.0));
      const r_l = Number(initData.road_length !== undefined ? initData.road_length : (initData.road_length_km !== undefined ? initData.road_length_km : 5.0));

      const updatedImg = {
        road_name: initData.road_name || 'Field Survey Capture',
        location: initData.location || initData.city || 'Field Survey Ingestion',
        road_length: r_l,
        pothole_count: p_c,
        pothole_depth: p_d,
        crack_length: c_l,
        road_age: r_a,
        traffic_density: initData.traffic_density || initData.traffic_volume || 'Medium',
        rainfall: initData.rainfall || 'Moderate',
        latitude: initData.latitude !== undefined ? initData.latitude : null,
        longitude: initData.longitude !== undefined ? initData.longitude : null,
        save_prediction: false
      };
      setImageParams(updatedImg);
      if (initData.imageUrl) {
        setCustomImage(initData.imageUrl);
        setSelectedScenario({
          id: 'transferred-upload',
          title: initData.imageTitle || `Captured Photo: ${initData.road_name}`,
          location: initData.location || initData.city || 'Field Inspection',
          road_name: initData.road_name || 'Captured Corridor',
          imageUrl: initData.imageUrl,
          description: 'Roadway inspection photo segmented by Neural Vision AI.',
          detections: initData.detections || [],
          telemetry: updatedImg
        });
      }
      runImageInference(updatedImg, false, initData.imageUrl || customImage);
    } else {
      setActiveInputMode('telemetry');
      applyTelemetryRoadParams(initData);
    }
  };

  const applyTelemetryRoadParams = (roadData) => {
    const rLen = roadData.road_length !== undefined ? Number(roadData.road_length) : (roadData.road_length_km !== undefined ? Number(roadData.road_length_km) : 5.0);
    const pCnt = roadData.pothole_count !== undefined ? Number(roadData.pothole_count) : 10;
    const pDep = roadData.pothole_depth !== undefined ? Number(roadData.pothole_depth) : (roadData.average_pothole_depth_cm !== undefined ? Number(roadData.average_pothole_depth_cm) : 5.0);
    const cLen = roadData.crack_length !== undefined ? Number(roadData.crack_length) : (roadData.total_crack_length_m !== undefined ? Number(roadData.total_crack_length_m) : 30.0);
    const rAge = roadData.road_age !== undefined ? Number(roadData.road_age) : (roadData.pavement_age_years !== undefined ? Number(roadData.pavement_age_years) : 5.0);
    const tDen = roadData.traffic_density || roadData.traffic_volume || 'High';
    const rRain = roadData.rainfall || 'Moderate';
    const rLoc = roadData.location || roadData.city || 'Coimbatore';

    const updated = {
      road_name: roadData.road_name || 'Corridor',
      location: rLoc,
      road_length: rLen,
      pothole_count: pCnt,
      pothole_depth: pDep,
      crack_length: cLen,
      road_age: rAge,
      traffic_density: tDen,
      rainfall: rRain,
      latitude: roadData.latitude !== undefined ? roadData.latitude : null,
      longitude: roadData.longitude !== undefined ? roadData.longitude : null,
      save_prediction: false
    };
    setTelemetryParams(updated);
    const rId = roadData.id || roadData.road_id;
    if (rId) {
      setSelectedRoadId(String(rId));
    }
    if (rLoc && rLoc !== selectedCity && selectedCity !== 'All Municipalities') {
      setSelectedCity(rLoc);
    }
    runTelemetryInference(updated, false);
  };

  // Sync when initialParams changes externally
  useEffect(() => {
    if (initialParams && (initialParams.road_name || initialParams.road_id || initialParams.id || initialParams.sourceMode)) {
      handleIncomingParams(initialParams);
    }
  }, [initialParams]);

  const handleSelectRoad = (roadId) => {
    setSelectedRoadId(roadId);
    const road = availableRoads.find(r => String(r.id) === String(roadId));
    if (road) {
      applyTelemetryRoadParams(road);
    }
  };

  const handleCityChange = (cityName) => {
    setSelectedCity(cityName);
    const cityRoads = cityName === 'All Municipalities' 
      ? availableRoads 
      : availableRoads.filter(r => r.location === cityName);

    if (cityRoads.length > 0) {
      const targetRoad = cityRoads[0];
      setSelectedRoadId(String(targetRoad.id));
      applyTelemetryRoadParams(targetRoad);
    }
  };

  // Debounce references to prevent rapid-fire requests and UI flickering
  const telemetryDebounceTimer = useRef(null);
  const latestTelemetryReqId = useRef(0);
  const imageDebounceTimer = useRef(null);
  const latestImageReqId = useRef(0);

  // Debounced input updater for Telemetry mode
  const updateTelemetryParam = (field, value) => {
    setTelemetryParams(prev => {
      const updated = { ...prev, [field]: value };
      
      if (telemetryDebounceTimer.current) {
        clearTimeout(telemetryDebounceTimer.current);
      }
      
      telemetryDebounceTimer.current = setTimeout(() => {
        runTelemetryInference(updated, false);
      }, 70);
      
      return updated;
    });
  };

  // Debounced input updater for Image mode
  const updateImageParam = (field, value) => {
    setImageParams(prev => {
      const updated = { ...prev, [field]: value };
      
      if (imageDebounceTimer.current) {
        clearTimeout(imageDebounceTimer.current);
      }
      
      imageDebounceTimer.current = setTimeout(() => {
        runImageInference(updated, false);
      }, 70);
      
      return updated;
    });
  };

  // --- Run XGBoost ML Inference for Telemetry Inputs ---
  const runTelemetryInference = async (inputParams, saveToDb = false) => {
    const reqId = ++latestTelemetryReqId.current;
    if (saveToDb) {
      setLoadingTelemetry(true);
    }
    setTelemetrySaveSuccess(false);
    try {
      const p_c = Number(inputParams.pothole_count !== undefined ? inputParams.pothole_count : 0);
      const p_d = Number(inputParams.pothole_depth !== undefined ? inputParams.pothole_depth : (inputParams.average_pothole_depth_cm !== undefined ? inputParams.average_pothole_depth_cm : 0.0));
      const c_l = Number(inputParams.crack_length !== undefined ? inputParams.crack_length : (inputParams.total_crack_length_m !== undefined ? inputParams.total_crack_length_m : 0.0));
      const r_a = Number(inputParams.road_age !== undefined ? inputParams.road_age : (inputParams.pavement_age_years !== undefined ? inputParams.pavement_age_years : 1.0));
      const r_l = Number(inputParams.road_length !== undefined ? inputParams.road_length : (inputParams.road_length_km !== undefined ? inputParams.road_length_km : 5.0));
      const t_v = inputParams.traffic_density || inputParams.traffic_volume || 'Medium';
      const r_f = inputParams.rainfall || 'Moderate';

      const payload = {
        road_name: inputParams.road_name?.trim() || 'Monitored Road Corridor',
        location: inputParams.location?.trim() || 'Coimbatore',
        pothole_count: p_c,
        average_pothole_depth_cm: p_d,
        pothole_depth: p_d,
        total_crack_length_m: c_l,
        crack_length: c_l,
        pavement_age_years: r_a,
        road_age: r_a,
        road_length_km: r_l,
        road_length: r_l,
        traffic_volume: t_v,
        traffic_density: t_v,
        rainfall: r_f,
        latitude: inputParams.latitude !== undefined ? inputParams.latitude : null,
        longitude: inputParams.longitude !== undefined ? inputParams.longitude : null,
        save_prediction: saveToDb
      };

      const res = await api.predict(payload);
      if (reqId === latestTelemetryReqId.current) {
        setTelemetryPrediction(res);
      }
      if (saveToDb) {
        setTelemetrySaveSuccess(true);
        setTelemetrySavedTime(new Date());
        api.getRoads().then(data => setAvailableRoads(data || [])).catch(() => {});
      }
    } catch (err) {
      console.error("Telemetry AI Prediction Error:", err);
    } finally {
      if (saveToDb) {
        setLoadingTelemetry(false);
      }
    }
  };

  // --- Handle Custom Image File Upload for Road Image AI Inspection ---
  const handleImageFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImageValidationError(null);
      setIsScanningImage(true);
      const base64Data = await compressImageForUpload(file, 1280, 0.88);
      if (!base64Data) {
        setIsScanningImage(false);
        return;
      }

      // 1. Immediate client-side deterministic computer vision road check
      const valCheck = await validateRoadImageClient(base64Data);
      if (!valCheck.isValid) {
        setIsScanningImage(false);
        setCustomImage(null);
        setImagePrediction(null);
        setImageValidationError("Please upload a valid image");
        if (e.target) e.target.value = "";
        return;
      }

        // Valid road image verified
      setCustomImage(base64Data);
      setImageValidationError(null);

      // 2. Extract physical distress telemetry dynamically from the uploaded image
      const clientAnalysis = await analyzeRoadDamageFromImage(base64Data);
      const pCnt = clientAnalysis?.telemetry?.pothole_count ?? 0;
      const pDep = clientAnalysis?.telemetry?.pothole_depth ?? (pCnt > 0 ? 4.0 : 0.0);
      const cLen = clientAnalysis?.telemetry?.crack_length ?? 0.0;
      const rAge = clientAnalysis?.telemetry?.road_age ?? 1.2;
      const tVol = clientAnalysis?.telemetry?.traffic_density || (pCnt > 10 ? 'High' : 'Moderate');
      const rain = clientAnalysis?.telemetry?.rainfall || (pCnt > 10 ? 'Heavy' : 'Moderate');

      const cleanedName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Uploaded Inspection Corridor';
      const updatedImgParams = {
        ...imageParams,
        road_name: cleanedName,
        location: 'Field Survey Ingestion',
        pothole_count: pCnt,
        pothole_depth: pDep,
        crack_length: cLen,
        road_age: rAge,
        traffic_density: tVol,
        rainfall: rain
      };
      setImageParams(updatedImgParams);

      if (clientAnalysis?.detections) {
        setSelectedScenario(prev => ({
          ...(prev || {}),
          id: 'custom-upload',
          title: cleanedName,
          imageUrl: base64Data,
          detections: clientAnalysis.detections,
          telemetry: clientAnalysis.telemetry
        }));
      }

      setTimeout(() => {
        setIsScanningImage(false);
        runImageInference(updatedImgParams, false, base64Data);
      }, 1000);
    } catch (err) {
      console.error("Image processing error:", err);
      setIsScanningImage(false);
      setCustomImage(null);
      setImagePrediction(null);
      setImageValidationError("Please upload a valid image");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  // --- Run End-to-End Road Image Risk Pipeline (Image Analysis + 8 Features + XGBoost) ---
  const runImageInference = async (inputParams, saveToDb = false, overrideImage = null) => {
    const reqId = ++latestImageReqId.current;
    setImageValidationError(null);
    if (saveToDb) {
      setLoadingImage(true);
    }
    setImageSaveSuccess(false);
    try {
      const imgB64 = overrideImage || customImage || selectedScenario?.imageUrl;
      let pipelineRes = null;

      if (imgB64) {
        // Validate image before sending to pipeline
        const valCheck = await validateRoadImageClient(imgB64);
        if (!valCheck.isValid) {
          setImagePrediction(null);
          setImageValidationError("Please upload a valid image");
          if (saveToDb) setLoadingImage(false);
          return;
        }

        try {
          pipelineRes = await api.detectRoadImage({
            image_base64: imgB64,
            road_name: inputParams.road_name?.trim() || 'Surveyed Photo Corridor'
          });
        } catch (pipeErr) {
          const detail = pipeErr?.response?.data?.detail || pipeErr?.message || "";
          if (detail.includes("Invalid image") || detail.includes("valid image") || pipeErr?.response?.status === 400) {
            setImagePrediction(null);
            setImageValidationError("Please upload a valid image");
            return;
          }
          try {
            pipelineRes = await api.predictImagePipeline({
              image_base64: imgB64,
              road_name: inputParams.road_name?.trim() || 'Surveyed Photo Corridor',
              location: inputParams.location?.trim() || 'Field Survey Ingestion'
            });
          } catch (e2) {
            const e2Detail = e2?.response?.data?.detail || e2?.message || "";
            if (e2Detail.includes("Invalid image") || e2Detail.includes("valid image") || e2?.response?.status === 400) {
              setImagePrediction(null);
              setImageValidationError("Please upload a valid image");
              return;
            }
          }
        }
      }

      if (pipelineRes && pipelineRes.is_valid_road === false) {
        setImagePrediction(null);
        setImageValidationError(pipelineRes.message || "Please upload a valid image");
        if (saveToDb) setLoadingImage(false);
        return;
      }

      if (!pipelineRes || !pipelineRes.risk_level) {
        const liveFallback = calculateLiveRoadRisk({
          pothole_count: inputParams.pothole_count ?? 0,
          pothole_depth: inputParams.pothole_depth ?? inputParams.average_pothole_depth_cm ?? 0.0,
          crack_length: inputParams.crack_length ?? inputParams.total_crack_length_m ?? 0.0,
          road_age: inputParams.road_age ?? inputParams.pavement_age_years ?? 1.2,
          road_length: inputParams.road_length ?? inputParams.road_length_km ?? 5.0,
          traffic_density: inputParams.traffic_density || inputParams.traffic_volume || 'Moderate',
          rainfall: inputParams.rainfall || 'Moderate'
        });
        pipelineRes = {
          ...liveFallback,
          is_valid_road: true,
          damage_type: liveFallback.risk_level === 'Low Risk' ? 'Optimal Road Surface' : 'Surface Cracking & Fatigue',
          detections: liveFallback.risk_level === 'Low Risk' ? [
            { id: 1, label: 'Surface Integrity: Optimal Road Pavement', confidence: 96.5, x: 20, y: 35, w: 60, h: 50, color: '#10B981' }
          ] : [
            { class: 'Pothole Distress (D40)', confidence: 91.5, bbox: [0.35, 0.45, 0.28, 0.24] }
          ]
        };
      }

      setImageValidationError(null);
      const rawConf = pipelineRes.confidence;
      const formattedConf = rawConf !== undefined ? (rawConf <= 1.0 ? Math.round(rawConf * 100) : Math.round(rawConf)) : 95;
      const finalPrediction = {
        ...pipelineRes,
        confidence: formattedConf,
        confidence_percentage: formattedConf,
        road_name: inputParams.road_name?.trim() || 'Surveyed Road Photo Corridor',
        location: inputParams.location?.trim() || 'Field Survey Ingestion',
        prediction_date: new Date()
      };

      if (reqId === latestImageReqId.current) {
        setImagePrediction(finalPrediction);
      }

      if (saveToDb) {
        setImageSaveSuccess(true);
        setImageSavedTime(new Date());
        api.getRoads().then(data => setAvailableRoads(data || [])).catch(() => {});
      }
    } catch (err) {
      console.error("Image AI Prediction Error:", err);
      setImagePrediction(null);
      setImageValidationError("Please upload a valid image");
    } finally {
      if (saveToDb) {
        setLoadingImage(false);
      }
    }
  };

  // --- Presets for Telemetry Mode ---
  const applyTelemetryPreset = (preset) => {
    let updated;
    if (preset === 'new') {
      updated = {
        ...telemetryParams,
        pothole_count: 0,
        pothole_depth: 0.0,
        crack_length: 2.0,
        road_age: 1.0,
        rainfall: 'Light',
        save_prediction: false
      };
    } else if (preset === 'moderate') {
      updated = {
        ...telemetryParams,
        pothole_count: 8,
        pothole_depth: 5.0,
        crack_length: 35.0,
        road_age: 6.0,
        rainfall: 'Moderate',
        save_prediction: false
      };
    } else if (preset === 'monsoon_damaged') {
      updated = {
        ...telemetryParams,
        pothole_count: 22,
        pothole_depth: 12.0,
        crack_length: 80.0,
        road_age: 11.0,
        traffic_density: 'Very High',
        rainfall: 'Torrential',
        save_prediction: false
      };
    } else if (preset === 'critical') {
      updated = {
        ...telemetryParams,
        pothole_count: 36,
        pothole_depth: 16.5,
        crack_length: 125.0,
        road_age: 15.0,
        traffic_density: 'Very High',
        rainfall: 'Heavy',
        save_prediction: false
      };
    }
    if (updated) {
      setTelemetryParams(updated);
      runTelemetryInference(updated, false);
    }
  };

  // --- Handle Selecting an Image Scenario ---
  const handleSelectImageScenario = (scenario) => {
    setCustomImage(null);
    setSelectedScenario(scenario);
    const t = scenario.telemetry || {};
    const p_c = Number(t.pothole_count !== undefined ? t.pothole_count : 24);
    const p_d = Number(t.average_pothole_depth_cm !== undefined ? t.average_pothole_depth_cm : (t.pothole_depth || 13.5));
    const c_l = Number(t.total_crack_length_m !== undefined ? t.total_crack_length_m : (t.crack_length || 85.0));
    const r_a = Number(t.pavement_age_years !== undefined ? t.pavement_age_years : (t.road_age || 12.5));
    const t_v = t.traffic_volume || t.traffic_density || 'Very High';
    const r_f = t.rainfall || 'Heavy';

    const updated = {
      ...imageParams,
      road_name: scenario.road_name,
      location: scenario.location,
      pothole_count: p_c,
      pothole_depth: p_d,
      crack_length: c_l,
      road_age: r_a,
      traffic_density: t_v,
      rainfall: r_f,
      save_prediction: false
    };
    setImageParams(updated);
    setIsScanningImage(true);
    setTimeout(() => {
      setIsScanningImage(false);
      runImageInference(updated, false);
    }, 1200);
  };



  // Filter available roads by selected city and search keyword for telemetry mode
  const filteredRoads = availableRoads.filter(r => {
    const matchesCity = selectedCity === 'All Municipalities' || r.location === selectedCity;
    if (!matchesCity) return false;
    if (!roadSearchTerm) return true;
    const term = roadSearchTerm.toLowerCase();
    return (
      r.road_name?.toLowerCase().includes(term) ||
      r.location?.toLowerCase().includes(term) ||
      r.traffic_density?.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. THE LIVING ROAD FULL-BLEED ANIMATED ECG ROAD PERSPECTIVE HERO */}
      <div className="living-road-hero" style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(30, 58, 138, 0.45) 0%, rgba(10, 14, 20, 0.95) 75%)',
        border: '1px solid rgba(59, 130, 246, 0.35)',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2.5rem 1.5rem 2rem',
        overflow: 'hidden'
      }}>
        {/* Full-Bleed Animated Road Perspective & Pulsing ECG Monitor */}
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.85,
          zIndex: 0
        }}>
          <svg width="100%" height="100%" viewBox="0 0 1200 480" preserveAspectRatio="none">
            <defs>
              <linearGradient id="roadPerspective" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0B132B" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#0A0E14" stopOpacity="0.95" />
              </linearGradient>

              <linearGradient id="ecgGlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.1" />
                <stop offset="40%" stopColor="#3B82F6" stopOpacity="1" />
                <stop offset="70%" stopColor="#06B6D4" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Receding Asphalt Road Perspective Lines */}
            <path d="M 450 0 L 100 480 M 750 0 L 1100 480" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="2" fill="none" />
            <path d="M 520 0 L 350 480 M 680 0 L 850 480" stroke="rgba(59, 130, 246, 0.08)" strokeWidth="1.5" strokeDasharray="8 8" fill="none" />

            {/* Center Road Pulse Spine */}
            <line x1="600" y1="0" x2="600" y2="480" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="2" strokeDasharray="16 16" />

            {/* Pulsing ECG Heartbeat Waveform Line */}
            <path
              d="M 0 240 
                 L 220 240 
                 L 250 240 
                 L 270 215 
                 L 290 265 
                 L 310 170 
                 L 335 310 
                 L 355 240 
                 L 500 240 
                 L 530 210 
                 L 560 270 
                 L 585 150 
                 L 615 330 
                 L 640 240 
                 L 780 240 
                 L 810 215 
                 L 835 265 
                 L 860 180 
                 L 885 300 
                 L 910 240 
                 L 1200 240"
              fill="none"
              stroke="url(#ecgGlowGradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ecg-line-pulse"
              style={{ filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))' }}
            />
          </svg>
        </div>

        {/* Hero Content Overlay */}
        <div style={{ 
          position: 'relative', 
          zIndex: 1, 
          maxWidth: '820px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '0.85rem' 
        }}>
          {/* Mission Control Status Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.35rem 0.9rem',
            borderRadius: '999px',
            background: 'rgba(10, 14, 20, 0.8)',
            border: '1px solid rgba(59, 130, 246, 0.5)',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)'
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#3B82F6',
              boxShadow: '0 0 10px #3B82F6'
            }} className="pulse-animation" />
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#60A5FA', letterSpacing: '0.08em', textTransform: 'uppercase' }} className="mono">
              THE LIVING ROAD • VITAL SIGNS ACTIVE
            </span>
          </div>

          <h1 style={{
            fontSize: '2.3rem',
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            color: '#FFFFFF',
            margin: 0
          }}>
            The Living Road <span style={{
              background: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #06B6D4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>AI Diagnostic Engine</span>
          </h1>

          <p style={{
            fontSize: '0.92rem',
            color: '#94A3B8',
            lineHeight: 1.5,
            maxWidth: '640px',
            margin: 0
          }}>
            Treating the highway network as a living organism. Risk scores pulse as real-time vital signs powered by XGBoost & IRC:82 civil engineering intelligence.
          </p>
        </div>
      </div>

      {/* Mode Selector Control Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Cpu size={22} color="#3B82F6" />
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Inference Control Console
          </span>
        </div>

        {/* Mode Selector Tabs (Separating Road Inputs vs Road Image Inputs) */}
        <div className="appearance-segment" style={{ padding: '0.25rem', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <button
            className={`appearance-segment-btn ${activeInputMode === 'telemetry' ? 'active' : ''}`}
            onClick={() => setActiveInputMode('telemetry')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 1rem', fontSize: '0.86rem', fontWeight: 700 }}
          >
            <Milestone size={16} />
            <span>Road Telemetry Inputs</span>
          </button>

          <button
            className={`appearance-segment-btn ${activeInputMode === 'image' ? 'active' : ''}`}
            onClick={() => setActiveInputMode('image')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 1rem', fontSize: '0.86rem', fontWeight: 700 }}
          >
            <Camera size={16} />
            <span>Road Image Inputs</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          MODE 1: ROAD TELEMETRY INPUTS & CORRIDOR XGBOOST PREDICTION
         ========================================================================= */}
      {activeInputMode === 'telemetry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Telemetry Presets Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={15} color="#60A5FA" />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700 }}>Telemetry Distress Presets:</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => applyTelemetryPreset('new')} title="Simulate newly resurfaced road">
                ✨ Newly Paved
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => applyTelemetryPreset('moderate')} title="Simulate mid-life moderate road distress">
                ⚠️ Moderate Wear
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => applyTelemetryPreset('critical')} title="Simulate severe structural failure & safety hazard">
                🚨 Severe Hazard
              </button>
            </div>
          </div>

          {/* 2-Column Layout for Telemetry Mode */}
          <div className="predictor-two-column-grid">
            
            {/* Left Column: Corridor Selection & Telemetry Sliders */}
            <div className="glass-card">
              
              {/* Unified Combined Corridor Selector & Custom Input Hub */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(99, 102, 241, 0.05))',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Milestone size={15} color="#60A5FA" />
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Predefined Monitored Roadways & Custom Hub
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#93C5FD', fontWeight: 600 }}>
                    {availableRoads.length} Corridors
                  </span>
                </div>

                {/* City Selector & Search Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <div>
                    <select
                      className="form-select form-input-sm"
                      value={selectedCity}
                      onChange={(e) => handleCityChange(e.target.value)}
                      style={{ fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      {CITIES.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <Search size={13} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                    <input
                      type="text"
                      className="form-input form-input-sm"
                      placeholder="Filter corridor name..."
                      value={roadSearchTerm}
                      onChange={(e) => setRoadSearchTerm(e.target.value)}
                      style={{ paddingLeft: '1.8rem', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                {/* Corridor Dropdown */}
                <select
                  className="form-select"
                  value={selectedRoadId}
                  onChange={(e) => {
                    const rId = e.target.value;
                    setSelectedRoadId(rId);
                    if (rId) {
                      const found = availableRoads.find(r => String(r.id) === String(rId));
                      if (found) {
                        applyTelemetryRoadParams(found);
                      }
                    }
                  }}
                  style={{ width: '100%', fontSize: '0.84rem' }}
                >
                  <option value="">— Select from 70+ Monitored Real Corridors —</option>
                  {filteredRoads.map((road) => (
                    <option key={road.id} value={road.id}>
                      {road.road_name} ({road.location}) • {road.risk_level || 'Evaluated'} • {road.road_length} km
                    </option>
                  ))}
                </select>

                {telemetryParams.latitude && telemetryParams.longitude && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    marginTop: '0.5rem',
                    fontSize: '0.72rem',
                    color: '#93C5FD',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}>
                    <MapPin size={12} color="#60A5FA" />
                    <span>Verified GPS: {Number(telemetryParams.latitude).toFixed(4)}° N, {Number(telemetryParams.longitude).toFixed(4)}° E</span>
                  </div>
                )}
              </div>

              {/* Physical Pavement Distress Inputs (Both Typing and Sliders) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Road Info Header: Editable Names */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.65rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Corridor Name</label>
                    <input
                      type="text"
                      className="form-input form-input-sm"
                      value={telemetryParams.road_name}
                      onChange={(e) => updateTelemetryParam('road_name', e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Municipality / City</label>
                    <input
                      type="text"
                      className="form-input form-input-sm"
                      value={telemetryParams.location}
                      onChange={(e) => updateTelemetryParam('location', e.target.value)}
                    />
                  </div>
                </div>

                {/* 1. Road Length Input & Slider */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Road Length (km)</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <input
                        type="number"
                        min="0.1"
                        max="50.0"
                        step="0.5"
                        className="form-input form-input-sm"
                        style={{ width: '70px', padding: '0.2rem 0.4rem', textAlign: 'right', fontWeight: 700, color: '#60A5FA', fontFamily: 'JetBrains Mono, monospace' }}
                        value={telemetryParams.road_length}
                        onChange={(e) => updateTelemetryParam('road_length', parseFloat(e.target.value) || 0.5)}
                      />
                      <span className="mono" style={{ color: '#60A5FA', fontSize: '0.75rem', fontWeight: 700 }}>km</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="30.0"
                    step="0.5"
                    className="form-range"
                    value={telemetryParams.road_length}
                    onChange={(e) => updateTelemetryParam('road_length', parseFloat(e.target.value))}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    <span>0.5 km (Short Span)</span>
                    <span>15 km (Expressway)</span>
                    <span>30 km (Highway Corridor)</span>
                  </div>
                </div>

                {/* 2. Pothole Count Input & Slider */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Pothole / Crater Count</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        className="form-input form-input-sm"
                        style={{ width: '70px', padding: '0.2rem 0.4rem', textAlign: 'right', fontWeight: 700, color: telemetryParams.pothole_count > 15 ? '#EF4444' : '#60A5FA', fontFamily: 'JetBrains Mono, monospace' }}
                        value={telemetryParams.pothole_count}
                        onChange={(e) => updateTelemetryParam('pothole_count', parseInt(e.target.value) || 0)}
                      />
                      <span className="mono" style={{ color: '#60A5FA', fontSize: '0.75rem', fontWeight: 700 }}>units</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="1"
                    className="form-range"
                    value={telemetryParams.pothole_count}
                    onChange={(e) => updateTelemetryParam('pothole_count', parseInt(e.target.value))}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    <span>0 (Pristine)</span>
                    <span>25 (Moderate)</span>
                    <span>60 (Severe Field)</span>
                  </div>
                </div>

                {/* 3. Pothole Depth Input & Slider */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Average Crater Depth</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <input
                        type="number"
                        min="0.0"
                        max="30.0"
                        step="0.5"
                        className="form-input form-input-sm"
                        style={{ width: '70px', padding: '0.2rem 0.4rem', textAlign: 'right', fontWeight: 700, color: telemetryParams.pothole_depth > 8 ? '#EF4444' : '#60A5FA', fontFamily: 'JetBrains Mono, monospace' }}
                        value={telemetryParams.pothole_depth}
                        onChange={(e) => updateTelemetryParam('pothole_depth', parseFloat(e.target.value) || 0.0)}
                      />
                      <span className="mono" style={{ color: '#60A5FA', fontSize: '0.75rem', fontWeight: 700 }}>cm</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="22.0"
                    step="0.5"
                    className="form-range"
                    value={telemetryParams.pothole_depth}
                    onChange={(e) => updateTelemetryParam('pothole_depth', parseFloat(e.target.value))}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    <span>0 cm (Smooth)</span>
                    <span>10 cm (Hazard)</span>
                    <span>22 cm (Axle Breaking)</span>
                  </div>
                </div>

                {/* 4. Crack Length Input & Slider */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Total Crack Length</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <input
                        type="number"
                        min="0.0"
                        max="200.0"
                        step="1.0"
                        className="form-input form-input-sm"
                        style={{ width: '70px', padding: '0.2rem 0.4rem', textAlign: 'right', fontWeight: 700, color: telemetryParams.crack_length > 50 ? '#EF4444' : '#60A5FA', fontFamily: 'JetBrains Mono, monospace' }}
                        value={telemetryParams.crack_length}
                        onChange={(e) => updateTelemetryParam('crack_length', parseFloat(e.target.value) || 0.0)}
                      />
                      <span className="mono" style={{ color: '#60A5FA', fontSize: '0.75rem', fontWeight: 700 }}>meters</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    step="1"
                    className="form-range"
                    value={telemetryParams.crack_length}
                    onChange={(e) => updateTelemetryParam('crack_length', parseFloat(e.target.value))}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    <span>0 m (Intact)</span>
                    <span>75 m (Fissures)</span>
                    <span>150 m (Alligator Fatigue)</span>
                  </div>
                </div>

                {/* 5. Pavement Age Input & Slider */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Pavement Age</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <input
                        type="number"
                        min="0.1"
                        max="25.0"
                        step="0.5"
                        className="form-input form-input-sm"
                        style={{ width: '70px', padding: '0.2rem 0.4rem', textAlign: 'right', fontWeight: 700, color: telemetryParams.road_age > 10 ? '#EF4444' : '#60A5FA', fontFamily: 'JetBrains Mono, monospace' }}
                        value={telemetryParams.road_age}
                        onChange={(e) => updateTelemetryParam('road_age', parseFloat(e.target.value) || 0.5)}
                      />
                      <span className="mono" style={{ color: '#60A5FA', fontSize: '0.75rem', fontWeight: 700 }}>years</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="20.0"
                    step="0.5"
                    className="form-range"
                    value={telemetryParams.road_age}
                    onChange={(e) => updateTelemetryParam('road_age', parseFloat(e.target.value))}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    <span>0.5 yrs (Fresh)</span>
                    <span>10 yrs (Mid-life)</span>
                    <span>20 yrs (End of Life)</span>
                  </div>
                </div>

                {/* 6. Traffic Density & Precipitation Pattern */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Traffic Density</label>
                    <select
                      className="form-select form-input-sm"
                      value={telemetryParams.traffic_density || 'Medium'}
                      onChange={(e) => updateTelemetryParam('traffic_density', e.target.value)}
                    >
                      <option value="Low">Low Traffic</option>
                      <option value="Medium">Medium Traffic</option>
                      <option value="High">High Traffic</option>
                      <option value="Very High">Very High Traffic</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Precipitation Pattern</label>
                    <select
                      className="form-select form-input-sm"
                      value={telemetryParams.rainfall || 'Moderate'}
                      onChange={(e) => updateTelemetryParam('rainfall', e.target.value)}
                    >
                      <option value="Light">Light Rainfall</option>
                      <option value="Moderate">Moderate Rainfall</option>
                      <option value="Heavy">Heavy Rainfall</option>
                      <option value="Torrential">Torrential / Monsoon</option>
                    </select>
                  </div>
                </div>

                {/* Single Clean Action Button */}
                <div style={{ display: 'flex', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => runTelemetryInference(telemetryParams, true)}
                    disabled={loadingTelemetry}
                  >
                    <Save size={16} />
                    <span>{loadingTelemetry ? 'Logging Telemetry Assessment...' : 'Save & Log Assessment'}</span>
                  </button>
                </div>

                {telemetrySaveSuccess && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.18)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#34D399',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem'
                  }}>
                    <CheckCircle2 size={16} color="#34D399" />
                    <span>
                      ✨ Road <strong>"{telemetryParams.road_name || 'Corridor'}"</strong> updated in <strong>Road Networks</strong> & <strong>GIS Hazard Map</strong> at {formatTime(telemetrySavedTime || new Date(), true)}!
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: XGBoost ML Prediction for Road Telemetry */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Telemetry Live Bar */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(99, 102, 241, 0.08))',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Activity size={16} color="#60A5FA" className="pulse-animation" />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#93C5FD', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Road Telemetry Inference Telemetry
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {formatDateTime(telemetryPrediction?.prediction_date || new Date())}
                    </div>
                  </div>
                </div>

                <span style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34D399',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.5rem',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}>
                  <span className="live-pulse" style={{ width: 6, height: 6 }}></span>
                  {loadingTelemetry ? 'Evaluating Model...' : 'Road Telemetry Model Active'}
                </span>
              </div>

              {/* Card 1: XGBoost ML Risk Prediction (Road Telemetry) */}
              <div className="glass-card highlight">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Cpu size={18} color="#3B82F6" />
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      1. XGBoost ML Risk Prediction (Road Telemetry)
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#60A5FA', fontWeight: 600 }}>
                    {telemetryPrediction?.confidence || 95}% Confidence
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                  <div>
                    <RiskGauge
                      score={telemetryPrediction?.risk_score || 50}
                      level={telemetryPrediction?.risk_level || 'Medium Risk'}
                    />
                  </div>

                  {/* Class Probability Distribution */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Telemetry Model Probability Breakdown:
                    </span>
                    {telemetryPrediction?.probabilities &&
                      Object.entries(telemetryPrediction.probabilities).map(([cls, prob]) => {
                        const color = cls.includes('Critical') ? '#EF4444' : cls.includes('High') ? '#F97316' : cls.includes('Medium') ? '#F59E0B' : '#10B981';
                        return (
                          <div key={cls}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{cls}</span>
                              <span style={{ color, fontWeight: 700 }} className="mono">{prob}%</span>
                            </div>
                            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${prob}%`,
                                  backgroundColor: color,
                                  borderRadius: 3,
                                  transition: 'width 0.4s ease'
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Card 2: AI Maintenance Decision Agent for Telemetry */}
              <div className="glass-card" style={{ borderColor: 'rgba(99, 102, 241, 0.4)', background: 'linear-gradient(135deg, rgba(18, 24, 40, 0.95), rgba(30, 27, 75, 0.4))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Wrench size={18} color="#818CF8" />
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      2. AI Maintenance Decision Agent
                    </h3>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`priority-badge ${(telemetryPrediction?.priority || 'routine').toLowerCase()}`}>
                      {telemetryPrediction?.priority || 'Routine'}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onOpenReport && onOpenReport({ ...telemetryParams, ...telemetryPrediction })}
                      title="Generate Official Audit Document"
                    >
                      <FileText size={13} />
                      <span>Report</span>
                    </button>
                  </div>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#818CF8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                    🔧 Prescribed Engineering Remediation
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {telemetryPrediction?.recommendation || 'Preventive maintenance and scheduled surface inspection.'}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Urgency Window</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F87171' }}>
                        {telemetryPrediction?.agent_recommendation?.inspection_timeline || 'Within 14 calendar days'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Estimated Budget Scope</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#34D399' }} className="mono">
                        {telemetryPrediction?.estimated_budget || '₹3,50,000 - ₹8,50,000'}
                      </div>
                    </div>
                  </div>
                </div>

                {telemetryPrediction?.agent_recommendation?.safety_hazard && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem'
                  }}>
                    <AlertOctagon size={20} color="#F87171" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '0.8rem', color: '#FCA5A5', lineHeight: 1.4 }}>
                      {telemetryPrediction.agent_recommendation.safety_hazard}
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                    💡 Agent Reasoning Rationale
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {telemetryPrediction?.ai_reasoning || 'Evaluated combined impact of severe crater depth and rainfall infiltration against trained XGBoost trees.'}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODE 2: ROAD IMAGE INPUTS & OPTICAL RISK PREDICTION (XGBOOST ML MODEL)
         ========================================================================= */}
      {activeInputMode === 'image' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* 2-Column Layout for Image Mode */}
          <div className="predictor-two-column-grid">
            
            {/* Left Column: Image Canvas & Measurable Features Extractor */}
            <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Image Viewport with Neural Network Bounding Boxes */}
              <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#000', position: 'relative' }}>
                <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: '#93C5FD' }}>
                    <ImageIcon size={14} />
                    <span>{customImage ? 'Uploaded Road Inspection Photo' : (selectedScenario?.title || 'Road Inspection Image')}</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageFileUpload}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ padding: '0.2rem 0.55rem', fontSize: '0.74rem', gap: '0.3rem', height: 'auto' }}
                      title="Upload custom road image for AI inspection"
                    >
                      <Upload size={13} color="#60A5FA" />
                      <span>Upload Photo</span>
                    </button>
                  </div>
                </div>

                <div style={{ position: 'relative', width: '100%', minHeight: '260px', maxHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <img
                    src={customImage || selectedScenario?.imageUrl}
                    alt="Road Inspection"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />

                  {isScanningImage && (
                    <>
                      <div className="laser-scan-line" />
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.25) 0%, rgba(6, 182, 212, 0.1) 50%, transparent 100%)',
                        borderBottom: '3px solid #06B6D4',
                        boxShadow: '0 0 20px #06B6D4',
                        pointerEvents: 'none'
                      }} />
                    </>
                  )}
                </div>
              </div>

              {/* Invalid Image Error Notice */}
              {(imageValidationError || (imagePrediction && (imagePrediction.is_valid_road === false || !imagePrediction.risk_level))) && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.16)',
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  color: '#FCA5A5',
                  padding: '1.1rem 1.4rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  boxShadow: '0 4px 24px rgba(239, 68, 68, 0.25)',
                  animation: 'fadeIn 0.3s ease-in-out'
                }}>
                  <AlertOctagon size={26} color="#EF4444" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: '#EF4444', fontSize: '1.05rem', letterSpacing: '0.01em' }}>
                      Please upload a valid image
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#FECACA', marginTop: '0.2rem' }}>
                      The uploaded file does not contain a recognizable roadway or asphalt pavement scene. The AI Risk Prediction model will not classify non-road photos.
                    </div>
                  </div>
                  <button
                    onClick={() => setImageValidationError(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#FCA5A5',
                      cursor: 'pointer',
                      fontSize: '1.25rem',
                      padding: '0.25rem 0.5rem',
                      lineHeight: 1
                    }}
                    title="Dismiss notification"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* 8 Structured Measurable Features Extracted for XGBoost (Only for valid road images) */}
              {imagePrediction && imagePrediction.is_valid_road !== false && imagePrediction.risk_level && (
                <>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.8))',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(168, 85, 247, 0.35)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 700, color: '#C084FC' }}>
                        <Sliders size={15} color="#A855F7" />
                        <span>Extract Measurable Features (XGBoost Input Vector)</span>
                      </div>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: '#C084FC',
                        background: 'rgba(168, 85, 247, 0.15)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-full)'
                      }}>
                        8 Extracted Physical Indicators
                      </span>
                    </div>

                    {/* Extracted Damage Type & Severity Badges */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.35)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--text-dim)' }}>Detected Damage: </span>
                        <strong style={{ color: '#93C5FD' }}>{imagePrediction?.damage_type || 'Potholes & Structural Cracking'}</strong>
                      </div>
                      <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.35)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--text-dim)' }}>Damage Severity: </span>
                        <strong style={{ color: '#FCD34D' }}>{imagePrediction?.damage_severity || 'Moderate'}</strong>
                      </div>
                    </div>

                    {/* 8 Measurable Features Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem' }}>
                      {/* Feature 1: Pothole Count */}
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.65rem' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>• Pothole Count</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: (imagePrediction?.features?.pothole_count ?? imagePrediction?.pothole_count ?? imageParams.pothole_count) > 15 ? '#EF4444' : (imagePrediction?.features?.pothole_count ?? imagePrediction?.pothole_count ?? imageParams.pothole_count) > 5 ? '#F59E0B' : '#10B981', marginTop: '0.1rem' }} className="mono">
                          {imagePrediction?.features?.pothole_count ?? imagePrediction?.pothole_count ?? imageParams.pothole_count} <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-dim)' }}>craters</span>
                        </div>
                      </div>

                      {/* Feature 2: Pothole Area Ratio */}
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.65rem' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>• Pothole Area %</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#60A5FA', marginTop: '0.1rem' }} className="mono">
                          {imagePrediction?.features?.pothole_area_ratio !== undefined ? `${(imagePrediction.features.pothole_area_ratio * 100).toFixed(1)}%` : '6.5%'}
                        </div>
                      </div>

                      {/* Feature 3: Crack Area Ratio */}
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.65rem' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>• Crack Area %</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F59E0B', marginTop: '0.1rem' }} className="mono">
                          {imagePrediction?.features?.crack_area_ratio !== undefined ? `${(imagePrediction.features.crack_area_ratio * 100).toFixed(1)}%` : '12.0%'}
                        </div>
                      </div>

                      {/* Feature 4: Damaged Area Percentage */}
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.65rem' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>• Total Damaged %</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: (imagePrediction?.features?.damage_area_ratio ?? (imagePrediction?.damaged_area_percentage ? imagePrediction.damaged_area_percentage / 100 : 0.18)) > 0.35 ? '#EF4444' : '#F59E0B', marginTop: '0.1rem' }} className="mono">
                          {imagePrediction?.features?.damage_area_ratio !== undefined ? `${(imagePrediction.features.damage_area_ratio * 100).toFixed(1)}%` : `${imagePrediction?.damaged_area_percentage || 18.5}%`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metadata Input Fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Corridor Label</label>
                      <input
                        type="text"
                        className="form-input form-input-sm"
                        value={imageParams.road_name}
                        onChange={(e) => {
                          const updated = { ...imageParams, road_name: e.target.value };
                          setImageParams(updated);
                        }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Municipality / Location</label>
                      <input
                        type="text"
                        className="form-input form-input-sm"
                        value={imageParams.location}
                        onChange={(e) => {
                          const updated = { ...imageParams, location: e.target.value };
                          setImageParams(updated);
                        }}
                      />
                    </div>
                  </div>

                  {/* Save Assessment Button */}
                  <div style={{ display: 'flex', marginTop: '0.3rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => runImageInference(imageParams, true)}
                      disabled={loadingImage}
                    >
                      <Save size={16} />
                      <span>{loadingImage ? 'Logging Image Assessment...' : 'Save & Log Assessment'}</span>
                    </button>
                  </div>

                  {imageSaveSuccess && (
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.18)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#34D399',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem'
                    }}>
                      <CheckCircle2 size={16} color="#34D399" />
                      <span>
                        ✨ Photo Assessment for <strong>"{imageParams.road_name || 'Corridor'}"</strong> saved to <strong>Road Networks</strong> & <strong>GIS Map</strong> at {formatTime(imageSavedTime || new Date(), true)}!
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right Column: XGBoost ML Prediction & Maintenance Recommendation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {(imageValidationError || (imagePrediction && (imagePrediction.is_valid_road === false || !imagePrediction.risk_level))) ? (
                <div className="glass-card" style={{
                  borderColor: 'rgba(239, 68, 68, 0.45)',
                  background: 'rgba(239, 68, 68, 0.06)',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem',
                  boxShadow: '0 4px 24px rgba(239, 68, 68, 0.15)'
                }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <AlertOctagon size={28} color="#EF4444" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#EF4444', marginBottom: '0.4rem' }}>
                      Please upload a valid image
                    </h3>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto' }}>
                      The uploaded file does not contain a supported roadway or asphalt pavement scene. Prediction is halted and no risk classification is generated.
                    </p>
                  </div>
                </div>
              ) : (loadingImage || isScanningImage) ? (
                <div className="glass-card" style={{
                  padding: '3rem 1.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div className="animate-spin" style={{
                    width: 36,
                    height: 36,
                    border: '3px solid rgba(59, 130, 246, 0.2)',
                    borderTopColor: '#3B82F6',
                    borderRadius: '50%'
                  }} />
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                    Segmenting Surface Defects & Running XGBoost...
                  </div>
                </div>
              ) : imagePrediction ? (
                <>
                  {/* Image Live Bar */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(59, 130, 246, 0.08))',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Scan size={16} color="#34D399" className="pulse-animation" />
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#6EE7B7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Visual Defect Ingestion & ML Inference
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {formatDateTime(imagePrediction?.prediction_date || new Date())}
                        </div>
                      </div>
                    </div>

                    <span style={{
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      color: '#60A5FA',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}>
                      <span className="live-pulse" style={{ width: 6, height: 6, backgroundColor: '#60A5FA' }}></span>
                      {loadingImage ? 'Inferencing Image ML...' : 'XGBoost Classifier Active'}
                    </span>
                  </div>

                  {/* Card 1: 1. XGBoost ML Risk Prediction (Road Images) */}
                  <div className="glass-card highlight" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Cpu size={18} color="#10B981" />
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          1. XGBoost ML Risk Prediction (Road Images)
                        </h3>
                      </div>
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#34D399',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: 'var(--radius-full)'
                      }}>
                        {imagePrediction?.confidence || 98}% XGBoost ML Confidence
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                      <div>
                        <RiskGauge
                          score={imagePrediction?.risk_score || 94.5}
                          level={imagePrediction?.risk_level || 'Critical Risk'}
                        />
                      </div>

                      {/* 4-Tier Risk Probability Distribution */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Predicted Risk Probability Distribution:
                        </span>
                        {imagePrediction?.probabilities &&
                          Object.entries(imagePrediction.probabilities).map(([cls, prob]) => {
                            const color = cls.includes('Critical') ? '#EF4444' : cls.includes('High') ? '#F97316' : cls.includes('Medium') ? '#F59E0B' : '#10B981';
                            return (
                              <div key={cls}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                                  <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{cls}</span>
                                  <span style={{ color, fontWeight: 700 }} className="mono">{prob}%</span>
                                </div>
                                <div style={{ height: 6, borderRadius: 3, background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      height: '100%',
                                      width: `${prob}%`,
                                      backgroundColor: color,
                                      borderRadius: 3,
                                      transition: 'width 0.4s ease'
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>

                  {/* Card 2: 2. AI Maintenance Decision Recommendation (IRC:82 Guidelines) */}
                  <div className="glass-card" style={{ borderColor: 'rgba(16, 185, 129, 0.35)', background: 'linear-gradient(135deg, rgba(18, 24, 40, 0.95), rgba(6, 78, 59, 0.25))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Wrench size={18} color="#34D399" />
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          2. AI Maintenance Decision Recommendation (IRC:82 Guidelines)
                        </h3>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`priority-badge ${(imagePrediction?.priority || 'high').toLowerCase()}`}>
                          {imagePrediction?.priority || 'High'}
                        </span>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpenReport && onOpenReport({ ...imageParams, ...imagePrediction })}
                          title="Generate Official Audit Document"
                        >
                          <FileText size={13} />
                          <span>Report</span>
                        </button>
                      </div>
                    </div>

                    <div style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                        🔧 Prescribed Civil Engineering Remediation
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {imagePrediction?.recommendation || 'Full-depth asphalt milling and hot-mix patching (HMA Grade I/II) + sub-base reconstruction.'}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Urgency Window</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F87171' }}>
                            {imagePrediction?.inspection_timeline || imagePrediction?.agent_recommendation?.inspection_timeline || 'Within 24 - 48 hours'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Estimated Budget Scope</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#34D399' }} className="mono">
                            {imagePrediction?.estimated_budget || '₹4,50,000 - ₹9,50,000'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {imagePrediction?.safety_hazard && (
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem 1rem',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem'
                      }}>
                        <AlertOctagon size={20} color="#F87171" style={{ flexShrink: 0 }} />
                        <div style={{ fontSize: '0.8rem', color: '#FCA5A5', lineHeight: 1.4 }}>
                          {imagePrediction.safety_hazard}
                        </div>
                      </div>
                    )}

                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                        💡 XGBoost Decision Reasoning Rationale
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {imagePrediction?.ai_reasoning || 'Evaluated combined impact of measured crater cavitation depth, fissure span, and pavement fatigue against trained XGBoost decision trees under IRC:82 civil engineering specifications.'}
                      </p>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
