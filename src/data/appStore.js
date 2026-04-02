import {
  createBooking,
  createHostel,
  createRoom,
  fetchBookings,
  fetchHostels,
  fetchMenus,
  fetchRooms,
  updateHostel,
  updateBooking,
  updateRoom,
} from "../api/staynestApi";

const DEFAULT_MENU = {
  breakfast: "Menu will be updated by owner.",
  lunch: "Menu will be updated by owner.",
  dinner: "Menu will be updated by owner.",
};

const DEFAULT_IMAGES = ["https://placehold.co/1200x800?text=StayNest"];

const ROOM_TYPE_TO_UI = {
  single: "Single",
  double: "2 Share",
  triple: "3 Share",
  four: "4 Share",
  five: "5 Share",
  six: "6 Share",
};

const ROOM_TYPE_TO_API = {
  Single: "single",
  "2 Share": "double",
  "3 Share": "triple",
  "4 Share": "four",
  "5 Share": "five",
  "6 Share": "six",
};

function mapGenderToUi(genderType) {
  if (genderType === "boys") return "Boys";
  if (genderType === "girls") return "Girls";
  if (genderType === "coed") return "Co-Live";
  return "Co-Live";
}

function mapGenderToApi(gender) {
  if (gender === "Boys") return "boys";
  if (gender === "Girls") return "girls";
  return "coed";
}

function mapRoomsForUi(rooms) {
  return rooms.map((room) => ({
    id: room.id,
    roomNumber: room.room_number || "",
    type: ROOM_TYPE_TO_UI[room.type] || room.type,
    price: Number(room.monthly_rent || 0),
    dailyPrice: Number(room.daily_rent || 0),
    bookingAdvance: Number(room.booking_advance || 0),
    securityDeposit: Number(room.security_deposit || 0),
    total: room.total_beds,
    available: Math.max(0, room.total_beds - room.occupied_beds),
  }));
}

function mapHostelForUi(hostel, rooms, menu = DEFAULT_MENU) {
  const pending = hostel.pending_update || null;
  const effectiveHostel = pending
    ? {
      ...hostel,
      ...pending,
    }
    : hostel;
  const photos = hostel.photos?.length
    ? (pending?.photos?.length
      ? pending.photos.map((photo) => photo.url)
      : hostel.photos.map((photo) => photo.url))
    : DEFAULT_IMAGES;
  const amenities = effectiveHostel.amenities?.length
    ? effectiveHostel.amenities
    : ["WiFi", "CCTV", "Power Backup"];
  const rating = 0;
  const reviews = 0;
  const distance = effectiveHostel.city ? `${effectiveHostel.city} listing` : "Location available";
  const effectiveRooms = pending?.rooms?.length
    ? mapRoomsForUi(pending.rooms.map((room) => ({ hostel: hostel.id, ...room })))
    : rooms;

  return {
    id: hostel.id,
    ownerId: hostel.owner,
    owner: "Owner",
    name: effectiveHostel.name,
    location: effectiveHostel.area,
    city: effectiveHostel.city,
    address: effectiveHostel.address,
    contact_number: effectiveHostel.contact_number || "",
    pincode: effectiveHostel.pincode || "",
    rules: effectiveHostel.rules || "",
    total_floors: effectiveHostel.total_floors || null,
    rooms_per_floor: effectiveHostel.rooms_per_floor || [],
    total_rooms: effectiveHostel.total_rooms || null,
    floor_room_counts: effectiveHostel.floor_room_counts || [],
    geoLat: effectiveHostel.geo_lat != null ? Number(effectiveHostel.geo_lat) : null,
    geoLng: effectiveHostel.geo_lng != null ? Number(effectiveHostel.geo_lng) : null,
    rating,
    reviews,
    description: effectiveHostel.description || "",
    amenities,
    images: photos,
    rooms: effectiveRooms,
    menu,
    verified: hostel.moderation_status === "approved",
    moderationStatus: hostel.moderation_status,
    gender: mapGenderToUi(effectiveHostel.gender_type),
    distance,
    hasPendingChanges: hostel.has_pending_changes || false,
  };
}

export async function getHostels({ useAuth = false } = {}) {
  const [hostels, rooms, menus] = await Promise.all([
    fetchHostels({ useAuth }),
    fetchRooms({ useAuth }),
    fetchMenus({ useAuth }).catch(() => []),
  ]);
  const roomsByHostel = rooms.reduce((acc, room) => {
    const list = acc[room.hostel] || [];
    list.push(room);
    acc[room.hostel] = list;
    return acc;
  }, {});
  const menuByHostel = (menus || []).reduce((acc, menu) => {
    const existing = acc[menu.hostel];
    if (!existing) {
      acc[menu.hostel] = menu;
      return acc;
    }
    if (menu.is_override && !existing.is_override) {
      acc[menu.hostel] = menu;
      return acc;
    }
    if (menu.date > existing.date) {
      acc[menu.hostel] = menu;
    }
    return acc;
  }, {});

  return hostels.map((hostel) =>
    mapHostelForUi(
      hostel,
      mapRoomsForUi(roomsByHostel[hostel.id] || []),
      menuByHostel[hostel.id]
        ? {
          breakfast: menuByHostel[hostel.id].breakfast || DEFAULT_MENU.breakfast,
          lunch: menuByHostel[hostel.id].lunch || DEFAULT_MENU.lunch,
          dinner: menuByHostel[hostel.id].dinner || DEFAULT_MENU.dinner,
        }
        : DEFAULT_MENU,
    ),
  );
}

export async function getOwnerHostels(ownerId) {
  const hostels = await getHostels();
  return hostels.filter((hostel) => hostel.ownerId === ownerId);
}

export async function addHostelListing({ ownerId, ownerName, hostel }) {
  const payload = {
    owner: ownerId,
    name: hostel.name.trim(),
    address: hostel.address.trim(),
    area: hostel.location.trim(),
    city: hostel.city.trim(),
    pincode: hostel.pincode || "",
    geo_lat: hostel.geoLat ?? null,
    geo_lng: hostel.geoLng ?? null,
    gender_type: mapGenderToApi(hostel.gender),
    description: hostel.description.trim(),
    rules: "",
    contact_number: hostel.contact_number || "",
    moderation_status: "pending",
    photos: hostel.images.map((url, index) => ({ url, display_order: index })),
  };

  const created = await createHostel(payload);
  const roomCreates = hostel.rooms.map((room) =>
    createRoom({
      hostel: created.id,
      room_number: room.roomNumber || "",
      type: ROOM_TYPE_TO_API[room.type] || "single",
      monthly_rent: room.price,
      daily_rent: room.dailyPrice || 0,
      booking_advance: room.bookingAdvance || 0,
      security_deposit: room.securityDeposit || 0,
      total_beds: room.total,
      occupied_beds: Math.max(0, room.total - room.available),
      is_maintenance: false,
    }),
  );

  await Promise.all(roomCreates);

  return {
    id: created.id,
    ownerId,
    owner: ownerName,
    name: created.name,
    location: created.area,
    city: created.city,
    address: created.address,
    geoLat: created.geo_lat != null ? Number(created.geo_lat) : hostel.geoLat ?? null,
    geoLng: created.geo_lng != null ? Number(created.geo_lng) : hostel.geoLng ?? null,
    rating: 0,
    reviews: 0,
    description: created.description || "",
    amenities: hostel.amenities,
    images: hostel.images,
    rooms: hostel.rooms,
    menu: DEFAULT_MENU,
    verified: false,
    moderationStatus: "pending",
    gender: hostel.gender,
    distance: hostel.distance || "Distance not set",
  };
}

function mapBookingStatusToUi(status) {
  if (status === "approved") return "accepted";
  if (status === "rejected") return "rejected";
  return "pending";
}

function mapBookingStatusToApi(status) {
  if (status === "accepted") return "approved";
  if (status === "rejected") return "rejected";
  return "requested";
}

export async function getOwnerBookingRequests(ownerId, hostels = []) {
  const ownerHostelIds = new Set(hostels.filter((hostel) => hostel.ownerId === ownerId).map((h) => h.id));
  const [bookings, rooms] = await Promise.all([fetchBookings(), fetchRooms({ useAuth: true })]);
  const roomTypeById = rooms.reduce((acc, room) => {
    acc[room.id] = ROOM_TYPE_TO_UI[room.type] || room.type;
    return acc;
  }, {});
  return bookings
    .filter((booking) => ownerHostelIds.has(booking.hostel) && booking.status === "requested")
    .map((booking) => ({
      id: booking.id,
      hostelId: booking.hostel,
      hostelName: hostels.find((hostel) => hostel.id === booking.hostel)?.name || "Hostel",
      studentId: booking.student,
      studentName: "Student",
      studentPhone: booking.student_phone || "",
      roomType: booking.room ? `${booking.room_number ? `${booking.room_number} - ` : ""}${roomTypeById[booking.room] || "Room"}` : "Room",
      stayType: booking.stay_type || "monthly",
      totalDays: Number(booking.total_days || 0),
      moveInDate: booking.move_in_date,
      moveOutDate: booking.move_out_date,
      message: booking.message || "",
      status: mapBookingStatusToUi(booking.status),
      statusRaw: booking.status,
      createdAt: booking.created_at,
    }));
}

export async function getStudentBookingRequests(studentId, hostels = []) {
  const [bookings, rooms] = await Promise.all([fetchBookings(), fetchRooms()]);
  const roomTypeById = rooms.reduce((acc, room) => {
    acc[room.id] = ROOM_TYPE_TO_UI[room.type] || room.type;
    return acc;
  }, {});
  return bookings
    .filter((booking) => booking.student === studentId)
    .map((booking) => ({
      id: booking.id,
      hostelId: booking.hostel,
      hostelName: hostels.find((hostel) => hostel.id === booking.hostel)?.name || "Hostel",
      studentId: booking.student,
      studentName: "Student",
      roomType: booking.room ? `${booking.room_number ? `${booking.room_number} - ` : ""}${roomTypeById[booking.room] || "Room"}` : "Room",
      stayType: booking.stay_type || "monthly",
      totalDays: Number(booking.total_days || 0),
      moveInDate: booking.move_in_date,
      moveOutDate: booking.move_out_date,
      message: booking.message || "",
      status: mapBookingStatusToUi(booking.status),
      statusRaw: booking.status,
      createdAt: booking.created_at,
    }));
}

export async function createBookingRequest({
  hostelId,
  hostelName,
  studentId,
  studentName,
  studentPhone,
  roomType,
  moveInDate,
  moveOutDate,
  stayType,
  totalDays,
  message,
  roomId,
}) {
  if (!studentId) {
    return { ok: false, error: "Please login to send a booking request." };
  }

  const payload = {
    hostel: hostelId,
    student: studentId,
    room: roomId || null,
    status: "requested",
    stay_type: stayType || "monthly",
    total_days: Number(totalDays || 0),
    message: message?.trim() || "",
    student_phone: studentPhone || "",
    move_in_date: moveInDate || null,
    move_out_date: moveOutDate || null,
  };

  try {
    const booking = await createBooking(payload);
    return {
      ok: true,
      request: {
        id: booking.id,
        hostelId,
        hostelName,
        studentId,
        studentName,
        studentPhone,
        roomType,
        stayType: payload.stay_type,
        totalDays: payload.total_days,
        moveInDate,
        moveOutDate,
        message: payload.message,
        status: "pending",
        statusRaw: booking.status,
        createdAt: booking.created_at,
      },
    };
  } catch (error) {
    return { ok: false, error: error.message || "Unable to create booking request." };
  }
}

export async function updateBookingRequestStatus({ requestId, status }) {
  try {
    await updateBooking(requestId, { status: mapBookingStatusToApi(status) });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || "Unable to update booking request." };
  }
}

export async function updateHostelDetails(hostelId, payload) {
  return updateHostel(hostelId, payload);
}

export async function updateRoomDetails(roomId, payload) {
  return updateRoom(roomId, payload);
}

export async function createRoomDetails(payload) {
  return createRoom(payload);
}
