// In development, Vite proxies /api to FastAPI, avoiding local-port CORS issues.
const API = import.meta.env.VITE_API_URL || '/api';
async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || 'Unable to complete the request.');
  return body;
}
export const api = {
  health: () => request('/health'), customers: () => request('/customers'), accounts: () => request('/accounts'),
  transactions: (query = '') => request(`/transactions${query ? `?${query}` : ''}`), stats: () => request('/dashboard/stats'),
  analytics: () => request('/analytics/transactions'), reports: () => request('/reports'),
  customer: id => request(`/customers/${id}`), createCustomer: data => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id, data) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: id => request(`/customers/${id}`, { method: 'DELETE' }),
  mutate: (account, action, amount) => request(`/accounts/${account}/${action}`, { method: 'POST', body: JSON.stringify({ amount: Number(amount) }) }),
  transfer: data => request('/transfers', { method: 'POST', body: JSON.stringify(data) }),
};
