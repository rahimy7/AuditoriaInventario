import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Audit, CountItem, User } from "@/data/types";
import { AUDIT_STATUS_LABELS, COUNT_STATUS_LABELS } from "@/data/types";

const BLUE: [number, number, number] = [21, 101, 192];
const INK: [number, number, number] = [33, 43, 54];
const MUTED: [number, number, number] = [120, 144, 156];

function fmtDate(d = new Date()): string {
  return d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Generate and download an audit PDF.
 * mode "progress" → coverage/status per item; mode "results" → system vs counted + differences.
 */
export function exportAuditPdf(audit: Audit, items: CountItem[], users: User[], mode: "progress" | "results"): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? "—";
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Header band ---
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageWidth, 68, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(mode === "results" ? "Reporte de Resultados" : "Reporte de Avance", 40, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(audit.name, 40, 48);
  doc.setFontSize(9);
  doc.text(`InventControl · ${fmtDate()}`, pageWidth - 40, 30, { align: "right" });

  // --- Meta block ---
  doc.setTextColor(...INK);
  doc.setFontSize(10);
  const meta: [string, string][] = [
    ["Almacén", audit.warehouse || "—"],
    ["Ubicación", audit.location || "—"],
    ["Estado", AUDIT_STATUS_LABELS[audit.status]],
    ["Supervisor", userName(audit.supervisorId)],
    ["Auxiliares", audit.assignedTo.map(userName).join(", ") || "Sin asignar"],
    ["Avance", `${audit.progress}%`],
  ];
  let y = 92;
  meta.forEach(([k, v], i) => {
    const x = 40 + (i % 2) * (pageWidth / 2 - 20);
    if (i % 2 === 0 && i > 0) y += 16;
    doc.setTextColor(...MUTED);
    doc.text(`${k}:`, x, y);
    doc.setTextColor(...INK);
    doc.text(String(v), x + 62, y);
  });

  // --- Summary ---
  const counted = items.filter((i) => i.countedQty !== null);
  const diffs = counted.filter((i) => i.countedQty !== i.systemQty);
  const shortage = diffs.filter((i) => (i.countedQty ?? 0) < i.systemQty).length;
  const surplus = diffs.filter((i) => (i.countedQty ?? 0) > i.systemQty).length;
  const net = counted.reduce((s, i) => s + ((i.countedQty ?? 0) - i.systemQty), 0);

  y += 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("Resumen", 40, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  y += 15;
  doc.text(
    `Ítems: ${items.length}   ·   Contados: ${counted.length}   ·   Con diferencia: ${diffs.length}   ·   Faltantes: ${shortage}   ·   Sobrantes: ${surplus}   ·   Varianza neta: ${net > 0 ? "+" : ""}${net}`,
    40,
    y,
  );

  // --- Table ---
  const head =
    mode === "results"
      ? [["Código", "Producto", "Sistema", "Contado", "Dif.", "Estado"]]
      : [["Código", "Producto", "Ubicación", "Asignado", "Sist.", "Cont.", "Estado"]];

  const body = items.map((i) => {
    const diff = i.countedQty !== null ? i.countedQty - i.systemQty : null;
    const counted = i.countedQty !== null ? String(i.countedQty) : "—";
    if (mode === "results") {
      return [
        i.product.code,
        i.product.name,
        String(i.systemQty),
        counted,
        diff === null ? "—" : `${diff > 0 ? "+" : ""}${diff}`,
        COUNT_STATUS_LABELS[i.status],
      ];
    }
    return [
      i.product.code,
      i.product.name,
      i.location || "—",
      i.assignedTo ? userName(i.assignedTo) : "—",
      String(i.systemQty),
      counted,
      COUNT_STATUS_LABELS[i.status],
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: y + 14,
    margin: { left: 40, right: 40 },
    styles: { fontSize: 8, cellPadding: 4, textColor: INK },
    headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [244, 247, 251] },
    columnStyles: mode === "results" ? { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } } : {},
  });

  const filename = `${mode === "results" ? "resultados" : "avance"}-${audit.name.replace(/[^\w-]+/g, "_").slice(0, 40)}.pdf`;
  doc.save(filename);
}
