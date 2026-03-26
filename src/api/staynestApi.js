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
    const message = payload?.detail || payload?.error || response.statusText;
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

export function fetchStudentOverview() {
  return apiGet("/student/overview/");
}

export function fetchNotifications() {
  return apiGet("/notifications/");
}
