const USERS_KEY = "staynest_users";
const SESSION_KEY = "staynest_session";
const OTP_STORE_KEY = "staynest_otp_store";

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

function otpStore() {
  return readJson(OTP_STORE_KEY, {});
}

function saveOtpStore(store) {
  writeJson(OTP_STORE_KEY, store);
}

function usersStore() {
  return readJson(USERS_KEY, []);
}

function saveUsersStore(users) {
  writeJson(USERS_KEY, users);
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
    role: user.role,
    status: user.status,
  };
}

function verifyOtp(phone, otp) {
  const normalizedPhone = normalizePhone(phone);
  const store = otpStore();
  const record = store[normalizedPhone];
  if (!record) return false;

  const isExpired = Date.now() > record.expiresAt;
  if (isExpired) return false;

  return record.otp === `${otp || ""}`.trim();
}

export function getSession() {
  return readJson(SESSION_KEY, null);
}

export function sendOtp({ phone }) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return { ok: false, error: "Enter a valid 10-digit mobile number." };
  }

  const code = `${Math.floor(100000 + Math.random() * 900000)}`;
  const store = otpStore();
  store[normalizedPhone] = {
    otp: code,
    expiresAt: Date.now() + 5 * 60 * 1000,
    createdAt: Date.now(),
  };
  saveOtpStore(store);

  return { ok: true, otp: code };
}

export function signUp({ name, phone, otp, role }) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return { ok: false, error: "Enter a valid mobile number." };
  }

  if (!verifyOtp(normalizedPhone, otp)) {
    return { ok: false, error: "Invalid or expired OTP." };
  }

  const users = usersStore();
  const existing = users.find((user) => user.phone === normalizedPhone);
  if (existing) {
    return { ok: false, error: "This mobile number is already registered." };
  }

  const user = {
    id: crypto.randomUUID(),
    name: name.trim(),
    phone: normalizedPhone,
    role,
    status: role === "owner" ? "pending_verification" : "active",
    createdAt: new Date().toISOString(),
  };

  saveUsersStore([user, ...users]);
  const session = toSession(user);
  saveSession(session);
  return { ok: true, session };
}

export function signIn({ phone, otp, role }) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return { ok: false, error: "Enter a valid mobile number." };
  }

  if (!verifyOtp(normalizedPhone, otp)) {
    return { ok: false, error: "Invalid or expired OTP." };
  }

  const users = usersStore();
  const user = users.find((item) => item.phone === normalizedPhone);

  if (!user) return { ok: false, error: "No account found for this mobile number." };
  if (user.role !== role) {
    return { ok: false, error: `This account is registered as ${user.role}.` };
  }
  if (user.status === "suspended") {
    return { ok: false, error: "Your account is suspended. Contact support." };
  }

  const session = toSession(user);
  saveSession(session);
  return { ok: true, session };
}

export function signOut() {
  saveSession(null);
}
