import { useState } from "react";
import { useApp } from "../context";
import { SUCURSALES } from "../data";
import type { Sucursal } from "../types";
import jsPDF from "jspdf";

// ─── PDF Generation Helper ────────────────────────────────────────────────────

function generarReportePDF(
  sucursalFiltro: "todas" | Sucursal,
  movimientos: ReturnType<typeof useApp>["movimientos"],
  repuestos: ReturnType<typeof useApp>["repuestos"]
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const colW = pageW - margin * 2;
  let y = 0;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const fmt$ = (n: number) =>
    "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const checkPage = (needed = 8) => {
    if (y + needed > pageH - 14) {
      doc.addPage();
      y = 18;
    }
  };

  const drawHLine = (lw = 0.2, color: [number, number, number] = [60, 60, 80]) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(lw);
    doc.line(margin, y, margin + colW, y);
  };

  // ── Semana actual (lunes→domingo) ────────────────────────────────────────────
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=domingo
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const fmtDate = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

  const semanaLabel = `${fmtDate(monday)} – ${fmtDate(sunday)}`;

  // Filtrar movimientos de la semana (y por sucursal si se seleccionó una específica)
  const movsSemanales = movimientos.filter((m) => {
    const fecha = new Date(m.fecha.replace(" ", "T"));
    return (
      fecha >= monday &&
      fecha <= sunday &&
      (sucursalFiltro === "todas" || m.sucursal === sucursalFiltro)
    );
  });

  // Determinar sucursales a incluir en el reporte
  const sucursales: Sucursal[] =
    sucursalFiltro === "todas"
      ? ["sucursal1", "sucursal2"]
      : [sucursalFiltro];

  // ── ENCABEZADO ───────────────────────────────────────────────────────────────
  // Fondo negro sólido
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, pageW, 44, "F");

  // Franja amarilla izquierda
  doc.setFillColor(234, 179, 8); // yellow-500
  doc.rect(0, 0, 5, 44, "F");

  // Línea inferior amarilla
  doc.setDrawColor(234, 179, 8);
  doc.setLineWidth(0.6);
  doc.line(0, 44, pageW, 44);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(234, 179, 8);
  doc.text("REPORTE SEMANAL DE INVENTARIO", margin + 4, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(200, 200, 200);
  doc.text(`Semana: ${semanaLabel}`, margin + 4, 22);
  doc.text(
    `Generado: ${fmtDate(now)} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    margin + 4,
    29
  );
  const labelSucursalHeader =
    sucursalFiltro === "todas"
      ? "Todas las sucursales"
      : SUCURSALES[sucursalFiltro];
  doc.text(`Sucursal(es): ${labelSucursalHeader}`, margin + 4, 36);

  y = 52;

  // ── POR SUCURSAL ─────────────────────────────────────────────────────────────
  let grandTotalIngresado = 0;
  let grandTotalGastado = 0;

  for (const suc of sucursales) {
    const movsucursal = movsSemanales.filter((m) => m.sucursal === suc);
    const ventas = movsucursal.filter(
      (m) => m.tipo === "salida" && m.motivo === "Venta al mostrador"
    );
    const compras = movsucursal.filter(
      (m) => m.tipo === "entrada" && m.motivo === "Compra de proveedor"
    );

    checkPage(20);

    // Título de sucursal — negro con texto amarillo
    doc.setFillColor(10, 10, 10);
    doc.rect(margin, y, colW, 11, "F");
    doc.setFillColor(234, 179, 8);
    doc.rect(margin, y, 4, 11, "F");
    doc.setDrawColor(234, 179, 8);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, colW, 11);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(234, 179, 8);
    doc.text(SUCURSALES[suc].toUpperCase(), margin + 8, y + 7.2);
    y += 15;

    // ─── TABLA: REPUESTOS VENDIDOS ─────────────────────────────────────────────
    checkPage(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(180, 140, 0);
    doc.text("▶  REPUESTOS VENDIDOS", margin, y);
    y += 5;
    drawHLine(0.4, [180, 140, 0]);
    y += 2;

    // Header de tabla ventas
    const colsVentas = [
      { label: "Repuesto", x: margin, w: 72 },
      { label: "Cant.", x: margin + 74, w: 16, align: "right" as const },
      { label: "Precio unit.", x: margin + 92, w: 28, align: "right" as const },
      { label: "Subtotal", x: margin + 122, w: 28, align: "right" as const },
    ];

    checkPage(8);
    doc.setFillColor(20, 20, 20);
    doc.rect(margin, y, colW, 6.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(234, 179, 8);
    for (const c of colsVentas) {
      if (c.align === "right") {
        doc.text(c.label, c.x + c.w, y + 4.2, { align: "right" });
      } else {
        doc.text(c.label, c.x + 1, y + 4.2);
      }
    }
    y += 7.5;

    // Agrupar ventas por repuesto
    const ventasAgrupadas: Record<
      string,
      { nombre: string; cantidad: number; precioUnit: number; subtotal: number }
    > = {};
    for (const m of ventas) {
      const rep = repuestos.find((r) => r.id === m.repuestoId);
      const precioUnit = rep ? rep.precioVenta : 0;
      if (!ventasAgrupadas[m.repuestoNombre]) {
        ventasAgrupadas[m.repuestoNombre] = {
          nombre: m.repuestoNombre,
          cantidad: 0,
          precioUnit,
          subtotal: 0,
        };
      }
      ventasAgrupadas[m.repuestoNombre].cantidad += m.cantidad;
      ventasAgrupadas[m.repuestoNombre].subtotal += m.cantidad * precioUnit;
    }
    const ventasArr = Object.values(ventasAgrupadas);
    const totalIngresado = ventasArr.reduce((a, v) => a + v.subtotal, 0);
    grandTotalIngresado += totalIngresado;

    if (ventasArr.length === 0) {
      checkPage(8);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 150);
      doc.text("Sin ventas registradas esta semana.", margin + 2, y + 4);
      y += 8;
    } else {
      for (let i = 0; i < ventasArr.length; i++) {
        checkPage(7);
        const v = ventasArr[i];
        if (i % 2 === 0) {
          doc.setFillColor(245, 245, 245);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(margin, y, colW, 6.5, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(30, 30, 30);

        // Nombre truncado
        const nombre = v.nombre.length > 42 ? v.nombre.slice(0, 40) + "…" : v.nombre;
        doc.text(nombre, margin + 1, y + 4.3);
        doc.text(String(v.cantidad), colsVentas[1].x + colsVentas[1].w, y + 4.3, {
          align: "right",
        });
        doc.text(fmt$(v.precioUnit), colsVentas[2].x + colsVentas[2].w, y + 4.3, {
          align: "right",
        });
        doc.text(fmt$(v.subtotal), colsVentas[3].x + colsVentas[3].w, y + 4.3, {
          align: "right",
        });
        y += 6.5;
      }
      // Total ventas
      checkPage(8);
      doc.setFillColor(10, 10, 10);
      doc.rect(margin, y, colW, 8, "F");
      doc.setDrawColor(234, 179, 8);
      doc.setLineWidth(0.3);
      doc.rect(margin, y, colW, 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(234, 179, 8);
      doc.text("TOTAL INGRESADO", margin + 2, y + 5.3);
      doc.text(fmt$(totalIngresado), margin + colW - 1, y + 5.3, { align: "right" });
      y += 12;
    }

    // ─── TABLA: REPUESTOS COMPRADOS ────────────────────────────────────────────
    checkPage(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text("▶  REPUESTOS COMPRADOS (ENTRADAS)", margin, y);
    y += 5;
    drawHLine(0.4, [80, 80, 80]);
    y += 2;

    const colsCompras = [
      { label: "Repuesto", x: margin, w: 72 },
      { label: "Cant.", x: margin + 74, w: 16, align: "right" as const },
      { label: "Precio unit.", x: margin + 92, w: 28, align: "right" as const },
      { label: "Subtotal", x: margin + 122, w: 28, align: "right" as const },
    ];

    checkPage(8);
    doc.setFillColor(60, 60, 60);
    doc.rect(margin, y, colW, 6.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(230, 230, 230);
    for (const c of colsCompras) {
      if (c.align === "right") {
        doc.text(c.label, c.x + c.w, y + 4.2, { align: "right" });
      } else {
        doc.text(c.label, c.x + 1, y + 4.2);
      }
    }
    y += 7.5;

    // Agrupar compras por repuesto
    const comprasAgrupadas: Record<
      string,
      { nombre: string; cantidad: number; precioUnit: number; subtotal: number }
    > = {};
    for (const m of compras) {
      const rep = repuestos.find((r) => r.id === m.repuestoId);
      const precioUnit = rep ? rep.precioCompra : 0;
      if (!comprasAgrupadas[m.repuestoNombre]) {
        comprasAgrupadas[m.repuestoNombre] = {
          nombre: m.repuestoNombre,
          cantidad: 0,
          precioUnit,
          subtotal: 0,
        };
      }
      comprasAgrupadas[m.repuestoNombre].cantidad += m.cantidad;
      comprasAgrupadas[m.repuestoNombre].subtotal += m.cantidad * precioUnit;
    }
    const comprasArr = Object.values(comprasAgrupadas);
    const totalGastado = comprasArr.reduce((a, c) => a + c.subtotal, 0);
    grandTotalGastado += totalGastado;

    if (comprasArr.length === 0) {
      checkPage(8);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 150);
      doc.text("Sin compras registradas esta semana.", margin + 2, y + 4);
      y += 8;
    } else {
      for (let i = 0; i < comprasArr.length; i++) {
        checkPage(7);
        const c = comprasArr[i];
        if (i % 2 === 0) {
          doc.setFillColor(245, 245, 245);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(margin, y, colW, 6.5, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(30, 30, 30);
        const nombre = c.nombre.length > 42 ? c.nombre.slice(0, 40) + "…" : c.nombre;
        doc.text(nombre, margin + 1, y + 4.3);
        doc.text(String(c.cantidad), colsCompras[1].x + colsCompras[1].w, y + 4.3, {
          align: "right",
        });
        doc.text(fmt$(c.precioUnit), colsCompras[2].x + colsCompras[2].w, y + 4.3, {
          align: "right",
        });
        doc.text(fmt$(c.subtotal), colsCompras[3].x + colsCompras[3].w, y + 4.3, {
          align: "right",
        });
        y += 6.5;
      }
      checkPage(8);
      doc.setFillColor(60, 60, 60);
      doc.rect(margin, y, colW, 8, "F");
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      doc.rect(margin, y, colW, 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text("TOTAL GASTADO", margin + 2, y + 5.3);
      doc.text(fmt$(totalGastado), margin + colW - 1, y + 5.3, { align: "right" });
      y += 12;
    }
  }

  // ── RESUMEN GENERAL ──────────────────────────────────────────────────────────
  checkPage(42);
  y += 4;
  drawHLine(0.6, [234, 179, 8]);
  y += 5;

  // Caja negra con borde amarillo
  doc.setFillColor(10, 10, 10);
  doc.rect(margin, y, colW, 34, "F");
  doc.setDrawColor(234, 179, 8);
  doc.setLineWidth(0.6);
  doc.rect(margin, y, colW, 34);
  // Franja amarilla izquierda
  doc.setFillColor(234, 179, 8);
  doc.rect(margin, y, 5, 34, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(234, 179, 8);
  doc.text("RESUMEN GENERAL DE LA SEMANA", margin + 9, y + 9);

  // Línea separadora
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.2);
  doc.line(margin + 5, y + 12, margin + colW, y + 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 180);
  doc.text("Total Ingresado:", margin + 9, y + 20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(234, 179, 8);
  doc.text(fmt$(grandTotalIngresado), margin + colW - 2, y + 20, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 180);
  doc.text("Total Gastado:", margin + 9, y + 27);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(200, 200, 200);
  doc.text(fmt$(grandTotalGastado), margin + colW - 2, y + 27, { align: "right" });

  const balance = grandTotalIngresado - grandTotalGastado;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(140, 140, 140);
  doc.text("Balance neto:", margin + 9, y + 33);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  // Verde si positivo, rojo si negativo
  doc.setTextColor(
    balance >= 0 ? 80 : 220,
    balance >= 0 ? 180 : 60,
    balance >= 0 ? 80 : 60
  );
  doc.text(
    (balance >= 0 ? "+" : "") + fmt$(balance),
    margin + colW - 2,
    y + 33,
    { align: "right" }
  );
  y += 40;

  // ── PIE DE PÁGINA en todas las páginas ──────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(10, 10, 10);
    doc.rect(0, pageH - 10, pageW, 10, "F");
    // Línea amarilla superior del pie
    doc.setDrawColor(234, 179, 8);
    doc.setLineWidth(0.4);
    doc.line(0, pageH - 10, pageW, pageH - 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(
      "Sistema Inventario Génesis — Reporte Semanal — Documento generado automáticamente",
      margin,
      pageH - 3.5
    );
    doc.setTextColor(234, 179, 8);
    doc.text(`Página ${p} de ${totalPages}`, pageW - margin, pageH - 3.5, { align: "right" });
  }

  // ── GUARDAR ──────────────────────────────────────────────────────────────────
  const sucursalSuffix = sucursalFiltro === "todas" ? "todas" : sucursalFiltro;
  const fileName = `reporte_semanal_${sucursalSuffix}_${fmtDate(monday).replace(/\//g, "-")}.pdf`;
  doc.save(fileName);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Reportes() {
  const { usuarioActual, repuestos, herramientas, movimientos } = useApp();
  if (!usuarioActual) return null;

  const esGerente = usuarioActual.rol === "gerente";
  const [sucursalFiltro, setSucursalFiltro] = useState<"todas" | Sucursal>(
    esGerente ? "todas" : usuarioActual.sucursal
  );
  const [generando, setGenerando] = useState(false);

  const repsBase =
    sucursalFiltro === "todas"
      ? repuestos
      : repuestos.filter((r) => r.sucursal === sucursalFiltro);
  const herrsBase =
    sucursalFiltro === "todas"
      ? herramientas
      : herramientas.filter((h) => h.sucursal === sucursalFiltro);

  const agotados = repsBase.filter((r) => r.existencia === 0);
  const bajoStock = repsBase.filter((r) => r.existencia > 0 && r.existencia <= r.stockMinimo);
  const normales = repsBase.filter((r) => r.existencia > r.stockMinimo);

  const valorInventario = repsBase.reduce((a, r) => a + r.existencia * r.precioCompra, 0);
  const valorVenta = repsBase.reduce((a, r) => a + r.existencia * r.precioVenta, 0);
  const gananciaTotal = valorVenta - valorInventario;

  const herrsEnUso = herrsBase.filter((h) => h.estado === "en_uso");

  // Category breakdown
  const categorias = Array.from(new Set(repsBase.map((r) => r.categoria)));
  const porCategoria = categorias
    .map((cat) => {
      const items = repsBase.filter((r) => r.categoria === cat);
      return {
        categoria: cat,
        total: items.length,
        valor: items.reduce((a, r) => a + r.existencia * r.precioCompra, 0),
        alertas: items.filter((r) => r.existencia <= r.stockMinimo).length,
      };
    })
    .sort((a, b) => b.valor - a.valor);

  const handleGenerarPDF = async () => {
    setGenerando(true);
    try {
      await new Promise((r) => setTimeout(r, 50)); // allow UI to update
      generarReportePDF(sucursalFiltro, movimientos, repuestos);
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-display text-2xl text-[var(--foreground)]">Reportes</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
              Alertas de stock y análisis de inventario
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filtro de sucursal */}
            {esGerente && (
              <div className="flex gap-1 bg-[var(--secondary)] p-1 rounded-lg">
                {(["todas", "sucursal1", "sucursal2"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSucursalFiltro(s)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      sucursalFiltro === s
                        ? "bg-[var(--card)] text-[var(--foreground)]"
                        : "text-[var(--muted-foreground)]"
                    }`}
                  >
                    {s === "todas" ? "Todas" : SUCURSALES[s]}
                  </button>
                ))}
              </div>
            )}

            {/* Botón Generar PDF — solo visible para gerente */}
            {esGerente && (
            <button
              id="btn-generar-reporte-pdf"
              onClick={handleGenerarPDF}
              disabled={generando}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
                transition-all duration-200 select-none border
                ${
                  generando
                    ? "bg-yellow-400/20 border-yellow-600/40 text-yellow-500 cursor-not-allowed"
                    : "bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black border-yellow-300 shadow-lg shadow-yellow-900/20"
                }
              `}
            >
              {generando ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Generando…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Reporte Semanal PDF
                </>
              )}
            </button>
            )}

          </div>
        </div>

        {/* Info badge semana — solo visible para gerente */}
        {esGerente && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-yellow-400/5 border border-yellow-500/25 w-fit">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-yellow-400 shrink-0">
              <path
                fillRule="evenodd"
                d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs text-yellow-300/80">
              El PDF incluye <span className="font-semibold text-yellow-300">ambas sucursales</span> por separado, semana actual (lunes a domingo)
            </p>
          </div>
        )}

        {/* Alert banners */}
        {agotados.length > 0 && (
          <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-400 shrink-0">
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  clipRule="evenodd"
                />
              </svg>
              <h3 className="font-semibold text-red-400 text-sm">
                {agotados.length} producto{agotados.length !== 1 ? "s" : ""} sin existencia
              </h3>
            </div>
            <div className="space-y-2">
              {agotados.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-1.5 border-t border-red-800/20"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{r.nombre}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {r.codigo} · {SUCURSALES[r.sucursal]} · {r.categoria} · Proveedor:{" "}
                      {r.proveedor}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400">
                      AGOTADO
                    </span>
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                      Mín: {r.stockMinimo}{" "}
                      {esGerente ? `· P.compra: $${r.precioCompra.toLocaleString()}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {bajoStock.length > 0 && (
          <div className="bg-yellow-950/20 border border-yellow-800/30 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-yellow-400 shrink-0">
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  clipRule="evenodd"
                />
              </svg>
              <h3 className="font-semibold text-yellow-400 text-sm">
                {bajoStock.length} producto{bajoStock.length !== 1 ? "s" : ""} con stock bajo
              </h3>
            </div>
            <div className="space-y-2">
              {bajoStock.map((r) => {
                const pct = Math.round((r.existencia / r.stockMinimo) * 100);
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 py-1.5 border-t border-yellow-800/20"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {r.nombre}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {r.codigo} · {SUCURSALES[r.sucursal]} · {r.categoria}
                      </p>
                    </div>
                    <div className="w-24 shrink-0">
                      <div className="flex justify-between text-[10px] text-[var(--muted-foreground)] mb-1">
                        <span>
                          {r.existencia} / {r.stockMinimo}
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1 bg-[var(--secondary)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-500 rounded-full"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400 shrink-0">
                      BAJO
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {agotados.length === 0 && bajoStock.length === 0 && (
          <div className="bg-[var(--success)]/5 border border-[var(--success)]/20 rounded-xl p-6 mb-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[var(--success)]/10 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[var(--success)]">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[var(--success)]">Sin alertas de stock</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Todos los productos tienen existencia suficiente.
              </p>
            </div>
          </div>
        )}

        {/* Financial summary (Solo Gerente) */}
        {esGerente && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-xs text-[var(--muted-foreground)] mb-1">Valor en inventario</p>
              <p className="text-xl font-bold font-mono-data text-[var(--foreground)]">
                ${valorInventario.toLocaleString("es-MX")}
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)]">Costo de compra</p>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-xs text-[var(--muted-foreground)] mb-1">Valor de venta</p>
              <p className="text-xl font-bold font-mono-data text-[var(--foreground)]">
                ${valorVenta.toLocaleString("es-MX")}
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)]">Precio de lista</p>
            </div>
            <div className="bg-[var(--card)] border border-[var(--success)]/20 rounded-xl p-4">
              <p className="text-xs text-[var(--muted-foreground)] mb-1">Ganancia potencial</p>
              <p className="text-xl font-bold font-mono-data text-[var(--success)]">
                ${gananciaTotal.toLocaleString("es-MX")}
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)]">
                {valorInventario > 0
                  ? `${((gananciaTotal / valorInventario) * 100).toFixed(1)}% sobre costo`
                  : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Status overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Inventory status */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="font-semibold text-[var(--foreground)] mb-4">Estado del inventario</h3>
            <div className="space-y-3">
              {[
                {
                  label: "Normal",
                  count: normales.length,
                  color: "bg-[var(--success)]",
                  text: "text-[var(--success)]",
                },
                {
                  label: "Stock bajo",
                  count: bajoStock.length,
                  color: "bg-yellow-500",
                  text: "text-yellow-400",
                },
                {
                  label: "Agotado",
                  count: agotados.length,
                  color: "bg-red-500",
                  text: "text-red-400",
                },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${s.color}`} />
                  <span className="text-sm text-[var(--muted-foreground)] flex-1">{s.label}</span>
                  <span className={`font-mono-data font-semibold text-sm ${s.text}`}>
                    {s.count}
                  </span>
                  <div className="w-24 h-1.5 bg-[var(--secondary)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.color}`}
                      style={{
                        width: `${repsBase.length > 0 ? (s.count / repsBase.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tools in use */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="font-semibold text-[var(--foreground)] mb-4">Herramientas en uso</h3>
            {herrsEnUso.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">
                Todas las herramientas están disponibles.
              </p>
            ) : (
              <div className="space-y-2">
                {herrsEnUso.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 bg-[var(--secondary)] rounded-lg px-3 py-2.5"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--foreground)] truncate">
                        {h.nombre}
                      </p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        {SUCURSALES[h.sucursal]}
                        {h.asignadoA ? ` · ${h.asignadoA}` : ""}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono-data text-[var(--muted-foreground)]">
                      {h.fechaAsignacion || ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="font-semibold text-[var(--foreground)] mb-4">Repuestos por categoría</h3>
          {porCategoria.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-6">Sin datos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {[
                      "Categoría",
                      "Productos",
                      ...(esGerente ? ["Valor inventario"] : []),
                      "Alertas",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {porCategoria.map((c) => (
                    <tr
                      key={c.categoria}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--secondary)]/40 transition-colors"
                    >
                      <td className="px-3 py-3 text-xs font-medium text-[var(--foreground)]">
                        {c.categoria}
                      </td>
                      <td className="px-3 py-3 font-mono-data text-xs text-[var(--foreground)]">
                        {c.total}
                      </td>
                      {esGerente && (
                        <td className="px-3 py-3 font-mono-data text-xs text-[var(--foreground)]">
                          ${c.valor.toLocaleString("es-MX")}
                        </td>
                      )}
                      <td className="px-3 py-3">
                        {c.alertas > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400">
                            <span className="w-1 h-1 rounded-full bg-red-500" />
                            {c.alertas}
                          </span>
                        ) : (
                          <span className="text-[var(--success)] font-mono-data text-xs">✓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
