export default function Stars({ rating = 0 }) {
  const num = Number(rating || 0);
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (num >= i) {
      stars.push("★");
    } else if (num >= i - 0.5) {
      stars.push("★");
    } else {
      stars.push("☆");
    }
  }

  return (
    <span className="stars" aria-label={`${num} out of 5 stars`} style={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
      {stars.map((star, idx) => (
        <span
          key={idx}
          style={{
            color: star === "★" ? "#f59e0b" : "#d1d5db",
            fontSize: "14px",
            lineHeight: 1,
          }}
        >
          {star}
        </span>
      ))}
    </span>
  );
}
