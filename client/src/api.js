const API_BASE = 'http://localhost:3001/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('token');
  const config = {
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const resp = await fetch(url, config);
  
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || 'Request failed');
  }

  const contentType = resp.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    return resp.text();
  }
  return resp.json();
}

// Auth API
export const authApi = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (email, password) => request('/auth/register', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me'),
};

// Backlinks API
export const backlinksApi = {
  list: (params = {}) => {
    const { vault, ...restParams } = params;
    const qs = new URLSearchParams(restParams).toString();
    if (vault) {
      return request(`/backlinks/vault?${qs}`);
    }
    return request(`/backlinks?${qs}`);
  },
  stats: () => request('/backlinks/stats'),
  get: (id) => request(`/backlinks/${id}`),
  create: (data) => request('/backlinks', { method: 'POST', body: data }),
  update: (id, data) => request(`/backlinks/${id}`, { method: 'PUT', body: data }),
  delete: (id) => request(`/backlinks/${id}`, { method: 'DELETE' }),
  import: (urls, category, source, projectId, contributeToPublic = true) => request('/backlinks/import', { method: 'POST', body: { urls, category, source, projectId, contributeToPublic } }),
  export: (filters = {}) => request('/backlinks/export', { method: 'POST', body: filters }),
  markInteraction: (id, status) => request(`/backlinks/${id}/interaction`, { method: 'POST', body: { status } }),
  clearInteraction: (id) => request(`/backlinks/${id}/interaction`, { method: 'DELETE' }),
  setBookmark: (id, context = 'global') => request(`/backlinks/${id}/bookmark`, { method: 'POST', body: { context } }),
  getBookmark: (context = 'global') => request(`/backlinks/bookmark?context=${encodeURIComponent(context)}`),
  clearBookmark: (context = 'global') => request(`/backlinks/bookmark`, { method: 'DELETE', body: { context } }),
  // Vault-specific
  vaultList: (params = {}) => request(`/backlinks/vault?${new URLSearchParams(params).toString()}`),
  vaultDelete: (id) => request(`/backlinks/vault/${id}`, { method: 'DELETE' }),
  vaultAddToProject: (id, projectId) => request(`/backlinks/vault/${id}/add-to-project`, { method: 'POST', body: { projectId } }),
};

// Projects API
export const projectsApi = {
  list: () => request('/projects'),
  get: (id) => request(`/projects/${id}`),
  create: (data) => request('/projects', { method: 'POST', body: data }),
  update: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: data }),
  delete: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  share: (id) => request(`/projects/${id}/share`, { method: 'POST' }),
  getShared: (token) => request(`/projects/shared/${token}`),
  export: (id) => request(`/projects/${id}/export`, { method: 'GET' }),
};

// Submissions API
export const submissionsApi = {
  create: (data) => request('/submissions', { method: 'POST', body: data }),
  update: (id, data) => request(`/submissions/${id}`, { method: 'PUT', body: data }),
  markLast: (id) => request(`/submissions/${id}/mark-last`, { method: 'PUT' }),
  delete: (id) => request(`/submissions/${id}`, { method: 'DELETE' }),
  bulkStatus: (ids, status) => request('/submissions/bulk/status', { method: 'PUT', body: { ids, status } }),
  bulkDelete: (ids) => request('/submissions/bulk', { method: 'DELETE', body: { ids } }),
};

// Scraper API
export const scraperApi = {
  run: (searchQueries = 3) => request('/scraper/run', { method: 'POST', body: { searchQueries } }),
  scrapeUrl: (url, query) => request('/scraper/scrape-url', { method: 'POST', body: { url, query } }),
  status: () => request('/scraper/status'),
  history: () => request('/scraper/history'),
};

// Health
export const healthApi = {
  check: () => request('/health'),
};

// Users API
export const usersApi = {
  getProfile: (username) => request(`/users/${username}`),
  getSettings: () => request('/users/settings'),
  updateSettings: (data) => request('/users/settings', { method: 'PUT', body: data }),
  updateProfile: (data) => request('/users/profile', { method: 'PUT', body: data }),
  changePassword: (data) => request('/users/password', { method: 'PUT', body: data }),
  deleteAccount: (password) => request('/users/account', { method: 'DELETE', body: { password } }),
};

// AI API
export const aiApi = {
  generateContent: (keywords, targetUrl, snippetCount = 1) => 
    request('/ai/generate-content', { method: 'POST', body: { keywords, targetUrl, snippetCount } }),
  rephrase: (text) => 
    request('/ai/rephrase', { method: 'POST', body: { text } }),
};
