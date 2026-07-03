import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ImagePlus, Loader2, Package, Trash2 } from "lucide-react";
import { useStore } from "@/data/store";
import { assetUrl } from "@/data/api";
import type { Product } from "@/data/types";
import { useUnitCatalog } from "@/data/units";
import { PageHeader } from "@/components/common/PageHeader";
import { UnitCombobox } from "@/components/common/UnitCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";

type Draft = Omit<Product, "id">;
const EMPTY: Draft = { code: "", name: "", category: "", line: "", unit: "PZA", systemStock: 0, active: true };

export function ProductFormPage({ id }: { id?: string }) {
  const store = useStore();
  const { products, updateProduct, createProduct, uploadProductPhoto } = store;
  const [, navigate] = useLocation();

  const existing = id ? products.find((p) => p.id === id) : undefined;
  const [draft, setDraft] = useState<Draft>(existing ? { ...existing } : { ...EMPTY });
  // For a brand-new product the photo can't be uploaded until it has an id — hold
  // the chosen file plus a local preview and attach it right after creation.
  const [pendingPhoto, setPendingPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const usedUnits = useMemo(() => products.map((p) => p.unit), [products]);
  const { units, addUnit } = useUnitCatalog(usedUnits);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const isEdit = !!id;
  const notFound = isEdit && !existing;

  const currentImage = pendingPhoto?.preview ?? assetUrl(draft.imageUrl);

  const onPickPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (isEdit && existing) {
      // Existing product: upload immediately.
      setBusy(true);
      try {
        await uploadProductPhoto(existing.id, file);
        toast.success("Foto actualizada");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo subir la foto");
      } finally {
        setBusy(false);
      }
    } else {
      const preview = URL.createObjectURL(file);
      setPendingPhoto({ file, preview });
    }
  };

  const save = async () => {
    if (!draft.code.trim() || !draft.name.trim()) {
      toast.error("Código y nombre son obligatorios");
      return;
    }
    setBusy(true);
    try {
      if (isEdit && existing) {
        await updateProduct(existing.id, draft);
        toast.success("Producto actualizado");
      } else {
        const created = await createProduct(draft);
        if (pendingPhoto) await uploadProductPhoto(created.id, pendingPhoto.file);
        toast.success("Producto creado");
      }
      navigate("/products");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  };

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
        <Button variant="ghost" className="gap-2" onClick={() => navigate("/products")}>
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
        <p className="text-sm text-muted-foreground">Producto no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <Button variant="ghost" className="gap-2 -ml-2 w-fit" onClick={() => navigate("/products")}>
        <ArrowLeft className="h-4 w-4" /> Volver al catálogo
      </Button>

      <PageHeader
        title={isEdit ? "Editar producto" : "Nuevo producto"}
        description={isEdit ? draft.name : "Completa la información del producto"}
      />

      <div className="grid gap-5 md:grid-cols-[200px_1fr]">
        {/* Photo */}
        <div className="space-y-2">
          <Label>Foto</Label>
          <div className="relative aspect-square w-full overflow-hidden rounded-xl border bg-muted/40">
            {currentImage ? (
              <img src={currentImage} alt={draft.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Package className="h-10 w-10" />
              </div>
            )}
            {busy && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => fileRef.current?.click()} disabled={busy}>
              <ImagePlus className="h-4 w-4" /> {currentImage ? "Cambiar" : "Subir"}
            </Button>
            {currentImage && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                disabled={busy}
                onClick={async () => {
                  if (pendingPhoto) {
                    URL.revokeObjectURL(pendingPhoto.preview);
                    setPendingPhoto(null);
                  } else if (isEdit && existing) {
                    await updateProduct(existing.id, { imageUrl: undefined });
                    update({ imageUrl: undefined });
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              onPickPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        {/* Fields */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Código</Label>
            <Input value={draft.code} onChange={(e) => update({ code: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Unidad</Label>
            <UnitCombobox value={draft.unit} units={units} onChange={(u) => update({ unit: u })} onCreate={addUnit} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Nombre</Label>
            <Input value={draft.name} onChange={(e) => update({ name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <Input value={draft.category} onChange={(e) => update({ category: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Línea</Label>
            <Input value={draft.line} onChange={(e) => update({ line: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Stock en sistema</Label>
            <Input
              type="number"
              value={draft.systemStock}
              onChange={(e) => update({ systemStock: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="flex items-end justify-between gap-3 rounded-lg border p-3">
            <Label>Activo</Label>
            <Switch checked={draft.active} onCheckedChange={(v) => update({ active: v })} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={() => navigate("/products")}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={busy} className="gap-2">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar
        </Button>
      </div>
    </div>
  );
}
