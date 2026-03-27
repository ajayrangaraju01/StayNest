const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

function getSession() {
  try {
    const raw = localStorage.getItem("staynest_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getAccessToken() {
  return localStorage.getItem("staynest_access_token");
}

function getRefreshToken() {
  return localStorage.getItem("staynest_refresh_token");
}

function setAccessToken(token) {
  if (token) {
    localStorage.setItem("staynest_access_token", token);
  }
}

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function formatApiError(payload, fallbackStatusText) {
  if (!payload) return fallbackStatusText || "Request failed.";
  if (typeof payload === "string") return payload;
  if (payload.detail) return payload.detail;
  if (payload.error) return payload.error;

  const parts = Object.entries(payload).flatMap(([key, value]) => {
    if (Array.isArray(value)) {
      return value.map((item) => `${key}: ${item}`);
    }
    if (value && typeof value === "object") {
      return Object.entries(value).flatMap(([nestedKey, nestedValue]) => {
        if (Array.isArray(nestedValue)) {
          return nestedValue.map((item) => `${key}.${nestedKey}: ${item}`);
        }
        return `${key}.${nestedKey}: ${nestedValue}`;
      });
    }
    return `${key}: ${value}`;
  }).filter(Boolean);

  return parts[0] || fallbackStatusText || "Request failed.";
}

async function apiFetch(path, options = {}) {
  const token = getAccessToken();
  const authHeaders = token && !options.skipAuth ? { Authorization: `Bearer ${token}` } : {};

  let response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 401 && !options.skipAuth && !options._retry) {
    const refresh = getRefreshToken();
    if (refresh) {
      const refreshResponse = await fetch(`${API_BASE}/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (refreshResponse.ok) {
        const refreshPayload = await parseJsonSafe(refreshResponse);
        if (refreshPayload?.access) {
          setAccessToken(refreshPayload.access);
          response = await fetch(`${API_BASE}${path}`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${refreshPayload.access}`,
              ...(options.headers || {}),
            },
            ...options,
            _retry: true,
          });
        }
      }
    }
  }

  if (!response.ok) {
    const payload = await parseJsonSafe(response);
    const message = formatApiError(payload, response.statusText);
    throw new Error(message || "Request failed.");
  }

  if (response.status === 204) return null;
  const data = await parseJsonSafe(response);
  return data;
}

export function apiGet(path) {
  return apiFetch(path);
}

export function apiPost(path, body) {
  return apiFetch(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPatch(path, body) {
  return apiFetch(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiPut(path, body) {
  return apiFetch(path, { method: "PUT", body: JSON.stringify(body) });
}

export async function apiDownload(path, filename = "download.csv") {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const payload = await parseJsonSafe(response);
    const message = formatApiError(payload, response.statusText);
    throw new Error(message || "Download failed.");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export function fetchHostels({ useAuth = false } = {}) {
  return apiFetch("/hostels/", { skipAuth: !useAuth });
}

export function createHostel(payload) {
  return apiPost("/hostels/", payload);
}

export function updateHostel(id, payload) {
  return apiPatch(`/hostels/${id}/`, payload);
}

export function fetchRooms({ useAuth = false } = {}) {
  return apiFetch("/rooms/", { skipAuth: !useAuth });
}

export function createRoom(payload) {
  return apiPost("/rooms/", payload);
}

export function updateRoom(id, payload) {
  return apiPatch(`/rooms/${id}/`, payload);
}

export function fetchBookings() {
  return apiGet("/bookings/");
}

export function createBooking(payload) {
  return apiPost("/bookings/", payload);
}

export function updateBooking(id, payload) {
  return apiPatch(`/bookings/${id}/`, payload);
}

export function fetchUsers() {
  return apiGet("/users/");
}

export function createUser(payload) {
  return apiPost("/users/", payload);
}

export function fetchUsersByPhone(phone, role) {
  const params = new URLSearchParams();
  if (phone) params.set("phone", phone);
  if (role) params.set("role", role);
  return apiGet(`/users/?${params.toString()}`);
}

export function authRegister(payload) {
  return apiPost("/auth/register/", payload);
}

export function authSendRegistrationOtp(payload) {
  return apiPost("/auth/send-registration-otp/", payload);
}

export function authSendLoginOtp(payload) {
  return apiPost("/auth/send-login-otp/", payload);
}

export function authLoginOtp(payload) {
  return apiPost("/auth/login-otp/", payload);
}

export function authLogin(payload) {
  return apiPost("/auth/login/", payload);
}

export function authRefresh(payload) {
  return apiPost("/auth/refresh/", payload);
}

export function authMe() {
  return apiGet("/auth/me/");
}

export function fetchOwnerStudents() {
  return apiGet("/owner/students/");
}

export function createWalkinStudent(payload) {
  return apiPost("/owner/students/walkin/", payload);
}

export function updateOwnerGuest(studentId, payload) {
  return apiPatch(`/owner/students/${studentId}/update/`, payload);
}

export function fetchOwnerAnalytics() {
  return apiGet("/owner/analytics/");
}

export function fetchOwnerDefaulters() {
  return apiGet("/owner/defaulters/");
}

export function sendOwnerFeeReminders(payload = {}) {
  return apiPost("/owner/fee-reminders/send/", payload);
}

export function downloadOwnerFeeLedgerExport() {
  return apiDownload("/owner/fee-ledgers/export/", "staynest-fee-ledgers.csv");
}

export function fetchStudentOverview() {
  return apiGet("/student/overview/");
}

export function fetchNotifications() {
  return apiGet("/notifications/");
}

export function fetchFeeLedgers() {
  return apiGet("/fee-ledgers/");
}

export function createFeeLedger(payload) {
  return apiPost("/fee-ledgers/", payload);
}

export function updateFeeLedger(id, payload) {
  return apiPatch(`/fee-ledgers/${id}/`, payload);
}

export function fetchFeePayments() {
  return apiGet("/fee-payments/");
}

export function createFeePayment(payload) {
  return apiPost("/fee-payments/", payload);
}

export function fetchMenus({ useAuth = true } = {}) {
  return apiFetch("/menus/", { skipAuth: !useAuth });
}

export function createMenu(payload) {
  return apiPost("/menus/", payload);
}

export function updateMenu(id, payload) {
  return apiPatch(`/menus/${id}/`, payload);
}

export function fetchLeaves() {
  return apiGet("/leaves/");
}

export function createLeave(payload) {
  return apiPost("/leaves/", payload);
}

export function updateLeave(id, payload) {
  return apiPatch(`/leaves/${id}/`, payload);
}

export function updateMyProfile(payload) {
  return apiPatch("/auth/me/update/", payload);
}

export function fetchTrustSummary() {
  return apiGet("/trust/summary/");
}

export function fetchComplaints() {
  return apiGet("/complaints/");
}

export function createComplaint(payload) {
  return apiPost("/complaints/", payload);
}

export function updateComplaint(id, payload) {
  return apiPatch(`/complaints/${id}/`, payload);
}

export function fetchReviews() {
  return apiGet("/reviews/");
}

export function createReview(payload) {
  return apiPost("/reviews/", payload);
}

export function updateReview(id, payload) {
  return apiPatch(`/reviews/${id}/`, payload);
}

export function fetchAdminOverview() {
  return apiGet("/admin/overview/");
}

export function fetchAdminOwners() {
  return apiGet("/admin/owners/");
}

export function fetchAdminAllOwners() {
  return apiGet("/admin/owners/all/");
}

export function updateAdminUser(userId, payload) {
  return apiPost(`/admin/users/${userId}/update/`, payload);
}

export function fetchAdminHostels() {
  return apiGet("/admin/hostels/");
}

export function fetchAdminAllHostels() {
  return apiGet("/admin/hostels/all/");
}

export function updateAdminHostelModeration(hostelId, payload) {
  return apiPost(`/admin/hostels/${hostelId}/moderation/`, payload);
}
