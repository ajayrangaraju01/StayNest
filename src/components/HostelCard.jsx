import Stars from "./Stars";

export default function HostelCard({ hostel, onClick }) {
  const minPrice = Math.min(...hostel.rooms.map((room) => room.price));

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
        <div className="card-footer">
          <div className="card-price">
            Starting from
            <strong>
              INR
              {" "}
              {minPrice.toLocaleString()}
            </strong>
            /month
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
