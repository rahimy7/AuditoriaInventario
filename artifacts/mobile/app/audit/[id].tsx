import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { isBlindForAuxiliar, useAuditContext, type CountItem } from "@/contexts/AuditContext";
import { useColors } from "@/hooks/useColors";
import StatusBadge from "@/components/StatusBadge";

export default function AuditDetailScreen() {
  const { id, scanItem } = useLocalSearchParams<{ id: string; scanItem?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getAudit, getAuditItems, assignUsers, updateAuditStatus, closeAudit, saveCount, users } = useAuditContext();
  const router = useRouter();
  const [showAssign, setShowAssign] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [countTarget, setCountTarget] = useState<CountItem | null>(null);
  const [qtyInput, setQtyInput] = useState("");

  const audit = getAudit(id ?? "");
  const items = getAuditItems(id ?? "");

  // When returning from the scanner with a resolved item, open the quantity modal for it.
  useEffect(() => {
    if (!scanItem) return;
    const it = items.find((i) => i.id === scanItem);
    if (it) { setCountTarget(it); setQtyInput(""); }
    router.setParams({ scanItem: "" });
  }, [scanItem, items, router]);

  if (!audit || !user) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <Text style={{ color: colors.mutedForeground }}>Auditoría no encontrada</Text>
    </View>
  );

  const myItems = items.filter((i) => i.assignedTo === user.id);
  const canCount = user.role === "auxiliar" && audit.assignedTo.includes(user.id);
  const canAssign = user.role === "supervisor" || user.role === "gerente";
  const canClose = user.role === "gerente" && audit.status === "aprobado";

  // The auxiliary's audit view is their own counting sheet: stats reflect only their items.
  const viewItems = canCount ? myItems : items;
  const counted = viewItems.filter((i) => i.countedQty !== null).length;
  const sent = viewItems.filter((i) => i.status === "enviado" || i.status === "aprobado").length;
  const diff = viewItems.filter((i) => i.countedQty !== null && i.countedQty !== i.systemQty).length;
  const displayProgress = canCount
    ? (viewItems.length > 0 ? Math.round((counted / viewItems.length) * 100) : 0)
    : audit.progress;

  const auxiliaresAll = users.filter((u) => u.role === "auxiliar" && u.active !== false);
  const auxiliaresInWarehouse = auxiliaresAll.filter((u) => u.warehouse === audit.warehouse);
  const auxiliares = auxiliaresInWarehouse.length > 0 ? auxiliaresInWarehouse : auxiliaresAll;

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

  // ── Auxiliary: compact, search-driven counting sheet ──────────────────────
  if (canCount) {
    const blindAux = isBlindForAuxiliar(audit);
    const q = query.trim().toLowerCase();
    const filteredItems = q
      ? myItems.filter((i) =>
          i.product.code.toLowerCase().includes(q) ||
          i.product.name.toLowerCase().includes(q) ||
          i.location.toLowerCase().includes(q)
        )
      : myItems;

    const openItem = (item: CountItem) => { setQtyInput(""); setCountTarget(item); };

    const handleSubmit = () => {
      if (!q) return;
      const exact = myItems.find((i) => i.product.code.toLowerCase() === q);
      const target = exact ?? (filteredItems.length === 1 ? filteredItems[0] : undefined);
      if (target) { setQuery(""); openItem(target); return; }
      if (filteredItems.length === 0) {
        Alert.alert("Producto no encontrado", `No hay ningún producto con "${query}" en tu hoja de conteo.`);
      }
    };

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>{audit.name}</Text>
            <Text style={styles.headerSub}>{counted}/{myItems.length} contados · {sent} enviados</Text>
          </View>
        </View>

        {/* Search bar with scan */}
        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar por SKU o código de barras"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={handleSubmit}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Feather name="x-circle" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.scanIconBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: "/scanner", params: { auditId: audit.id } })}
          >
            <Feather name="camera" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[styles.auxList, { paddingBottom: 110 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[styles.auxListLabel, { color: colors.mutedForeground }]}>
            {q ? `${filteredItems.length} resultado(s)` : `${myItems.length} productos por contar`}
          </Text>
          {filteredItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openItem(item)}
            >
              <View style={styles.itemLeft}>
                <Text style={[styles.itemCode, { color: colors.mutedForeground }]}>{item.product.code}</Text>
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{item.product.name}</Text>
                <Text style={[styles.itemLocation, { color: colors.mutedForeground }]}>{item.location}</Text>
              </View>
              <View style={styles.itemRight}>
                <StatusBadge status={item.status} type="count" size="sm" />
                {item.countedQty !== null && (
                  <Text style={[styles.itemQty, { color: blindAux ? colors.text : (item.countedQty !== item.systemQty ? colors.error : colors.success) }]}>
                    {blindAux ? `${item.countedQty} ${item.product.unit}` : `${item.countedQty} / ${item.systemQty}`}
                  </Text>
                )}
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </View>
            </TouchableOpacity>
          ))}
          {filteredItems.length === 0 && (
            <View style={[styles.emptySmall, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.emptySmallText, { color: colors.mutedForeground }]}>
                {q ? `Sin coincidencias para "${query}"` : "No tienes productos asignados"}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Send bar */}
        {myItems.some((i) => i.status === "contado") && (
          <View style={[styles.actionBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleSendAll}>
              <Feather name="send" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Enviar al Supervisor</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quantity capture modal */}
        <QuantityModal
          item={countTarget}
          qty={qtyInput}
          setQty={setQtyInput}
          colors={colors}
          showStock={!blindAux}
          onClose={() => setCountTarget(null)}
          onSave={async (finalQty) => {
            if (!countTarget) return;
            await saveCount(countTarget.id, finalQty, countTarget.notes, countTarget.photos);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setCountTarget(null);
          }}
        />
      </View>
    );
  }

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
            <Text style={[styles.progressTitle, { color: colors.text }]}>{canCount ? "Mi Avance de Conteo" : "Avance del Conteo"}</Text>
            <Text style={[styles.progressPct, { color: colors.primary }]}>{displayProgress}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: displayProgress === 100 ? colors.success : colors.primary, width: `${displayProgress}%` }]} />
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.text }]}>{viewItems.length}</Text>
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

        {/* Assigned users — supervisors/gerentes only. The auxiliary goes straight to their counting sheet. */}
        {canAssign && (
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
                const u = users.find((x) => x.id === uid);
                if (!u) return null;
                const uItems = items.filter((i) => i.assignedTo === uid);
                const uCounted = uItems.filter((i) => i.countedQty !== null).length;
                const RowComponent: React.ComponentType<any> = canAssign ? TouchableOpacity : View;
                return (
                  <RowComponent
                    key={uid}
                    style={[styles.userRow, { borderBottomColor: colors.divider }]}
                    onPress={canAssign ? () => router.push({ pathname: "/count-detail/[auditId]", params: { auditId: audit.id, auxId: uid } }) : undefined}
                  >
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
                    {canAssign && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
                  </RowComponent>
                );
              })}
            </View>
          )}

          {/* Consolidated global view — supervisor / gerente */}
          {canAssign && (
            <TouchableOpacity
              style={[styles.consolidatedBtn, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              onPress={() => router.push({ pathname: "/count-detail/[auditId]", params: { auditId: audit.id } })}
            >
              <Feather name="layers" size={18} color={colors.primary} />
              <View style={styles.consolidatedText}>
                <Text style={[styles.consolidatedTitle, { color: colors.primary }]}>Ver Conteo Consolidado</Text>
                <Text style={[styles.consolidatedSub, { color: colors.mutedForeground }]}>Total de ítems y productos de todos los auxiliares</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
        )}
      </ScrollView>

      {/* Action buttons */}
      {canClose && (
        <View style={[styles.actionBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.success }]} onPress={handleClose}>
            <Feather name="archive" size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Cerrar Auditoría</Text>
          </TouchableOpacity>
        </View>
      )}

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

// Lightweight modal that only asks for the counted quantity.
function QuantityModal({
  item, qty, setQty, colors, showStock, onClose, onSave,
}: {
  item: CountItem | null;
  qty: string;
  setQty: (v: string) => void;
  colors: ReturnType<typeof useColors>;
  showStock: boolean;
  onClose: () => void;
  onSave: (finalQty: number) => void | Promise<void>;
}) {
  const inputRef = useRef<TextInput>(null);
  const focusInput = () => setTimeout(() => inputRef.current?.focus(), Platform.OS === "android" ? 150 : 50);

  if (!item) return null;

  const parsed = parseFloat(qty);
  const isValid = !isNaN(parsed) && parsed >= 0;
  const hasExisting = item.countedQty !== null;

  const confirm = () => {
    if (!isValid) { Alert.alert("Cantidad inválida", "Ingresa una cantidad válida."); return; }
    if (hasExisting) {
      Alert.alert(
        "Este ítem ya tiene conteo",
        `Conteo actual: ${item.countedQty} ${item.product.unit}.\n¿Qué deseas hacer con ${parsed} ${item.product.unit}?`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Reemplazar", onPress: () => onSave(parsed) },
          { text: "Agregar", onPress: () => onSave((item.countedQty ?? 0) + parsed) },
        ]
      );
    } else {
      onSave(parsed);
    }
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose} onShow={focusInput}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={[styles.qtyCard, { backgroundColor: colors.card }]} activeOpacity={1} onPress={() => inputRef.current?.focus()}>
          <View style={styles.qtyHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.qtyCode, { color: colors.mutedForeground }]}>{item.product.code}</Text>
              <Text style={[styles.qtyName, { color: colors.text }]} numberOfLines={2}>{item.product.name}</Text>
              {item.location ? (
                <View style={styles.qtyLocation}>
                  <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.qtyLocationText, { color: colors.mutedForeground }]}>{item.location}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          {showStock ? (
            <View style={[styles.qtyStock, { backgroundColor: colors.infoLight }]}>
              <Feather name="database" size={14} color={colors.info} />
              <Text style={[styles.qtyStockText, { color: colors.info }]}>
                Existencia en sistema: {item.systemQty} {item.product.unit}
              </Text>
            </View>
          ) : (
            <View style={[styles.qtyStock, { backgroundColor: colors.muted }]}>
              <Feather name="eye-off" size={14} color={colors.mutedForeground} />
              <Text style={[styles.qtyStockText, { color: colors.mutedForeground }]}>
                Conteo a ciegas · stock oculto
              </Text>
            </View>
          )}

          {hasExisting && (
            <View style={[styles.qtyExisting, { backgroundColor: colors.surface }]}>
              <Feather name="info" size={13} color={colors.primary} />
              <Text style={[styles.qtyExistingText, { color: colors.primary }]}>
                Ya registrado: {item.countedQty} {item.product.unit}
              </Text>
            </View>
          )}

          <Text style={[styles.qtyLabel, { color: colors.text }]}>Cantidad contada</Text>
          <TextInput
            ref={inputRef}
            style={[styles.qtyInput, { borderColor: colors.primary, backgroundColor: colors.muted, color: colors.text }]}
            value={qty}
            onChangeText={setQty}
            keyboardType="numeric"
            placeholder=""
            textAlign="center"
            returnKeyType="done"
            showSoftInputOnFocus
            onSubmitEditing={confirm}
          />

          <View style={styles.qtyActions}>
            <TouchableOpacity style={[styles.qtyCancel, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.qtyCancelText, { color: colors.primary }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.qtySave, { backgroundColor: colors.primary, opacity: isValid ? 1 : 0.5 }]} onPress={confirm} disabled={!isValid}>
              <Feather name="check" size={18} color="#FFFFFF" />
              <Text style={styles.qtySaveText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerText: { gap: 8 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1 },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, height: 48, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  scanIconBtn: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  auxList: { padding: 16, gap: 10 },
  auxListLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 2 },
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
  consolidatedBtn: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  consolidatedText: { flex: 1, gap: 2 },
  consolidatedTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  consolidatedSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
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
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  qtyCard: { borderRadius: 20, padding: 20, gap: 14 },
  qtyHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  qtyCode: { fontSize: 12, fontFamily: "Inter_400Regular" },
  qtyName: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 2 },
  qtyLocation: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  qtyLocationText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  qtyStock: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  qtyStockText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  qtyExisting: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  qtyExistingText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  qtyLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  qtyInput: { borderWidth: 2, borderRadius: 16, height: 72, fontSize: 34, fontFamily: "Inter_700Bold" },
  qtyActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  qtyCancel: { flex: 1, alignItems: "center", justifyContent: "center", height: 50, borderRadius: 14, borderWidth: 1 },
  qtyCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  qtySave: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 14 },
  qtySaveText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
});
