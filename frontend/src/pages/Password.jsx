// src/pages/Password.jsx
import { useMemo, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import Section from "../components/Section";
import { Field } from "../components/Field";
import Button from "../components/Button";
import "../styles/pages/password.css";

export default function Password(){
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNewPw] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCon, setShowCon] = useState(false);

  const strength = useMemo(()=>{
    let score = 0;
    if(newPassword.length >= 8) score++;
    if(/[A-Z]/.test(newPassword)) score++;
    if(/[a-z]/.test(newPassword)) score++;
    if(/\d/.test(newPassword)) score++;
    if(/[^A-Za-z0-9]/.test(newPassword)) score++;
    return score; // 0..5
  },[newPassword]);

  const strengthLabel = ["Too short","Weak","Fair","Good","Strong","Very strong"][strength];
  const canSubmit = currentPassword && newPassword.length >= 8 && newPassword === confirmPassword && !loading;

  const submit = async (e)=>{
    e.preventDefault();
    setMsg(""); setErr("");
    if(newPassword.length < 8){ setErr("New password must be at least 8 characters."); return; }
    if(newPassword !== confirmPassword){ setErr("Passwords do not match."); return; }
    setLoading(true);
    try{
      await api.patch("/account/password", { currentPassword, newPassword, confirmPassword });
      setMsg("Password updated.");
      setCurrent(""); setNewPw(""); setConfirm("");
    }catch(ex){
      setErr(ex?.response?.data?.error || "Failed to update password.");
    }finally{
      setLoading(false);
    }
  };

  return (
    <div className="page page-password">
      <PageHeader title="Change Password" />

      <Section>
        <form onSubmit={submit} className="password-compact">
          {/* Current */}
          <Field label="Current password">
            <div className="input-with-action">
              <input
                type={showCur ? "text" : "password"}
                value={currentPassword}
                onChange={e=>setCurrent(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button type="button" className="ghost-mini" onClick={()=>setShowCur(s=>!s)}>
                {showCur ? "Hide" : "Show"}
              </button>
            </div>
          </Field>

          {/* New */}
          <Field label="New password">
            <div className="input-with-action">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={e=>setNewPw(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              <button type="button" className="ghost-mini" onClick={()=>setShowNew(s=>!s)}>
                {showNew ? "Hide" : "Show"}
              </button>
            </div>
          </Field>

          {/* Strength */}
          <div className="strength-row">
            <div className={`strength-bar s${strength}`} aria-hidden />
            <div className="subtle">{strengthLabel}</div>
          </div>

          {/* Confirm */}
          <Field label="Confirm new password">
            <div className="input-with-action">
              <input
                type={showCon ? "text" : "password"}
                value={confirmPassword}
                onChange={e=>setConfirm(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
              <button type="button" className="ghost-mini" onClick={()=>setShowCon(s=>!s)}>
                {showCon ? "Hide" : "Show"}
              </button>
            </div>
          </Field>

          {/* Actions / feedback */}
          <div className="actions">
            <Button className="btn btn-primary" disabled={!canSubmit}>
              {loading ? "Updating…" : "Update Password"}
            </Button>
            <div className="subtle hint">Tip: use a mix of upper/lowercase, numbers, and symbols.</div>
          </div>

          {err && <div className="badge err full">{err}</div>}
          {msg && <div className="badge ok full">{msg}</div>}
        </form>
      </Section>
    </div>
  );
}
