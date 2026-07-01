import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditContext } from "@/contexts/AuditContext";
import { useColors } from "@/hooks/useColors";
import AuditCard from "@/components/AuditCard";
import MetricCard from "@/components/MetricCard";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { audits, countItems, getUserAudits, getSupervisorAudits } = useAuditContext();
  const router = useRouter();

  if (!user) return null;

  const role = user.role;
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : 100;

  const roleLabel = role === "auxiliar" ? "Auxiliar de Conteo" : role === "supervisor" ? "Supervisor" : "Gerente General";
  const greeting = new Date().getHours() < 12 ? "Buenos días" : new Date().getHours() < 19 ? "Buenas tardes" : "Buenas noches";

  const myAudits = role === "auxiliar"
    ? getUserAudits(user.id)
    : role === "supervisor"
    ? getSupervisorAudits(user.id)
    : audits;

  const pendingAudits = myAudits.filter((a) => ["creado", "asignado", "en_proceso"].includes(a.status));
  const sentAudits = myAudits.filter((a) => ["enviado", "en_revision"].includes(a.status));
  const completedAudits = myAudits.filter((a) => ["aprobado", "cerrado"].includes(a.status));

  const myItems = countItems.filter((i) => i.assignedTo === user.id);
  const pendingItems = myItems.filter((i) => i.status === "pendiente").length;
  const countedItems = myItems.filter((i) => i.countedQty !== null).length;

  const allItems = countItems.filter((i) => myAudits.some((a) => a.id === i.auditId));
  const totalDiff = allItems.filter((i) => i.countedQty !== null && i.countedQty !== i.systemQty).length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPadding, paddingBottom: bottomPadding }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#0D47A1", "#1565C0"]}
        style={[styles.header]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>{user.name.split(" ")[0]}</Text>
            <View style={styles.roleBadge}>
              <Feather name="shield" size={11} color="rgba(255,255,255,0.8)" />
              <Text style={styles.roleLabel}>{roleLabel}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push("/(tabs)/settings")}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
            </View>
          </TouchableOpacity>
        </View>
        {user.warehouse && (
          <View style={styles.warehouseRow}>
            <Feather name="home" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.warehouseText}>{user.warehouse}</Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.body}>
        {/* Metrics Row */}
        <View style={styles.metricsGrid}>
          {role === "auxiliar" ? (
            <>
              <MetricCard label="Pendientes" value={pendingItems} icon="clock" color={colors.warning} />
              <MetricCard label="Contados" value={countedItems} icon="check-circle" color={colors.success} />
            </>
          ) : role === "supervisor" ? (
            <>
              <MetricCard label="Mis Auditorías" value={myAudits.length} icon="clipboard" color={colors.primary} />
              <MetricCard label="En Proceso" value={pendingAudits.length} icon="activity" color={colors.warning} />
            </>
          ) : (
            <>
              <MetricCard label="Total Auditorías" value={audits.length} icon="clipboard" color={colors.primary} />
              <MetricCard label="Diferencias" value={totalDiff} icon="alert-circle" color={colors.error} />
            </>
          )}
        </View>

        <View style={styles.metricsGrid}>
          {role === "auxiliar" ? (
            <>
              <MetricCard label="Enviados" value={sentAudits.length} icon="send" color={colors.accent} />
              <MetricCard label="Aprobados" value={completedAudits.length} icon="award" color={colors.success} />
            </>
          ) : (
            <>
              <MetricCard label="Enviados" value={sentAudits.length} icon="send" color={colors.accent} />
              <MetricCard label="Aprobados" value={completedAudits.length} icon="award" color={colors.success} />
            </>
          )}
        </View>

        {/* Acciones rápidas */}
        {role !== "auxiliar" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Acciones Rápidas</Text>
            <View style={styles.quickActions}>
              {role === "gerente" && (
                <TouchableOpacity
                  style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push("/create-audit")}
                >
                  <View style={[styles.quickIcon, { backgroundColor: colors.surface }]}>
                    <Feather name="plus-circle" size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.quickLabel, { color: colors.text }]}>Nueva Auditoría</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push("/(tabs)/metrics")}
              >
                <View style={[styles.quickIcon, { backgroundColor: "#EDE9FE" }]}>
                  <Feather name="bar-chart-2" size={20} color="#5E35B1" />
                </View>
                <Text style={[styles.quickLabel, { color: colors.text }]}>Ver Métricas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push("/(tabs)/pool")}
              >
                <View style={[styles.quickIcon, { backgroundColor: colors.successLight }]}>
                  <Feather name="list" size={20} color={colors.success} />
                </View>
                <Text style={[styles.quickLabel, { color: colors.text }]}>Pool de Trabajo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Recent Audits */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {role === "auxiliar" ? "Mis Auditorías" : "Auditorías Recientes"}
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/pool")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          {myAudits.slice(0, 3).map((audit) => (
            <AuditCard key={audit.id} audit={audit} />
          ))}
          {myAudits.length === 0 && (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="inbox" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin auditorías asignadas</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>Cuando te asignen trabajo, aparecerá aquí</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 24 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  userName: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginTop: 2 },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  roleLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)" },
  avatarBtn: { marginTop: 4 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  warehouseRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10 },
  warehouseText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  body: { padding: 16, gap: 20 },
  metricsGrid: { flexDirection: "row", gap: 10 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium" },
  quickActions: { flexDirection: "row", gap: 10 },
  quickBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 8,
  },
  quickIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  emptyState: {
    alignItems: "center",
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
