export default function OwnerReviewsTab({
  trustSummary, reviews, formatDisplayDate, handleReviewModeration
}) {
  return (
    <>
      <>
            <div className="form-section">
              <div className="form-section-title">Review Summary</div>
              {trustSummary?.hostel_review_summary?.length ? (
                trustSummary.hostel_review_summary.map((item) => (
                  <div key={item.hostel_id} style={{ border: "1px solid var(--cream-dark)", borderRadius: 10, padding: 14, marginBottom: 10, background: "white" }}>
                    <div style={{ fontWeight: 700 }}>{item.hostel_name}</div>
                    <div style={{ marginTop: 6, fontSize: 13, color: "var(--warm-gray)" }}>
                      Reviews: {item.reviews_count} | Average Rating: {item.average_rating ?? "Not enough data"} | Open Complaints: {item.open_complaints}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No published reviews yet.</p>
              )}
            </div>

            <div className="form-section">
              <div className="form-section-title">Review Replies</div>
              {reviews.length === 0 && <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No reviews yet.</p>}
              {reviews.map((review) => (
                <div key={review.id} style={{ border: "1px solid var(--cream-dark)", borderRadius: 10, padding: 14, marginBottom: 10, background: "white" }}>
                  <div style={{ fontWeight: 700 }}>{review.hostel_name}</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "var(--warm-gray)" }}>
                    {review.student_name} | Avg Rating: {review.average_rating} | Status: {review.status}
                  </div>
                  {review.text && <div style={{ marginTop: 8, fontSize: 13 }}>{review.text}</div>}
                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    <textarea
                      className="form-textarea"
                      value={ownerReplies[review.id] ?? review.owner_reply ?? ""}
                      onChange={(event) => setOwnerReplies({ ...ownerReplies, [review.id]: event.target.value })}
                    />
                    <button className="submit-btn" onClick={() => handleOwnerReply(review.id)}>Save Reply</button>
                  </div>
                </div>
              ))}
            </div>
          </>
    </>
  );
}
