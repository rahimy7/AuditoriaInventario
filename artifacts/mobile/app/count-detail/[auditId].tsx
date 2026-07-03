import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { isBlindForSupervisor, useAuditContext } from "@/contexts/AuditContext";
import { useColors } from "@/hooks/useColors";
import StatusBadge from "@/components/StatusBadge";

export default function CountDetailScreen() {
  const { auditId, auxId } = useLocalSearchParams<{ auditId: string; auxId?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getAudit, getAuditItems, users } = useAuditContext();
  const { user } = useAuth();
  const router = useRouter();

  const audit = getAudit(auditId ?? "");
  const auditItems = getAuditItems(auditId ?? "");

  if (!audit) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <Text style={{ color: colors.mutedForeground }}>Auditoría no encontrada</Text>
    </View>
  );

  const blindSup = isBlindForSupervisor(audit) && user?.role === "supervisor";
  const isConsolidated = !auxId;
  const aux = auxId ? users.find((u) => u.id === auxId) : null;
  const items = isConsolidated ? auditItems : auditItems.filter((i) => i.assignedTo === auxId);

  const totalItems = items.length;
  const distinctProducts = new Set(items.map((i) => i.productId)).size;
  const counted = items.filter((i) => i.countedQty !== null).length;
  const systemUnits = items.reduce((s, i) => s + i.systemQty, 0);
  const countedUnits = items.reduce((s, i) => s + (i.countedQty ?? 0), 0);
  const diffItems = items.filter((i) => i.countedQty !== null && i.countedQty !== i.systemQty).length;
  const unitsDiff = countedUnits - systemUnits;
  const pct = totalItems > 0 ? Math.round((counted / totalItems) * 100) : 0;

  const auxBreakdown = isConsolidated
    ? audit.assignedTo
        .map((uid) => {
          const u = users.find((x) => x.id === uid);
          const uItems = auditItems.filter((i) => i.assignedTo === uid);
          const uCounted = uItems.filter((i) => i.countedQty !== null).length;
          const uCountedUnits = uItems.reduce((s, i) => s + (i.countedQty ?? 0), 0);
          return { u, uid, total: uItems.length, uCounted, uCountedUnits };
        })
        .filter((b) => b.u)
    : [];

  const getUser = (uid: string) => users.find((u) => u.id === uid);

  const title = isConsolidated ? "Conteo Consolidado" : aux?.name ?? "Detalle de Conteo";
  const subtitle = isConsolidated ? `${audit.name} · Todos los auxiliares` : audit.name;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerSub}>{isConsolidated ? "Resumen Global" : "Detalle del Auxiliar"}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {/* Progress + counts */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Avance del Conteo</Text>
            <Text style={[styles.progressPct, { color: colors.primary }]}>{pct}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: pct === 100 ? colors.success : colors.primary, width: `${pct}%` }]} />
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.text }]}>{distinctProducts}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Productos</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.text }]}>{totalItems}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Ítems</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{counted}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Contados</Text>
            </View>
            {!blindSup && (
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: diffItems > 0 ? colors.error : colors.success }]}>{diffItems}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Diferencias</Text>
              </View>
            )}
          </View>
        </View>

        {/* Units comparison */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Total de Unidades</Text>
          <View style={styles.unitsRow}>
            {!blindSup && (
              <View style={[styles.unitBox, { backgroundColor: colors.infoLight }]}>
                <Text style={[styles.unitLabel, { color: colors.info }]}>Sistema</Text>
                <Text style={[styles.unitNum, { color: colors.info }]}>{systemUnits}</Text>
              </View>
            )}
            <View style={[styles.unitBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.unitLabel, { color: colors.primary }]}>Contado</Text>
              <Text style={[styles.unitNum, { color: colors.primary }]}>{countedUnits}</Text>
            </View>
            {!blindSup && (
              <View style={[styles.unitBox, { backgroundColor: unitsDiff === 0 ? colors.successLight : colors.errorLight }]}>
                <Text style={[styles.unitLabel, { color: unitsDiff === 0 ? colors.success : colors.error }]}>Diferencia</Text>
                <Text style={[styles.unitNum, { color: unitsDiff === 0 ? colors.success : colors.error }]}>
                  {unitsDiff > 0 ? "+" : ""}{unitsDiff}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Per-auxiliary breakdown (consolidated only) */}
        {isConsolidated && auxBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Auxiliares ({auxBreakdown.length})</Text>
            <View style={[styles.usersCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {auxBreakdown.map(({ u, uid, total, uCounted, uCountedUnits }) => (
                <TouchableOpacity
                  key={uid}
                  style={[styles.userRow, { borderBottomColor: colors.divider }]}
                  onPress={() => router.push({ pathname: "/count-detail/[auditId]", params: { auditId: audit.id, auxId: uid } })}
                >
                  <View style={[styles.userAvatar, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.userAvatarText, { color: colors.primary }]}>{u!.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: colors.text }]}>{u!.name}</Text>
                    <Text style={[styles.userStat, { color: colors.mutedForeground }]}>
                      {uCounted}/{total} ítems · {uCountedUnits} und.
                    </Text>
                  </View>
                  <Text style={[styles.userPct, { color: colors.primary }]}>
                    {total > 0 ? Math.round((uCounted / total) * 100) : 0}%
                  </Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Items detail */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Detalle de Ítems ({items.length})</Text>
          {items.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="inbox" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Sin ítems para mostrar</Text>
            </View>
          ) : (
            items.map((item) => {
              const hasDiff = !blindSup && item.countedQty !== null && item.countedQty !== item.systemQty;
              const countedColor = blindSup ? colors.primary : (item.countedQty === null ? colors.mutedForeground : (item.countedQty !== item.systemQty ? colors.error : colors.success));
              const assignedUser = isConsolidated ? getUser(item.assignedTo) : null;
              return (
                <View key={item.id} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: hasDiff ? `${colors.error}40` : colors.border }]}>
                  <View style={styles.itemTop}>
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemCode, { color: colors.mutedForeground }]}>{item.product.code}</Text>
                      <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{item.product.name}</Text>
                      <Text style={[styles.itemLocation, { color: colors.mutedForeground }]}>{item.location}</Text>
                    </View>
                    <View style={styles.itemRight}>
                      <StatusBadge status={item.status} type="count" size="sm" />
                      <View style={styles.qtyRow}>
                        {!blindSup && (
                          <View style={[styles.qtyBox, { backgroundColor: colors.infoLight }]}>
                            <Text style={[styles.qtyLabel, { color: colors.info }]}>Sistema</Text>
                            <Text style={[styles.qtyNum, { color: colors.info }]}>{item.systemQty}</Text>
                          </View>
                        )}
                        <View style={[styles.qtyBox, { backgroundColor: hasDiff ? colors.errorLight : colors.successLight }]}>
                          <Text style={[styles.qtyLabel, { color: countedColor }]}>Contado</Text>
                          <Text style={[styles.qtyNum, { color: countedColor }]}>{item.countedQty ?? "—"}</Text>
                        </View>
                      </View>
                      {hasDiff && (
                        <View style={[styles.diffPill, { backgroundColor: colors.errorLight }]}>
                          <Feather name={item.countedQty! > item.systemQty ? "trending-up" : "trending-down"} size={10} color={colors.error} />
                          <Text style={[styles.diffText, { color: colors.error }]}>
                            {item.countedQty! > item.systemQty ? "+" : ""}{(item.countedQty ?? 0) - item.systemQty}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {(assignedUser || item.notes) && (
                    <View style={[styles.itemFooter, { borderTopColor: colors.divider }]}>
                      {assignedUser && (
                        <>
                          <Feather name="user" size={12} color={colors.mutedForeground} />
                          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>{assignedUser.name}</Text>
                        </>
                      )}
                      {item.notes ? (
                        <>
                          {assignedUser && <Text style={[styles.footerDot, { color: colors.mutedForeground }]}>·</Text>}
                          <Text style={[styles.footerText, { color: colors.mutedForeground }]} numberOfLines={1}>{item.notes}</Text>
                        </>
                      ) : null}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, gap: 2 },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  content: { padding: 16, gap: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressPct: { fontSize: 18, fontFamily: "Inter_700Bold" },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  statsRow: { flexDirection: "row" },
  stat: { flex: 1, alignItems: "center", gap: 3 },
  statNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  unitsRow: { flexDirection: "row", gap: 10 },
  unitBox: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12, gap: 4 },
  unitLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  unitNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  usersCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1 },
  userAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  userAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  userStat: { fontSize: 12, fontFamily: "Inter_400Regular" },
  userPct: { fontSize: 14, fontFamily: "Inter_700Bold" },
  itemCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  itemTop: { flexDirection: "row", gap: 10, padding: 12 },
  itemInfo: { flex: 1, gap: 2 },
  itemCode: { fontSize: 11, fontFamily: "Inter_400Regular" },
  itemName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  itemLocation: { fontSize: 11, fontFamily: "Inter_400Regular" },
  itemRight: { alignItems: "flex-end", gap: 6 },
  qtyRow: { flexDirection: "row", gap: 6 },
  qtyBox: { alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, minWidth: 52 },
  qtyLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  qtyNum: { fontSize: 16, fontFamily: "Inter_700Bold" },
  diffPill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  diffText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  itemFooter: { flexDirection: "row", alignItems: "center", gap: 5, padding: 10, paddingHorizontal: 12, borderTopWidth: 1 },
  footerText: { fontSize: 12, fontFamily: "Inter_400Regular", flexShrink: 1 },
  footerDot: { fontSize: 12 },
  emptyCard: { alignItems: "center", padding: 32, borderRadius: 16, borderWidth: 1, gap: 8 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
