import { Link } from "wouter";
import {
  Activity,
  AlertCircle,
  Award,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  Inbox,
  Package,
  PlusCircle,
  Send,
  Users2,
} from "lucide-react";
import { useStore } from "@/data/store";
import { firstName, greeting } from "@/lib/format";
import { ROLE_FULL_LABELS } from "@/data/types";
import { MetricCard } from "@/components/common/MetricCard";
import { AuditCard } from "@/components/common/AuditCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";

export function DashboardPage() {
  const { user, audits, countItems, products, users, getUserAudits, getSupervisorAudits } = useStore();
  if (!user) return null;
  const role = user.role;

  const myAudits =
    role === "auxiliar" ? getUserAudits(user.id) : role === "supervisor" ? getSupervisorAudits(user.id) : audits;

  const pending = myAudits.filter((a) => ["creado", "asignado", "en_proceso"].includes(a.status));
  const sent = myAudits.filter((a) => ["enviado", "en_revision"].includes(a.status));
  const completed = myAudits.filter((a) => ["aprobado", "cerrado"].includes(a.status));

  const myItems = countItems.filter((i) => i.assignedTo === user.id);
  const pendingItems = myItems.filter((i) => i.status === "pendiente").length;
  const countedItems = myItems.filter((i) => i.countedQty !== null).length;

  const scopeItems = countItems.filter((i) => myAudits.some((a) => a.id === i.auditId));
  const diffCount = scopeItems.filter((i) => i.countedQty !== null && i.countedQty !== i.systemQty).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Greeting banner */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0D47A1] to-[#1565C0] p-5 text-white sm:p-6">
        <div className="text-sm text-white/70">{greeting()},</div>
        <div className="text-2xl font-bold">{firstName(user.name)}</div>
        <div className="mt-1 text-sm text-white/80">{ROLE_FULL_LABELS[role]}</div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {role === "auxiliar" ? (
          <>
            <MetricCard label="Ítems pendientes" value={pendingItems} icon={Clock} color="#E65100" />
            <MetricCard label="Ítems contados" value={countedItems} icon={CheckCircle2} color="#2E7D32" />
            <MetricCard label="Auditorías enviadas" value={sent.length} icon={Send} color="#0288D1" />
            <MetricCard label="Auditorías aprobadas" value={completed.length} icon={Award} color="#2E7D32" />
          </>
        ) : role === "supervisor" ? (
          <>
            <MetricCard label="Mis auditorías" value={myAudits.length} icon={ClipboardList} color="#1565C0" />
            <MetricCard label="En proceso" value={pending.length} icon={Activity} color="#E65100" />
            <MetricCard label="Por revisar" value={sent.length} icon={Send} color="#8E24AA" />
            <MetricCard label="Diferencias" value={diffCount} icon={AlertCircle} color="#C62828" />
          </>
        ) : (
          <>
            <MetricCard label="Total auditorías" value={audits.length} icon={ClipboardList} color="#1565C0" />
            <MetricCard label="En proceso" value={pending.length} icon={Activity} color="#E65100" />
            <MetricCard label="Diferencias" value={diffCount} icon={AlertCircle} color="#C62828" />
            <MetricCard
              label="Usuarios activos"
              value={users.filter((u) => u.active).length}
              icon={Users2}
              color="#5E35B1"
            />
          </>
        )}
      </div>

      {/* Quick actions */}
      {role !== "auxiliar" && (
        <div>
          <h3 className="mb-2 text-sm font-bold text-foreground">Acciones rápidas</h3>
          <div className="flex flex-wrap gap-2">
            {role === "gerente" && (
              <Link href="/audits">
                <Button variant="outline" className="gap-2">
                  <PlusCircle className="h-4 w-4 text-primary" /> Nueva auditoría
                </Button>
              </Link>
            )}
            <Link href="/metrics">
              <Button variant="outline" className="gap-2">
                <BarChart3 className="h-4 w-4 text-[#5E35B1]" /> Ver métricas
              </Button>
            </Link>
            <Link href="/products">
              <Button variant="outline" className="gap-2">
                <Package className="h-4 w-4 text-[#2E7D32]" /> Catálogo ({products.length})
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Recent audits */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">
            {role === "auxiliar" ? "Mis auditorías" : "Auditorías recientes"}
          </h3>
          <Link href="/audits" className="text-sm font-medium text-primary hover:underline">
            Ver todas
          </Link>
        </div>
        {myAudits.length === 0 ? (
          <EmptyState icon={Inbox} title="Sin auditorías asignadas" description="Cuando te asignen trabajo aparecerá aquí." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {myAudits.slice(0, 6).map((a) => (
              <AuditCard key={a.id} audit={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
