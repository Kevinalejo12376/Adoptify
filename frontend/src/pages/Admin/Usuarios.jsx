import React from "react";
import GestionUsuarios from "./components/GestionUsuarios";

export default function AdminUsuarios() {
  return (
    <GestionUsuarios
      titulo="Gestión de Usuarios"
      descripcion="Crea y administra los usuarios registrados en la plataforma"
      rolCrear="usuario"
      rolesFiltro={["usuario"]}
      emptyMessage="No hay usuarios registrados"
    />
  );
}
