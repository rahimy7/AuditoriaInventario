import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Camera,
  Check,
  Database,
  EyeOff,
  Minus,
  Package,
  Plus,
  Save,
  ScanLine,
  Send,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useStore } from "@/data/store";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export function CountWorkspacePage({ id }: { id: string }) {
  const store = useStore();
  const { user, getAudit, getAuditItems } = store;
  const audit = getAudit(id);
  const allItems = getAuditItems(id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [scan, setScan] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const myItems = useMemo(() => {
    if (!user) return [];
    return user.role === "auxiliar" ? allItems.filter((i) => i.assignedTo === user.id) : allItems;
  }, [allItems, user]);

  const selected = myItems.find((i) => i.id === selectedId) ?? null;

  // hydrate editor when the selection changes
  useEffect(() => {
    if (!selected) return;
    setQty(selected.countedQty?.toString() ?? "");
    setNotes(selected.notes ?? "");
    setPhotos(selected.photos ?? []);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // auto-select first item
  useEffect(() => {
    if (!selectedId && myItems.length > 0) setSelectedId(myItems[0]!.id);
  }, [myItems, selectedId]);

  if (!user) return null;
  if (!audit) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Auditoría no encontrada.{" "}
        <Link href="/audits" className="text-primary hover:underline">
          Volver
        </Link>
      </div>
    );
  }

  const blind = user.role === "auxiliar" && (audit.blindForAuxiliar ?? false);
  const parsed = parseFloat(qty);
  const isValid = !Number.isNaN(parsed) && parsed >= 0;
  const diff = isValid && selected ? parsed - selected.systemQty : null;

  const step = (delta: number) => {
    const current = parseFloat(qty) || 0;
    setQty(String(Math.max(0, current + delta)));
  };

  const onScan = (e: React.FormEvent) => {
    e.preventDefault();
    const q = scan.trim().toLowerCase();
    if (!q) return;
    const match = myItems.find(
      (i) => i.product.code.toLowerCase() === q || i.product.code.toLowerCase().includes(q) || i.product.name.toLowerCase().includes(q),
    );
    if (match) {
      setSelectedId(match.id);
      toast.success("Producto encontrado", { description: match.product.name });
    } else {
      toast.error("Sin coincidencias", { description: `No se encontró "${scan}" en tu pool.` });
    }
    setScan("");
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => setPhotos((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const save = (submit: boolean) => {
    if (!selected) return;
    if (!isValid) {
      toast.error("Cantidad inválida", { description: "Ingresa un número mayor o igual a 0." });
      return;
    }
    store.saveCount(selected.id, parsed, notes, photos);
    if (submit) {
      store.submitCount(selected.id);
      toast.success("Conteo enviado al supervisor");
    } else {
      toast.success("Borrador guardado");
    }
  };

  const countedCount = myItems.filter((i) => i.countedQty !== null).length;
  const draftCount = myItems.filter((i) => i.status === "contado").length;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/audits/${audit.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {audit.name}
          </Link>
          <h2 className="text-xl font-bold">Registrar conteo</h2>
        </div>
        <div className="flex items-center gap-2">
          {blind && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              <EyeOff className="h-3.5 w-3.5" /> Modo a ciegas
            </span>
          )}
          <Button
            variant="outline"
            className="gap-2"
            disabled={draftCount === 0}
            onClick={() => {
              store.submitAllForAudit(audit.id, user.role === "auxiliar" ? user.id : undefined);
              toast.success("Conteos enviados");
            }}
          >
            <Send className="h-4 w-4" /> Enviar borradores ({draftCount})
          </Button>
        </div>
      </div>

      {/* Scan bar */}
      <form onSubmit={onScan} className="relative">
        <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        <Input
          value={scan}
          onChange={(e) => setScan(e.target.value)}
          placeholder="Escanea o escribe un código de producto y presiona Enter…"
          className="pl-9"
        />
      </form>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Item list */}
        <Card className="max-h-[70vh] overflow-y-auto p-0">
          <div className="border-b p-3 text-xs text-muted-foreground">
            {countedCount}/{myItems.length} contados
          </div>
          {myItems.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Package} title="Sin ítems asignados" description="No tienes productos para contar en esta auditoría." />
            </div>
          ) : (
            <ul className="divide-y">
              {myItems.map((i) => (
                <li key={i.id}>
                  <button
                    onClick={() => setSelectedId(i.id)}
                    className={cn(
                      "flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50",
                      selectedId === i.id && "bg-secondary",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{i.product.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {i.product.code} · {i.location}
                      </span>
                    </span>
                    {i.countedQty !== null && (
                      <span className="text-sm font-bold text-foreground">
                        {i.countedQty} {i.product.unit}
                      </span>
                    )}
                    <StatusBadge status={i.status} type="count" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Editor */}
        {selected ? (
          <Card className="space-y-4 p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                <Package className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">{selected.product.code}</div>
                <div className="font-semibold text-foreground">{selected.product.name}</div>
                <div className="text-xs text-muted-foreground">
                  {selected.product.category} · {selected.product.line} · {selected.location}
                </div>
              </div>
              <StatusBadge status={selected.status} type="count" />
            </div>

            {blind ? (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/60 p-3 text-sm text-muted-foreground">
                <EyeOff className="h-4 w-4" /> Stock del sistema oculto (conteo a ciegas)
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border p-3 text-sm" style={{ backgroundColor: "#E1F5FE", color: "#0277BD", borderColor: "#0277BD30" }}>
                <Database className="h-4 w-4" />
                <span>
                  Existencia en sistema: <strong>{selected.systemQty} {selected.product.unit}</strong>
                </span>
              </div>
            )}

            <div>
              <Label>Cantidad física contada</Label>
              <div className="mt-2 flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" onClick={() => step(-1)}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="h-14 text-center text-2xl font-bold"
                  style={diff && diff !== 0 ? { borderColor: "#C62828" } : undefined}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => step(1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 flex gap-2">
                {[5, 10, 25, 50].map((n) => (
                  <Button key={n} type="button" variant="secondary" size="sm" className="flex-1" onClick={() => step(n)}>
                    +{n}
                  </Button>
                ))}
              </div>
              {!blind && diff !== null && (
                <div
                  className="mt-3 flex items-center gap-2 rounded-lg p-2.5 text-sm font-medium"
                  style={{
                    backgroundColor: diff === 0 ? "#E8F5E9" : "#FFEBEE",
                    color: diff === 0 ? "#2E7D32" : "#C62828",
                  }}
                >
                  {diff === 0 ? (
                    <>
                      <Check className="h-4 w-4" /> Sin diferencia
                    </>
                  ) : diff > 0 ? (
                    <>
                      <TrendingUp className="h-4 w-4" /> Sobrante: +{diff} {selected.product.unit}
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4" /> Faltante: {diff} {selected.product.unit}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas de ubicación, condición del producto…"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Evidencias fotográficas</Label>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
                  <Camera className="h-3.5 w-3.5" /> Añadir
                </Button>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
              </div>
              {photos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {photos.map((src, idx) => (
                    <div key={idx} className="relative">
                      <img src={src} alt="evidencia" className="h-16 w-16 rounded-lg object-cover" />
                      <button
                        onClick={() => setPhotos((prev) => prev.filter((_, i2) => i2 !== idx))}
                        className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => save(false)}>
                <Save className="h-4 w-4" /> Guardar borrador
              </Button>
              <Button className="flex-1 gap-2" onClick={() => save(true)} disabled={!isValid}>
                <Send className="h-4 w-4" /> Enviar
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="flex items-center justify-center p-10 text-sm text-muted-foreground">
            Selecciona un ítem de la lista para contar.
          </Card>
        )}
      </div>
    </div>
  );
}
