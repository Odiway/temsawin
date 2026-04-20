/* BOM Entegrasyon API client — proxied through /bom-api */

const BASE = '/bom-api';

async function request(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'İstek başarısız' }));
    throw { response: { data: err } };
  }
  return { data: await res.json() };
}

async function upload(path, file, fieldName = 'file') {
  const fd = new FormData();
  fd.append(fieldName, file);
  const res = await fetch(`${BASE}${path}`, { method: 'POST', body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Yükleme hatası' }));
    throw { response: { data: err } };
  }
  return { data: await res.json() };
}

// Projects
export const uploadProject = (file) => upload('/projects/upload', file);
export const getProjects = () => request('/projects/');
export const getProject = (id) => request(`/projects/${id}`);
export const deleteProject = (id) => request(`/projects/${id}`, { method: 'DELETE' });
export const getItems = (projectId, params) => {
  const q = params ? '?' + new URLSearchParams(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])).toString() : '';
  return request(`/projects/${projectId}/items${q}`);
};
export const getStats = (projectId) => request(`/projects/${projectId}/stats`);
export const getNav = (projectId) => request(`/projects/${projectId}/nav`);
export const updateItem = (projectId, itemId, data) =>
  request(`/projects/${projectId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) });
export const bulkResolve = (projectId, data) =>
  request(`/projects/${projectId}/bulk-resolve`, { method: 'POST', body: JSON.stringify(data) });
export const exportProject = (projectId) => `${BASE}/projects/${projectId}/export`;
export const uploadKalemTipi = (projectId, file) => upload(`/projects/${projectId}/upload-kalem-tipi`, file);
export const reprocessProject = (projectId) => request(`/projects/${projectId}/reprocess`, { method: 'POST' });

// Materials
export const getMaterials = (params) => {
  const q = params ? '?' + new URLSearchParams(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])).toString() : '';
  return request(`/materials/${q}`);
};
export const getMaterialCount = () => request('/materials/count');
export const createMaterial = (data) => request('/materials/', { method: 'POST', body: JSON.stringify(data) });
export const updateMaterial = (id, data) => request(`/materials/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteMaterial = (id) => request(`/materials/${id}`, { method: 'DELETE' });
export const importMM03 = (file) => upload('/materials/import-mm03', file);

// Calendar
export const getBuses = () => request('/calendar/buses');
export const createBus = (data) => request('/calendar/buses', { method: 'POST', body: JSON.stringify(data) });
export const updateBus = (id, data) => request(`/calendar/buses/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteBus = (id) => request(`/calendar/buses/${id}`, { method: 'DELETE' });
export const getTasks = (busId) => {
  const q = busId ? `?bus_id=${busId}` : '';
  return request(`/calendar/tasks${q}`);
};
export const createTask = (data) => request('/calendar/tasks', { method: 'POST', body: JSON.stringify(data) });
export const updateTask = (id, data) => request(`/calendar/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTask = (id) => request(`/calendar/tasks/${id}`, { method: 'DELETE' });
export const checkBottleneck = (data, excludeTaskId) => {
  const q = excludeTaskId ? `?exclude_task_id=${excludeTaskId}` : '';
  return request(`/calendar/check-bottleneck${q}`, { method: 'POST', body: JSON.stringify(data) });
};
export const getCalendarExcelUrl = () => `${BASE}/calendar/export/excel`;
export const getCalendarPdfUrl = () => `${BASE}/calendar/export/pdf`;

// SubTasks (detailed calendar)
export const getSubTasks = (parentTaskId) => {
  const q = parentTaskId ? `?parent_task_id=${parentTaskId}` : '';
  return request(`/calendar/subtasks${q}`);
};
export const createSubTask = (data) => request('/calendar/subtasks', { method: 'POST', body: JSON.stringify(data) });
export const updateSubTask = (id, data) => request(`/calendar/subtasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSubTask = (id) => request(`/calendar/subtasks/${id}`, { method: 'DELETE' });

// Follow-Ups
export const getFollowUps = (busId, status) => {
  const params = [];
  if (busId) params.push(`bus_id=${busId}`);
  if (status) params.push(`status=${status}`);
  const q = params.length ? `?${params.join('&')}` : '';
  return request(`/calendar/followups${q}`);
};
export const createFollowUp = (data) => request('/calendar/followups', { method: 'POST', body: JSON.stringify(data) });
export const updateFollowUp = (id, data) => request(`/calendar/followups/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteFollowUp = (id) => request(`/calendar/followups/${id}`, { method: 'DELETE' });

// Project Costs
export const getCosts = (busId) => {
  const q = busId ? `?bus_id=${busId}` : '';
  return request(`/calendar/costs${q}`);
};
export const createCost = (data) => request('/calendar/costs', { method: 'POST', body: JSON.stringify(data) });
export const updateCost = (id, data) => request(`/calendar/costs/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCost = (id) => request(`/calendar/costs/${id}`, { method: 'DELETE' });
export const getCostSummary = () => request('/calendar/costs/summary');

// Audit Logs
export const getAuditLogs = (limit = 200, offset = 0) => request(`/calendar/audit-logs?limit=${limit}&offset=${offset}`);
export const createAuditLog = (data) => request('/calendar/audit-logs', { method: 'POST', body: JSON.stringify(data) });

// ── Integration Module ──
export const intUpload = (file, calcQty = false) => upload(`/integration/upload?calculate_quantity=${calcQty}`, file);
export const intGetUploads = () => request('/integration/uploads');
export const intGetUpload = (id) => request(`/integration/uploads/${id}`);
export const intDeleteUpload = (id) => request(`/integration/uploads/${id}`, { method: 'DELETE' });
export const intGetItems = (uploadId, params) => {
  const q = params ? '?' + new URLSearchParams(Object.entries(params).filter(([,v]) => v != null && v !== '').map(([k,v]) => [k, String(v)])).toString() : '';
  return request(`/integration/uploads/${uploadId}/items${q}`);
};
export const intGetItemsCount = (uploadId, params) => {
  const q = params ? '?' + new URLSearchParams(Object.entries(params).filter(([,v]) => v != null && v !== '').map(([k,v]) => [k, String(v)])).toString() : '';
  return request(`/integration/uploads/${uploadId}/items/count${q}`);
};
export const intGetStats = (uploadId) => request(`/integration/uploads/${uploadId}/stats`);
export const intUpdateItem = (itemId, data) => request(`/integration/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) });
export const intExportUrl = (uploadId, params) => {
  const q = params ? '?' + new URLSearchParams(Object.entries(params).filter(([,v]) => v != null && v !== '').map(([k,v]) => [k, String(v)])).toString() : '';
  return `${BASE}/integration/uploads/${uploadId}/export${q}`;
};
export const intReupload = (uploadId, file) => upload(`/integration/uploads/${uploadId}/reupload`, file);
export const intApprove = (uploadId, rowNumbers) => request(`/integration/uploads/${uploadId}/approve`, { method: 'POST', body: JSON.stringify(rowNumbers) });
export const intGetHistory = (uploadId) => request(`/integration/uploads/${uploadId}/history`);
export const intTemplateUrl = () => `${BASE}/integration/template`;
