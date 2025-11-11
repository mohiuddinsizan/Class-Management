// src/pages/Login.jsx
import { useState } from "react";
import api from "../api";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field } from "../components/Field";

export default function Login({ setUser }){
  const [tpin, setTpin] = useState("447");
  const [password, setPassword] = useState("87654321");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e)=>{
    e.preventDefault();
    if (loading) return; // prevent double submit
    setError("");
    setLoading(true);
    try{
      const { data } = await api.post("/auth/login", { tpin, password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      location.href="/";
    }catch(err){
      setError(err?.response?.data?.error || "Login failed");
    }finally{
      setLoading(false);
    }
  };

  return (
    <div style={{maxWidth:420, margin:"60px auto"}}>
      <Card title="Sign in">
        {/* thin top progress bar while loading */}
        {loading && (
          <div
            aria-hidden="true"
            style={{
              height: 3,
              margin: "-8px 0 12px",
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.06) 100%)",
              backgroundSize: "200% 100%",
              animation: "loginProgress 1s linear infinite"
            }}
          />
        )}

        <form onSubmit={submit} className="grid" style={{gap:14}} aria-busy={loading}>
          <Field label="TPIN">
            <input
              value={tpin}
              onChange={e=>setTpin(e.target.value)}
              placeholder="Your TPIN"
              disabled={loading}
              autoComplete="username"
              inputMode="numeric"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              placeholder="Password"
              disabled={loading}
              autoComplete="current-password"
            />
          </Field>

          {error && <div className="badge err" role="alert">{error}</div>}

          <Button disabled={loading} aria-live="polite">
            {loading ? (
              <span style={{display:"inline-flex", alignItems:"center", gap:8}}>
                {/* inline SVG spinner */}
                <svg
                  width="18" height="18" viewBox="0 0 24 24"
                  role="img" aria-label="Loading"
                  style={{animation:"spin 1s linear infinite"}}
                >
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.2"/>
                  <path d="M22 12a10 10 0 0 0-10-10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Signing you in…
              </span>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      </Card>

      {/* keyframes inline to avoid touching global CSS */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes loginProgress { to { background-position: -200% 0; } }
      `}</style>
    </div>
  );
}
