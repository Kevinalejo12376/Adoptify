import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.rol !== "administrador_principal" && user.rol !== "administrador")) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
