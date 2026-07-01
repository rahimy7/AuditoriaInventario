import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditContext, type AuditStatus } from "@/contexts/AuditContext";
import { useColors } from "@/hooks/useColors";
import AuditCard from "@/components/AuditCard";

const STATUS_FILTERS: { label: string; value: AuditStatus | "todos" }[] = [
  { label: "Todos", value: "todos" },
  { label: "En Proceso", value: "en_proceso" },
  { label: "Enviado", value: "enviado" },
  { label: "Revisión", value: "en_revision" },
  { label: "Aprobado", value: "aprobado" },
];

export default function PoolScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { audits, getUserAudits, getSupervisorAudits } = useAuditContext();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AuditStatus | "todos">("todos");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  if (!user) return null;

  const baseAudits =
    user.role === "auxiliar"
      ? getUserAudits(user.id)
      : user.role === "supervisor"
      ? getSupervisorAudits(user.id)
      : audits;

  const filtered = baseAudits.filter((a) => {
    const matchFilter = filter === "todos" || a.status === filter;
    const matchSearch =
      !search.trim() ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.warehouse.toLowerCase().includes(search.toLowerCase()) ||
      a.location.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPadding + 12 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Pool de Trabajo</Text>
          {user.role === "gerente" && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push("/create-audit")}
            >
              <Feather name="plus" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.searchBar, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Feather name="search" size={16} color="rgba(255,255,255,0.8)" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar auditorías..."
            placeholderTextColor="rgba(255,255,255,0.6)"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <View style={[styles.filterWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[
                styles.chip,
                {
                  backgroundColor: filter === f.value ? colors.primary : colors.muted,
                  borderColor: filter === f.value ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilter(f.value)}
            >
              <Text style={[styles.chipText, { color: filter === f.value ? "#FFFFFF" : colors.secondary }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === "web" ? 34 + 84 : 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {filtered.length} {filtered.length === 1 ? "auditoría" : "auditorías"}
        </Text>
        {filtered.map((audit) => (
          <AuditCard key={audit.id} audit={audit} />
        ))}
        {filtered.length === 0 && (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="clipboard" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin resultados</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              No hay auditorías que coincidan con tu búsqueda
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#FFFFFF",
  },
  filterWrap: { borderBottomWidth: 1 },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 0 },
  count: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8 },
  empty: { alignItems: "center", padding: 40, borderRadius: 16, borderWidth: 1, gap: 8, marginTop: 20 },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
