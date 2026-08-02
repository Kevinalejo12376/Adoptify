import React, { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, SlidersHorizontal } from "lucide-react";
import Badge from "./Badge";
import Pagination from "./Pagination";
import EmptyState from "./EmptyState";

export default function DataTable({
  columnas,
  datos,
  buscador = true,
  placeholder = "Buscar...",
  filtros: FiltrosComponent,
  accionFila,
  paginaActual: paginaExterna,
  totalPaginas: totalExterno,
  onPageChange,
  itemsPerPage = 10,
  cargando = false,
  emptyMessage = "No se encontraron resultados",
  emptyIcon,
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [busqueda, setBusqueda] = useState("");
  const [paginaInterna, setPaginaInterna] = useState(1);

  const esControlado = paginaExterna !== undefined;
  const pagina = esControlado ? paginaExterna : paginaInterna;

  const manejarSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const datosFiltrados = useMemo(() => {
    let filtrados = [...datos];

    // Búsqueda
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase();
      filtrados = filtrados.filter((fila) =>
        columnas.some((col) => {
          const valor = col.acceso ? col.acceso(fila) : fila[col.key];
          return String(valor || "").toLowerCase().includes(termino);
        })
      );
    }

    // Ordenamiento
    if (sortConfig.key) {
      filtrados.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtrados;
  }, [datos, busqueda, sortConfig, columnas]);

  const totalPaginas = esControlado
    ? totalExterno
    : Math.ceil(datosFiltrados.length / itemsPerPage);

  const datosPagina = esControlado
    ? datosFiltrados
    : datosFiltrados.slice((pagina - 1) * itemsPerPage, pagina * itemsPerPage);

  const manejarPageChange = (nuevaPagina) => {
    if (esControlado) {
      onPageChange(nuevaPagina);
    } else {
      setPaginaInterna(nuevaPagina);
    }
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ChevronsUpDown size={14} className="text-gray-400" />;
    return sortConfig.direction === "asc" ? (
      <ChevronUp size={14} className="text-rose-500" />
    ) : (
      <ChevronDown size={14} className="text-rose-500" />
    );
  };

  const renderCellValue = (col, fila) => {
    const valor = col.acceso ? col.acceso(fila) : fila[col.key];

    if (col.tipo === "badge") {
      return <Badge estado={valor} variant={col.variant ? col.variant(valor, fila) : undefined} />;
    }

    if (col.tipo === "avatar") {
      return (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center text-xs font-bold text-rose-600 dark:text-rose-400">
            {col.nombreAvatar ? col.nombreAvatar(fila) : (fila.nombre?.[0] || "?")}
          </div>
          <span className="font-medium text-gray-900 dark:text-dark-text text-sm">{valor}</span>
        </div>
      );
    }

    if (col.tipo === "moneda") {
      return (
        <span className="font-medium text-gray-900 dark:text-dark-text">
          ${typeof valor === "number" ? valor.toLocaleString("es-CO") : valor}
        </span>
      );
    }

    if (col.tipo === "fecha") {
      return (
        <span className="text-sm text-gray-500 dark:text-dark-text-secondary">
          {new Date(valor).toLocaleDateString("es-CO", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      );
    }

    if (col.tipo === "render") {
      return col.render ? col.render(valor, fila) : valor;
    }

    return <span className="text-sm text-gray-700 dark:text-dark-text">{valor || "-"}</span>;
  };

  if (cargando) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-8">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-dark-border rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden shadow-sm">
      {/* Header con buscador y filtros */}
      {(buscador || FiltrosComponent) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-dark-border">
          {buscador && (
            <div className="relative flex-1 max-w-xs w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={placeholder}
                value={busqueda}
                onChange={(e) => { setBusqueda(e.target.value); setPaginaInterna(1); }}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
            </div>
          )}
          {FiltrosComponent && <FiltrosComponent />}
        </div>
      )}

      {/* Tabla */}
      {datosPagina.length === 0 ? (
        <EmptyState mensaje={emptyMessage} icono={emptyIcon} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-dark-border">
                {columnas.map((col, idx) => (
                  <th
                    key={col.key || idx}
                    className={`
                      px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider
                      ${col.ordenable !== false ? "cursor-pointer select-none hover:text-gray-700 dark:hover:text-dark-text" : ""}
                      ${col.className || ""}
                    `}
                    onClick={() => col.ordenable !== false && manejarSort(col.key)}
                    style={col.width ? { width: col.width } : {}}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.titulo}
                      {col.ordenable !== false && getSortIcon(col.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-dark-border">
              {datosPagina.map((fila, idx) => (
                <tr
                  key={fila.id || idx}
                  onClick={() => accionFila?.(fila)}
                  className={`
                    transition-colors duration-150
                    ${accionFila ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-bg/50" : ""}
                  `}
                >
                  {columnas.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      className={`px-4 py-3 text-sm ${col.cellClassName || ""}`}
                    >
                      {renderCellValue(col, fila)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="border-t border-gray-100 dark:border-dark-border px-4 py-3">
          <Pagination
            paginaActual={pagina}
            totalPaginas={totalPaginas}
            onPageChange={manejarPageChange}
          />
        </div>
      )}
    </div>
  );
}
