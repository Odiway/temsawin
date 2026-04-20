const API_BASE = '/api/v1';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'API Error');
  }
  return res.json();
}

export const api = {
  // Dashboard
  getStats: () => request('/dashboard/stats'),
  getWeather: () => request('/dashboard/weather'),
  getNews: () => request('/dashboard/news'),

  // Vehicles
  getVehicles: (category) => request(`/vehicles${category ? `?category=${category}` : ''}`),
  getVehicle: (id) => request(`/vehicles/${id}`),

  // Variants
  getVariants: (params = {}) => {
    const q = new URLSearchParams();
    if (params.vehicle_id) q.set('vehicle_id', params.vehicle_id);
    if (params.engine_type) q.set('engine_type', params.engine_type);
    if (params.search) q.set('search', params.search);
    return request(`/variants?${q.toString()}`);
  },
  getVariant: (id) => request(`/variants/${id}`),
  getVariantFuelMap: (id) => request(`/variants/${id}/fuel-map`),
  getVariantLoadCurves: (id) => request(`/variants/${id}/load-curves`),
  getVariantGearRatios: (id) => request(`/variants/${id}/gear-ratios`),
  compareVariants: (ids) => request('/variants/compare', {
    method: 'POST',
    body: JSON.stringify({ variant_ids: ids }),
  }),

  // Analysis - Brain endpoints
  getRankings: (metric = 'overall', category = null) => {
    const q = new URLSearchParams({ metric });
    if (category) q.set('category', category);
    return request(`/analysis/rankings?${q.toString()}`);
  },
  getInsights: () => request('/analysis/insights'),
  getFleetSummary: () => request('/analysis/fleet-summary'),
  getDetailedComparison: (ids) => request(`/analysis/compare-detailed?ids=${ids.join(',')}`),

  // Import
  uploadXml: async (files) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    const res = await fetch(`${API_BASE}/import/upload-bulk`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },
  importDirectory: (dir) => request(`/import/directory?directory=${encodeURIComponent(dir)}`, { method: 'POST' }),
  getImportLogs: () => request('/import/logs'),

  // CO2 — Official VECTO Results (source of truth)
  getFleetEmissions: () => request('/co2/fleet-emissions'),
  getFleetTracking: () => request('/co2/fleet-tracking'),
  getCorrelation: () => request('/co2/correlation'),
  getBenchmark: () => request('/co2/benchmark'),
  getVectoResults: () => request('/co2/vecto-results'),
  getVariantResults: () => request('/co2/variant-results'),
  getVariantResultDetail: (vin) => request(`/co2/variant-results/${encodeURIComponent(vin)}`),
  getFleetCO2Calculation: () => request('/co2/fleet-co2-calculation'),
  updateFleetCounts: (updates) => request('/co2/fleet-count', { method: 'POST', body: JSON.stringify({ updates }) }),
  addTestData: (data) => request('/co2/test-data', { method: 'POST', body: JSON.stringify(data) }),
  importOutputDirectory: (dir) => request(`/co2/import-output-directory?directory=${encodeURIComponent(dir)}`, { method: 'POST' }),
  importResultFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/co2/import-result`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },
  importResultDirectory: (dir) => request(`/co2/import-result-directory?directory=${encodeURIComponent(dir)}`, { method: 'POST' }),

  // Digital Twin
  getDigitalTwinList: () => request('/co2/digital-twin-list'),
  getDigitalTwin: (variantCode) => request(`/co2/digital-twin/${encodeURIComponent(variantCode)}`),

  // Unified Variants Hub
  getVariantsHub: () => request('/co2/variants-hub'),
  compareModels: (modelNames) => request('/co2/compare-models', {
    method: 'POST',
    body: JSON.stringify(modelNames),
  }),
  compareVariantsDetailed: (variantCodes) => request('/co2/compare-variants', {
    method: 'POST',
    body: JSON.stringify(variantCodes),
  }),

  // Fleet Management
  listFleets: () => request('/co2/fleets'),
  createFleet: (data) => request('/co2/fleets', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getFleet: (id) => request(`/co2/fleets/${id}`),
  updateFleet: (id, data) => request(`/co2/fleets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteFleet: (id) => request(`/co2/fleets/${id}`, { method: 'DELETE' }),
  compareFleets: (ids) => request('/co2/fleets/compare', {
    method: 'POST',
    body: JSON.stringify(ids),
  }),

  // VSUM Deep Analytics
  getVsumFullData: () => request('/vsum-analytics/full-data'),
  getEnergySankey: () => request('/vsum-analytics/energy-sankey'),
  getDrivingDynamics: () => request('/vsum-analytics/driving-dynamics'),
  getGearUsage: () => request('/vsum-analytics/gear-usage'),
  getDrivetrainLosses: () => request('/vsum-analytics/drivetrain-losses'),
  getBusAuxiliary: () => request('/vsum-analytics/bus-auxiliary'),
  getFcWaterfall: () => request('/vsum-analytics/fc-waterfall'),
  getLoadingSensitivity: () => request('/vsum-analytics/loading-sensitivity'),
  getComponentEfficiency: () => request('/vsum-analytics/component-efficiency'),
  getEngineOperatingPoint: () => request('/vsum-analytics/engine-operating-point'),
  getAdasImpact: () => request('/vsum-analytics/adas-impact'),

  // ML Prediction
  getMlStatus: () => request('/ml-prediction/status'),
  getMlTrainingData: () => request('/ml-prediction/training-data'),
  trainMlModel: () => request('/ml-prediction/train', { method: 'POST' }),
  mlPredict: (params) => request('/ml-prediction/predict', {
    method: 'POST',
    body: JSON.stringify(params),
  }),
  mlPredictAllMissions: (params) => request('/ml-prediction/predict-all-missions', {
    method: 'POST',
    body: JSON.stringify(params),
  }),
  mlSweep: (params) => request('/ml-prediction/sweep', {
    method: 'POST',
    body: JSON.stringify(params),
  }),
};
