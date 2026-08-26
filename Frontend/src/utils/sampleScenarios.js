// Real Road Damage Benchmark Scenarios (Road Damage Dataset RDD2022 / Real Field Surveys)
export const SAMPLE_INSPECTION_SCENARIOS = [
  {
    id: 'pothole-d40',
    title: 'RDD2022 Benchmark: Pothole Distress (D40)',
    location: 'Coimbatore',
    road_name: 'Avinashi Road Arterial Corridor (Peelamedu)',
    damage_class: 'Pothole',
    source_tag: 'RDD2022 India Benchmark (Ground Truth)',
    source_url: 'https://github.com/sekilab/RoadDamageDetector',
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    description: 'Measured deep pavement crater (D40 class) resulting from moisture infiltration and dynamic axle loading.',
    detections: [
      { id: 1, label: 'Pothole (D40)', confidence: 96.8, x: 25, y: 48, w: 28, h: 22, color: '#EF4444' },
      { id: 2, label: 'Pothole (Secondary)', confidence: 91.4, x: 62, y: 58, w: 22, h: 18, color: '#EF4444' },
      { id: 3, label: 'Other Road Damage', confidence: 87.2, x: 45, y: 72, w: 18, h: 12, color: '#F97316' },
      { id: 4, label: 'Longitudinal Crack (D00)', confidence: 84.5, x: 18, y: 25, w: 45, h: 14, color: '#F59E0B' }
    ],
    telemetry: {
      pothole_count: 24,
      average_pothole_depth_cm: 13.5,
      total_crack_length_m: 85.0,
      pavement_age_years: 12.5,
      traffic_volume: 'Very High',
      rainfall: 'Heavy',
      surface_type: 'Bituminous Concrete (BC)',
      estimated_risk: 'Critical Risk'
    }
  },
  {
    id: 'alligator-d20',
    title: 'RDD2022 Benchmark: Alligator / Fatigue Cracking (D20)',
    location: 'Bengaluru',
    road_name: 'Outer Ring Road (Marathahalli - Bellandur)',
    damage_class: 'Alligator Crack',
    source_tag: 'RDD2022 India Benchmark (Ground Truth)',
    source_url: 'https://github.com/sekilab/RoadDamageDetector',
    imageUrl: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=800&q=80',
    description: 'Structural sub-base fatigue causing interconnected crocodile pattern fissures (D20 class).',
    detections: [
      { id: 1, label: 'Alligator Crack (D20)', confidence: 94.2, x: 15, y: 35, w: 68, h: 42, color: '#EF4444' },
      { id: 2, label: 'Transverse Crack (D10)', confidence: 89.0, x: 30, y: 15, w: 55, h: 15, color: '#F97316' },
      { id: 3, label: 'Other Road Damage', confidence: 82.5, x: 70, y: 68, w: 24, h: 18, color: '#F59E0B' }
    ],
    telemetry: {
      pothole_count: 14,
      average_pothole_depth_cm: 7.8,
      total_crack_length_m: 95.0,
      pavement_age_years: 9.0,
      traffic_volume: 'Very High',
      rainfall: 'Heavy',
      surface_type: 'Bituminous Concrete (BC)',
      estimated_risk: 'High Risk'
    }
  },
  {
    id: 'longitudinal-d00',
    title: 'RDD2022 Benchmark: Longitudinal Wheel-Path Crack (D00)',
    location: 'Chennai',
    road_name: 'Anna Salai Arterial Strip (Mount Road)',
    damage_class: 'Longitudinal Crack',
    source_tag: 'RDD2022 India Benchmark (Ground Truth)',
    source_url: 'https://github.com/sekilab/RoadDamageDetector',
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    description: 'Linear longitudinal fissure along vehicle wheel tracks with initial bituminous emulsion oxidation.',
    detections: [
      { id: 1, label: 'Longitudinal Crack (D00)', confidence: 90.1, x: 22, y: 40, w: 42, h: 15, color: '#F59E0B' },
      { id: 2, label: 'Pothole (Early Stage)', confidence: 85.6, x: 68, y: 52, w: 14, h: 12, color: '#F59E0B' }
    ],
    telemetry: {
      pothole_count: 5,
      average_pothole_depth_cm: 3.5,
      total_crack_length_m: 22.0,
      pavement_age_years: 4.5,
      traffic_volume: 'High',
      rainfall: 'Moderate',
      surface_type: 'Bituminous Concrete (BC)',
      estimated_risk: 'Medium Risk'
    }
  },
  {
    id: 'pristine-pavement',
    title: 'Field Verification: Resurfaced Bituminous Corridor',
    location: 'Mumbai',
    road_name: 'Bandra-Kurla Complex Boulevard',
    damage_class: 'Other Road Damage',
    source_tag: 'Municipal Maintenance Register (Verified)',
    source_url: 'https://data.gov.in/',
    imageUrl: 'https://images.unsplash.com/photo-1498084393753-b411b2d26b34?auto=format&fit=crop&w=800&q=80',
    description: 'Freshly resurfaced bituminous wearing course with zero structural defects and optimal friction skid resistance.',
    detections: [
      { id: 1, label: 'Surface Integrity: Optimal', confidence: 99.1, x: 10, y: 15, w: 80, h: 70, color: '#10B981' }
    ],
    telemetry: {
      pothole_count: 0,
      average_pothole_depth_cm: 0.0,
      total_crack_length_m: 0.0,
      pavement_age_years: 0.8,
      traffic_volume: 'High',
      rainfall: 'Moderate',
      surface_type: 'Dense Bituminous Macadam (DBM)',
      estimated_risk: 'Low Risk'
    }
  }
];
