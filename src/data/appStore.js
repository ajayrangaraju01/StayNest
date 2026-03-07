import { HOSTELS } from "./hostels";

const HOSTELS_KEY = "staynest_app_hostels";
const BOOKING_REQUESTS_KEY = "staynest_booking_requests";

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

function ownerIdFromName(name) {
  return `owner_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

function withSeedMetadata(hostel) {
  return {
    ...hostel,
    ownerId: ownerIdFromName(hostel.owner),
    moderationStatus: "approved",
  };
}

function ensureSeedData() {
  const existing = readJson(HOSTELS_KEY, null);
  if (Array.isArray(existing) && existing.length > 0) return existing;
  const seeded = HOSTELS.map(withSeedMetadata);
  writeJson(HOSTELS_KEY, seeded);
  return seeded;
}

export function getHostels() {
  return ensureSeedData();
}

export function getPublicHostels() {
  return getHostels().filter((hostel) => hostel.moderationStatus === "approved");
}

export function getOwnerHostels(ownerId) {
  return getHostels().filter((hostel) => hostel.ownerId === ownerId);
}

export function addHostelListing({ ownerId, ownerName, hostel }) {
  const hostels = getHostels();
  const nextId = hostels.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0) + 1;

  const newHostel = {
    id: nextId,
    ownerId,
    owner: ownerName,
    name: hostel.name.trim(),
    location: hostel.location.trim(),
    city: hostel.city.trim(),
    address: hostel.address.trim(),
    rating: 0,
    reviews: 0,
    description: hostel.description.trim(),
    amenities: hostel.amenities,
    images: hostel.images,
    rooms: hostel.rooms,
    menu: {
      breakfast: "Will be updated by owner",
      lunch: "Will be updated by owner",
      dinner: "Will be updated by owner",
    },
    verified: false,
    moderationStatus: "pending",
    gender: hostel.gender,
    distance: hostel.distance || "Distance not set",
  };

  const updated = [newHostel, ...hostels];
  writeJson(HOSTELS_KEY, updated);
  return newHostel;
}

export function getBookingRequests() {
  return readJson(BOOKING_REQUESTS_KEY, []);
}

export function getOwnerBookingRequests(ownerId) {
  const ownerHostelIds = new Set(getOwnerHostels(ownerId).map((hostel) => hostel.id));
  return getBookingRequests().filter((request) => ownerHostelIds.has(request.hostelId));
}

export function getStudentBookingRequests(studentId) {
  return getBookingRequests().filter((request) => request.studentId === studentId);
}

export function createBookingRequest({
  hostelId,
  hostelName,
  studentId,
  studentName,
  roomType,
  moveInDate,
  message,
}) {
  const requests = getBookingRequests();
  const duplicate = requests.find(
    (request) =>
      request.hostelId === hostelId && request.studentId === studentId && request.status === "pending",
  );

  if (duplicate) {
    return { ok: false, error: "You already have a pending request for this hostel." };
  }

  const newRequest = {
    id: crypto.randomUUID(),
    hostelId,
    hostelName,
    studentId,
    studentName,
    roomType,
    moveInDate,
    message: message?.trim() || "",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  writeJson(BOOKING_REQUESTS_KEY, [newRequest, ...requests]);
  return { ok: true, request: newRequest };
}

export function updateBookingRequestStatus({ requestId, status }) {
  const requests = getBookingRequests();
  const target = requests.find((request) => request.id === requestId);
  if (!target) return { ok: false, error: "Request not found." };

  if (target.status !== "pending") {
    return { ok: false, error: "Only pending requests can be updated." };
  }

  const updatedRequests = requests.map((request) =>
    request.id === requestId
      ? { ...request, status, respondedAt: new Date().toISOString() }
      : request,
  );
  writeJson(BOOKING_REQUESTS_KEY, updatedRequests);

  if (status === "accepted") {
    const hostels = getHostels();
    const hostelsUpdated = hostels.map((hostel) => {
      if (hostel.id !== target.hostelId) return hostel;
      return {
        ...hostel,
        rooms: hostel.rooms.map((room) => {
          if (room.type !== target.roomType) return room;
          return { ...room, available: Math.max(0, room.available - 1) };
        }),
      };
    });
    writeJson(HOSTELS_KEY, hostelsUpdated);
  }

  return { ok: true };
}
