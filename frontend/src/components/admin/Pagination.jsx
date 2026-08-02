import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ paginaActual, totalPaginas, onPageChange }) {
  const getPaginas = () => {
    const pages = [];
    const mostrar = 5;
    let inicio = Math.max(1, paginaActual - Math.floor(mostrar / 2));
    let fin = Math.min(totalPaginas, inicio + mostrar - 1);

    if (fin - inicio + 1 < mostrar) {
      inicio = Math.max(1, fin - mostrar + 1);
    }

    for (let i = inicio; i <= fin; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
        Página {paginaActual} de {totalPaginas}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(paginaActual - 1)}
          disabled={paginaActual === 1}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-dark-border dark:hover:text-dark-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        {getPaginas().map((pag) => (
          <button
            key={pag}
            onClick={() => onPageChange(pag)}
            className={`
              min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-all duration-150
              ${
                pag === paginaActual
                  ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm"
                  : "text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-border"
              }
            `}
          >
            {pag}
          </button>
        ))}
        <button
          onClick={() => onPageChange(paginaActual + 1)}
          disabled={paginaActual === totalPaginas}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-dark-border dark:hover:text-dark-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
