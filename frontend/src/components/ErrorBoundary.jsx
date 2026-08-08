import React from "react";

/**
 * ErrorBoundary global: captura errores de renderizado de React para evitar
 * la pantalla en blanco y mostrar un mensaje claro con el error real.
 * En desarrollo, el detalle completo se imprime en la consola.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Registrar el error completo para diagnóstico
    console.error("[ErrorBoundary] Error capturado:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, info } = this.state;
      const message = error?.message || String(error || "Error desconocido");
      const stack = error?.stack || "";
      const componentStack = info?.componentStack || "";

      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8f8f8", padding: "24px" }}>
          <div style={{ maxWidth: "640px", width: "100%", backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", padding: "32px", fontFamily: "system-ui, sans-serif" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>⚠️</div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px 0" }}>
              Algo salió mal al cargar la página
            </h1>
            <p style={{ color: "#555", margin: "0 0 16px 0", fontSize: "14px", lineHeight: 1.5 }}>
              Ocurrió un error durante el renderizado. El detalle a continuación ayuda a diagnosticar el problema.
            </p>
            <pre style={{ backgroundColor: "#f4f4f5", padding: "16px", borderRadius: "8px", fontSize: "12px", color: "#b91c1c", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: "240px", overflow: "auto" }}>
              {message}
              {stack ? `\n\n${stack}` : ""}
              {componentStack ? `\n\nComponent stack:\n${componentStack}` : ""}
            </pre>
            <button
              onClick={this.handleReload}
              style={{ marginTop: "16px", padding: "10px 20px", backgroundColor: "#e11d48", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
