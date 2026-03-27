import { useState } from "react";
import Stars from "../components/Stars";
import { amenityIcons, roomIcons } from "../data/hostels";

export default function HostelDetail({
  hostel,
  user,
  onBack,
  onToast,
  onRequireStudentLogin,
  onBookingRequest,
}) {
  const [activeImg, setActiveImg] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState(
    hostel.rooms.find((room) => room.available > 0)?.type || "",
  );
  const [moveInDate, setMoveInDate] = useState("");
  const [message, setMessage] = useState("");

  const selectedRoomData = hostel.rooms.find((room) => room.type === selectedRoom);
  const bookingAdvance = selectedRoomData ? Number(selectedRoomData.bookingAdvance || 0) : 0;
  const securityDeposit = selectedRoomData ? Number(selectedRoomData.securityDeposit || 0) : 0;
  const totalOpenBeds = hostel.rooms.reduce((sum, room) => sum + Number(room.available || 0), 0);
  const moveInEligibleRooms = hostel.rooms.filter(
    (room) => Number(room.available || 0) > 0 && Number(room.price || 0) > 0,
  );
  const lowestMoveIn = moveInEligibleRooms.length
    ? Math.min(
      ...moveInEligibleRooms.map((room) =>
        Number(room.price || 0) + Number(room.bookingAdvance || 0) + Number(room.securityDeposit || 0) + 500,
      ),
    )
    : 0;
  const quickSignals = [
    `${totalOpenBeds} beds open`,
    hostel.verified ? "Owner verified" : "Approval pending",
    `${hostel.rooms.length} share options`,
  ];

  const handleRequestBooking = () => {
    if (!selectedRoomData) {
      onToast("Please select an available room.");
      return;
    }

    if (!moveInDate) {
      onToast("Please select your move-in date.");
      return;
    }

    if (!user || user.role !== "guest") {
      onRequireStudentLogin();
      return;
    }

    onBookingRequest({
      roomType: selectedRoomData.type,
      moveInDate,
      message,
    });
  };

  return (
    <div>
      <div className="detail-hero">
        <div className="detail-gallery">
          <div className="gallery-main">
            <img src={hostel.images[activeImg]} alt={hostel.name} className="gallery-img" />
          </div>
          {hostel.images.slice(1, 3).map((image, index) => (
            <div key={image}>
              <img
                src={image}
                alt={hostel.name}
                className="gallery-img"
                onClick={() => setActiveImg(index + 1)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="detail-body">
        <button className="back-btn" onClick={onBack}>
          Back to listings
        </button>

        <div className="detail-grid">
          <div>
            <h1 className="detail-title">{hostel.name}</h1>
            <div className="detail-meta">
              <div className="meta-item">{hostel.address}</div>
              <div className="meta-item">
                <Stars rating={hostel.rating} />
                <strong>{hostel.rating}</strong>
                <span>
                  (
                  {hostel.reviews}
                  {" "}
                  reviews)
                </span>
              </div>
              {hostel.verified && (
                <div className="meta-item" style={{ color: "var(--sage)", fontWeight: 600 }}>
                  Verified Hostel
                </div>
              )}
              <span
                className={`card-badge badge-${hostel.gender.toLowerCase().replace("-", "")}`}
                style={{ position: "static" }}
              >
                {hostel.gender}
              </span>
            </div>

            <p className="detail-desc">{hostel.description}</p>

            <div className="card-signal-row" style={{ marginBottom: 24 }}>
              {quickSignals.map((signal) => (
                <span key={signal} className="card-signal">{signal}</span>
              ))}
            </div>

            <div className="rooms-title">Amenities</div>
            <div className="amenity-grid">
              {hostel.amenities.map((amenity) => (
                <div className="amenity-item" key={amenity}>
                  <span>{amenityIcons[amenity] || "OK"}</span>
                  {" "}
                  {amenity}
                </div>
              ))}
            </div>

            <div className="rooms-title">Available Rooms</div>
            <div className="room-cards">
              {hostel.rooms.map((room) => (
                <div
                  key={room.type}
                  className={`room-card${room.available === 0 ? " full-room" : ""}`}
                  onClick={() => room.available > 0 && setSelectedRoom(room.type)}
                  style={{
                    cursor: room.available > 0 ? "pointer" : "not-allowed",
                    borderColor: selectedRoom === room.type ? "var(--terra)" : "",
                  }}
                >
                  <div className="room-card-left">
                    <div className="room-icon">{roomIcons[room.type] || "R"}</div>
                    <div>
                      <div className="room-type-name">{room.type}</div>
                      <div className="room-avail">
                        {room.available === 0
                          ? "No beds available"
                          : `${room.available} of ${room.total} beds available`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div className="room-price-wrap">
                      <div className="room-price">
                        INR
                        {" "}
                        {room.price.toLocaleString()}
                      </div>
                      <div className="room-price-label">per month</div>
                    </div>
                    <button
                      className="room-book-btn"
                      disabled={room.available === 0}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedRoom(room.type);
                      }}
                    >
                      {room.available === 0 ? "Full" : "Select"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="menu-section">
              <div className="menu-title">Today&apos;s Menu</div>
              <div className="menu-grid">
                {[
                  { key: "breakfast", label: "Breakfast" },
                  { key: "lunch", label: "Lunch" },
                  { key: "dinner", label: "Dinner" },
                ].map(({ key, label }) => (
                  <div className="menu-card" key={key}>
                    <div className="menu-card-label">{label}</div>
                    <div className="menu-card-items">{hostel.menu[key]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="booking-sidebar">
              <div className="booking-title">Request to Join</div>
              <div className="booking-sub">Select room type and move-in date to see the owner-set fee breakup</div>
              <div className="booking-trust-box">
                <div className="booking-trust-item">
                  <span>Hostel Status</span>
                  <strong>{hostel.verified ? "Verified & Live" : "Awaiting approval"}</strong>
                </div>
                <div className="booking-trust-item">
                  <span>Beds Open</span>
                  <strong>{totalOpenBeds}</strong>
                </div>
                <div className="booking-trust-item">
                  <span>Lowest Move-in</span>
                  <strong>INR {lowestMoveIn.toLocaleString()}</strong>
                </div>
              </div>

              <select
                className="booking-select"
                value={selectedRoom}
                onChange={(event) => setSelectedRoom(event.target.value)}
              >
                {hostel.rooms.map((room) => (
                  <option key={room.type} value={room.type} disabled={room.available === 0}>
                    {room.type}
                    {" "}
                    -
                    {" "}
                    INR
                    {" "}
                    {room.price.toLocaleString()}
                    /mo
                    {" "}
                    {room.available === 0 ? "(Full)" : ""}
                  </option>
                ))}
              </select>

              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="form-label">Move-in Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={moveInDate}
                  onChange={(event) => setMoveInDate(event.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Message to Owner</label>
                <textarea
                  className="form-textarea"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Tell owner about your requirements..."
                  style={{ minHeight: 82 }}
                />
              </div>

              {selectedRoomData && (
                <>
                  <div className="booking-price-row">
                    <span>Monthly Rent</span>
                    <strong>
                      INR
                      {" "}
                      {selectedRoomData.price.toLocaleString()}
                    </strong>
                  </div>
                  <div className="booking-price-row">
                    <span>Booking Advance</span>
                    <strong>
                      INR
                      {" "}
                      {bookingAdvance.toLocaleString()}
                    </strong>
                  </div>
                  <div className="booking-price-row">
                    <span>Security Deposit</span>
                    <strong>
                      INR
                      {" "}
                      {securityDeposit.toLocaleString()}
                    </strong>
                  </div>
                  <div className="booking-price-row">
                    <span>Maintenance</span>
                    <strong>INR 500</strong>
                  </div>
                  <hr className="booking-divider" />
                  <div className="booking-total">
                    <span>Total at Move-in</span>
                    <span>
                      INR
                      {" "}
                      {(bookingAdvance + securityDeposit + selectedRoomData.price + 500).toLocaleString()}
                    </span>
                  </div>
                </>
              )}

              <button className="book-now-btn" onClick={handleRequestBooking}>
                {user?.role === "guest" ? "Send Join Request" : "Login as Guest"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="mobile-booking-bar">
        <div className="mobile-booking-bar-copy">
          <strong>Move in from INR {lowestMoveIn.toLocaleString()}</strong>
          <span>{totalOpenBeds} beds open</span>
        </div>
        <button className="mobile-booking-bar-btn" onClick={handleRequestBooking}>
          {user?.role === "guest" ? "Request" : "Login"}
        </button>
      </div>
    </div>
  );
}
