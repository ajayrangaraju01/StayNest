import { authLogin, authMe, authRegister } from "../api/staynestApi";

const SESSION_KEY = "staynest_session";
const ACCESS_KEY = "staynest_access_token";
const REFRESH_KEY = "staynest_refresh_token";

function readJson(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizePhone(phone) {
  const digits = `${phone || ""}`.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return "";
}

function saveSession(session) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  writeJson(SESSION_KEY, session);
}

function toSession(user) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role === "student" ? "guest" : user.role,
    status: user.status,
  };
}

export function getSession() {
  return readJson(SESSION_KEY, null);
}

function saveTokens({ access, refresh }) {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export async function signUp({ name, phone, password, role, hostel }) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return { ok: false, error: "Enter a valid mobile number." };
  }
  if (!password || password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  try {
    const apiRole = role === "guest" ? "student" : role;
    const payload = {
      phone: normalizedPhone,
      name: name.trim(),
      role: apiRole,
      status: apiRole === "owner" ? "pending" : "active",
      verification_state: apiRole === "owner" ? "pending" : "unverified",
      password,
    };
    if (hostel && apiRole === "owner") {
      payload.hostel = hostel;
    }
    const user = await authRegister(payload);
    const tokens = await authLogin({ phone: normalizedPhone, password });
    saveTokens(tokens);
    const session = toSession(user);
    saveSession(session);
    return { ok: true, session };
  } catch (error) {
    return { ok: false, error: error.message || "Unable to create account." };
  }
}

export async function signIn({ phone, password, role }) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return { ok: false, error: "Enter a valid mobile number." };
  }
  if (!password) {
    return { ok: false, error: "Enter your password." };
  }

  try {
    const tokens = await authLogin({ phone: normalizedPhone, password });
    saveTokens(tokens);
    const user = await authMe();
    if (role && user.role !== (role === "guest" ? "student" : role)) {
      return { ok: false, error: `This account is registered as ${user.role}.` };
    }
    if (user.status === "suspended") {
      return { ok: false, error: "Your account is suspended. Contact support." };
    }
    const session = toSession(user);
    saveSession(session);
    return { ok: true, session };
  } catch (error) {
    return { ok: false, error: error.message || "Unable to login." };
  }
}

export function signOut() {
  saveSession(null);
  clearTokens();
}
