// src/pages/AdminRatings.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import Card from "../components/Card";
import Button from "../components/Button";
import StarRating from "../components/StarRating";

export default function AdminRatings() {
  const [tpin, setTpin] = useState("");
  const [block, setBlock] = useState(null);

  const [score, setScore] = useState(""); // empty until admin types
  const [comment, setComment] = useState("");

  const [loadingUserRatings, setLoadingUserRatings] = useState(false);
  const [saving, setSaving] = useState(false);

  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");

  /* ---------------------- Load ALL users once ---------------------- */
  useEffect(() => {
    api
      .get("/users") // all roles
      .then((r) => setUsers(r.data || []))
      .catch(() => setUsers([]));
  }, []);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.trim().toLowerCase();
    return users.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.tpin || "").toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const notes = block?.notes || [];
  const stats = useMemo(() => {
    if (!notes.length) return null;
    const total = notes.reduce((s, n) => s + (Number(n.score) || 0), 0);
    const avg = total / notes.length;
    return {
      average: avg,
      latest: notes[0].score,
      count: notes.length,
    };
  }, [notes]);

  const numericScore = score === "" ? 0 : Number(score) || 0;

  /* ---------------------- Load rating by TPIN ---------------------- */
  const loadByTpin = async (tpinValue) => {
    const raw = String(tpinValue ?? tpin).trim();
    if (!raw) return;
    setLoadingUserRatings(true);
    try {
      const r = await api.get(`/ratings/${encodeURIComponent(raw)}`);
      setBlock(r.data);
      setTpin(raw);
      setScore("");
      setComment("");
    } catch (e) {
      setBlock(null);
      alert("User not found or error while loading ratings.");
    } finally {
      setLoadingUserRatings(false);
    }
  };

  /* ---------------------- Save rating/comment ---------------------- */
  const addRating = async () => {
    const cleanTpin = tpin.trim();
    if (!cleanTpin) {
      alert("Select a user from the left or enter TPIN first.");
      return;
    }
    if (score === "") {
      alert("Please enter a rating score (0–5).");
      return;
    }

    setSaving(true);
    try {
      await api.post("/ratings", {
        tpin: cleanTpin,
        score: Number(score),
        comment,
      });
      setComment("");
      setScore("");
      await loadByTpin(cleanTpin);
    } finally {
      setSaving(false);
    }
  };

  /* ============================== UI ============================== */

  return (
    <Card title="User Ratings (Admin)">
      {/* Top meta row */}
      <div
        className="row"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--sp-4)",
          gap: "var(--sp-3)",
          flexWrap: "wrap",
        }}
      >
        <div className="subtle">
          Maintain performance notes and rating history for every user.
        </div>
        <div className="badge">Total users: {users.length || 0}</div>
      </div>

      {/* Responsive layout: 2 columns on desktop, 1 on mobile (via .grid-2 CSS) */}
      <div className="grid grid-2" style={{ gap: "var(--sp-4)" }}>
        {/* LEFT: User list + search */}
        <div
          style={{
            background: "#0d1230",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            padding: "var(--sp-4)",
            display: "flex",
            flexDirection: "column",
            maxHeight: 420,
          }}
        >
          <div
            className="row"
            style={{
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "var(--sp-3)",
              gap: "var(--sp-2)",
            }}
          >
            <div className="h3">Users</div>
            <div className="subtle" style={{ fontSize: "var(--fs-12)" }}>
              Tap a user to view / edit ratings
            </div>
          </div>

          <input
            placeholder="Search by name or TPIN"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            style={{ marginBottom: "var(--sp-3)" }}
          />

          <div
            style={{
              flex: 1,
              overflow: "auto",
              paddingRight: 4,
            }}
          >
            {filteredUsers.length === 0 ? (
              <div className="subtle" style={{ fontSize: "var(--fs-13)" }}>
                No users match this search.
              </div>
            ) : (
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "grid",
                  gap: "6px",
                }}
              >
                {filteredUsers.map((u) => {
                  const active = block?.user?.tpin === u.tpin;
                  return (
                    <li key={u._id}>
                      <button
                        type="button"
                        onClick={() => loadByTpin(u.tpin)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          borderRadius: 10,
                          border: `1px solid ${
                            active ? "var(--primary)" : "var(--border)"
                          }`,
                          background: active
                            ? "linear-gradient(135deg, rgba(108,123,255,.22), #0f1432)"
                            : "#0b0f29",
                          padding: "8px 10px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "var(--fs-14)",
                            fontWeight: 600,
                            color: "#e5e7ff",
                          }}
                        >
                          {u.name}
                        </span>
                        <span
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "var(--fs-12)",
                            color: "var(--muted)",
                          }}
                        >
                          <span>TPIN: {u.tpin}</span>
                          <span
                            style={{
                              textTransform: "capitalize",
                              opacity: 0.9,
                            }}
                          >
                            {u.role}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* RIGHT: Rating editor + history */}
        <div
          style={{
            background: "#0d1230",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            padding: "var(--sp-5)",
            minHeight: 260,
            display: "flex",
            flexDirection: "column",
            gap: "var(--sp-4)",
          }}
        >
          {/* TPIN + Load row */}
          <div
            className="row"
            style={{
              gap: "var(--sp-3)",
              alignItems: "flex-end", // 👈 aligns input + button bottoms
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <label
                className="subtle"
                style={{ display: "block", marginBottom: 4 }}
              >
                TPIN
              </label>
              <input
                placeholder="Type TPIN and press Load"
                value={tpin}
                onChange={(e) => setTpin(e.target.value)}
              />
            </div>
            <div>
              <Button
                onClick={() => loadByTpin()}
                disabled={loadingUserRatings}
              >
                {loadingUserRatings ? "Loading..." : "Load"}
              </Button>
            </div>
          </div>

          {!block ? (
            <div className="subtle" style={{ fontSize: "var(--fs-14)" }}>
              Select a user from the left or load by TPIN to start adding
              rating comments.
            </div>
          ) : (
            <>
              {/* Header for selected user */}
              <div
                className="row"
                style={{
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "var(--sp-3)",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "var(--fs-18)",
                      fontWeight: 700,
                      marginBottom: 2,
                    }}
                  >
                    {block.user.name}
                  </div>
                  <div className="subtle" style={{ fontSize: "var(--fs-13)" }}>
                    TPIN {block.user.tpin} ·{" "}
                    <span style={{ textTransform: "capitalize" }}>
                      {block.user.role}
                    </span>
                  </div>
                </div>
                <div
                  className="row"
                  style={{
                    gap: "6px",
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  {stats ? (
                    <>
                      <span className="badge">
                        Avg: {stats.average.toFixed(2)}
                      </span>
                      <span className="badge">
                        Latest: {stats.latest.toFixed(1)}
                      </span>
                      <span className="badge">Entries: {stats.count}</span>
                    </>
                  ) : (
                    <span className="badge subtle">No ratings yet</span>
                  )}
                </div>
              </div>

              <div className="hr" />

              {/* New rating editor */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                <div className="h3">Add Rating Comment</div>

                <div
                  className="row"
                  style={{
                    alignItems: "center",
                    gap: "var(--sp-4)",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    <StarRating value={numericScore} size={22} showValue />
                  </div>
                  <div style={{ maxWidth: 160, width: "100%" }}>
                    <label
                      className="subtle"
                      style={{ display: "block", marginBottom: 4 }}
                    >
                      Score (0–5)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      placeholder="e.g. 4.5"
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="subtle"
                    style={{ display: "block", marginBottom: 4 }}
                  >
                    Comment
                  </label>
                  <textarea
                    rows={3}
                    style={{ width: "100%", resize: "vertical" }}
                    placeholder="Internal note: performance, behavior, improvements, etc."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <Button onClick={addRating} disabled={saving}>
                    {saving ? "Saving..." : "Save Rating & Comment"}
                  </Button>
                </div>
              </div>

              <div className="hr" />

              {/* History */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                <div className="h3">History (Newest first)</div>
                {notes.length === 0 ? (
                  <div className="subtle">No ratings yet.</div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: "var(--sp-2)",
                      maxHeight: 220,
                      overflow: "auto",
                      paddingRight: 4,
                    }}
                  >
                    {notes.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background:
                            "linear-gradient(135deg,#0f1430,#090d24)",
                          padding: "10px 12px",
                        }}
                      >
                        <div
                          className="row"
                          style={{
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 4,
                            gap: "var(--sp-2)",
                          }}
                        >
                          <StarRating value={n.score} size={16} />
                          <span
                            style={{
                              fontSize: "var(--fs-12)",
                              color: "var(--muted)",
                            }}
                          >
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {n.comment && (
                          <div
                            style={{
                              fontSize: "var(--fs-14)",
                              whiteSpace: "pre-wrap",
                              marginBottom: 4,
                            }}
                          >
                            {n.comment}
                          </div>
                        )}
                        {n.createdBy && (
                          <div
                            style={{
                              fontSize: "var(--fs-12)",
                              color: "#7b86c9",
                              textAlign: "right",
                            }}
                          >
                            by {n.createdBy.name} ({n.createdBy.tpin})
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
