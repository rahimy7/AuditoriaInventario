import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert, Modal, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { isBlindForSupervisor, useAuditContext } from "@/contexts/AuditContext";
import { useColors } from "@/hooks/useColors";
import StatusBadge from "@/components/StatusBadge";

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getAudit, getAuditItems, reviewItem, updateAuditStatus, users } = useAuditContext();
  const { user } = useAuth();
  const router = useRouter();
  const [reviewModal, setReviewModal] = useState<{ itemId: string; action: "approve" | "return" } | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const audit = getAudit(id ?? "");
  const items = getAuditItems(id ?? "");
  const sentItems = items.filter((i) => i.status === "enviado" || i.status === "aprobado" || i.status === "devuelto");

  if (!audit) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <Text style={{ color: colors.mutedForeground }}>Auditoría no encontrada</Text>
    </View>
  );

  const blindSup = isBlindForSupervisor(audit) && user?.role === "supervisor";
  const pendingReview = sentItems.filter((i) => i.status === "enviado");
  const approved = sentItems.filter((i) => i.status === "aprobado");
  const returned = sentItems.filter((i) => i.status === "devuelto");

  const handleReview = async () => {
    if (!reviewModal) return;
    await reviewItem(reviewModal.itemId, reviewModal.action, reviewNotes);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setReviewModal(null);
    setReviewNotes("");
  };

  const handleApproveAll = async () => {
    Alert.alert("Aprobar Todo", `¿Aprobar todos los ${pendingReview.length} ítems pendientes?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Aprobar Todo",
        onPress: async () => {
          for (const item of pendingReview) {
            await reviewItem(item.id, "approve", "Aprobado en revisión masiva");
          }
          await updateAuditStatus(audit.id, "aprobado");
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
      },
    ]);
  };

  const getUser = (uid: string) => users.find((u) => u.id === uid);

  const diffColor = (item: typeof items[0]) => {
    if (blindSup) return colors.primary;
    if (item.countedQty === null) return colors.mutedForeground;
    if (item.countedQty === item.systemQty) return colors.success;
    return colors.error;
  };

  const SECTIONS = [
    { title: "Pendientes de Revisión", items: pendingReview, color: colors.warning },
    { title: "Aprobados", items: approved, color: colors.success },
    { title: "Devueltos", items: returned, color: colors.error },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerSub}>Revisión de Supervisor</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{audit.name}</Text>
        </View>
      </View>

      {/* Summary bar */}
      <View style={[styles.summaryBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: colors.warning }]}>{pendingReview.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Pendientes</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: colors.success }]}>{approved.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Aprobados</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: colors.error }]}>{returned.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Devueltos</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
        {SECTIONS.map(({ title, items: sectionItems, color }) => (
          sectionItems.length > 0 && (
            <View key={title} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: color }]} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
                <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
                  <Text style={[styles.badgeText, { color }]}>{sectionItems.length}</Text>
                </View>
              </View>
              {sectionItems.map((item) => {
                const assignedUser = getUser(item.assignedTo);
                const hasDiff = !blindSup && item.countedQty !== null && item.countedQty !== item.systemQty;
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
                            <Text style={[styles.qtyLabel, { color: diffColor(item) }]}>Contado</Text>
                            <Text style={[styles.qtyNum, { color: diffColor(item) }]}>{item.countedQty ?? "—"}</Text>
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

                    {assignedUser && (
                      <View style={[styles.userRow, { borderTopColor: colors.divider }]}>
                        <Feather name="user" size={12} color={colors.mutedForeground} />
                        <Text style={[styles.userText, { color: colors.mutedForeground }]}>{assignedUser.name}</Text>
                        {item.notes ? (
                          <>
                            <Text style={[styles.notesDot, { color: colors.mutedForeground }]}>·</Text>
                            <Text style={[styles.notesText, { color: colors.mutedForeground }]} numberOfLines={1}>{item.notes}</Text>
                          </>
                        ) : null}
                      </View>
                    )}

                    {item.status === "enviado" && (
                      <View style={[styles.actionRow, { borderTopColor: colors.divider }]}>
                        <TouchableOpacity
                          style={[styles.returnBtn, { backgroundColor: colors.errorLight }]}
                          onPress={() => { setReviewModal({ itemId: item.id, action: "return" }); setReviewNotes(""); }}
                        >
                          <Feather name="rotate-ccw" size={14} color={colors.error} />
                          <Text style={[styles.btnText, { color: colors.error }]}>Devolver</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.approveBtn, { backgroundColor: colors.successLight }]}
                          onPress={() => { setReviewModal({ itemId: item.id, action: "approve" }); setReviewNotes(""); }}
                        >
                          <Feather name="check" size={14} color={colors.success} />
                          <Text style={[styles.btnText, { color: colors.success }]}>Aprobar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )
        ))}

        {sentItems.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="clock" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin ítems enviados</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>Los auxiliares aún no han enviado conteos</Text>
          </View>
        )}
      </ScrollView>

      {pendingReview.length > 0 && (
        <View style={[styles.actionBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity style={[styles.approveAllBtn, { backgroundColor: colors.success }]} onPress={handleApproveAll}>
            <Feather name="check-circle" size={18} color="#FFFFFF" />
            <Text style={styles.approveAllText}>Aprobar Todos ({pendingReview.length})</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={!!reviewModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setReviewModal(null)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {reviewModal?.action === "approve" ? "Aprobar Conteo" : "Devolver para Reconteo"}
            </Text>
            <TouchableOpacity onPress={() => setReviewModal(null)}>
              <Feather name="x" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Comentario de revisión (opcional)</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.text }]}
              value={reviewNotes}
              onChangeText={setReviewNotes}
              placeholder={reviewModal?.action === "approve" ? "Ej: Conteo correcto, sin observaciones" : "Ej: Diferencia significativa, verificar estante"}
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: reviewModal?.action === "approve" ? colors.success : colors.error }]}
              onPress={handleReview}
            >
              <Feather name={reviewModal?.action === "approve" ? "check" : "rotate-ccw"} size={18} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>
                {reviewModal?.action === "approve" ? "Confirmar Aprobación" : "Confirmar Devolución"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, gap: 2 },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  summaryBar: { flexDirection: "row", borderBottomWidth: 1 },
  summaryItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  summaryNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  summaryDivider: { width: 1, marginVertical: 8 },
  content: { padding: 16, gap: 16 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
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
  userRow: { flexDirection: "row", alignItems: "center", gap: 5, padding: 10, paddingHorizontal: 12, borderTopWidth: 1 },
  userText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  notesDot: { fontSize: 12 },
  notesText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  actionRow: { flexDirection: "row", gap: 8, padding: 10, paddingHorizontal: 12, borderTopWidth: 1 },
  returnBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, borderRadius: 10 },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, borderRadius: 10 },
  btnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyCard: { alignItems: "center", padding: 40, borderRadius: 16, borderWidth: 1, gap: 8, marginTop: 20 },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  actionBar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 12, borderTopWidth: 1 },
  approveAllBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 14 },
  approveAllText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 20, gap: 12 },
  modalLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  modalInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 100 },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 14, marginTop: 8 },
  confirmBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
});
