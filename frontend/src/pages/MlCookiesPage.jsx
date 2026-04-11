import { Navigate } from "react-router-dom";

export default function MlCookiesPage() {
  return <Navigate to="/settings?tab=cookies" replace />;
}
