import {
  createBooking,
  createHostel,
  createRoom,
  fetchBookings,
  fetchHostels,
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
    bookingAdvance: Number(room.booking_advance || 0),
    securityDeposit: Number(room.security_deposit || 0),
    total: room.total_beds,
    available: Math.max(0, room.total_beds - room.occupied_beds),
  }));
}

function mapHostelForUi(hostel, rooms) {
  const photos = hostel.photos?.length
    ? hostel.photos.map((photo) => photo.url)
    : DEFAULT_IMAGES;
  const amenities = hostel.amenities?.length
    ? hostel.amenities
    : ["WiFi", "CCTV", "Power Backup"];
  const menu = DEFAULT_MENU;
  const rating = 0;
  const reviews = 0;
  const distance = hostel.city ? `${hostel.city} listing` : "Location available";

  return {
    id: hostel.id,
    ownerId: hostel.owner,
    owner: "Owner",
    name: hostel.name,
    location: hostel.area,
    city: hostel.city,
    address: hostel.address,
    contact_number: hostel.contact_number || "",
    pincode: hostel.pincode || "",
    rules: hostel.rules || "",
    total_floors: hostel.total_floors || null,
    rooms_per_floor: hostel.rooms_per_floor || [],
    total_rooms: hostel.total_rooms || null,
    floor_room_counts: hostel.floor_room_counts || [],
    rating,
    reviews,
    description: hostel.description || "",
    amenities,
    images: photos,
    rooms,
    menu,
    verified: hostel.moderation_status === "approved",
    moderationStatus: hostel.moderation_status,
    gender: mapGenderToUi(hostel.gender_type),
    distance,
  };
}

export async function getHostels({ useAuth = false } = {}) {
  const [hostels, rooms] = await Promise.all([
    fetchHostels({ useAuth }),
    fetchRooms({ useAuth }),
  ]);
  const roomsByHostel = rooms.reduce((acc, room) => {
    const list = acc[room.hostel] || [];
    list.push(room);
    acc[room.hostel] = list;
    return acc;
  }, {});

  return hostels.map((hostel) =>
    mapHostelForUi(hostel, mapRoomsForUi(roomsByHostel[hostel.id] || [])),
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
      moveInDate: booking.move_in_date,
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
      moveInDate: booking.move_in_date,
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
    message: message?.trim() || "",
    student_phone: studentPhone || "",
    move_in_date: moveInDate || null,
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
        moveInDate,
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
