const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://citizen-health-backend.onrender.com";

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  };
  const res = await fetch(url, config);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Something went wrong");
  return data;
}

export const api = {
  // Auth
  signup: (data) => request("/api/signup", { method: "POST", body: JSON.stringify(data) }),
  login: (data) => request("/api/login", { method: "POST", body: JSON.stringify(data) }),
  sendOtp: (mobile) => {
    const fd = new FormData();
    fd.append("mobile", mobile);
    return fetch(`${API_BASE}/api/send-otp`, { method: "POST", body: fd }).then((r) => r.json());
  },
  verifyOtp: (data) => request("/api/verify-otp", { method: "POST", body: JSON.stringify(data) }),
  verifyAadhaar: (aadhaar) => {
    const fd = new FormData();
    fd.append("aadhaar", aadhaar);
    return fetch(`${API_BASE}/api/verify-aadhaar`, { method: "POST", body: fd }).then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail);
      return d;
    });
  },

  // Profile
  getProfile: (userId) => request(`/api/profile/${userId}`),

  // Family
  addFamily: (userId, data) => request(`/api/family/${userId}`, { method: "POST", body: JSON.stringify(data) }),
  verifyFamilyAbha: (userId, abha_id) => request(`/api/family/${userId}/verify-abha`, { method: "POST", body: JSON.stringify({ abha_id }) }),
  confirmFamilyAbha: (userId, data) => request(`/api/family/${userId}/confirm-abha`, { method: "POST", body: JSON.stringify(data) }),
  getFamily: (userId) => request(`/api/family/${userId}`),
  getFamilyRecords: (userId, memberId) => request(`/api/family/${userId}/records/${memberId}`),

  // Documents
  uploadDocument: (userId, file) => {
    const fd = new FormData();
    fd.append("user_id", userId);
    fd.append("file", file);
    return fetch(`${API_BASE}/api/upload`, { method: "POST", body: fd }).then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail);
      return d;
    });
  },
  uploadToRecord: (userId, recordId, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${API_BASE}/api/records/${userId}/${recordId}/upload`, { method: "POST", body: fd }).then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail);
      return d;
    });
  },
  getDocumentUrl: (userId, recordId) => {
    return `${API_BASE}/api/records/${userId}/${recordId}/file`;
  },
  deleteDocument: (userId, recordId) => {
    return fetch(`${API_BASE}/api/records/${userId}/${recordId}/file`, { method: "DELETE" }).then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Failed to delete document");
      return d;
    });
  },

  // Records
  getRecords: (userId) => request(`/api/records/${userId}`),

  // QR Code
  getQRCodeUrl: (healthId) => `${API_BASE}/api/qr-code/${healthId}`,
};
