import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ALL_USERS, useAuth } from "@/contexts/AuthContext";
import { useAuditContext } from "@/contexts/AuditContext";
import { useColors } from "@/hooks/useColors";
import StatusBadge from "@/components/StatusBadge";

export default function AuditDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getAudit, getAuditItems, assignUsers, updateAuditStatus, closeAudit } = useAuditContext();
  const router = useRouter();
  const [showAssign, setShowAssign] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const audit = getAudit(id ?? "");
  const items = getAuditItems(id ?? "");

  if (!audit || !user) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <Text style={{ color: colors.mutedForeground }}>Auditoría no encontrada</Text>
    </View>
  );

  const counted = items.filter((i) => i.countedQty !== null).length;
  const sent = items.filter((i) => i.status === "enviado" || i.status === "aprobado").length;
  const diff = items.filter((i) => i.countedQty !== null && i.countedQty !== i.systemQty).length;

  const myItems = items.filter((i) => i.assignedTo === user.id);
  const canCount = user.role === "auxiliar" && audit.assignedTo.includes(user.id);
  const canAssign = user.role === "supervisor" || user.role === "gerente";
  const canClose = user.role === "gerente" && audit.status === "aprobado";

  const auxiliares = ALL_USERS.filter((u) => u.role === "auxiliar");

  const handleAssign = async () => {
    await assignUsers(audit.id, selectedUsers);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAssign(false);
  };

  const handleSendAll = async () => {
    Alert.alert("Enviar Conteo", "¿Enviar todos los ítems contados al supervisor?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Enviar",
        onPress: async () => {
          await updateAuditStatus(audit.id, "enviado");
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
      },
    ]);
  };

  const handleClose = async () => {
    Alert.alert("Cerrar Auditoría", "¿Cerrar esta auditoría? No podrá modificarse.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar",
        style: "destructive",
        onPress: async () => {
          await closeAudit(audit.id);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
      },
    ]);
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={2}>{audit.name}</Text>
          <StatusBadge status={audit.status} />
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Feather name="home" size={15} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Almacén</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{audit.warehouse}</Text>
          </View>
          <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.divider }]}>
            <Feather name="map-pin" size={15} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Ubicación</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{audit.location}</Text>
          </View>
          <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.divider }]}>
            <Feather name="calendar" size={15} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Creado</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(audit.createdAt)}</Text>
          </View>
          <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.divider }]}>
            <Feather name="tag" size={15} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Líneas</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{audit.lines.join(", ")}</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>Avance del Conteo</Text>
            <Text style={[styles.progressPct, { color: colors.primary }]}>{audit.progress}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: audit.progress === 100 ? colors.success : colors.primary, width: `${audit.progress}%` }]} />
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.text }]}>{items.length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{counted}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Contados</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.success }]}>{sent}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Enviados</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: diff > 0 ? colors.error : colors.success }]}>{diff}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Diferencias</Text>
            </View>
          </View>
        </View>

        {/* Assigned users */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Auxiliares Asignados</Text>
            {canAssign && (
              <TouchableOpacity
                onPress={() => { setSelectedUsers(audit.assignedTo); setShowAssign(true); }}
                style={[styles.assignBtn, { backgroundColor: colors.surface }]}
              >
                <Feather name="user-plus" size={14} color={colors.primary} />
                <Text style={[styles.assignBtnText, { color: colors.primary }]}>Asignar</Text>
              </TouchableOpacity>
            )}
          </View>
          {audit.assignedTo.length === 0 ? (
            <View style={[styles.emptySmall, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.emptySmallText, { color: colors.mutedForeground }]}>Sin auxiliares asignados</Text>
            </View>
          ) : (
            <View style={[styles.usersCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {audit.assignedTo.map((uid) => {
                const u = ALL_USERS.find((x) => x.id === uid);
                if (!u) return null;
                const uItems = items.filter((i) => i.assignedTo === uid);
                const uCounted = uItems.filter((i) => i.countedQty !== null).length;
                return (
                  <View key={uid} style={[styles.userRow, { borderBottomColor: colors.divider }]}>
                    <View style={[styles.userAvatar, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.userAvatarText, { color: colors.primary }]}>{u.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, { color: colors.text }]}>{u.name}</Text>
                      <Text style={[styles.userStat, { color: colors.mutedForeground }]}>{uCounted}/{uItems.length} ítems</Text>
                    </View>
                    <Text style={[styles.userPct, { color: colors.primary }]}>
                      {uItems.length > 0 ? Math.round((uCounted / uItems.length) * 100) : 0}%
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Items list */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {canCount ? "Mis Ítems" : "Ítems de Conteo"} ({canCount ? myItems.length : items.length})
          </Text>
          {(canCount ? myItems : items).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/count/${item.id}`)}
            >
              <View style={styles.itemLeft}>
                <Text style={[styles.itemCode, { color: colors.mutedForeground }]}>{item.product.code}</Text>
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{item.product.name}</Text>
                <Text style={[styles.itemLocation, { color: colors.mutedForeground }]}>{item.location}</Text>
              </View>
              <View style={styles.itemRight}>
                <StatusBadge status={item.status} type="count" size="sm" />
                {item.countedQty !== null && (
                  <Text style={[styles.itemQty, {
                    color: item.countedQty !== item.systemQty ? colors.error : colors.success
                  }]}>
                    {item.countedQty} / {item.systemQty}
                  </Text>
                )}
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View style={[styles.actionBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
        {canCount && myItems.some((i) => i.status === "contado") && (
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleSendAll}>
            <Feather name="send" size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Enviar al Supervisor</Text>
          </TouchableOpacity>
        )}
        {canCount && (
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push(`/scanner`)}
          >
            <Feather name="camera" size={18} color={colors.primary} />
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Escanear</Text>
          </TouchableOpacity>
        )}
        {canClose && (
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.success }]} onPress={handleClose}>
            <Feather name="archive" size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Cerrar Auditoría</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Assign Modal */}
      <Modal visible={showAssign} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAssign(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Asignar Auxiliares</Text>
            <TouchableOpacity onPress={() => setShowAssign(false)}>
              <Feather name="x" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {auxiliares.map((u) => {
              const selected = selectedUsers.includes(u.id);
              return (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.assignRow, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.surface : colors.card }]}
                  onPress={() => setSelectedUsers((prev) => selected ? prev.filter((x) => x !== u.id) : [...prev, u.id])}
                >
                  <View style={[styles.userAvatar, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.userAvatarText, { color: colors.primary }]}>{u.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: colors.text }]}>{u.name}</Text>
                    <Text style={[styles.userStat, { color: colors.mutedForeground }]}>{u.warehouse}</Text>
                  </View>
                  {selected && <Feather name="check-circle" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary, flex: 1 }]} onPress={handleAssign}>
              <Text style={styles.primaryBtnText}>Confirmar ({selectedUsers.length})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerText: { gap: 8 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  content: { padding: 16, gap: 16 },
  infoCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular", width: 70 },
  infoValue: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, textAlign: "right" },
  progressCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  progressPct: { fontSize: 18, fontFamily: "Inter_700Bold" },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  statsRow: { flexDirection: "row" },
  stat: { flex: 1, alignItems: "center", gap: 3 },
  statNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  assignBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  assignBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  emptySmall: { padding: 16, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  emptySmallText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  usersCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1 },
  userAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  userAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  userStat: { fontSize: 12, fontFamily: "Inter_400Regular" },
  userPct: { fontSize: 14, fontFamily: "Inter_700Bold" },
  itemCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  itemLeft: { flex: 1, gap: 2 },
  itemCode: { fontSize: 11, fontFamily: "Inter_400Regular" },
  itemName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  itemLocation: { fontSize: 11, fontFamily: "Inter_400Regular" },
  itemRight: { alignItems: "flex-end", gap: 4 },
  itemQty: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  actionBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 10, padding: 12, borderTopWidth: 1 },
  primaryBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 14 },
  primaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  secondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 14, paddingHorizontal: 16, borderWidth: 1 },
  secondaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 16, gap: 8 },
  assignRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 2 },
  modalFooter: { padding: 16, borderTopWidth: 1 },
});
