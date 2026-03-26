import { useEffect, useMemo, useState } from "react";
import { fetchOwnerStudents } from "../api/staynestApi";
import { updateHostelDetails, updateRoomDetails } from "../data/appStore";

const sidebarItems = [
  { id: "overview", label: "Overview" },
  { id: "edit", label: "Edit Hostel" },
  { id: "students", label: "Students" },
  { id: "enquiries", label: "Booking Requests" },
  { id: "settings", label: "Settings" },
];

export default function OwnerDashboard({
  ownerName = "Owner",
  ownerPhone = "",
  ownerRole = "owner",
  ownerStatus,
  hostels,
  requests,
  onRequestStatusChange,
  onBack,
  onToast,
  onLogout,
  onRefreshHostels,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedHostelId, setSelectedHostelId] = useState(
    hostels[0]?.id || null,
  );
  const [editForm, setEditForm] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const stats = useMemo(() => {
    const totalBeds = hostels.reduce(
      (count, hostel) => count + hostel.rooms.reduce((roomCount, room) => roomCount + room.total, 0),
      0,
    );
    const availableBeds = hostels.reduce(
      (count, hostel) =>
        count + hostel.rooms.reduce((roomCount, room) => roomCount + room.available, 0),
      0,
    );
    return {
      totalHostels: hostels.length,
      totalBeds,
      availableBeds,
      pendingRequests: requests.filter((request) => request.status === "pending").length,
    };
  }, [hostels, requests]);

  const floorTypeLabel = {
    double: "2 Share",
    triple: "3 Share",
    four: "4 Share",
    five: "5 Share",
    six: "6 Share",
  };

  const selectedHostel = useMemo(
    () => hostels.find((hostel) => hostel.id === selectedHostelId) || null,
    [hostels, selectedHostelId],
  );

  const loadEditForm = (hostel) => {
    if (!hostel) {
      setEditForm(null);
      return;
    }
    setPhotoIndex(0);
    setEditForm({
      id: hostel.id,
      name: hostel.name || "",
      area: hostel.location || "",
      city: hostel.city || "",
      address: hostel.address || "",
      pincode: hostel.pincode || "",
      gender: hostel.gender || "Boys",
      contact_number: hostel.contact_number || "",
      description: hostel.description || "",
      rules: hostel.rules || "",
      amenitiesText: (hostel.amenities || []).join(", "),
      existingPhotos: hostel.images || [],
      newPhotoFiles: [],
      totalFloors: hostel.total_floors || "",
      totalRooms: hostel.total_rooms || "",
      floorRoomCounts: hostel.floor_room_counts || [],
      rooms: hostel.rooms.map((room) => ({
        id: room.id,
        type: room.type,
        price: room.price,
        total: room.total,
        available: room.available,
      })),
    });
  };

  const handleHostelSelect = (event) => {
    const nextId = Number(event.target.value);
    setSelectedHostelId(nextId);
    const hostel = hostels.find((item) => item.id === nextId);
    loadEditForm(hostel);
  };

  const mergedPhotosPreview = useMemo(() => {
    if (!editForm) return [];
    return [
      ...(editForm.existingPhotos || []),
      ...(editForm.newPhotoFiles || []),
    ];
  }, [editForm]);

  const hasPhotos = mergedPhotosPreview.length > 0;
  const activePhoto = hasPhotos ? mergedPhotosPreview[photoIndex % mergedPhotosPreview.length] : null;

  const handleRoomChange = (roomId, field, value) => {
    setEditForm((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) =>
        room.id === roomId ? { ...room, [field]: value } : room,
      ),
    }));
  };

  const normalizeFloorCounts = (floors) =>
    Array.from({ length: floors }, (_, index) => {
      const existing = editForm?.floorRoomCounts?.find((item) => item.floor === index + 1);
      return {
        floor: index + 1,
        double: existing?.double ?? 0,
        triple: existing?.triple ?? 0,
        four: existing?.four ?? 0,
        five: existing?.five ?? 0,
        six: existing?.six ?? 0,
      };
    });

  const handleFloorsChange = (value) => {
    const floors = Number(value || 0);
    setEditForm((prev) => ({
      ...prev,
      totalFloors: value,
      floorRoomCounts: floors > 0 ? normalizeFloorCounts(floors) : [],
    }));
  };

  const handleFloorRoomChange = (floor, field, value) => {
    setEditForm((prev) => ({
      ...prev,
      floorRoomCounts: prev.floorRoomCounts.map((item) =>
        item.floor === floor ? { ...item, [field]: Number(value || 0) } : item,
      ),
    }));
  };

  const handleEditPhotoFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      setEditForm((prev) => ({ ...prev, newPhotoFiles: [] }));
      return;
    }
    const readers = files.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Unable to read file."));
      reader.readAsDataURL(file);
    }));
    try {
      const results = await Promise.all(readers);
      setEditForm((prev) => ({ ...prev, newPhotoFiles: results }));
      setPhotoIndex(0);
    } catch {
      onToast("Unable to read one or more images.");
    }
  };

  const handleSaveEdits = async () => {
    if (!editForm) return;
    try {
      const mergedPhotosPreview = [
        ...(editForm.existingPhotos || []),
        ...(editForm.newPhotoFiles || []),
      ];
      const floorTotals = editForm.floorRoomCounts.reduce(
        (acc, floor) => {
          Object.keys(floorTypeLabel).forEach((key) => {
            acc[key] += Number(floor[key] || 0);
          });
          return acc;
        },
        { double: 0, triple: 0, four: 0, five: 0, six: 0 },
      );

      const missingTypes = Object.entries(floorTotals)
        .filter(([, count]) => count > 0)
        .filter(([key]) => {
          const label = floorTypeLabel[key];
          const room = editForm.rooms.find((item) => item.type === label);
          return !room || Number(room.price || 0) <= 0;
        })
        .map(([key]) => floorTypeLabel[key]);

      if (missingTypes.length > 0) {
        onToast(`Set price for room types: ${missingTypes.join(", ")}.`);
        return;
      }

      const shareMap = {
        double: 2,
        triple: 3,
        four: 4,
        five: 5,
        six: 6,
      };

      const bedMismatch = Object.entries(floorTotals).find(([key, count]) => {
        if (count === 0) return false;
        const label = floorTypeLabel[key];
        const room = editForm.rooms.find((item) => item.type === label);
        if (!room) return false;
        const expectedBeds = count * shareMap[key];
        return Number(room.total || 0) !== expectedBeds;
      });

      if (bedMismatch) {
        const [key, count] = bedMismatch;
        const label = floorTypeLabel[key];
        const expectedBeds = count * shareMap[key];
        onToast(
          `${label}: total beds must be ${expectedBeds} (rooms ${count} × ${shareMap[key]} share).`,
        );
        return;
      }

      const amenities = editForm.amenitiesText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const photos = mergedPhotosPreview.map((url, index) => ({
        url,
        display_order: index,
      }));

      const payload = {
        name: editForm.name,
        area: editForm.area,
        city: editForm.city,
        address: editForm.address,
        pincode: editForm.pincode,
        gender_type: editForm.gender === "Boys" ? "boys" : editForm.gender === "Girls" ? "girls" : "coed",
        contact_number: editForm.contact_number,
        description: editForm.description,
        rules: editForm.rules,
        amenities,
        total_floors: editForm.totalFloors ? Number(editForm.totalFloors) : null,
        total_rooms: editForm.totalRooms ? Number(editForm.totalRooms) : null,
        floor_room_counts: editForm.floorRoomCounts || [],
      };
      if (photos.length > 0) {
        payload.photos = photos;
      }

      await updateHostelDetails(editForm.id, payload);

      await Promise.all(
        editForm.rooms.map((room) => {
          const total = Number(room.total || 0);
          const available = Number(room.available || 0);
          const occupied = Math.max(0, total - available);
          return updateRoomDetails(room.id, {
            monthly_rent: Number(room.price || 0),
            total_beds: total,
            occupied_beds: occupied,
          });
        }),
      );

      onToast("Hostel details updated.");
      if (onRefreshHostels) {
        await onRefreshHostels();
      }
    } catch (error) {
      onToast(error.message || "Unable to update hostel details.");
    }
  };

  useEffect(() => {
    if (!selectedHostelId && hostels.length > 0) {
      setSelectedHostelId(hostels[0].id);
    }
  }, [hostels, selectedHostelId]);

  useEffect(() => {
    if (selectedHostel) {
      loadEditForm(selectedHostel);
    }
  }, [selectedHostel]);

  useEffect(() => {
    const loadStudents = async () => {
      if (activeTab !== "students") return;
      setStudentsLoading(true);
      try {
        const data = await fetchOwnerStudents();
        setStudents(data);
      } catch (error) {
        onToast(error.message || "Unable to load students.");
      } finally {
        setStudentsLoading(false);
      }
    };
    loadStudents();
  }, [activeTab, onToast]);


  return (
    <div className="dashboard">
      <div className="sidebar">
        <div className="sidebar-logo">
          Stay
          <span>Nest</span>
          {" "}
          Owner
        </div>
        <div className="sidebar-section">Management</div>
        {sidebarItems.map((item) => (
          <div
            key={item.id}
            className={`sidebar-item${activeTab === item.id ? " active" : ""}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.label}
          </div>
        ))}
        <div className="sidebar-section">Account</div>
        <div className="sidebar-item" onClick={onLogout}>Logout</div>
      </div>

      <div className="dash-main">
        {ownerStatus !== "active" && (
          <div className="form-section" style={{ marginBottom: 20, background: "#fff7ed" }}>
            <div className="form-section-title">Verification Status</div>
            <p style={{ color: "#9a3412", fontSize: 14 }}>
              Your owner account is pending admin verification. You can submit listings now; they stay
              hidden until approved.
            </p>
          </div>
        )}

        <div className="dash-header">
          <div className="dash-greeting">Welcome back, {ownerName}</div>
          <div className="dash-title">
            {sidebarItems.find((item) => item.id === activeTab)?.label}
          </div>
        </div>

        {activeTab === "overview" && (
          <>
            <div className="form-section" style={{ marginBottom: 18 }}>
              <div className="form-section-title">Owner Profile</div>
              <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
                <div>
                  Name:
                  {" "}
                  <strong>{ownerName}</strong>
                </div>
                <div>
                  Phone:
                  {" "}
                  <strong>{ownerPhone || "Not provided"}</strong>
                </div>
                <div>
                  Role:
                  {" "}
                  <strong>{ownerRole}</strong>
                </div>
                <div>
                  Status:
                  {" "}
                  <strong>{ownerStatus}</strong>
                </div>
              </div>
            </div>
            <div className="stats-row">
              {[
                { label: "Your Hostels", num: stats.totalHostels },
                { label: "Total Beds", num: stats.totalBeds },
                { label: "Available Beds", num: stats.availableBeds },
                { label: "Pending Requests", num: stats.pendingRequests },
              ].map((stat) => (
                <div className="stat-card" key={stat.label}>
                  <div className="stat-num">{stat.num}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>

            {false && (
            <div className="form-section">
              <div className="form-section-title">Your Listings</div>
              {hostels.length === 0 && (
                <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
                  You have not listed any hostels yet.
                </p>
              )}
              {hostels.map((hostel) => (
                <div
                  key={hostel.id}
                  style={{
                    border: "1px solid var(--cream-dark)",
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 10,
                    background: "white",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{hostel.name}</div>
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 2 }}>
                    {hostel.location}
                    ,{" "}
                    {hostel.city}
                    {" "}
                    •
                    {" "}
                    {hostel.gender}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                    {hostel.address}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    Contact:
                    {" "}
                    <strong>{hostel.contact_number || "Not provided"}</strong>
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    Amenities:
                    {" "}
                    {(hostel.amenities && hostel.amenities.length > 0)
                      ? hostel.amenities.join(", ")
                      : "Not provided"}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    Rooms:
                    {" "}
                    {(hostel.rooms && hostel.rooms.length > 0)
                      ? hostel.rooms.map((room) =>
                        `${room.type} - INR ${room.price} (${room.available}/${room.total} beds)`).join(", ")
                      : "Not provided"}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    Photos:
                    {" "}
                    {hostel.images ? hostel.images.length : 0}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    Status:
                    {" "}
                    <strong>{hostel.moderationStatus}</strong>
                  </div>
                </div>
              ))}
            </div>
            )}
          </>
        )}

        {activeTab === "edit" && (
          <div className="form-section">
            <div className="form-section-title">Edit Hostel / PG Details</div>
            {hostels.length === 0 && (
              <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
                No hostels available.
              </p>
            )}
            {hostels.length > 0 && editForm && (
              <>
                <div className="form-group">
                  <label className="form-label">Select Hostel</label>
                  <select className="form-select" value={selectedHostelId || ""} onChange={handleHostelSelect}>
                    {hostels.map((hostel) => (
                      <option key={hostel.id} value={hostel.id}>
                        {hostel.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Hostel Name</label>
                    <input
                      className="form-input"
                      value={editForm.name}
                      onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Area / Location</label>
                    <input
                      className="form-input"
                      value={editForm.area}
                      onChange={(event) => setEditForm({ ...editForm, area: event.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      className="form-input"
                      value={editForm.city}
                      onChange={(event) => setEditForm({ ...editForm, city: event.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hostel Type</label>
                    <select
                      className="form-select"
                      value={editForm.gender}
                      onChange={(event) => setEditForm({ ...editForm, gender: event.target.value })}
                    >
                      <option>Boys</option>
                      <option>Girls</option>
                      <option>Co-Live</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Number</label>
                    <input
                      className="form-input"
                      value={editForm.contact_number}
                      onChange={(event) => setEditForm({ ...editForm, contact_number: event.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Floors</label>
                    <input
                      className="form-input"
                      type="number"
                      value={editForm.totalFloors}
                      onChange={(event) => handleFloorsChange(event.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Rooms</label>
                    <input
                      className="form-input"
                      type="number"
                      value={editForm.totalRooms}
                      onChange={(event) => setEditForm({ ...editForm, totalRooms: event.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode</label>
                    <input
                      className="form-input"
                      value={editForm.pincode}
                      onChange={(event) => setEditForm({ ...editForm, pincode: event.target.value })}
                    />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Address</label>
                    <input
                      className="form-input"
                      value={editForm.address}
                      onChange={(event) => setEditForm({ ...editForm, address: event.target.value })}
                    />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-textarea"
                      value={editForm.description}
                      onChange={(event) => setEditForm({ ...editForm, description: event.target.value })}
                    />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Rules / Other Details</label>
                    <textarea
                      className="form-textarea"
                      value={editForm.rules}
                      onChange={(event) => setEditForm({ ...editForm, rules: event.target.value })}
                    />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Amenities (comma separated)</label>
                    <input
                      className="form-input"
                      value={editForm.amenitiesText}
                      onChange={(event) => setEditForm({ ...editForm, amenitiesText: event.target.value })}
                    />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Hostel/PG Photos</label>
                    <input
                      className="form-input"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleEditPhotoFiles}
                    />
                    <div style={{ fontSize: 12, marginTop: 6 }}>
                      Existing photos:
                      {" "}
                      {editForm.existingPhotos?.length || 0}
                      {" "}
                      | New selected:
                      {" "}
                      {editForm.newPhotoFiles?.length || 0}
                    </div>
                    {hasPhotos && (
                      <div
                        style={{
                          marginTop: 12,
                          border: "1px solid var(--cream-dark)",
                          borderRadius: 12,
                          overflow: "hidden",
                          background: "white",
                        }}
                      >
                        <div style={{ position: "relative" }}>
                          <img
                            src={activePhoto}
                            alt={`Hostel photo ${photoIndex + 1}`}
                            style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}
                          />
                          {mergedPhotosPreview.length > 1 && (
                            <>
                              <button
                                type="button"
                                className="nav-btn"
                                onClick={() =>
                                  setPhotoIndex((prev) =>
                                    prev === 0 ? mergedPhotosPreview.length - 1 : prev - 1)}
                                style={{
                                  position: "absolute",
                                  left: 10,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                }}
                              >
                                Prev
                              </button>
                              <button
                                type="button"
                                className="nav-btn"
                                onClick={() =>
                                  setPhotoIndex((prev) =>
                                    prev === mergedPhotosPreview.length - 1 ? 0 : prev + 1)}
                                style={{
                                  position: "absolute",
                                  right: 10,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                }}
                              >
                                Next
                              </button>
                            </>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6, padding: "8px 12px", flexWrap: "wrap" }}>
                          {mergedPhotosPreview.map((photo, index) => (
                            <button
                              key={`${photo}-${index}`}
                              type="button"
                              onClick={() => setPhotoIndex(index)}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                border: index === photoIndex ? "2px solid var(--terra)" : "1px solid var(--cream-dark)",
                                padding: 0,
                                overflow: "hidden",
                                background: "white",
                                cursor: "pointer",
                              }}
                            >
                              <img
                                src={photo}
                                alt={`Thumb ${index + 1}`}
                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-section" style={{ marginTop: 16 }}>
                  <div className="form-section-title">Rooms</div>
                  {editForm.rooms.map((room) => (
                    <div className="form-grid" key={room.id} style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                      <div className="form-group">
                        <label className="form-label">{room.type} Price</label>
                        <input
                          className="form-input"
                          type="number"
                          value={room.price}
                          onChange={(event) => handleRoomChange(room.id, "price", event.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{room.type} Total Beds</label>
                        <input
                          className="form-input"
                          type="number"
                          value={room.total}
                          onChange={(event) => handleRoomChange(room.id, "total", event.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{room.type} Available Beds</label>
                        <input
                          className="form-input"
                          type="number"
                          value={room.available}
                          onChange={(event) => handleRoomChange(room.id, "available", event.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="form-section" style={{ marginTop: 16 }}>
                  <div className="form-section-title">Rooms Per Floor</div>
                  {editForm.floorRoomCounts.length === 0 && (
                    <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
                      Enter total floors to define per-floor room counts.
                    </p>
                  )}
                  {editForm.floorRoomCounts.map((floor) => (
                    <div key={floor.floor} className="form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr" }}>
                      <div className="form-group">
                        <label className="form-label">Floor</label>
                        <input className="form-input" value={`Floor ${floor.floor}`} disabled />
                      </div>
                      {[
                        ["double", "2 Share"],
                        ["triple", "3 Share"],
                        ["four", "4 Share"],
                        ["five", "5 Share"],
                        ["six", "6 Share"],
                      ].map(([key, label]) => (
                        <div className="form-group" key={`${floor.floor}-${key}`}>
                          <label className="form-label">{label}</label>
                          <input
                            className="form-input"
                            type="number"
                            value={floor[key]}
                            onChange={(event) => handleFloorRoomChange(floor.floor, key, event.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <button className="submit-btn" onClick={handleSaveEdits} style={{ marginTop: 12 }}>
                  Save Changes
                </button>
              </>
            )}
          </div>
        )}

        {activeTab === "students" && (
          <div className="form-section">
            <div className="form-section-title">Students</div>
            {studentsLoading && (
              <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>Loading students...</p>
            )}
            {!studentsLoading && students.length === 0 && (
              <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
                No students/ Guests found yet.
              </p>
            )}
            {!studentsLoading && students.map((student) => (
              <div
                key={student.booking_id}
                style={{
                  border: "1px solid var(--cream-dark)",
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 10,
                  background: "white",
                }}
              >
                <div style={{ fontWeight: 700 }}>{student.student_name}</div>
                <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                  Phone:
                  {" "}
                  {student.student_phone}
                </div>
                <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                  Hostel:
                  {" "}
                  {student.hostel_name}
                </div>
                <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                  Room Type:
                  {" "}
                  {student.room_type || "Not assigned"}
                </div>
                <div style={{ fontSize: 12, marginTop: 6 }}>
                  Status:
                  {" "}
                  <strong>{student.status}</strong>
                </div>
              </div>
            ))}
          </div>
        )}


        {activeTab === "enquiries" && (
          <div className="form-section">
            <div className="form-section-title">Booking Requests</div>
            {requests.length === 0 && (
              <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
                No booking requests yet.
              </p>
            )}
            {requests.map((request) => (
              <div
                key={request.id}
                style={{
                  border: "1px solid var(--cream-dark)",
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  {request.studentName}
                  {" "}
                  requested
                  {" "}
                  {request.roomType}
                </div>
                {request.studentPhone && (
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                    Phone:
                    {" "}
                    {request.studentPhone}
                  </div>
                )}
                <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                  Hostel:
                  {" "}
                  {request.hostelName}
                  {" "}
                  • Move-in:
                  {" "}
                  {request.moveInDate}
                </div>
                {request.message && (
                  <div style={{ marginTop: 8, fontSize: 14 }}>"{request.message}"</div>
                )}
                <div style={{ marginTop: 10, fontSize: 12 }}>
                  Status:
                  {" "}
                  <strong>{request.status}</strong>
                </div>

                {request.status === "pending" && (
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button
                      className="card-cta"
                      onClick={() => onRequestStatusChange(request.id, "accepted")}
                    >
                      Accept
                    </button>
                    <button
                      className="nav-btn"
                      onClick={() => onRequestStatusChange(request.id, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "settings" && (
          <>
            <div className="form-section">
              <div className="form-section-title">Profile Settings</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Owner Name</label>
                  <input className="form-input" defaultValue={ownerName} />
                </div>
                <div className="form-group">
                  <label className="form-label">UPI ID</label>
                  <input className="form-input" placeholder="name@upi" />
                </div>
              </div>
            </div>
            <button className="submit-btn" onClick={() => onToast("Settings saved.")}>
              Save Settings
            </button>
          </>
        )}
      </div>
    </div>
  );
}
