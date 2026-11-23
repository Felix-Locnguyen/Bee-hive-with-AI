// API Client kết nối với FastAPI Backend (qua proxy Vite /api)

async function request(endpoint, options = {}) {
  try {
    const res = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const error = new Error(errBody.detail || `Request failed with status ${res.status}`);
      error.status = res.status;
      error.data = errBody;
      throw error;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[API] ${options.method || 'GET'} ${endpoint} failed:`, err.message);
    throw err;
  }
}

export const api = {
  // 1. Thống kê số lượng thùng
  getHiveStats: () => request('/api/hives/stats'),

  // 2. Danh sách thùng ong (hỗ trợ filter zone, status, q)
  getHives: (params = {}) => {
    const q = new URLSearchParams();
    if (params.zone && params.zone !== 'all') q.set('zone', params.zone);
    if (params.status && params.status !== 'all') q.set('status', params.status);
    if (params.q) q.set('q', params.q);
    const qs = q.toString();
    return request(`/api/hives${qs ? '?' + qs : ''}`);
  },

  // 3. Chi tiết thùng
  getHive: (hiveId) => request(`/api/hives/${hiveId}`),

  // 4. Nhật ký chăm sóc của thùng
  getHiveRecords: (hiveId) => request(`/api/hives/${hiveId}/records`),
  createHiveRecord: (hiveId, data) =>
    request(`/api/hives/${hiveId}/records`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 5. Cảm biến của thùng (latest & chart)
  getLatestReading: (hiveId) => request(`/api/hives/${hiveId}/readings/latest`),
  getChartReadings: (hiveId, hours = 24, limit = 200) =>
    request(`/api/hives/${hiveId}/readings/chart?hours=${hours}&limit=${limit}`),

  // 6. Cảnh báo
  getAlertCount: (hiveId) =>
    request(`/api/alerts/count${hiveId ? '?hive_id=' + hiveId : ''}`),
  getAlerts: (params = {}) => {
    const q = new URLSearchParams();
    if (params.hive_id) q.set('hive_id', params.hive_id);
    if (params.severity) q.set('severity', params.severity);
    if (params.unread !== undefined) q.set('unread', params.unread);
    if (params.limit) q.set('limit', params.limit);
    const qs = q.toString();
    return request(`/api/alerts${qs ? '?' + qs : ''}`);
  },
  markAlertRead: (alertId) =>
    request(`/api/alerts/${alertId}`, {
      method: 'PUT',
      body: JSON.stringify({ is_read: true }),
    }),
};
