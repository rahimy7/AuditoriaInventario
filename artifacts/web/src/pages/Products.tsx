import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Download, Package, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { useStore } from "@/data/store";
import { assetUrl } from "@/data/api";
import type { Product } from "@/data/types";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ImportProductsDialog } from "@/components/products/ImportProductsDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { downloadCSV } from "@/lib/format";

export function ProductsPage() {
  const { products, deleteProduct } = useStore();
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todas");
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category))).sort(), [products]);

  const filtered = useMemo(
    () =>
      products
        .filter((p) => category === "todas" || p.category === category)
        .filter(
          (p) =>
            !query.trim() ||
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.code.toLowerCase().includes(query.toLowerCase()) ||
            p.line.toLowerCase().includes(query.toLowerCase()),
        ),
    [products, query, category],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Catálogo de productos"
        description={`${products.length} productos · ${categories.length} categorías`}
        actions={
          <>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                downloadCSV(
                  "productos.csv",
                  filtered.map((p) => ({
                    codigo: p.code,
                    nombre: p.name,
                    categoria: p.category,
                    linea: p.line,
                    unidad: p.unit,
                    stock_sistema: p.systemStock,
                    activo: p.active ? "Sí" : "No",
                  })),
                )
              }
            >
              <Download className="h-4 w-4" /> Exportar
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Importar
            </Button>
            <Button className="gap-2" onClick={() => navigate("/products/new")}>
              <Plus className="h-4 w-4" /> Nuevo producto
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, código o línea…" className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Línea</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const img = assetUrl(p.imageUrl);
                return (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/products/${p.id}`)}>
                    <TableCell>
                      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
                        {img ? (
                          <img src={img} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                    <TableCell className="text-sm">{p.category}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.line}</TableCell>
                    <TableCell className="text-right text-sm">
                      {p.systemStock} {p.unit}
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
                        style={p.active ? { backgroundColor: "#E8F5E9", color: "#2E7D32" } : { backgroundColor: "#ECEFF1", color: "#455A64" }}
                      >
                        {p.active ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(`/products/${p.id}`)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setToDelete(p)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Package className="h-4 w-4" /> Sin productos
                    </span>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ImportProductsDialog open={importOpen} onOpenChange={setImportOpen} />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Eliminar producto"
        description={toDelete ? `Se eliminará "${toDelete.name}" del catálogo.` : ""}
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (toDelete) {
            deleteProduct(toDelete.id)
              .then(() => toast.success("Producto eliminado"))
              .catch((e) => toast.error(e instanceof Error ? e.message : "No se pudo eliminar"));
          }
        }}
      />
    </div>
  );
}
