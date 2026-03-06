const USERS_KEY = "staynest_users";
const SESSION_KEY = "staynest_session";

function readUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return [];
  try {
    const users = JSON.parse(raw);
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function readSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeSession(session) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession() {
  return readSession();
}

export function signUp({ name, email, password, role }) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = readUsers();
  const existing = users.find((user) => user.email === normalizedEmail);

  if (existing) {
    return { ok: false, error: "Email already registered." };
  }

  const user = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    password,
    role,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  writeUsers(users);

  const session = { id: user.id, name: user.name, email: user.email, role: user.role };
  writeSession(session);
  return { ok: true, session };
}

export function signIn({ email, password, role }) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = readUsers();
  const user = users.find((item) => item.email === normalizedEmail);

  if (!user || user.password !== password) {
    return { ok: false, error: "Invalid email or password." };
  }

  if (user.role !== role) {
    return { ok: false, error: `This account is registered as ${user.role}.` };
  }

  const session = { id: user.id, name: user.name, email: user.email, role: user.role };
  writeSession(session);
  return { ok: true, session };
}

export function signOut() {
  writeSession(null);
}
