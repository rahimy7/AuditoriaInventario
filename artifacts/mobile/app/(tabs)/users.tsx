import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuditContext } from "@/contexts/AuditContext";
import { type User, type UserRole } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const ROLE_LABELS: Record<UserRole, string> = {
  auxiliar: "Auxiliar",
  supervisor: "Supervisor",
  gerente: "Gerente",
};

const ROLE_COLORS: Record<UserRole, string> = {
  auxiliar: "#3949AB",
  supervisor: "#8E24AA",
  gerente: "#C62828",
};

export default function UsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { audits, users, getUserAudits } = useAuditContext();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<User | null>(null);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const filtered = users.filter(
    (u) =>
      !search.trim() ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const groupedByRole: Record<UserRole, User[]> = { auxiliar: [], supervisor: [], gerente: [] };
  filtered.forEach((u) => groupedByRole[u.role].push(u));

  const userAuditCount = (userId: string) => getUserAudits(userId).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPadding + 12 }]}>
        <Text style={styles.headerTitle}>Gestión de Usuarios</Text>
        <View style={[styles.searchBar, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Feather name="search" size={16} color="rgba(255,255,255,0.8)" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar usuario..."
            placeholderTextColor="rgba(255,255,255,0.6)"
          />
        </View>
      </View>

      {/* Summary cards */}
      <View style={[styles.summaryRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["auxiliar", "supervisor", "gerente"] as UserRole[]).map((role) => (
          <View key={role} style={styles.summaryItem}>
            <Text style={[styles.summaryCount, { color: ROLE_COLORS[role] }]}>
              {users.filter((u) => u.role === role).length}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{ROLE_LABELS[role]}s</Text>
          </View>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 34 + 84 : 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {(["gerente", "supervisor", "auxiliar"] as UserRole[]).map((role) => {
          const roleUsers = groupedByRole[role];
          if (roleUsers.length === 0) return null;
          return (
            <View key={role} style={styles.group}>
              <View style={styles.groupHeader}>
                <View style={[styles.roleDot, { backgroundColor: ROLE_COLORS[role] }]} />
                <Text style={[styles.groupTitle, { color: colors.text }]}>{ROLE_LABELS[role]}s</Text>
                <View style={[styles.groupCount, { backgroundColor: `${ROLE_COLORS[role]}15` }]}>
                  <Text style={[styles.groupCountText, { color: ROLE_COLORS[role] }]}>{roleUsers.length}</Text>
                </View>
              </View>
              {roleUsers.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setSelected(u)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.avatar, { backgroundColor: `${ROLE_COLORS[u.role]}15` }]}>
                    <Text style={[styles.avatarText, { color: ROLE_COLORS[u.role] }]}>{u.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: colors.text }]}>{u.name}</Text>
                    <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{u.email}</Text>
                    {u.warehouse && (
                      <View style={styles.warehouseRow}>
                        <Feather name="home" size={10} color={colors.mutedForeground} />
                        <Text style={[styles.warehouseText, { color: colors.mutedForeground }]}>{u.warehouse}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.userMeta}>
                    <View style={[styles.roleBadge, { backgroundColor: `${ROLE_COLORS[u.role]}15` }]}>
                      <Text style={[styles.roleText, { color: ROLE_COLORS[u.role] }]}>{ROLE_LABELS[u.role]}</Text>
                    </View>
                    {u.role !== "gerente" && (
                      <Text style={[styles.auditCount, { color: colors.mutedForeground }]}>
                        {userAuditCount(u.id)} auditorías
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}
      </ScrollView>

      {/* User detail modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Detalle de Usuario</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Feather name="x" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={[styles.modalAvatar, { backgroundColor: `${ROLE_COLORS[selected.role]}15` }]}>
                <Text style={[styles.modalAvatarText, { color: ROLE_COLORS[selected.role] }]}>{selected.name.charAt(0)}</Text>
              </View>
              <Text style={[styles.modalName, { color: colors.text }]}>{selected.name}</Text>
              <View style={[styles.modalRoleBadge, { backgroundColor: `${ROLE_COLORS[selected.role]}15` }]}>
                <Text style={[styles.modalRoleText, { color: ROLE_COLORS[selected.role] }]}>{ROLE_LABELS[selected.role]}</Text>
              </View>

              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.infoRow}>
                  <Feather name="mail" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Correo</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{selected.email}</Text>
                </View>
                {selected.warehouse && (
                  <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <Feather name="home" size={16} color={colors.mutedForeground} />
                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Almacén</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{selected.warehouse}</Text>
                  </View>
                )}
                {selected.role !== "gerente" && (
                  <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <Feather name="clipboard" size={16} color={colors.mutedForeground} />
                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Auditorías</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{userAuditCount(selected.id)}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.errorLight }]}
                onPress={() => {
                  Alert.alert("Función demo", "En la versión completa podrías editar o desactivar usuarios.");
                  setSelected(null);
                }}
              >
                <Feather name="edit-2" size={16} color={colors.error} />
                <Text style={[styles.actionBtnText, { color: colors.error }]}>Editar Usuario</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  searchBar: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 12, height: 42, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#FFFFFF" },
  summaryRow: { flexDirection: "row", borderBottomWidth: 1 },
  summaryItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  summaryCount: { fontSize: 22, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  content: { padding: 16, gap: 16 },
  group: { gap: 8 },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  roleDot: { width: 8, height: 8, borderRadius: 4 },
  groupTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  groupCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  groupCountText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  userCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 12, gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  userInfo: { flex: 1, gap: 2 },
  userName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  userEmail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  warehouseRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  warehouseText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  userMeta: { alignItems: "flex-end", gap: 4 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  auditCount: { fontSize: 11, fontFamily: "Inter_400Regular" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalContent: { alignItems: "center", padding: 24, gap: 12 },
  modalAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  modalAvatarText: { fontSize: 32, fontFamily: "Inter_700Bold" },
  modalName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  modalRoleBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  modalRoleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  infoCard: { borderRadius: 14, borderWidth: 1, width: "100%", overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular", width: 60 },
  infoValue: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, textAlign: "right" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, width: "100%", justifyContent: "center", marginTop: 8 },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
