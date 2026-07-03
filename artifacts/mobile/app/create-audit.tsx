import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditContext } from "@/contexts/AuditContext";
import { useColors } from "@/hooks/useColors";

const FALLBACK_WAREHOUSES = ["Almacén Central", "Almacén Norte", "Almacén Sur", "Almacén Este"];
const LINES = ["Ferretería", "Hidráulica", "Instalaciones", "Materiales", "Acabados", "EPP", "Jardín"];
const CATEGORIES = ["Herramientas", "Eléctricos", "Tornillería", "Pinturas", "Plomería", "Construcción", "Seguridad", "Abrasivos", "Riego"];

export default function CreateAuditScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { createAudit, users, warehouses } = useAuditContext();
  const router = useRouter();

  const WAREHOUSES = warehouses.length > 0 ? warehouses.filter((w) => w.active).map((w) => w.name) : FALLBACK_WAREHOUSES;

  const [name, setName] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [location, setLocation] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [blindForAuxiliar, setBlindForAuxiliar] = useState(false);
  const [blindForSupervisor, setBlindForSupervisor] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const supervisorsAll = users.filter((u) => u.role === "supervisor" && u.active !== false);
  const supervisorsInWarehouse = warehouse
    ? supervisorsAll.filter((u) => u.warehouse === warehouse)
    : supervisorsAll;
  const supervisors = supervisorsInWarehouse.length > 0 ? supervisorsInWarehouse : supervisorsAll;

  const handleSelectWarehouse = (w: string) => {
    setWarehouse(w);
    // Clear supervisor if they don't belong to the new warehouse
    if (supervisorId) {
      const sup = users.find((u) => u.id === supervisorId);
      if (sup && sup.warehouse !== w) setSupervisorId("");
    }
  };

  const handleSelectSupervisor = (sup: { id: string; warehouse?: string }) => {
    setSupervisorId(sup.id);
    // Auto-fill warehouse from supervisor if not selected
    if (!warehouse && sup.warehouse) setWarehouse(sup.warehouse);
  };

  const toggleLine = (line: string) => {
    setSelectedLines((prev) =>
      prev.includes(line) ? prev.filter((l) => l !== line) : [...prev, line]
    );
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const renderBlindToggle = (active: boolean, title: string, desc: string, onToggle: () => void) => (
    <View style={[styles.toggleCard, { backgroundColor: active ? "#EDE9FE" : colors.muted, borderColor: active ? "#7C3AED" : colors.border }]}>
      <View style={styles.toggleLeft}>
        <View style={[styles.toggleIcon, { backgroundColor: active ? "#7C3AED" : colors.surface }]}>
          <Feather name={active ? "eye-off" : "eye"} size={18} color={active ? "#FFFFFF" : colors.mutedForeground} />
        </View>
        <View style={styles.toggleInfo}>
          <Text style={[styles.toggleTitle, { color: active ? "#4C1D95" : colors.text }]}>{title}</Text>
          <Text style={[styles.toggleDesc, { color: active ? "#6D28D9" : colors.mutedForeground }]}>{desc}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.toggleSwitch, { backgroundColor: active ? "#7C3AED" : colors.border }]}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <View style={[styles.toggleThumb, { transform: [{ translateX: active ? 18 : 0 }] }]} />
      </TouchableOpacity>
    </View>
  );

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert("Campo requerido", "Ingresa un nombre para la auditoría."); return; }
    if (!warehouse) { Alert.alert("Campo requerido", "Selecciona un almacén."); return; }
    if (!location.trim()) { Alert.alert("Campo requerido", "Ingresa una ubicación."); return; }
    if (!supervisorId) { Alert.alert("Campo requerido", "Selecciona un supervisor."); return; }

    setIsCreating(true);
    await createAudit({
      name: name.trim(),
      warehouse,
      location: location.trim(),
      status: "creado",
      assignedTo: [],
      supervisorId,
      createdBy: user?.id ?? "u5",
      lines: selectedLines,
      categories: selectedCategories,
      blindForAuxiliar,
      blindForSupervisor,
    });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsCreating(false);
    Alert.alert("Auditoría Creada", `"${name}" fue creada exitosamente.`, [
      { text: "Ver Pool", onPress: () => router.replace("/(tabs)/pool") },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nueva Auditoría</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
          {/* Name */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Nombre de la Auditoría *</Text>
            <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.muted }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="Ej: Conteo Almacén Central Q3 2026"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          {/* Warehouse */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Almacén *</Text>
            <View style={styles.chipGroup}>
              {WAREHOUSES.map((w) => (
                <TouchableOpacity
                  key={w}
                  style={[styles.chip, { backgroundColor: warehouse === w ? colors.primary : colors.muted, borderColor: warehouse === w ? colors.primary : colors.border }]}
                  onPress={() => handleSelectWarehouse(w)}
                >
                  <Text style={[styles.chipText, { color: warehouse === w ? "#FFFFFF" : colors.secondary }]}>{w}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Ubicación / Zona *</Text>
            <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.muted }]}>
              <Feather name="map-pin" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={location}
                onChangeText={setLocation}
                placeholder="Ej: Pasillo A, Góndola 1-3"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          {/* Supervisor */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Supervisor Asignado *
              {warehouse && supervisorsInWarehouse.length > 0 && (
                <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}> — filtrados por {warehouse}</Text>
              )}
            </Text>
            {supervisors.length === 0 && (
              <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                No hay supervisores{warehouse ? ` en ${warehouse}` : ""} disponibles.
              </Text>
            )}
            <View style={styles.chipGroup}>
              {supervisors.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.supervisorChip, { backgroundColor: supervisorId === s.id ? colors.primary : colors.muted, borderColor: supervisorId === s.id ? colors.primary : colors.border }]}
                  onPress={() => handleSelectSupervisor(s)}
                >
                  <View style={[styles.supAvatar, { backgroundColor: supervisorId === s.id ? "rgba(255,255,255,0.2)" : colors.surface }]}>
                    <Text style={[styles.supAvatarText, { color: supervisorId === s.id ? "#FFFFFF" : colors.primary }]}>{s.name.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={[styles.supName, { color: supervisorId === s.id ? "#FFFFFF" : colors.text }]}>{s.name}</Text>
                    <Text style={[styles.supWarehouse, { color: supervisorId === s.id ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>{s.warehouse}</Text>
                  </View>
                  {supervisorId === s.id && <Feather name="check" size={16} color="#FFFFFF" style={{ marginLeft: "auto" }} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Blind count per role */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Conteo a Ciegas</Text>
            <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
              Oculta el stock del sistema al rol seleccionado. Si no está activo, sí puede verlo.
            </Text>
            {renderBlindToggle(
              blindForAuxiliar,
              "Ciego para Auxiliar",
              "El auxiliar no ve el stock al contar",
              () => setBlindForAuxiliar((v) => !v)
            )}
            {renderBlindToggle(
              blindForSupervisor,
              "Ciego para Supervisor",
              "El supervisor no ve el stock al revisar",
              () => setBlindForSupervisor((v) => !v)
            )}
          </View>

          {/* Lines */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Líneas de Productos</Text>
            <View style={styles.chipGroup}>
              {LINES.map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.chip, { backgroundColor: selectedLines.includes(l) ? "#EDE9FE" : colors.muted, borderColor: selectedLines.includes(l) ? "#7C3AED" : colors.border }]}
                  onPress={() => toggleLine(l)}
                >
                  {selectedLines.includes(l) && <Feather name="check" size={12} color="#7C3AED" />}
                  <Text style={[styles.chipText, { color: selectedLines.includes(l) ? "#7C3AED" : colors.secondary }]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Categories */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Categorías</Text>
            <View style={styles.chipGroup}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, { backgroundColor: selectedCategories.includes(c) ? colors.successLight : colors.muted, borderColor: selectedCategories.includes(c) ? colors.success : colors.border }]}
                  onPress={() => toggleCategory(c)}
                >
                  {selectedCategories.includes(c) && <Feather name="check" size={12} color={colors.success} />}
                  <Text style={[styles.chipText, { color: selectedCategories.includes(c) ? colors.success : colors.secondary }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={[styles.actionBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.cancelText, { color: colors.secondary }]}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }, isCreating && styles.btnDisabled]}
            onPress={handleCreate}
            disabled={isCreating}
          >
            <Feather name="plus" size={18} color="#FFFFFF" />
            <Text style={styles.createText}>Crear Auditoría</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16, justifyContent: "space-between" },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  content: { padding: 16, gap: 20 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  fieldHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -2 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  chipGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  toggleCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 16, borderWidth: 1.5, gap: 12 },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  toggleIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  toggleInfo: { flex: 1, gap: 2 },
  toggleTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  toggleDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  toggleSwitch: { width: 46, height: 26, borderRadius: 13, padding: 3, justifyContent: "center" },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF" },
  supervisorChip: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 2, width: "100%" },
  supAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  supAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  supName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  supWarehouse: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actionBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 10, padding: 12, borderTopWidth: 1 },
  cancelBtn: { flex: 1, height: 50, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  createBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 14 },
  btnDisabled: { opacity: 0.7 },
  createText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
});
