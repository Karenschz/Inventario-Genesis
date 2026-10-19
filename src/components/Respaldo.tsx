import { useState } from "react";
import { useApp } from "../context";
import {
  dbExportarRespaldo,
  dbExportarTablaCSV,
  type BackupTableName,
} from "../lib/supabaseService";

const tablas: { id: BackupTableName; nombre: string }[] = [
  { id: "sucursales", nombre: "Sucursales" },
  { id: "categorias_repuestos", nombre: "Categorías de repuestos" },
  { id: "proveedores", nombre: "Proveedores" },
  { id: "usuarios", nombre: "Usuarios (sin contraseñas)" },
  { id: "repuestos", nombre: "Repuestos" },
  { id: "inventario_repuestos", nombre: "Inventario de repuestos" },
  { id: "herramientas", nombre: "Herramientas" },
  { id: "movimientos_kardex", nombre: "Movimientos / Kardex" },
];

function descargarArchivo(contenido: string, tipo: string, nombre: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const link = document.createElement("a");
  link.href = url;
  link.download = nombre;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function Respaldo() {
  const { usuarioActual } = useApp();
  const [tablaSeleccionada, setTablaSeleccionada] = useState<BackupTableName>("repuestos");
  const [generando, setGenerando] = useState<"sql" | "csv" | null>(null);
  const [estado, setEstado] = useState("");
  const fecha = new Date().toISOString().slice(0, 10);

  if (usuarioActual?.rol !== "gerente") return null;

  const crearRespaldoSQL = async () => {
    setGenerando("sql");
    setEstado("");
    try {
      const contenido = await dbExportarRespaldo();
      descargarArchivo(contenido, "application/sql;charset=utf-8", `respaldo-genesis-${fecha}.sql`);
      setEstado("Respaldo SQL descargado. Las contraseñas fueron excluidas.");
    } catch (error) {
      setEstado(error instanceof Error ? error.message : "No se pudo generar el respaldo.");
    } finally {
      setGenerando(null);
    }
  };

  const crearCSV = async () => {
    setGenerando("csv");
    setEstado("");
    try {
      const contenido = await dbExportarTablaCSV(tablaSeleccionada);
      if (!contenido) {
        setEstado("La tabla seleccionada no tiene registros para exportar.");
        return;
      }
      descargarArchivo(`\uFEFF${contenido}`, "text/csv;charset=utf-8", `genesis-${tablaSeleccionada}-${fecha}.csv`);
      setEstado("Archivo CSV descargado. Puedes importarlo como una pestaña en Google Sheets.");
    } catch (error) {
      setEstado(error instanceof Error ? error.message : "No se pudo exportar la tabla.");
    } finally {
      setGenerando(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="font-display text-2xl text-[var(--foreground)]">Respaldo de datos</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Descarga una copia de la base de datos o prepara una tabla para editarla en Google Sheets.
          </p>
        </header>

        <section className="border-t border-[var(--border)] py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Respaldo completo</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Archivo SQL con los datos de las ocho tablas, sin contraseñas.
              </p>
            </div>
            <button
              type="button"
              onClick={crearRespaldoSQL}
              disabled={generando !== null}
              className="btn-primary shrink-0 disabled:opacity-60"
            >
              {generando === "sql" ? "Generando..." : "Descargar respaldo SQL"}
            </button>
          </div>
        </section>

        <section className="border-t border-[var(--border)] py-6">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Hoja editable para Google Sheets</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1 max-w-2xl">
            Exporta una tabla como CSV y ábrela en Google Sheets. Para trabajar con varias tablas, importa cada CSV como una pestaña.
          </p>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-end gap-3">
            <label className="flex flex-col gap-1.5 text-sm text-[var(--foreground)]">
              Tabla de la base de datos
              <select
                value={tablaSeleccionada}
                onChange={(event) => setTablaSeleccionada(event.target.value as BackupTableName)}
                disabled={generando !== null}
                className="min-w-64 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)]"
              >
                {tablas.map((tabla) => (
                  <option key={tabla.id} value={tabla.id}>{tabla.nombre}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={crearCSV}
              disabled={generando !== null}
              className="btn-secondary disabled:opacity-60"
            >
              {generando === "csv" ? "Preparando hoja..." : "Descargar CSV editable"}
            </button>
          </div>

          <p className="text-xs text-[var(--muted-foreground)] mt-4 max-w-2xl">
            Los archivos se descargan en tu equipo; impórtalos en Google Sheets para editarlos. Los cambios en la hoja no modifican automáticamente la base de datos.
          </p>
        </section>

        {estado && (
          <p role="status" aria-live="polite" className="border-t border-[var(--border)] py-4 text-sm text-[var(--muted-foreground)]">
            {estado}
          </p>
        )}
      </div>
    </div>
  );
}