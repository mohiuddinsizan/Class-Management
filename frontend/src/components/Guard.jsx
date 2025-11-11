// src/components/Guard.jsx
import { Navigate } from "react-router-dom";
export function Protected({ roles, children }){
  const user = JSON.parse(localStorage.getItem("user")||"null");
  if(!user) return <Navigate to="/login" replace />;
  if(roles && !roles.includes(user.role)) return <Navigate to="/" replace/>;
  return children;
}
