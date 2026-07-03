import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, AlertTriangle, Award, CheckCircle2, ClipboardList, Clock, Gauge, Percent, ShieldCheck, Target } from "lucide-react";
import { useStore } from "@/data/store";
import { AUDIT_STATUS_LABELS, PALETTE, STATUS_COLORS, type AuditStatus } from "@/data/types";
import { computeMetrics } from "@/lib/metrics";
import { PageHeader } from "@/components/common/PageHeader";
import { MetricCard } from "@/components/common/MetricCard";
import { ProgressBar } from "@/components/common/ProgressBar";
import { Avatar } from "@/components/common/RoleBadge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadCSV } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

// Score bands → status color (reserved status palette, per dataviz rules).
function scoreColor(v: number): string {
  if (v >= 80) return PALETTE.success;
  if (v >= 60) return PALETTE.primary;
  if (v >= 40) return PALETTE.warning;
  return PALETTE.error;
}

export function MetricsPage() {
  const { user, audits, countItems, users, products, getSupervisorAudits } = useStore();

  const scopeAudits = useMemo(
    () => (user?.role === "supervisor" ? getSupervisorAudits(user.id) : audits),
    [user, audits, getSupervisorAudits],
  );
  const scopeItems = useMemo(
    () => countItems.filter((i) => scopeAudits.some((a) => a.id === i.auditId)),
    [countItems, scopeAudits],
  );
  const m = useMemo(
    () => computeMetrics(users, products, scopeAudits, scopeItems),
    [users, products, scopeAudits, scopeItems],
  );

  if (!user) return null;

  const totalAudits = scopeAudits.length;
  const inProgress = scopeAudits.filter((a) => a.status === "en_proceso").length;
  const approved = scopeAudits.filter((a) => a.status === "aprobado" || a.status === "cerrado").length;
  const pendingAudits = scopeAudits.filter((a) => ["creado", "asignado"].includes(a.status)).length;

  const totalItems = scopeItems.length;
  const countedItems = scopeItems.filter((i) => i.countedQty !== null).length;
  const diffItems = scopeItems.filter((i) => i.countedQty !== null && i.countedQty !== i.systemQty);
  const surplus = diffItems.filter((i) => (i.countedQty ?? 0) > i.systemQty).length;
  const shortage = diffItems.filter((i) => (i.countedQty ?? 0) < i.systemQty).length;
  const exact = countedItems - diffItems.length;
  const avgProgress = totalAudits > 0 ? Math.round(scopeAudits.reduce((s, a) => s + a.progress, 0) / totalAudits) : 0;

  const statusData = (Object.keys(AUDIT_STATUS_LABELS) as AuditStatus[])
    .map((s) => ({ status: AUDIT_STATUS_LABELS[s], value: scopeAudits.filter((a) => a.status === s).length, color: STATUS_COLORS[s].text }))
    .filter((d) => d.value > 0);

  const userStats = users
    .filter((u) => u.role === "auxiliar")
    .map((u) => {
      const its = scopeItems.filter((i) => i.assignedTo === u.id);
      const counted = its.filter((i) => i.countedQty !== null).length;
      return { user: u, total: its.length, counted, pct: its.length > 0 ? Math.round((counted / its.length) * 100) : 0 };
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.counted - a.counted);

  const diffDistribution = [
    { name: "Sin diferencia", value: exact, color: PALETTE.success },
    { name: "Sobrantes", value: surplus, color: PALETTE.warning },
    { name: "Faltantes", value: shortage, color: PALETTE.error },
  ].filter((d) => d.value > 0);

  const topDiff = diffItems
    .map((i) => ({
      name: i.product.name.length > 22 ? `${i.product.name.slice(0, 22)}…` : i.product.name,
      diff: (i.countedQty ?? 0) - i.systemQty,
      abs: Math.abs((i.countedQty ?? 0) - i.systemQty),
    }))
    .sort((a, b) => b.abs - a.abs)
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Métricas y reportes"
        description={user.role === "supervisor" ? "Indicadores de tus auditorías." : "Indicadores globales de inventario."}
        actions={
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              downloadCSV(
                "reporte-diferencias.csv",
                diffItems.map((i) => ({
                  codigo: i.product.code,
                  producto: i.product.name,
                  sistema: i.systemQty,
                  contado: i.countedQty,
                  diferencia: (i.countedQty ?? 0) - i.systemQty,
                })),
              )
            }
            disabled={diffItems.length === 0}
          >
            <Download className="h-4 w-4" /> Reporte de diferencias
          </Button>
        }
      />

      <Tabs defaultValue="calidad">
        <TabsList>
          <TabsTrigger value="calidad">Calidad del dato</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="diferencias">Diferencias</TabsTrigger>
        </TabsList>

        {/* Calidad del dato */}
        <TabsContent value="calidad" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
            <Card className="flex flex-col items-center justify-center p-4">
              <h3 className="mb-1 self-start text-sm font-bold">Índice de calidad del dato</h3>
              <ScoreGauge value={m.dataQualityScore} />
              <p className="mt-1 text-center text-xs text-muted-foreground">
                Combina cobertura, exactitud y baja discrepancia del conteo.
              </p>
            </Card>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
              <MetricCard label="Cobertura" value={`${m.coveragePct}%`} icon={Target} color={PALETTE.primary} hint={`${m.totals.countItems} ítems`} />
              <MetricCard label="Exactitud" value={`${m.accuracyPct}%`} icon={CheckCircle2} color={PALETTE.success} hint={`${m.exactCount} exactos`} />
              <MetricCard label="Tasa de discrepancia" value={`${m.discrepancyRatePct}%`} icon={AlertTriangle} color={PALETTE.warning} />
              <MetricCard label="Varianza neta" value={`${m.netVarianceUnits > 0 ? "+" : ""}${m.netVarianceUnits}`} icon={Gauge} color={PALETTE.purple} hint="unidades" />
              <MetricCard label="Faltante" value={`${m.shortageUnits}`} icon={ShieldCheck} color={PALETTE.error} hint={`${m.shortageCount} ítems`} />
              <MetricCard label="Sobrante" value={`${m.surplusUnits}`} icon={Percent} color={PALETTE.accent} hint={`${m.surplusCount} ítems`} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-bold">Exactitud por categoría</h3>
              <div className="h-64">
                {m.byCategory.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sin datos.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={m.byCategory.slice(0, 8)} margin={{ top: 4, right: 32, bottom: 4, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5eaf2" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                      <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => `${v}%`} />
                      <Bar dataKey="accuracyPct" name="Exactitud" radius={[0, 6, 6, 0]}>
                        {m.byCategory.slice(0, 8).map((d, i) => (
                          <Cell key={i} fill={scoreColor(d.accuracyPct)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="mb-3 text-sm font-bold">Cobertura por almacén</h3>
              <div className="h-64">
                {m.byWarehouse.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sin datos.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={m.byWarehouse.map((w) => ({
                        name: w.warehouse,
                        contados: w.counted,
                        pendientes: w.items - w.counted,
                      }))}
                      margin={{ top: 4, right: 8, bottom: 4, left: -16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5eaf2" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={48} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="contados" name="Contados" stackId="a" fill={PALETTE.primary} radius={[6, 6, 0, 0]} />
                      <Bar dataKey="pendientes" name="Pendientes" stackId="a" fill="#cdd9ea" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* General */}
        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="Total auditorías" value={totalAudits} icon={ClipboardList} color={PALETTE.primary} />
            <MetricCard label="En proceso" value={inProgress} icon={Activity} color={PALETTE.warning} />
            <MetricCard label="Aprobadas" value={approved} icon={Award} color={PALETTE.success} />
            <MetricCard label="Pendientes" value={pendingAudits} icon={Clock} color={PALETTE.muted} />
          </div>

          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold">
              <span>Avance global</span>
              <span className="text-primary">{avgProgress}%</span>
            </div>
            <ProgressBar value={avgProgress} />
            <div className="mt-3 grid grid-cols-3 text-center">
              <Stat label="Contados" value={countedItems} />
              <Stat label="Pendientes" value={totalItems - countedItems} />
              <Stat label="Total" value={totalItems} />
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-bold">Auditorías por estado</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5eaf2" />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Auditorías" radius={[6, 6, 0, 0]}>
                    {statusData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        {/* Usuarios */}
        <TabsContent value="usuarios" className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-bold">Ítems contados por auxiliar</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userStats.map((s) => ({ name: s.user.name.split(" ")[0], contados: s.counted, total: s.total }))} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5eaf2" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="contados" name="Contados" fill={PALETTE.primary} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="total" name="Asignados" fill="#cdd9ea" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="space-y-2">
            {userStats.map((s) => (
              <Card key={s.user.id} className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar name={s.user.name} role={s.user.role} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{s.user.name}</div>
                    <div className="text-xs text-muted-foreground">{s.user.warehouse ?? "Sin almacén"}</div>
                  </div>
                  <div className="text-sm font-bold" style={{ color: s.pct === 100 ? PALETTE.success : PALETTE.primary }}>
                    {s.pct}%
                  </div>
                </div>
                <div className="mt-2">
                  <ProgressBar value={s.pct} color={s.pct === 100 ? PALETTE.success : PALETTE.primary} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {s.counted} de {s.total} ítems contados
                </div>
              </Card>
            ))}
            {userStats.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Sin datos de usuarios.</div>}
          </div>
        </TabsContent>

        {/* Diferencias */}
        <TabsContent value="diferencias" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="Con diferencia" value={diffItems.length} icon={AlertTriangle} color={PALETTE.error} />
            <MetricCard label="Sin diferencia" value={exact} icon={CheckCircle2} color={PALETTE.success} />
            <MetricCard label="Sobrantes" value={surplus} icon={Activity} color={PALETTE.warning} />
            <MetricCard label="Faltantes" value={shortage} icon={Activity} color={PALETTE.error} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-bold">Distribución de conteos</h3>
              <div className="h-64">
                {diffDistribution.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sin conteos registrados.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={diffDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                        {diffDistribution.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="mb-3 text-sm font-bold">Top productos con diferencia</h3>
              <div className="h-64">
                {topDiff.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sin diferencias registradas.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={topDiff} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5eaf2" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="diff" name="Diferencia" radius={[0, 6, 6, 0]}>
                        {topDiff.map((d, i) => (
                          <Cell key={i} fill={d.diff >= 0 ? PALETTE.warning : PALETTE.error} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ScoreGauge({ value }: { value: number }) {
  const color = scoreColor(value);
  const data = [{ name: "score", value, fill: color }];
  return (
    <div className="relative h-44 w-44">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={220} endAngle={-40}>
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background dataKey="value" cornerRadius={10} angleAxisId={0} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {value}
        </span>
        <span className="text-[11px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}
