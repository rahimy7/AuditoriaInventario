import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, CheckCircle2, Clock, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import { useStore } from "@/data/store";
import type { CountItem } from "@/data/types";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";

export function ReviewWorkspacePage({ id }: { id: string }) {
  const store = useStore();
  const { user, getAudit, getAuditItems, getUserById } = store;
  const audit = getAudit(id);
  const items = getAuditItems(id);
  const [modal, setModal] = useState<{ item: CountItem; action: "approve" | "return" } | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

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

  const blindSup = user.role === "supervisor" && (audit.blindForSupervisor ?? false);
  const pending = items.filter((i) => i.status === "enviado");
  const approved = items.filter((i) => i.status === "aprobado");
  const returned = items.filter((i) => i.status === "devuelto");

  const confirmReview = () => {
    if (!modal) return;
    store.reviewItem(modal.item.id, modal.action, reviewNotes);
    toast.success(modal.action === "approve" ? "Conteo aprobado" : "Conteo devuelto");
    setModal(null);
    setReviewNotes("");
  };

  const sections: { title: string; color: string; list: CountItem[] }[] = [
    { title: "Pendientes de revisión", color: "#E65100", list: pending },
    { title: "Aprobados", color: "#2E7D32", list: approved },
    { title: "Devueltos", color: "#C62828", list: returned },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/audits/${audit.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {audit.name}
          </Link>
          <h2 className="text-xl font-bold">Revisión de conteos</h2>
        </div>
        {pending.length > 0 && (
          <Button
            className="gap-2"
            onClick={() => {
              store.approveAll(audit.id);
              toast.success(`${pending.length} conteo(s) aprobados`);
            }}
          >
            <CheckCircle2 className="h-4 w-4" /> Aprobar todos ({pending.length})
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { n: pending.length, l: "Pendientes", c: "#E65100" },
          { n: approved.length, l: "Aprobados", c: "#2E7D32" },
          { n: returned.length, l: "Devueltos", c: "#C62828" },
        ].map((s) => (
          <Card key={s.l} className="p-3 text-center">
            <div className="text-2xl font-bold" style={{ color: s.c }}>
              {s.n}
            </div>
            <div className="text-xs text-muted-foreground">{s.l}</div>
          </Card>
        ))}
      </div>

      {pending.length + approved.length + returned.length === 0 ? (
        <EmptyState icon={Clock} title="Sin ítems enviados" description="Los auxiliares aún no han enviado conteos para revisar." />
      ) : (
        sections.map(
          (sec) =>
            sec.list.length > 0 && (
              <div key={sec.title} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: sec.color }} />
                  <h3 className="text-sm font-bold">{sec.title}</h3>
                  <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${sec.color}18`, color: sec.color }}>
                    {sec.list.length}
                  </span>
                </div>
                {sec.list.map((i) => {
                  const diff = i.countedQty !== null ? i.countedQty - i.systemQty : null;
                  const hasDiff = !blindSup && diff !== null && diff !== 0;
                  const assignee = getUserById(i.assignedTo);
                  return (
                    <Card key={i.id} className="p-3" style={hasDiff ? { borderColor: "#C6282840" } : undefined}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">{i.product.code}</div>
                          <div className="font-medium text-foreground">{i.product.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {i.location}
                            {assignee ? ` · ${assignee.name}` : ""}
                          </div>
                          {i.notes ? <div className="mt-1 text-xs italic text-muted-foreground">“{i.notes}”</div> : null}
                        </div>
                        <div className="flex items-center gap-2">
                          {!blindSup && (
                            <div className="rounded-lg px-2.5 py-1 text-center" style={{ backgroundColor: "#E1F5FE" }}>
                              <div className="text-[10px] text-[#0277BD]">Sistema</div>
                              <div className="text-sm font-bold text-[#0277BD]">{i.systemQty}</div>
                            </div>
                          )}
                          <div
                            className="rounded-lg px-2.5 py-1 text-center"
                            style={{ backgroundColor: hasDiff ? "#FFEBEE" : "#E8F5E9" }}
                          >
                            <div className="text-[10px]" style={{ color: hasDiff ? "#C62828" : "#2E7D32" }}>
                              Contado
                            </div>
                            <div className="text-sm font-bold" style={{ color: hasDiff ? "#C62828" : "#2E7D32" }}>
                              {i.countedQty ?? "—"}
                            </div>
                          </div>
                          {hasDiff && (
                            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#C62828]">
                              {diff! > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {diff! > 0 ? "+" : ""}
                              {diff}
                            </span>
                          )}
                        </div>
                      </div>

                      {i.photos.length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {i.photos.map((src, idx) => (
                            <img key={idx} src={src} alt="evidencia" className="h-14 w-14 rounded-md object-cover" />
                          ))}
                        </div>
                      )}

                      {i.status === "enviado" ? (
                        <div className="mt-3 flex gap-2 border-t pt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1.5 text-[#C62828]"
                            onClick={() => {
                              setModal({ item: i, action: "return" });
                              setReviewNotes("");
                            }}
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Devolver
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 gap-1.5"
                            onClick={() => {
                              setModal({ item: i, action: "approve" });
                              setReviewNotes("");
                            }}
                          >
                            <Check className="h-3.5 w-3.5" /> Aprobar
                          </Button>
                        </div>
                      ) : i.reviewNotes ? (
                        <div className="mt-2 border-t pt-2 text-xs text-muted-foreground">Revisión: {i.reviewNotes}</div>
                      ) : null}
                    </Card>
                  );
                })}
              </div>
            ),
        )
      )}

      <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{modal?.action === "approve" ? "Aprobar conteo" : "Devolver para reconteo"}</DialogTitle>
            <DialogDescription>{modal?.item.product.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Comentario de revisión (opcional)</Label>
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
              placeholder={modal?.action === "approve" ? "Ej: Conteo correcto." : "Ej: Diferencia significativa, verificar estante."}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button variant={modal?.action === "approve" ? "default" : "destructive"} onClick={confirmReview}>
              {modal?.action === "approve" ? "Confirmar aprobación" : "Confirmar devolución"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
