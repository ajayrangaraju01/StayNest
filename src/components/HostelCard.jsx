import Stars from "./Stars";

export default function HostelCard({ hostel, onClick }) {
  const pricedRooms = hostel.rooms.filter((room) => Number(room.price || 0) > 0);
  const minPrice = pricedRooms.length ? Math.min(...pricedRooms.map((room) => room.price)) : 0;
  const totalAvailableBeds = hostel.rooms.reduce((sum, room) => sum + Number(room.available || 0), 0);
  const totalBeds = hostel.rooms.reduce((sum, room) => sum + Number(room.total || 0), 0);
  const bestRoom = hostel.rooms.find((room) => room.available > 0) || hostel.rooms[0] || null;
  const moveInPreviewRooms = hostel.rooms.filter(
    (room) => Number(room.available || 0) > 0 && Number(room.price || 0) > 0,
  );
  const moveInPreview = moveInPreviewRooms.length
    ? Math.min(
      ...moveInPreviewRooms.map((room) =>
        Number(room.price || 0)
        + Number(room.bookingAdvance || 0)
        + Number(room.securityDeposit || 0)
        + 500,
      ),
    )
    : 0;
  const highlightAmenities = (hostel.amenities || []).slice(0, 3);

  return (
    <div className="hostel-card" onClick={onClick}>
      <div className="card-img-wrap">
        <img src={hostel.images[0]} alt={hostel.name} className="card-img" loading="lazy" />
        <span className={`card-badge badge-${hostel.gender.toLowerCase().replace("-", "")}`}>
          {hostel.gender}
        </span>
        {hostel.verified && <span className="verified-badge">Verified</span>}
      </div>
      <div className="card-body">
        <div className="card-location">
          {hostel.location}
          ,{" "}
          {hostel.city}
        </div>
        <div className="card-name">{hostel.name}</div>
        <div className="card-distance">{hostel.distance}</div>
        <div className="card-signal-row">
          <span className="card-signal">{totalAvailableBeds} beds open</span>
          <span className="card-signal">{totalBeds} total beds</span>
          <span className="card-signal">{bestRoom?.type || "Room info soon"}</span>
        </div>
        <div className="card-rating">
          <Stars rating={hostel.rating} />
          <span className="rating-num">{hostel.rating}</span>
          <span className="rating-count">
            (
            {hostel.reviews}
            {" "}
            reviews)
          </span>
        </div>
        <div className="card-rooms">
          {hostel.rooms.map((room) => (
            <span key={room.type} className={`room-tag${room.available === 0 ? " full" : ""}`}>
              {room.type}
              {" "}
              {room.available === 0 ? "- Full" : `- ${room.available} left`}
            </span>
          ))}
        </div>
        <div className="card-amenities">
          {highlightAmenities.map((amenity) => (
            <span key={amenity} className="card-amenity-pill">{amenity}</span>
          ))}
        </div>
        <div className="card-footer">
          <div className="card-price">
            Starting from
            <strong>
              INR
              {" "}
              {minPrice.toLocaleString()}
            </strong>
            /month
            <span className="card-price-sub">Move-in from INR {moveInPreview.toLocaleString()}</span>
          </div>
          <button
            className="card-cta"
            onClick={(event) => {
              event.stopPropagation();
              onClick();
            }}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
