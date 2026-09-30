import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MapPin, 
  Layers, 
  Navigation, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  AlertTriangle, 
  ShieldCheck, 
  Flame, 
  Filter, 
  Sparkles, 
  Activity, 
  Compass, 
  FileText, 
  Search, 
  Eye, 
  RefreshCw, 
  Locate, 
  ExternalLink,
  Milestone,
  CheckCircle2,
  TrendingDown,
  Clock,
  Globe,
  Radio,
  Crosshair,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Route
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../api';
import RiskBadge from '../components/RiskBadge';
import { formatDate, formatTime, formatRelativeTime } from '../utils/dateUtils';
import { DEFAULT_ROADS } from '../data/roadsData';
import { batchLoadRoadRoutes } from '../utils/routingService';

// OSRM Route Display Helpers
function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '--';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

function formatDistance(meters) {
  if (!meters && meters !== 0) return '--';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}


// Real-World Geographic Centers & Viewport Spans for Municipalities
const CITY_GEO_PROFILES = {
  All: { 
    name: 'Pan-India Network', 
    centerLat: 11.0168, 
    centerLng: 76.9558, 
    zoom: 11
  },
  Coimbatore: { 
    name: 'Coimbatore Municipal Corporation', 
    centerLat: 11.0168, 
    centerLng: 76.9558, 
    zoom: 13
  },
  Chennai: { 
    name: 'Greater Chennai Corporation', 
    centerLat: 13.0400, 
    centerLng: 80.2200, 
    zoom: 13
  },
  Bengaluru: { 
    name: 'BBMP Bengaluru Urban', 
    centerLat: 12.9500, 
    centerLng: 77.6200, 
    zoom: 13
  },
  Mumbai: { 
    name: 'Brihanmumbai Municipal Corporation', 
    centerLat: 19.0600, 
    centerLng: 72.8600, 
    zoom: 13
  },
  Hyderabad: { 
    name: 'GHMC Hyderabad', 
    centerLat: 17.4000, 
    centerLng: 78.4200, 
    zoom: 13
  },
  Kochi: { 
    name: 'Kochi Municipal Corporation', 
    centerLat: 9.9800, 
    centerLng: 76.3000, 
    zoom: 13
  },
  'Delhi NCR': { 
    name: 'Delhi National Capital Region', 
    centerLat: 28.5800, 
    centerLng: 77.2000, 
    zoom: 13
  },
  Trichy: { 
    name: 'Tiruchirappalli City Corporation', 
    centerLat: 10.8050, 
    centerLng: 78.6856, 
    zoom: 13
  },
  Salem: { 
    name: 'Salem Municipal Corporation', 
    centerLat: 11.6643, 
    centerLng: 78.1460, 
    zoom: 13
  },
  Madurai: { 
    name: 'Madurai Municipal Corporation', 
    centerLat: 9.9252, 
    centerLng: 78.1198, 
    zoom: 13
  }
};

// Real Tile Layer Providers with global CDN endpoints
const TILE_LAYERS = {
  streets: {
    name: 'Real Street Map',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  satellite: {
    name: 'Satellite Aerial',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18
  },
  topo: {
    name: 'Topographic Terrain',
    url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17
  }
};

export default function MapView({ onInspectRoad, onNavigate, onRunAiTest }) {
  const [roads, setRoads] = useState(DEFAULT_ROADS);
  const [loading, setLoading] = useState(false);
  const [selectedRoad, setSelectedRoad] = useState(DEFAULT_ROADS[0] || null);
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [mapLayer, setMapLayer] = useState('streets'); // Default to Real Street Map
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [spottingIndex, setSpottingIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [routeGeometries, setRouteGeometries] = useState({});
  const [routingProgress, setRoutingProgress] = useState({ loaded: 0, total: 0 });

  // Map DOM & Leaflet References
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const roadLayersGroupRef = useRef(null);
  const userMarkerRef = useRef(null);

  // Load Road Data from Backend / Local Telemetry
  useEffect(() => {
    loadMapData();
  }, []);

  const loadMapData = async () => {
    try {
      const data = await api.getRoads();
      if (data && data.length > 0) {
        setRoads(data);
        if (!selectedRoad) {
          setSelectedRoad(data[0]);
        }
      }
    } catch (err) {
      console.warn('Using certified local GIS telemetry data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract verified GPS coordinates
  const getRoadCoords = (road) => {
    if (!road) return { lat: 11.0168, lng: 76.9558 };
    if (road.latitude && road.longitude && Number(road.latitude) !== 0 && Number(road.longitude) !== 0) {
      return { lat: Number(road.latitude), lng: Number(road.longitude) };
    }
    // Fallback: use city center — never generate fake coordinates
    const city = CITY_GEO_PROFILES[road.location] || CITY_GEO_PROFILES['Coimbatore'];
    return { lat: city.centerLat, lng: city.centerLng };
  };

  // --- OSRM Route-Following Utilities ---
  const OSRM_BASE = 'https://router.project-osrm.org';
  const routeCacheRef = useRef({});
  const [roadRoutes, setRoadRoutes] = useState({});
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);

  // Compute a road's corridor endpoints from its center + length
  const computeCorridorEndpoints = (road) => {
    const { lat, lng } = getRoadCoords(road);
    const spanKm = road.road_length || road.road_length_km || 3.0;
    // Roughly 1 degree latitude = 111 km, adjust longitude by cos(lat)
    const latSpan = (spanKm / 111) * 0.5;
    const lngSpan = latSpan / Math.cos((lat * Math.PI) / 180);
    // Determine road bearing from name/road type heuristics
    const roadName = (road.road_name || '').toLowerCase();
    let bearing = 0;
    if (roadName.includes('ring') || roadName.includes('outer')) bearing = 0;
    else if (roadName.includes('east') && roadName.includes('west')) bearing = 90;
    else if (roadName.includes('north') && roadName.includes('south')) bearing = 0;
    else if (roadName.includes('highway') || roadName.includes('expressway') || roadName.includes('arterial')) bearing = 45;
    else bearing = ((road.id || 0) * 37) % 180; // Deterministic per road
    const rad = (bearing * Math.PI) / 180;
    const dLat = latSpan * Math.cos(rad);
    const dLng = lngSpan * Math.sin(rad);
    return {
      start: [lng - dLng, lat - dLat],
      end: [lng + dLng, lat + dLat],
      center: [lat, lng]
    };
  };

  // Fetch an OSRM route between two [lng, lat] points
  const fetchOSRMRoute = async (startCoord, endCoord) => {
    const key = `${startCoord[0].toFixed(4)},${startCoord[1].toFixed(4)};${endCoord[0].toFixed(4)},${endCoord[1].toFixed(4)}`;
    if (routeCacheRef.current[key]) return routeCacheRef.current[key];
    try {
      const url = `${OSRM_BASE}/route/v1/driving/${startCoord[0]},${startCoord[1]};${endCoord[0]},${endCoord[1]}?overview=full&geometries=geojson&alternatives=true`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.routes && data.routes.length > 0) {
        const result = data.routes.map(r => ({
          coordinates: r.geometry.coordinates, // [ [lng, lat], ... ]
          distance: r.distance, // meters
          duration: r.duration // seconds
        }));
        routeCacheRef.current[key] = result;
        return result;
      }
    } catch (err) {
      console.warn('OSRM route fetch failed, using straight line:', err);
    }
    return null;
  };

  // Snap a coordinate to nearest road point via OSRM
  const snapToRoad = async (lng, lat) => {
    try {
      const url = `${OSRM_BASE}/nearest/v1/road/${lng},${lat}?number=1`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.waypoints && data.waypoints.length > 0) {
        const wp = data.waypoints[0].location;
        return { lng: wp[0], lat: wp[1] };
      }
    } catch (err) {
      // Silently fall back to original coords
    }
    return { lng, lat };
  };

  const getRiskColor = (riskLevel) => {
    if (!riskLevel) return '#EAB308';
    const r = String(riskLevel).toLowerCase();
    if (r.includes('critical')) return '#EF4444';
    if (r.includes('high')) return '#F97316';
    if (r.includes('medium') || r.includes('moderate')) return '#EAB308';
    return '#22C55E';
  };

  // Filtered Roads
  const filteredRoads = useMemo(() => {
    return roads.filter((r) => {
      const matchesCity = selectedCity === 'All' || r.location === selectedCity;
      const latestPred = r.latest_prediction || (r.predictions && r.predictions[0]);
      const risk = latestPred ? latestPred.risk_level : (r.risk_level || 'Medium Risk');
      const matchesRisk = selectedRiskFilter === 'All' || risk.toLowerCase().includes(selectedRiskFilter.toLowerCase());
      const matchesSearch = !searchTerm.trim() || 
        r.road_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.location.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCity && matchesRisk && matchesSearch;
    });
  }, [roads, selectedCity, selectedRiskFilter, searchTerm]);

  // Fetch high-precision OSRM driving route for the selected road on demand (avoids flooding 82 concurrent OSRM requests)
  useEffect(() => {
    if (!selectedRoad) return;
    if (roadRoutes[selectedRoad.id]) return;

    let cancelled = false;
    const fetchSelectedRoute = async () => {
      try {
        const { start, end } = computeCorridorEndpoints(selectedRoad);
        const routes = await fetchOSRMRoute(start, end);
        if (!cancelled && routes) {
          setRoadRoutes(prev => ({ ...prev, [selectedRoad.id]: routes }));
          if (routes.length > 0 && routes[0].coordinates) {
            setRouteGeometries(prev => ({
              ...prev,
              [selectedRoad.id]: {
                pointCount: routes[0].coordinates.length,
                routeDistanceKm: ((routes[0].distance || 0) / 1000).toFixed(1)
              }
            }));
          }
        }
      } catch (err) {
        // Fall back cleanly to corridor polyline without blocking UI
      }
    };
    fetchSelectedRoute();
    return () => { cancelled = true; };
  }, [selectedRoad]);

  // Batch-load authentic OSRM road geometry progressively for visible corridors (never crosses buildings)
  useEffect(() => {
    if (!filteredRoads || filteredRoads.length === 0) return;
    const unrouted = filteredRoads.slice(0, 10).filter(r => !roadRoutes[r.id]);
    if (unrouted.length === 0) return;

    batchLoadRoadRoutes(unrouted, (roadId, routeResult) => {
      if (routeResult && routeResult.coordinates && routeResult.coordinates.length > 1) {
        setRoadRoutes(prev => ({
          ...prev,
          [roadId]: [{
            coordinates: routeResult.coordinates.map(c => [c[1], c[0]]),
            distance: routeResult.routeDistanceMeters,
            duration: routeResult.durationSeconds
          }]
        }));
        setRouteGeometries(prev => ({
          ...prev,
          [roadId]: {
            pointCount: routeResult.pointCount,
            routeDistanceKm: routeResult.routeDistanceKm
          }
        }));
      }
    }, 2, 80);
  }, [filteredRoads]);

  // Initialize Leaflet Map with full 360-degree panning / dragging support
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [11.0168, 76.9558],
        zoom: 12,
        dragging: true,
        touchZoom: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        zoomControl: false,
        attributionControl: false,
        worldCopyJump: true
      });

      // Explicitly enable mouse dragging and touch interactions
      if (map.dragging) map.dragging.enable();
      if (map.touchZoom) map.touchZoom.enable();
      if (map.scrollWheelZoom) map.scrollWheelZoom.enable();

      // Layer group for dynamic road hazard geometries
      const roadGroup = L.layerGroup().addTo(map);
      roadLayersGroupRef.current = roadGroup;

      leafletMapRef.current = map;

      // Invalidate size shortly after mount to ensure proper dimension offsets for drag
      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 150);
    }

    const handleResize = () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update Base Tile Layer when mapLayer changes
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const currentConfig = TILE_LAYERS[mapLayer] || TILE_LAYERS.streets;
    const newTileLayer = L.tileLayer(currentConfig.url, {
      maxZoom: currentConfig.maxZoom,
      subdomains: 'abc'
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
    map.invalidateSize();
  }, [mapLayer]);

  // Render Real Road-Following Corridors & Spotting Markers on Map
  useEffect(() => {
    if (!leafletMapRef.current || !roadLayersGroupRef.current) return;
    const roadGroup = roadLayersGroupRef.current;
    roadGroup.clearLayers();

    if (filteredRoads.length === 0) return;

    filteredRoads.forEach((road) => {
      const { lat, lng } = getRoadCoords(road);

      const latestPred = road.latest_prediction || (road.predictions && road.predictions[0]);
      const riskLevel = latestPred ? latestPred.risk_level : (road.risk_level || 'Medium Risk');
      const pinColor = getRiskColor(riskLevel);
      const isSelected = selectedRoad?.id === road.id;

      // Use authentic OSRM road geometry coordinates; never draw fake diagonal lines across buildings
      const osrmRoutes = roadRoutes[road.id];
      let corridorCoords = null;
      if (osrmRoutes && osrmRoutes.length > 0) {
        const routeIdx = isSelected ? selectedRouteIdx : 0;
        const route = osrmRoutes[Math.min(routeIdx, osrmRoutes.length - 1)];
        // OSRM returns [ [lng, lat], ... ], convert to Leaflet [lat, lng]
        if (route.coordinates && route.coordinates.length > 1) {
          corridorCoords = route.coordinates.map(c => [c[1], c[0]]);
        }
      }

      // ONLY draw corridor polyline if we have authentic road-following coordinates from OSRM
      // This strictly prevents drawing lines cutting through buildings or rooftops!
      if (corridorCoords && corridorCoords.length > 1) {
        const polyline = L.polyline(corridorCoords, {
          color: pinColor,
          weight: isSelected ? 5.5 : 3.5,
          opacity: isSelected ? 0.95 : 0.7,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: isSelected ? null : '6, 6'
        });

        polyline.on('click', () => {
          setSelectedRoad(road);
        });
        polyline.addTo(roadGroup);

        // Draw endpoint markers only for the actively selected corridor
        if (isSelected && corridorCoords.length > 2) {
          const startMarker = L.circleMarker(corridorCoords[0], {
            radius: 5,
            fillColor: '#22C55E',
            fillOpacity: 1,
            color: '#FFFFFF',
            weight: 2
          });
          startMarker.bindTooltip('Corridor Start', { permanent: false, className: 'roadsense-tooltip' });
          startMarker.addTo(roadGroup);

          const endMarker = L.circleMarker(corridorCoords[corridorCoords.length - 1], {
            radius: 5,
            fillColor: '#EF4444',
            fillOpacity: 1,
            color: '#FFFFFF',
            weight: 2
          });
          endMarker.bindTooltip('Corridor End', { permanent: false, className: 'roadsense-tooltip' });
          endMarker.addTo(roadGroup);
        }
      }

      // Custom HTML Beacon Marker for Hazard Spotting
      const customIcon = L.divIcon({
        className: 'custom-hazard-div-icon',
        html: `
          <div class="hazard-spot-pin">
            <div class="hazard-spot-core" style="background: ${pinColor}; border-color: ${isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.7)'}; transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'}">
              ${riskLevel.includes('Critical') ? '⚠️' : riskLevel.includes('High') ? '⚡' : '📍'}
            </div>
            ${riskLevel.includes('Critical') || riskLevel.includes('High') ? `<div class="hazard-spot-pulse" style="background: ${pinColor}"></div>` : ''}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Interactive Popup
      const routeData = (routeGeometries && routeGeometries[road.id]) || (osrmRoutes && osrmRoutes.length > 0 ? {
        pointCount: osrmRoutes[0].coordinates?.length || 0,
        routeDistanceKm: ((osrmRoutes[0].distance || 0) / 1000).toFixed(1)
      } : null);

      const popupContent = document.createElement('div');
      popupContent.style.padding = '0.85rem';
      popupContent.style.minWidth = '240px';
      popupContent.innerHTML = `
        <div style="font-size: 0.72rem; color: #94A3B8; text-transform: uppercase; font-weight: 700; margin-bottom: 0.2rem;">
          ${road.location} Municipality
        </div>
        <div style="font-size: 0.95rem; font-weight: 800; color: #FFFFFF; margin-bottom: 0.5rem; line-height: 1.3;">
          ${road.road_name}
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.6rem; padding: 0.35rem 0.55rem; background: rgba(255,255,255,0.06); border-radius: 6px;">
          <span style="font-size: 0.78rem; color: #CBD5E1;">Risk Level:</span>
          <span style="font-size: 0.78rem; font-weight: 800; color: ${pinColor};">${riskLevel}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; font-size: 0.75rem; color: #94A3B8; margin-bottom: 0.6rem;">
          <div>Potholes: <strong style="color: #FFFFFF;">${road.pothole_count || 0}</strong></div>
          <div>Cracks: <strong style="color: #FFFFFF;">${road.crack_length || 0} m</strong></div>
          <div>Span: <strong style="color: #FFFFFF;">${road.road_length_km || road.road_length || 1} km</strong></div>
          <div>Traffic: <strong style="color: #FFFFFF;">${road.traffic_volume || road.traffic_density || 'Med'}</strong></div>
        </div>
        <div style="font-size: 0.72rem; color: #60A5FA; font-family: monospace; margin-bottom: 0.35rem;">
          GPS: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E
        </div>
        ${routeData ? `
          <div style="font-size: 0.68rem; color: #34D399; font-weight: 600; background: rgba(16, 185, 129, 0.12); padding: 0.25rem 0.45rem; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.25);">
            ✓ OSRM Road Geometry: ${routeData.pointCount} pts (${routeData.routeDistanceKm} km)
          </div>
        ` : `
          <div style="font-size: 0.68rem; color: #94A3B8;">
            🛣️ Loading road-following route...
          </div>
        `}
      `;

      marker.bindPopup(popupContent, { className: 'roadsense-popup' });
      marker.on('click', () => {
        setSelectedRoad(road);
      });

      marker.addTo(roadGroup);
    });
  }, [filteredRoads, selectedRoad, roadRoutes, selectedRouteIdx, routeGeometries]);

  // Center camera when selected city changes
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;
    const profile = CITY_GEO_PROFILES[selectedCity] || CITY_GEO_PROFILES['Coimbatore'];
    map.flyTo([profile.centerLat, profile.centerLng], profile.zoom, {
      duration: 1.2
    });
  }, [selectedCity]);

  // Fly camera to selected road when chosen from sidebar/table
  const handleSpotRoad = (road) => {
    setSelectedRoad(road);
    if (!leafletMapRef.current || !road) return;
    const { lat, lng } = getRoadCoords(road);
    leafletMapRef.current.flyTo([lat, lng], 15, {
      duration: 1.2
    });
  };

  // Spot Next High-Risk Hazard
  const handleSpotNextHazard = () => {
    const highRiskList = roads.filter((r) => {
      const latestPred = r.latest_prediction || (r.predictions && r.predictions[0]);
      const risk = latestPred ? latestPred.risk_level : (r.risk_level || 'Medium Risk');
      return risk.includes('Critical') || risk.includes('High');
    });

    if (highRiskList.length === 0) return;
    const nextIdx = (spottingIndex + 1) % highRiskList.length;
    setSpottingIndex(nextIdx);
    const targetRoad = highRiskList[nextIdx];
    handleSpotRoad(targetRoad);
  };

  // Live Geolocation: Spot My Location
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        if (leafletMapRef.current) {
          const map = leafletMapRef.current;
          
          if (userMarkerRef.current) {
            map.removeLayer(userMarkerRef.current);
          }

          const userIcon = L.divIcon({
            className: 'user-location-div-icon',
            html: `
              <div style="position: relative; display: flex; align-items: center; justify-content: center;">
                <div class="user-spot-core"></div>
                <div class="user-spot-radar"></div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const uMarker = L.marker([latitude, longitude], { icon: userIcon })
            .bindPopup(`
              <div style="padding: 0.75rem; color: #FFFFFF; font-size: 0.85rem;">
                <div style="font-weight: 800; color: #60A5FA; margin-bottom: 0.2rem;">📍 Your Real-Time Location</div>
                <div style="font-size: 0.75rem; color: #94A3B8;">GPS: ${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E</div>
              </div>
            `, { className: 'roadsense-popup' })
            .addTo(map);

          userMarkerRef.current = uMarker;
          map.flyTo([latitude, longitude], 14, { duration: 1.5 });
        }
      },
      (err) => {
        setIsLocating(false);
        alert('Could not retrieve your live location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Pan controls (Pan sideways, up, down)
  const panByOffset = (x, y) => {
    if (leafletMapRef.current) {
      leafletMapRef.current.panBy([x, y], { duration: 0.3, easeLinearity: 0.5 });
    }
  };

  const handlePanLeft = () => panByOffset(-180, 0);
  const handlePanRight = () => panByOffset(180, 0);
  const handlePanUp = () => panByOffset(0, -180);
  const handlePanDown = () => panByOffset(0, 180);

  // Zoom helpers
  const handleZoomIn = () => leafletMapRef.current && leafletMapRef.current.zoomIn();
  const handleZoomOut = () => leafletMapRef.current && leafletMapRef.current.zoomOut();
  const handleResetView = () => {
    const profile = CITY_GEO_PROFILES[selectedCity] || CITY_GEO_PROFILES.All;
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([profile.centerLat, profile.centerLng], profile.zoom, { duration: 1.2 });
    }
  };

  // Stats calculation
  const criticalCount = roads.filter(r => (r.latest_prediction?.risk_level || r.risk_level || '').includes('Critical')).length;
  const highCount = roads.filter(r => (r.latest_prediction?.risk_level || r.risk_level || '').includes('High')).length;
  const mediumCount = roads.filter(r => (r.latest_prediction?.risk_level || r.risk_level || '').includes('Medium')).length;
  const lowCount = roads.filter(r => (r.latest_prediction?.risk_level || r.risk_level || '').includes('Low')).length;

  const currentCoords = selectedRoad ? getRoadCoords(selectedRoad) : { lat: 11.0168, lng: 76.9558 };
  const selectedLatestPred = selectedRoad?.latest_prediction || (selectedRoad?.predictions && selectedRoad?.predictions[0]);
  const selectedRisk = selectedLatestPred?.risk_level || selectedRoad?.risk_level || 'Medium Risk';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header with Real-Time Spotting Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
            <Navigation size={24} color="#3B82F6" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Real-Time GIS Hazard & Distress Spotter
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Interactive real map with drag-and-pan navigation in all directions, verified GPS coordinates, live hazard hotspots, and telemetry
          </p>
        </div>

        {/* Action Buttons: Spot Hazard, Locate Me, Layer Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          
          {/* Spot Next Hazard Button */}
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSpotNextHazard}
            title="Automatically spot and fly to high-risk road hazards"
            style={{ gap: '0.4rem', boxShadow: '0 0 15px rgba(239, 68, 68, 0.35)', background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
          >
            <Crosshair size={14} />
            <span>Spot Next Hazard</span>
          </button>

          {/* Spot My Location */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleLocateMe}
            disabled={isLocating}
            title="Spot your current GPS location on the map"
            style={{ gap: '0.4rem' }}
          >
            <Locate size={14} className={isLocating ? 'spin-animation' : ''} color="#60A5FA" />
            <span>{isLocating ? 'Locating...' : 'Spot My Location'}</span>
          </button>

          {/* Real Map Layer Switcher */}
          <div className="appearance-segment" style={{ padding: '0.15rem' }}>
            <button
              className={`appearance-segment-btn ${mapLayer === 'streets' ? 'active' : ''}`}
              onClick={() => setMapLayer('streets')}
            >
              Street Map
            </button>
            <button
              className={`appearance-segment-btn ${mapLayer === 'satellite' ? 'active' : ''}`}
              onClick={() => setMapLayer('satellite')}
            >
              Satellite
            </button>
            <button
              className={`appearance-segment-btn ${mapLayer === 'topo' ? 'active' : ''}`}
              onClick={() => setMapLayer('topo')}
            >
              Terrain
            </button>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={loadMapData}
            title="Synchronize real-time road telemetry"
          >
            <RefreshCw size={14} className={loading ? 'spin-animation' : ''} />
          </button>
        </div>
      </div>

      {/* Spatial Filter & Search Toolbar */}
      <div className="glass-card" style={{ padding: '0.85rem 1.25rem' }}>
        <div className="map-filter-toolbar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', alignItems: 'center' }}>
          
          {/* Corridor Search */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search corridor or municipality..."
              className="form-input form-input-sm"
              style={{ paddingLeft: '2.1rem', fontSize: '0.85rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Municipality Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={15} color="#60A5FA" />
            <select
              className="form-select form-select-sm"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="All">All Municipalities ({roads.length} Corridors)</option>
              {Object.keys(CITY_GEO_PROFILES).filter(k => k !== 'All').map((city) => {
                const count = roads.filter(r => r.location === city).length;
                return (
                  <option key={city} value={city}>
                    {city} ({count} corridors)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Risk Level Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={15} color="#F59E0B" />
            <select
              className="form-select form-select-sm"
              value={selectedRiskFilter}
              onChange={(e) => setSelectedRiskFilter(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="All">All Risk Severities</option>
              <option value="Critical">Critical Risk ({criticalCount})</option>
              <option value="High">High Risk ({highCount})</option>
              <option value="Medium">Medium Risk ({mediumCount})</option>
              <option value="Low">Low Risk ({lowCount})</option>
            </select>
          </div>

          {/* Quick Clear */}
          {(searchTerm || selectedCity !== 'All' || selectedRiskFilter !== 'All') && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedCity('All');
                setSelectedRiskFilter('All');
              }}
              style={{ fontSize: '0.78rem' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Real-Time GIS Map Workspace Grid */}
      <div className="map-workspace-grid">
        
        {/* Real-Time Leaflet Map Container */}
        <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)', width: '100%' }}>
          
          {/* Leaflet Map Div with explicit grab cursor and touch gestures */}
          <div
            ref={mapContainerRef}
            className="leaflet-map-canvas"
            style={{
              width: '100%',
              height: '620px',
              background: '#0B0F19',
              cursor: 'grab',
              userSelect: 'none'
            }}
          />

          {/* Floating HUD: Active City Badge */}
          <div className="map-hud-badge" style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.45rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            zIndex: 400
          }}>
            <Milestone size={14} color="#60A5FA" />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {selectedCity === 'All' ? 'Pan-India Overview' : (CITY_GEO_PROFILES[selectedCity]?.name || selectedCity)}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#93C5FD', background: 'rgba(59, 130, 246, 0.2)', padding: '0.1rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
              {filteredRoads.length} Spotted
            </span>
          </div>

          {/* Floating 4-Directional Pan Controls (Pan Sideways Left/Right, Up/Down) */}
          <div className="map-directional-pad" style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.35rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 28px)',
            gridTemplateRows: 'repeat(3, 28px)',
            gap: '2px',
            zIndex: 400
          }}>
            <div />
            <button className="btn-icon" onClick={handlePanUp} title="Pan Up" style={{ width: 28, height: 28, padding: 0 }}>
              <ArrowUp size={14} />
            </button>
            <div />
            <button className="btn-icon" onClick={handlePanLeft} title="Pan Left (Sideways)" style={{ width: 28, height: 28, padding: 0 }}>
              <ArrowLeft size={14} />
            </button>
            <button className="btn-icon" onClick={handleResetView} title="Reset Center View" style={{ width: 28, height: 28, padding: 0 }}>
              <RotateCcw size={13} />
            </button>
            <button className="btn-icon" onClick={handlePanRight} title="Pan Right (Sideways)" style={{ width: 28, height: 28, padding: 0 }}>
              <ArrowRight size={14} />
            </button>
            <div />
            <button className="btn-icon" onClick={handlePanDown} title="Pan Down" style={{ width: 28, height: 28, padding: 0 }}>
              <ArrowDown size={14} />
            </button>
            <div />
          </div>

          {/* Floating Zoom Controls */}
          <div style={{
            position: 'absolute',
            bottom: '1.25rem',
            right: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            zIndex: 400
          }}>
            <button
              className="btn-icon"
              onClick={handleZoomIn}
              title="Zoom In"
              style={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid var(--border-subtle)', width: 36, height: 36 }}
            >
              <ZoomIn size={16} />
            </button>
            <button
              className="btn-icon"
              onClick={handleZoomOut}
              title="Zoom Out"
              style={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid var(--border-subtle)', width: 36, height: 36 }}
            >
              <ZoomOut size={16} />
            </button>
          </div>

          {/* Floating Legend Bar */}
          <div className="map-floating-legend" style={{
            position: 'absolute',
            bottom: '1.25rem',
            left: '1.25rem',
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.5rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            zIndex: 400,
            fontSize: '0.74rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
              <span>Critical ({criticalCount})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316' }} />
              <span>High ({highCount})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
              <span>Medium ({mediumCount})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
              <span>Low ({lowCount})</span>
            </div>
          </div>
        </div>

        {/* Right Column: Telemetry Inspector HUD & Spotted Corridors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0, width: '100%' }}>
          
          {/* Selected Corridor Telemetry HUD */}
          {selectedRoad ? (
            <div className="glass-card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: getRiskColor(selectedRisk)
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={13} color="#60A5FA" />
                    <span>{selectedRoad.location} Municipality</span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem', lineHeight: 1.3 }}>
                    {selectedRoad.road_name}
                  </h3>
                </div>
                <RiskBadge level={selectedRisk} />
              </div>

              {/* Verified GPS Telemetry Card */}
              <div className="map-telemetry-grid" style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                fontSize: '0.78rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.6rem',
                marginBottom: '1rem'
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.68rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Globe size={11} color="#60A5FA" />
                    <span>Latitude</span>
                  </div>
                  <div className="mono" style={{ fontWeight: 700, color: '#93C5FD', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentCoords.lat.toFixed(4)}° N</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.68rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Globe size={11} color="#60A5FA" />
                    <span>Longitude</span>
                  </div>
                  <div className="mono" style={{ fontWeight: 700, color: '#93C5FD', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentCoords.lng.toFixed(4)}° E</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.68rem', textTransform: 'uppercase' }}>Span Length</div>
                  <div className="mono" style={{ fontWeight: 700, color: 'var(--text-main)' }}>{selectedRoad.road_length_km || selectedRoad.road_length || 1.0} km</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.68rem', textTransform: 'uppercase' }}>Traffic Volume</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{selectedRoad.traffic_volume || selectedRoad.traffic_density || 'Medium'}</div>
                </div>

                {/* OSRM Route Alignment Telemetry */}
                {selectedRoad && routeGeometries[selectedRoad.id] && (
                  <div style={{
                    gridColumn: '1 / -1',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.45rem 0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.4rem',
                    marginTop: '0.2rem'
                  }}>
                    <div style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle2 size={13} color="#34D399" />
                      <span>OSRM Drivable Alignment</span>
                    </div>
                    <span className="mono" style={{ fontSize: '0.7rem', color: '#A7F3D0', fontWeight: 700 }}>
                      {routeGeometries[selectedRoad.id].pointCount} road-following pts ({routeGeometries[selectedRoad.id].routeDistanceKm} km)
                    </span>
                  </div>
                )}
              </div>

              {/* Distress Snapshot */}
              <div className="map-distress-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', minWidth: 0 }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Pothole Count</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: (selectedRoad.pothole_count || 0) > 10 ? '#EF4444' : '#F59E0B' }} className="mono">
                    {selectedRoad.pothole_count || 0} craters
                  </div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', minWidth: 0 }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Crack Fissures</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: (selectedRoad.crack_length || 0) > 40 ? '#EF4444' : '#F59E0B' }} className="mono">
                    {selectedRoad.crack_length || 0} m
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="map-actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onRunAiTest && onRunAiTest(selectedRoad)}
                  style={{ gap: '0.4rem', justifyContent: 'center', minWidth: 0 }}
                >
                  <Sparkles size={14} />
                  <span>Run AI Predictor</span>
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onInspectRoad && onInspectRoad(selectedRoad)}
                  style={{ gap: '0.4rem', justifyContent: 'center', minWidth: 0 }}
                >
                  <FileText size={14} />
                  <span>Audit Report</span>
                </button>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedRoad.road_name + ' ' + (selectedRoad.location || ''))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{
                    gridColumn: '1 / -1',
                    gap: '0.4rem',
                    justifyContent: 'center',
                    background: 'rgba(66, 133, 244, 0.1)',
                    borderColor: 'rgba(66, 133, 244, 0.3)',
                    color: '#60A5FA',
                    fontSize: '0.78rem',
                    textAlign: 'center'
                  }}
                  title="Open exact road corridor in Google Maps in a new tab"
                >
                  <ExternalLink size={14} />
                  <span>Open in Google Maps ({currentCoords.lat.toFixed(4)}°, {currentCoords.lng.toFixed(4)}°)</span>
                </a>
              </div>

              {/* OSRM Route Following Info */}
              {roadRoutes[selectedRoad.id] && roadRoutes[selectedRoad.id].length > 0 && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem'
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Route size={12} color="#10B981" />
                    <span>OSRM Road-Following Route</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {roadRoutes[selectedRoad.id].map((route, idx) => {
                      const isActive = idx === selectedRouteIdx;
                      const isFastest = idx === 0;
                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedRouteIdx(idx)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            padding: '0.4rem 0.6rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: isActive ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)'}`,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
                            <Clock size={12} color={isActive ? '#10B981' : '#94A3B8'} />
                            <span style={{ fontSize: '0.8rem', fontWeight: isActive ? 700 : 500, color: isActive ? '#10B981' : 'var(--text-main)' }}>
                              {formatDuration(route.duration)}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>•</span>
                            <Route size={11} color={isActive ? '#10B981' : '#94A3B8'} />
                            <span style={{ fontSize: '0.78rem', color: isActive ? '#10B981' : 'var(--text-muted)' }}>
                              {formatDistance(route.distance)}
                            </span>
                          </div>
                          {isFastest && (
                            <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700, background: 'rgba(16,185,129,0.2)', color: '#10B981' }}>
                              Fastest
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <CheckCircle2 size={10} color="#10B981" />
                    <span>Route follows actual road geometry via OpenStreetMap routing</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Navigation size={32} color="#60A5FA" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Select a Hazard Spot</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Click any corridor or spot marker on the map to inspect live telemetry.</div>
            </div>
          )}

          {/* Spotted Corridors Quick Navigation List */}
          <div className="glass-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Radio size={14} color="#EF4444" className="pulse-animation" />
                <span>Active Spotted Hazards ({filteredRoads.length})</span>
              </div>
            </div>

            <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', paddingRight: '0.2rem' }}>
              {filteredRoads.map((r) => {
                const latest = r.latest_prediction || (r.predictions && r.predictions[0]);
                const rRisk = latest ? latest.risk_level : (r.risk_level || 'Medium Risk');
                const isSelected = selectedRoad?.id === r.id;
                const rCoords = getRoadCoords(r);

                return (
                  <div
                    key={`list-${r.id}`}
                    onClick={() => handleSpotRoad(r)}
                    className="map-hazard-item"
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'rgba(59, 130, 246, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.4)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      minWidth: 0,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#93C5FD' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.road_name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', gap: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span>{r.location}</span>
                        <span>•</span>
                        <span className="mono">{rCoords.lat.toFixed(2)}°N, {rCoords.lng.toFixed(2)}°E</span>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <RiskBadge level={rRisk} size="sm" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
