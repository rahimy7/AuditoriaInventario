import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { useAuditContext } from "@/contexts/AuditContext";
import { useColors } from "@/hooks/useColors";

const ROLE_LABELS: Record<UserRole, string> = {
  auxiliar: "Auxiliar de Conteo",
  supervisor: "Supervisor",
  gerente: "Gerente General",
};

const ROLE_COLORS: Record<UserRole, string> = {
  auxiliar: "#3949AB",
  supervisor: "#8E24AA",
  gerente: "#C62828",
};

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { resetData } = useAuditContext();
  const router = useRouter();
  const [notifications, setNotifications] = React.useState(true);
  const [offlineMode, setOfflineMode] = React.useState(true);
  const [confirmLogout, setConfirmLogout] = React.useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : 110;

  if (!user) return null;

  const handleLogout = () => {
    if (Platform.OS !== "web") {
      Alert.alert("Cerrar Sesión", "¿Estás seguro que deseas cerrar tu sesión?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar Sesión",
          style: "destructive",
          onPress: doLogout,
        },
      ]);
    } else {
      setConfirmLogout(true);
    }
  };

  const doLogout = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await logout();
    router.replace("/login");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPadding, paddingBottom: bottomPadding }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={[styles.profileHeader, { backgroundColor: colors.primary }]}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
          </View>
        </View>
        <Text style={styles.profileName}>{user.name}</Text>
        <Text style={styles.profileEmail}>{user.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[user.role] }]}>
          <Feather name="shield" size={11} color="#FFFFFF" />
          <Text style={styles.roleLabel}>{ROLE_LABELS[user.role]}</Text>
        </View>
        {user.warehouse && (
          <View style={styles.warehouseRow}>
            <Feather name="home" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.warehouseText}>{user.warehouse}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        {/* Preferencias */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PREFERENCIAS</Text>

          <View style={[styles.settingRow, { borderBottomColor: colors.divider }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.infoLight }]}>
                <Feather name="bell" size={16} color={colors.info} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Notificaciones</Text>
                <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>Alertas y actualizaciones</Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.successLight }]}>
                <Feather name="wifi-off" size={16} color={colors.success} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Modo Offline</Text>
                <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>Guardar datos localmente</Text>
              </View>
            </View>
            <Switch
              value={offlineMode}
              onValueChange={setOfflineMode}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Información */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>INFORMACIÓN</Text>

          <TouchableOpacity style={[styles.settingRow, { borderBottomColor: colors.divider }]} onPress={() => Alert.alert("InventControl", "Versión 1.0.0\nSistema de Conteo Físico de Inventario")}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.surface }]}>
                <Feather name="info" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Acerca de la App</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>v1.0.0</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: colors.divider }]}
            onPress={() => {
              const doReset = async () => {
                await resetData();
                Alert.alert("Datos restablecidos", "Los datos demo han sido restablecidos. La auditoría de conteo a ciegas ya está disponible en el pool.");
              };
              if (Platform.OS !== "web") {
                Alert.alert("Restablecer Datos Demo", "Esto restaurará las auditorías y conteos al estado inicial. ¿Continuar?", [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Restablecer", style: "destructive", onPress: doReset },
                ]);
              } else {
                doReset();
              }
            }}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: "#EDE9FE" }]}>
                <Feather name="refresh-ccw" size={16} color="#7C3AED" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Restablecer Datos Demo</Text>
                <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>Restaura auditorías iniciales (incl. conteo a ciegas)</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: colors.divider }]}
            onPress={() => Alert.alert("Sincronización", "Datos sincronizados correctamente. Último sync: Hace un momento.")}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.successLight }]}>
                <Feather name="refresh-cw" size={16} color={colors.success} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Sincronizar Datos</Text>
                <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>Último sync: hace un momento</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Alert.alert("Soporte", "Para soporte técnico contacta a tu administrador del sistema.")}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.warningLight }]}>
                <Feather name="help-circle" size={16} color={colors.warning} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Soporte</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        {confirmLogout ? (
          <View style={[styles.confirmBox, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
            <Feather name="alert-triangle" size={20} color={colors.error} />
            <Text style={[styles.confirmText, { color: colors.error }]}>¿Cerrar sesión?</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={[styles.confirmCancel, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => setConfirmLogout(false)}
              >
                <Text style={[styles.confirmCancelText, { color: colors.secondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmOk, { backgroundColor: colors.error }]}
                onPress={doLogout}
              >
                <Feather name="log-out" size={14} color="#FFFFFF" />
                <Text style={styles.confirmOkText}>Salir</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: colors.errorLight, borderColor: `${colors.error}30` }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Feather name="log-out" size={18} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>Cerrar Sesión</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.version, { color: colors.mutedForeground }]}>InventControl © 2026</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: { padding: 24, alignItems: "center", gap: 6, paddingBottom: 32 },
  avatarWrap: { marginBottom: 4 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "rgba(255,255,255,0.3)",
  },
  avatarText: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  profileName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 4 },
  roleLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  warehouseRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  warehouseText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  body: { padding: 16, gap: 16 },
  section: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, padding: 14, paddingBottom: 8 },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderBottomWidth: 1 },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  settingDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  settingRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  settingValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 16, borderWidth: 1 },
  logoutText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  confirmBox: { borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 10, alignItems: "center" },
  confirmText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  confirmBtns: { flexDirection: "row", gap: 10, width: "100%" },
  confirmCancel: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  confirmCancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  confirmOk: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 44, borderRadius: 12 },
  confirmOkText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  version: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
});
