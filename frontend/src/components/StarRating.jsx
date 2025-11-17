import "../styles/pages/star-rating.css";

export default function StarRating({
  value = 0,
  max = 5,
  size = 20,
  showValue = false,
}) {
  const safe = Math.max(0, Math.min(value, max));
  const pct = (safe / max) * 100;

  return (
    <div
      className="star-rating"
      style={{ "--star-size": `${size}px` }}
      aria-label={`Rating: ${safe.toFixed(1)} out of ${max}`}
    >
      <div className="star-rating-inner">
        <div className="stars-bg">★★★★★</div>
        <div className="stars-fill" style={{ width: `${pct}%` }}>
          ★★★★★
        </div>
      </div>
      {showValue && (
        <span className="star-value">{safe.toFixed(1)}</span>
      )}
    </div>
  );
}
