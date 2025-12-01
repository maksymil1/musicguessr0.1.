import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return null; // Lub spinner

  // Jeśli brak usera -> idź do logowania
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
