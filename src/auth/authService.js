import {
  authLogin,
  authLoginOtp,
  authMe,
  authRegister,
  authSendLoginOtp,
  authSendPasswordResetOtp,
  authSendRegistrationOtp,
  authResetPassword,
} from "../api/staynestApi";

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
    email: user.email,
    role: user.role === "student" ? "guest" : user.role,
    status: user.status,
    verificationState: user.verification_state,
    gender: user.student_profile?.gender || "",
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

export async function sendRegistrationOtp(email) {
  const normalizedEmail = `${email || ""}`.trim().toLowerCase();
  if (!normalizedEmail) {
    return { ok: false, error: "Enter a valid email address." };
  }

  try {
    await authSendRegistrationOtp({ email: normalizedEmail });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || "Unable to send email OTP." };
  }
}

export async function sendLoginOtp(email, role) {
  const normalizedEmail = `${email || ""}`.trim().toLowerCase();
  if (!normalizedEmail) {
    return { ok: false, error: "Enter a valid email address." };
  }

  try {
    await authSendLoginOtp({ email: normalizedEmail, role: role === "guest" ? "student" : role });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || "Unable to send login OTP." };
  }
}

export async function sendPasswordResetOtp(email, role) {
  const normalizedEmail = `${email || ""}`.trim().toLowerCase();
  if (!normalizedEmail) {
    return { ok: false, error: "Enter a valid email address." };
  }

  try {
    await authSendPasswordResetOtp({ email: normalizedEmail, role: role === "guest" ? "student" : role });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || "Unable to send password reset OTP." };
  }
}

export async function signUp({ name, phone, email, otpCode, password, role, hostel, studentProfile }) {
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = `${email || ""}`.trim().toLowerCase();
  if (!normalizedPhone) {
    return { ok: false, error: "Enter a valid mobile number." };
  }
  if (!normalizedEmail) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!otpCode || `${otpCode}`.trim().length !== 6) {
    return { ok: false, error: "Enter the 6-digit email OTP." };
  }
  if (!password || password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  try {
    const apiRole = role === "guest" ? "student" : role;
    const payload = {
      phone: normalizedPhone,
      email: normalizedEmail,
      name: name.trim(),
      role: apiRole,
      otp_code: `${otpCode}`.trim(),
      password,
    };
    if (hostel && apiRole === "owner") {
      payload.hostel = hostel;
    }
    if (studentProfile && apiRole === "student") {
      payload.student_profile = studentProfile;
    }
    await authRegister(payload);
    const tokens = await authLogin({ email: normalizedEmail, password, role: apiRole });
    saveTokens(tokens);
    const session = toSession(await authMe());
    saveSession(session);
    return { ok: true, session };
  } catch (error) {
    return { ok: false, error: error.message || "Unable to create account." };
  }
}

export async function signIn({ email, password, role }) {
  const normalizedEmail = `${email || ""}`.trim().toLowerCase();
  if (!normalizedEmail) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!password || password.length < 6) {
    return { ok: false, error: "Enter your password." };
  }

  try {
    const apiRole = role === "guest" ? "student" : role;
    const tokens = await authLogin({ email: normalizedEmail, password, role: apiRole });
    saveTokens(tokens);
    const user = await authMe();
    if (role && user.role !== apiRole) {
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

export async function signInWithOtp({ email, otpCode, role }) {
  const normalizedEmail = `${email || ""}`.trim().toLowerCase();
  if (!normalizedEmail) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!otpCode || `${otpCode}`.trim().length !== 6) {
    return { ok: false, error: "Enter the 6-digit email OTP." };
  }

  try {
    const apiRole = role === "guest" ? "student" : role;
    const tokens = await authLoginOtp({ email: normalizedEmail, otp_code: `${otpCode}`.trim(), role: apiRole });
    saveTokens(tokens);
    const user = await authMe();
    if (role && user.role !== apiRole) {
      return { ok: false, error: `This account is registered as ${user.role}.` };
    }
    if (user.status === "suspended") {
      return { ok: false, error: "Your account is suspended. Contact support." };
    }
    const session = toSession(user);
    saveSession(session);
    return { ok: true, session };
  } catch (error) {
    return { ok: false, error: error.message || "Unable to login with OTP." };
  }
}

export async function resetPassword({ email, otpCode, password, role }) {
  const normalizedEmail = `${email || ""}`.trim().toLowerCase();
  if (!normalizedEmail) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!otpCode || `${otpCode}`.trim().length !== 6) {
    return { ok: false, error: "Enter the 6-digit email OTP." };
  }
  if (!password || password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  try {
    await authResetPassword({
      email: normalizedEmail,
      otp_code: `${otpCode}`.trim(),
      new_password: password,
      role: role === "guest" ? "student" : role,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || "Unable to reset password." };
  }
}

export function signOut() {
  saveSession(null);
  clearTokens();
}
