// src/hooks/useAuth.js
import { useEffect, useState } from "react";
export default function useAuth(){
  const [user, setUser] = useState(()=>JSON.parse(localStorage.getItem("user")||"null"));
  useEffect(()=>{ if(user) localStorage.setItem("user", JSON.stringify(user)); },[user]);
  return { user, setUser };
}
