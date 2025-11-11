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

  const submit = async (e)=>{
    e.preventDefault();
    try{
      const { data } = await api.post("/auth/login", { tpin, password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      location.href="/";
    }catch(err){
      setError(err?.response?.data?.error || "Login failed");
    }
  };

  return (
    <div style={{maxWidth:420, margin:"60px auto"}}>
      <Card title="Sign in">
        <form onSubmit={submit} className="grid" style={{gap:14}}>
          <Field label="TPIN">
            <input value={tpin} onChange={e=>setTpin(e.target.value)} placeholder="Your TPIN"/>
          </Field>
          <Field label="Password">
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password"/>
          </Field>
          {error && <div className="badge err">{error}</div>}
          <Button>Continue</Button>
        </form>
      </Card>
    </div>
  );
}
