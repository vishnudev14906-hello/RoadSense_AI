/**
 * RoadSense AI - Real Road Network Routing Service (OSRM Integration)
 * 
 * Purpose: Fetches actual drivable road geometry from OpenStreetMap via OSRM,
 * replacing straight-line dummy segments with authentic road-following GeoJSON polylines.
 * 
 * Features:
 * - Real Indian road coordinate routing
 * - [lng, lat] (OSRM) to [lat, lng] (Leaflet) conversion
 * - In-memory and sessionStorage route caching to prevent redundant API calls
 * - Request queueing & concurrency throttling to respect public OSRM rate limits
 * - Strict failure handling (never draws fake straight lines if routing is unavailable)
 */

// In-Memory Fast Cache
const routeMemoryCache = new Map();

const OSRM_PUBLIC_BASE = 'https://router.project-osrm.org/route/v1/driving';

/**
 * Derives start and end routing coordinates along the road's corridor span.
 * Uses verified road coordinates from roadsense.db.
 */
export function calculateRoadEndpoints(road) {
  if (!road) return null;
  const lat = Number(road.latitude);
  const lng = Number(road.longitude);
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;

  // Use explicit start/end coordinates if provided in road model
  if (road.start_latitude && road.start_longitude && road.end_latitude && road.end_longitude) {
    return {
      start: { lat: Number(road.start_latitude), lng: Number(road.start_longitude) },
      end: { lat: Number(road.end_latitude), lng: Number(road.end_longitude) }
    };
  }

  // Calculate corridor bounding points based on verified road length
  const lengthKm = minMax(Number(road.road_length_km || road.road_length || 3.0), 1.2, 4.0);
  const deltaDeg = (lengthKm / 111.0) * 0.35;

  // Align direction based on road naming orientation or balanced corridor offset
  const name = (road.road_name || '').toLowerCase();
  let latFactor = 0.45;
  let lngFactor = 0.55;

  if (name.includes('ring') || name.includes('bypass')) {
    latFactor = 0.50;
    lngFactor = 0.50;
  } else if (name.includes('arterial') || name.includes('expressway') || name.includes('highway')) {
    latFactor = 0.40;
    lngFactor = 0.60;
  }

  return {
    start: {
      lat: Number((lat - deltaDeg * latFactor).toFixed(6)),
      lng: Number((lng - deltaDeg * lngFactor).toFixed(6))
    },
    end: {
      lat: Number((lat + deltaDeg * latFactor).toFixed(6)),
      lng: Number((lng + deltaDeg * lngFactor).toFixed(6))
    }
  };
}

function minMax(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Fetches the road-following geometry for a single road from OSRM.
 * Returns { coordinates: [[lat, lng], ...], distanceMeters: number, durationSeconds: number } or null.
 */
export async function fetchRoadRouteGeometry(road, signal) {
  if (!road || !road.id) return null;
  const cacheKey = `roadsense_osrm_route_${road.id}_${road.latitude}_${road.longitude}`;

  // 1. Check in-memory cache
  if (routeMemoryCache.has(cacheKey)) {
    return routeMemoryCache.get(cacheKey);
  }

  // 2. Check sessionStorage cache
  try {
    const sessionCached = sessionStorage.getItem(cacheKey);
    if (sessionCached) {
      const parsed = JSON.parse(sessionCached);
      routeMemoryCache.set(cacheKey, parsed);
      return parsed;
    }
  } catch (e) {
    // Ignore storage quota errors
  }

  // 3. Compute endpoints from database coordinates
  const endpoints = calculateRoadEndpoints(road);
  if (!endpoints) return null;

  const { start, end } = endpoints;
  const url = `${OSRM_PUBLIC_BASE}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      console.warn(`[OSRM] HTTP ${res.status} for Road ID ${road.id} (${road.road_name})`);
      return null;
    }

    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.warn(`[OSRM] No driving route found for Road ID ${road.id} (${road.road_name}): ${data.code}`);
      return null;
    }

    const primaryRoute = data.routes[0];
    const rawCoords = primaryRoute.geometry?.coordinates || [];

    if (rawCoords.length === 0) return null;

    // Convert OSRM GeoJSON [longitude, latitude] -> Leaflet Polyline [latitude, longitude]
    const leafletCoords = rawCoords.map(coord => [coord[1], coord[0]]);

    const routeResult = {
      roadId: road.id,
      coordinates: leafletCoords,
      pointCount: leafletCoords.length,
      routeDistanceMeters: primaryRoute.distance,
      routeDistanceKm: Number((primaryRoute.distance / 1000).toFixed(2)),
      durationSeconds: Math.round(primaryRoute.duration),
      isOsrmRouted: true
    };

    // Cache the verified road geometry
    routeMemoryCache.set(cacheKey, routeResult);
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(routeResult));
    } catch (e) {
      // Storage quota safety
    }

    return routeResult;
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error(`[OSRM Routing Error] Road ID ${road.id}:`, err);
    }
    return null;
  }
}

/**
 * Concurrency Queue to batch-load routes across roads smoothly without rate-limiting.
 */
export async function batchLoadRoadRoutes(roads, onRouteLoaded, concurrency = 3, delayMs = 60) {
  if (!roads || roads.length === 0) return;

  const queue = [...roads];
  let activeWorkers = 0;

  return new Promise((resolve) => {
    const processNext = async () => {
      if (queue.length === 0 && activeWorkers === 0) {
        resolve();
        return;
      }

      while (activeWorkers < concurrency && queue.length > 0) {
        const road = queue.shift();
        activeWorkers++;

        fetchRoadRouteGeometry(road)
          .then((routeData) => {
            if (routeData && onRouteLoaded) {
              onRouteLoaded(road.id, routeData);
            }
          })
          .catch(() => {})
          .finally(() => {
            activeWorkers--;
            setTimeout(processNext, delayMs);
          });
      }
    };

    processNext();
  });
}
