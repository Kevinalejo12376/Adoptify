import React from "react";
import { useAuth } from "../../context/AuthContext";
import GestionUsuarios from "./components/GestionUsuarios";

const ADMIN_PRINCIPAL_EMAIL = "adoptifyoficial@gmail.com";

export default function AdminAdministradores() {
  const { user } = useAuth();
  const userEmail = user?.email || "";
  const esAdminPrincipal = userEmail === ADMIN_PRINCIPAL_EMAIL;

  return (
    <GestionUsuarios
      titulo="Gestión de Administradores"
      descripcion={esAdminPrincipal
        ? "Crea y administra las cuentas de administrador de la plataforma"
        : "Visualiza la información de los administradores del sistema"
      }
      rolCrear="administrador"
      rolesFiltro={["administrador", "administrador_principal"]}
      emptyMessage="No hay administradores registrados"
      esAdminPrincipal={esAdminPrincipal}
      soloVisualizacion={!esAdminPrincipal}
    />
  );
}
