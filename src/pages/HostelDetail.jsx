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
  const [stayType, setStayType] = useState("monthly");
  const [moveInDate, setMoveInDate] = useState("");
  const [moveOutDate, setMoveOutDate] = useState("");
  const [message, setMessage] = useState("");
  const totalImages = hostel.images?.length || 0;
  const locationQuery = encodeURIComponent(
    hostel.geoLat != null && hostel.geoLng != null
      ? `${hostel.geoLat},${hostel.geoLng}`
      : [hostel.name, hostel.address, hostel.location, hostel.city, hostel.pincode].filter(Boolean).join(", "),
  );
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${locationQuery}`;

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
  const dailyEligibleRooms = hostel.rooms.filter(
    (room) => Number(room.available || 0) > 0 && Number(room.dailyPrice || 0) > 0,
  );
  const lowestDailyRate = dailyEligibleRooms.length
    ? Math.min(...dailyEligibleRooms.map((room) => Number(room.dailyPrice || 0)))
    : 0;
  const totalDays = moveInDate && moveOutDate
    ? Math.max(0, Math.ceil((new Date(moveOutDate) - new Date(moveInDate)) / (1000 * 60 * 60 * 24)))
    : 0;
  const dailyBookingTotal = selectedRoomData
    ? (Number(selectedRoomData.dailyPrice || 0) * totalDays)
    : 0;
  const quickSignals = [
    `${totalOpenBeds} beds open`,
    hostel.verified ? "Owner verified" : "Approval pending",
    lowestDailyRate > 0 ? `From INR ${lowestDailyRate.toLocaleString()}/day` : `${hostel.rooms.length} share options`,
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

    if (stayType === "daily") {
      if (!moveOutDate) {
        onToast("Please select your move-out date.");
        return;
      }
      if (totalDays <= 0) {
        onToast("Move-out date must be after move-in date.");
        return;
      }
      if (Number(selectedRoomData.dailyPrice || 0) <= 0) {
        onToast("Daily price is not available for this room type.");
        return;
      }
    }

    if (!user || user.role !== "guest") {
      onRequireStudentLogin();
      return;
    }

    onBookingRequest({
      roomType: selectedRoomData.type,
      moveInDate,
      moveOutDate: stayType === "daily" ? moveOutDate : "",
      stayType,
      totalDays: stayType === "daily" ? totalDays : 0,
      message,
    });
  };

  const showNextImage = () => {
    if (totalImages <= 1) return;
    setActiveImg((current) => (current + 1) % totalImages);
  };

  const showPreviousImage = () => {
    if (totalImages <= 1) return;
    setActiveImg((current) => (current - 1 + totalImages) % totalImages);
  };

  return (
    <div>
      <div className="detail-hero">
        <div className="detail-gallery">
          <div className="gallery-main">
            <img src={hostel.images[activeImg]} alt={hostel.name} className="gallery-img" />
            {totalImages > 1 && (
              <>
                <button type="button" className="gallery-nav gallery-nav-prev" onClick={showPreviousImage}>
                  Prev
                </button>
                <button type="button" className="gallery-nav gallery-nav-next" onClick={showNextImage}>
                  Next
                </button>
                <div className="gallery-counter">
                  {activeImg + 1}/{totalImages}
                </div>
              </>
            )}
          </div>
          {hostel.images.slice(1, 3).map((image, index) => (
            <div key={image} className="gallery-side-tile">
              <img
                src={image}
                alt={hostel.name}
                className={`gallery-img${activeImg === index + 1 ? " active" : ""}`}
                onClick={() => setActiveImg(index + 1)}
              />
            </div>
          ))}
        </div>
        {totalImages > 1 && (
          <div className="gallery-thumb-row">
            {hostel.images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                className={`gallery-thumb${activeImg === index ? " active" : ""}`}
                onClick={() => setActiveImg(index)}
              >
                <img src={image} alt={`${hostel.name} ${index + 1}`} className="gallery-thumb-img" />
              </button>
            ))}
          </div>
        )}
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

            <div className="detail-map-card">
              <div className="rooms-title">Location & Navigation</div>
              <div className="detail-map-copy">
                <div>{hostel.address}</div>
                <div>{[hostel.location, hostel.city, hostel.pincode].filter(Boolean).join(", ")}</div>
              </div>
              <a className="detail-map-btn" href={directionsUrl} target="_blank" rel="noreferrer">
                <span className="detail-map-btn-icon">-></span>
                <span>Navigate on Google Maps</span>
              </a>
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
                      {Number(room.dailyPrice || 0) > 0 && (
                        <div className="room-price-label">INR {Number(room.dailyPrice || 0).toLocaleString()} / day</div>
                      )}
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
              <div className="booking-sub">Select room type and stay plan to see the owner-set monthly or daily pricing</div>
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
                    {Number(room.dailyPrice || 0) > 0 ? ` | INR ${Number(room.dailyPrice || 0).toLocaleString()}/day` : ""}
                    {" "}
                    {room.available === 0 ? "(Full)" : ""}
                  </option>
                ))}
              </select>

              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="form-label">Stay Plan</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[
                    { value: "monthly", label: "Monthly Stay" },
                    { value: "daily", label: "Day Wise Stay" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className="room-book-btn"
                      onClick={() => setStayType(option.value)}
                      style={{
                        borderColor: stayType === option.value ? "var(--terra)" : "var(--cream-dark)",
                        background: stayType === option.value ? "rgba(174, 93, 68, 0.12)" : "white",
                        color: "var(--ink)",
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="form-label">{stayType === "daily" ? "Check-in Date" : "Move-in Date"}</label>
                <input
                  className="form-input"
                  type="date"
                  value={moveInDate}
                  onChange={(event) => setMoveInDate(event.target.value)}
                />
              </div>

              {stayType === "daily" && (
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="form-label">Check-out Date</label>
                  <input
                    className="form-input"
                    type="date"
                    value={moveOutDate}
                    min={moveInDate || undefined}
                    onChange={(event) => setMoveOutDate(event.target.value)}
                  />
                </div>
              )}

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
                    <span>Day-wise Price</span>
                    <strong>
                      INR
                      {" "}
                      {Number(selectedRoomData.dailyPrice || 0).toLocaleString()}
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
                  {stayType === "daily" ? (
                    <>
                      <div className="booking-price-row">
                        <span>Total Days</span>
                        <strong>{totalDays || 0}</strong>
                      </div>
                      <hr className="booking-divider" />
                      <div className="booking-total">
                        <span>Estimated Stay Total</span>
                        <span>
                          INR
                          {" "}
                          {dailyBookingTotal.toLocaleString()}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
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
