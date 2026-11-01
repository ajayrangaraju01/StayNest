import Stars from "./Stars";

const DEFAULT_COVER = "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80";

export default function HostelCard({ hostel, onClick }) {
  const pricedRooms = hostel.rooms.filter((room) => Number(room.price || 0) > 0);
  const minPrice = pricedRooms.length ? Math.min(...pricedRooms.map((room) => room.price)) : 0;
  const totalAvailableBeds = hostel.rooms.reduce((sum, room) => sum + Number(room.available || 0), 0);
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
  const coverImage = (hostel.images && hostel.images.length > 0 && hostel.images[0]) ? hostel.images[0] : DEFAULT_COVER;

  return (
    <div className="hostel-card" onClick={onClick}>
      <div className="card-img-wrap">
        <img src={coverImage} alt={hostel.name} className="card-img" loading="lazy" />
        <span className={`card-badge badge-${(hostel.gender || "coed").toLowerCase().replace("-", "")}`}>
          {hostel.gender}
        </span>
        {hostel.verified && <span className="verified-badge">Verified</span>}
      </div>
      <div className="card-body">
        <div className="card-location">
          <span>📍</span> {hostel.location}, {hostel.city}
        </div>
        <div className="card-name">{hostel.name}</div>
        
        <div className="card-rating" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Stars rating={hostel.rating} />
          <span className="rating-num" style={{ fontWeight: 700, fontSize: 13, color: "var(--espresso)" }}>
            {hostel.rating > 0 ? Number(hostel.rating).toFixed(1) : "New"}
          </span>
          <span className="rating-count" style={{ fontSize: 12, color: "var(--warm-gray)" }}>
            ({hostel.reviews || 0} reviews)
          </span>
          <span style={{ color: "var(--cream-dark)", margin: "0 2px" }}>•</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: totalAvailableBeds > 0 ? "#047857" : "#b91c1c" }}>
            ● {totalAvailableBeds} beds open
          </span>
        </div>

        <div className="card-rooms">
          {hostel.rooms.map((room) => (
            <span key={room.type} className={`room-tag${room.available === 0 ? " full" : ""}`}>
              {room.type} {room.available === 0 ? "(Full)" : `(${room.available} left)`}
            </span>
          ))}
        </div>

        {highlightAmenities.length > 0 && (
          <div className="card-amenities">
            {highlightAmenities.map((amenity) => (
              <span key={amenity} className="card-amenity-pill">{amenity}</span>
            ))}
          </div>
        )}

        <div className="card-footer">
          <div className="card-price">
            <span style={{ fontSize: 11, color: "var(--warm-gray)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Starting from</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <strong style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 24, fontWeight: 700, color: "var(--terra)", lineHeight: 1 }}>
                INR {minPrice.toLocaleString()}
              </strong>
              <span style={{ fontSize: 12, color: "var(--warm-gray)" }}>/mo</span>
            </div>
            {moveInPreview > 0 && (
              <span className="card-price-sub" style={{ fontSize: 11, color: "var(--warm-gray)", marginTop: 2 }}>
                Move-in: INR {moveInPreview.toLocaleString()}
              </span>
            )}
          </div>
          <button
            className="card-cta"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClick();
            }}
          >
            View Details →
          </button>
        </div>
      </div>
    </div>
  );
}
