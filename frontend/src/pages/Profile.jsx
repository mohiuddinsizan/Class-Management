// src/pages/Profile.jsx
import { useEffect, useState } from "react";
import api from "../api";
import Card from "../components/Card";

export default function Profile(){
  const [me, setMe] = useState(null);
  useEffect(()=>{ api.get("/profile/me").then(r=>setMe(r.data)); },[]);
  if(!me) return null;
  return (
    <Card title="My Profile">
      <div className="grid grid-3">
        <div className="badge">Name: {me.name}</div>
        <div className="badge">TPIN: {me.tpin}</div>
        <div className="badge">Role: {me.role}</div>
      </div>
      <div className="hr"/>
      <div className="row">
        <div className="badge ok">Completed Classes: {me.totals.totalCompleted}</div>
        <div className="badge warn">Remaining Balance: {me.totals.remainingBalance}</div>
      </div>
    </Card>
  );
}
