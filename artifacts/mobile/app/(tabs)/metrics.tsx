import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditContext } from "@/contexts/AuditContext";
import { useColors } from "@/hooks/useColors";
import MetricCard from "@/components/MetricCard";

export default function MetricsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { audits, countItems, users, getSupervisorAudits } = useAuditContext();
  const [tab, setTab] = useState<"general" | "users" | "diff">("general");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  if (!user) return null;

  const scopeAudits =
    user.role === "supervisor" ? getSupervisorAudits(user.id) : audits;

  const scopeItems = countItems.filter((i) =>
    scopeAudits.some((a) => a.id === i.auditId)
  );

  const totalAudits = scopeAudits.length;
  const inProgress = scopeAudits.filter((a) => a.status === "en_proceso").length;
  const approved = scopeAudits.filter((a) => a.status === "aprobado" || a.status === "cerrado").length;
  const pending = scopeAudits.filter((a) => ["creado", "asignado"].includes(a.status)).length;

  const totalItems = scopeItems.length;
  const countedItems = scopeItems.filter((i) => i.countedQty !== null).length;
  const diffItems = scopeItems.filter(
    (i) => i.countedQty !== null && i.countedQty !== i.systemQty
  );
  const surplus = diffItems.filter((i) => (i.countedQty ?? 0) > i.systemQty).length;
  const shortage = diffItems.filter((i) => (i.countedQty ?? 0) < i.systemQty).length;

  const avgProgress =
    scopeAudits.length > 0
      ? Math.round(scopeAudits.reduce((s, a) => s + a.progress, 0) / scopeAudits.length)
      : 0;

  const userStats = users
    .filter((u) => u.role === "auxiliar")
    .map((u) => {
      const items = scopeItems.filter((i) => i.assignedTo === u.id);
      const counted = items.filter((i) => i.countedQty !== null).length;
      return { user: u, total: items.length, counted, pct: items.length > 0 ? Math.round((counted / items.length) * 100) : 0 };
    })
    .sort((a, b) => b.counted - a.counted);

  const topDiffProducts = diffItems
    .map((i) => ({ name: i.product.name, code: i.product.code, diff: Math.abs((i.countedQty ?? 0) - i.systemQty), isShortage: (i.countedQty ?? 0) < i.systemQty }))
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 10);

  const TABS = [
    { key: "general", label: "General" },
    { key: "users", label: "Usuarios" },
    { key: "diff", label: "Diferencias" },
  ] as const;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPadding + 12 }]}>
        <Text style={styles.headerTitle}>Métricas</Text>
        <View style={styles.tabBar}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabItem, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, tab === t.key ? styles.tabTextActive : styles.tabTextInactive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 34 + 84 : 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {tab === "general" && (
          <>
            <View style={styles.grid2}>
              <MetricCard label="Total Auditorías" value={totalAudits} icon="clipboard" color={colors.primary} />
              <MetricCard label="En Proceso" value={inProgress} icon="activity" color={colors.warning} />
            </View>
            <View style={styles.grid2}>
              <MetricCard label="Aprobadas" value={approved} icon="check-circle" color={colors.success} />
              <MetricCard label="Pendientes" value={pending} icon="clock" color={colors.secondary} />
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Avance Global</Text>
              <View style={styles.progressRow}>
                <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${avgProgress}%` }]} />
                </View>
                <Text style={[styles.progressPct, { color: colors.primary }]}>{avgProgress}%</Text>
              </View>
              <View style={styles.statRow}>
                <View style={styles.stat}>
                  <Text style={[styles.statVal, { color: colors.text }]}>{countedItems}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Contados</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.stat}>
                  <Text style={[styles.statVal, { color: colors.text }]}>{totalItems - countedItems}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Pendientes</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.stat}>
                  <Text style={[styles.statVal, { color: colors.text }]}>{totalItems}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total</Text>
                </View>
              </View>
            </View>

            <View style={styles.grid2}>
              <MetricCard label="Sobrantes" value={surplus} icon="trending-up" color={colors.warning} />
              <MetricCard label="Faltantes" value={shortage} icon="trending-down" color={colors.error} />
            </View>
          </>
        )}

        {tab === "users" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Productividad por Usuario</Text>
            {userStats.map(({ user: u, total, counted, pct }) => (
              <View key={u.id} style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.userRow}>
                  <View style={[styles.userAvatar, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.userAvatarText, { color: colors.primary }]}>{u.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: colors.text }]}>{u.name}</Text>
                    <Text style={[styles.userWarehouse, { color: colors.mutedForeground }]}>{u.warehouse ?? "Sin almacén"}</Text>
                  </View>
                  <Text style={[styles.userPct, { color: pct === 100 ? colors.success : colors.primary }]}>{pct}%</Text>
                </View>
                <View style={styles.progressRow}>
                  <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.progressFill, { backgroundColor: pct === 100 ? colors.success : colors.primary, width: `${pct}%` }]} />
                  </View>
                </View>
                <Text style={[styles.userCountText, { color: colors.mutedForeground }]}>{counted} de {total} ítems contados</Text>
              </View>
            ))}
            {userStats.length === 0 && (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="users" size={28} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Sin datos de usuarios</Text>
              </View>
            )}
          </View>
        )}

        {tab === "diff" && (
          <View style={styles.section}>
            <View style={styles.grid2}>
              <MetricCard label="Con Diferencia" value={diffItems.length} icon="alert-triangle" color={colors.error} />
              <MetricCard label="Sin Diferencia" value={countedItems - diffItems.length} icon="check" color={colors.success} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Productos con Diferencia</Text>
            {topDiffProducts.map((p, i) => (
              <View key={i} style={[styles.diffCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.diffRow}>
                  <View style={[styles.diffIndex, { backgroundColor: i < 3 ? colors.errorLight : colors.muted }]}>
                    <Text style={[styles.diffIndexText, { color: i < 3 ? colors.error : colors.mutedForeground }]}>#{i + 1}</Text>
                  </View>
                  <View style={styles.diffInfo}>
                    <Text style={[styles.diffName, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[styles.diffCode, { color: colors.mutedForeground }]}>{p.code}</Text>
                  </View>
                  <View style={[styles.diffBadge, { backgroundColor: p.isShortage ? colors.errorLight : colors.warningLight }]}>
                    <Feather name={p.isShortage ? "trending-down" : "trending-up"} size={12} color={p.isShortage ? colors.error : colors.warning} />
                    <Text style={[styles.diffVal, { color: p.isShortage ? colors.error : colors.warning }]}>
                      {p.isShortage ? "-" : "+"}{p.diff}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
            {topDiffProducts.length === 0 && (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="check-circle" size={28} color={colors.success} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Sin diferencias registradas</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 0, gap: 12 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  tabBar: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, padding: 3 },
  tabItem: { flex: 1, paddingVertical: 7, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: "#FFFFFF" },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tabTextActive: { color: "#1565C0" },
  tabTextInactive: { color: "rgba(255,255,255,0.8)" },
  content: { padding: 16, gap: 12 },
  grid2: { flexDirection: "row", gap: 10 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressPct: { fontSize: 14, fontFamily: "Inter_700Bold", minWidth: 36, textAlign: "right" },
  statRow: { flexDirection: "row", alignItems: "center" },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 36 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 4 },
  userCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  userAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  userAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  userWarehouse: { fontSize: 12, fontFamily: "Inter_400Regular" },
  userPct: { fontSize: 16, fontFamily: "Inter_700Bold" },
  userCountText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  diffCard: { borderRadius: 12, borderWidth: 1, padding: 12 },
  diffRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  diffIndex: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  diffIndexText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  diffInfo: { flex: 1 },
  diffName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  diffCode: { fontSize: 11, fontFamily: "Inter_400Regular" },
  diffBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  diffVal: { fontSize: 13, fontFamily: "Inter_700Bold" },
  emptyCard: { alignItems: "center", padding: 32, borderRadius: 14, borderWidth: 1, gap: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
