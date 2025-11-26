import { useEffect, useState } from "react";
import api from "../api";
import Card from "../components/Card";
import StarRating from "../components/StarRating";

export default function Profile() {
  const [me, setMe] = useState(null);

  useEffect(() => {
    api.get("/profile/me").then((r) => setMe(r.data));
  }, []);

  if (!me) return null;

  const isEditor = me.role === "editor";
  const isTeacherOrAdmin = me.role === "teacher" || me.role === "admin";

  const summary = me.ratingSummary;
  const history = me.ratingHistory || [];

  const totals = me.totals || {};

  return (
    <Card title="My Profile">
      <div className="grid grid-3">
        <div className="badge">Name: {me.name}</div>
        <div className="badge">TPIN: {me.tpin}</div>
        <div className="badge">Role: {me.role}</div>
      </div>

      <div className="hr" />

      {/* EDITOR VIEW: uploaded / approved / remaining */}
      {isEditor && (
        <>
          <div className="row">
            <div className="badge ok">
              Uploaded Classes: {totals.totalUploaded ?? 0}
            </div>
            <div className="badge ok">
              Approved: {totals.totalApproved ?? 0}
            </div>
            <div className="badge warn">
              Remaining Balance: {totals.remainingBalance ?? 0}
            </div>
          </div>
          <div className="hr" />
        </>
      )}

      {/* TEACHER/ADMIN VIEW: completed + remaining */}
      {isTeacherOrAdmin && (
        <>
          <div className="row">
            <div className="badge ok">
              Completed Classes: {totals.totalCompleted ?? 0}
            </div>
            <div className="badge warn">
              Remaining Balance: {totals.remainingBalance ?? 0}
            </div>
          </div>
          <div className="hr" />
        </>
      )}

      {/* Rating summary (everyone) */}
      <div
        className="row"
        style={{ alignItems: "center", gap: "12px" }}
      >
        <span className="badge">Rating:</span>
        {summary ? (
          <>
            <StarRating value={summary.average} showValue />
            <span className="badge subtle">
              ({summary.count} rating
              {summary.count > 1 ? "s" : ""})
            </span>
          </>
        ) : (
          <span className="badge subtle">No ratings yet</span>
        )}
      </div>

      {/* Rating history */}
      {history.length > 0 && (
        <>
          <div className="hr" />
          <div>
            <h4 style={{ marginBottom: "8px" }}>
              Rating History
            </h4>
            <div className="rating-history">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="rating-note"
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    marginBottom: "6px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "4px",
                    }}
                  >
                    <StarRating
                      value={item.score}
                      size={16}
                    />
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#6b7280",
                      }}
                    >
                      {new Date(
                        item.createdAt
                      ).toLocaleString()}
                    </span>
                  </div>
                  {item.comment && (
                    <div
                      style={{
                        fontSize: "13px",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {item.comment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
