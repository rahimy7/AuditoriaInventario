import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuditContext, type CountItem } from "@/contexts/AuditContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const DEMO_CODES = ["001-MART", "002-TADR", "003-TORN", "005-TUBE", "007-SERR"];

export default function BlindCountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { getAudit, getAuditItems } = useAuditContext();

  const audit = getAudit(id);
  const items = getAuditItems(id);

  const [search, setSearch] = useState("");
  const [modalItem, setModalItem] = useState<CountItem | null>(null);
  const [qty, setQty] = useState("0");
  const [notFound, setNotFound] = useState(false);

  const searchRef = useRef<TextInput>(null);
  const qtyRef = useRef<TextInput>(null);

  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  if (!audit) return null;

  const myItems =
    user?.role === "auxiliar"
      ? items.filter((i) => i.assignedTo === user.id)
      : items;

  const counted = myItems.filter((i) => i.countedQty !== null).length;
  const pending = myItems.filter((i) => i.countedQty === null).length;
  const total = myItems.length;

  const filtered = search.trim()
    ? myItems.filter(
        (i) =>
          i.product.code.toLowerCase().includes(search.toLowerCase()) ||
          i.product.name.toLowerCase().includes(search.toLowerCase())
      )
    : myItems;

  const handleSearch = (text: string) => {
    setSearch(text);
    setNotFound(false);
  };

  const handleEnter = () => {
    if (!search.trim()) return;
    const found = myItems.find(
      (i) =>
        i.product.code.toLowerCase() === search.trim().toLowerCase() ||
        i.product.name.toLowerCase().includes(search.trim().toLowerCase())
    );
    if (found) {
      setNotFound(false);
      openQtyModal(found);
    } else {
      setNotFound(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const openQtyModal = (item: CountItem) => {
    setModalItem(item);
    setQty(item.countedQty?.toString() ?? "0");
    setNotFound(false);
    setTimeout(() => qtyRef.current?.focus(), 200);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const closeModal = () => {
    setModalItem(null);
    setSearch("");
    searchRef.current?.focus();
  };

  const handleQtyIncrement = (delta: number) => {
    const current = parseFloat(qty) || 0;
    setQty(Math.max(0, current + delta).toString());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleContinue = () => {
    if (!modalItem) return;
    const parsedQty = parseFloat(qty);
    if (isNaN(parsedQty) || parsedQty < 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/count/[id]",
      params: { id: modalItem.id, blind: "true", prefillQty: qty },
    });
    setModalItem(null);
    setSearch("");
  };

  const renderItem = ({ item }: { item: CountItem }) => {
    const isCounted = item.countedQty !== null;
    return (
      <TouchableOpacity
        style={[styles.row, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}
        onPress={() => openQtyModal(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.statusDot, { backgroundColor: isCounted ? colors.success : colors.border }]} />
        <View style={styles.rowInfo}>
          <Text style={[styles.rowCode, { color: colors.mutedForeground }]}>{item.product.code}</Text>
          <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
            {item.product.name}
          </Text>
        </View>
        <View style={styles.rowRight}>
          {isCounted ? (
            <View style={[styles.countedBadge, { backgroundColor: colors.successLight }]}>
              <Text style={[styles.countedText, { color: colors.success }]}>
                {item.countedQty} {item.product.unit}
              </Text>
            </View>
          ) : (
            <Text style={[styles.pendingText, { color: colors.mutedForeground }]}>—</Text>
          )}
          <Feather name="chevron-right" size={14} color={colors.border} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPadding + 12 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerMid}>
            <Text style={styles.headerTitle} numberOfLines={1}>{audit.name}</Text>
            <Text style={styles.headerSub}>{audit.warehouse} · {audit.location}</Text>
          </View>
          <View style={styles.blindBadge}>
            <Feather name="eye-off" size={12} color="#FFFFFF" />
            <Text style={styles.blindBadgeText}>Ciegas</Text>
          </View>
        </View>

        {/* Progress mini bar */}
        <View style={styles.progressRow}>
          <View style={styles.progressStats}>
            <View style={styles.progressStat}>
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <Text style={styles.progressStatText}>{counted} contados</Text>
            </View>
            <View style={styles.progressStat}>
              <View style={[styles.dot, { backgroundColor: "#FFA726" }]} />
              <Text style={styles.progressStatText}>{pending} pendientes</Text>
            </View>
          </View>
          <Text style={styles.progressPct}>{total > 0 ? Math.round((counted / total) * 100) : 0}%</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <View style={[styles.progressFill, { width: `${total > 0 ? (counted / total) * 100 : 0}%`, backgroundColor: colors.success }]} />
        </View>
      </View>

      {/* Search / Scan bar */}
      <View style={[styles.scanBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.scanInput, { backgroundColor: colors.muted, borderColor: notFound ? colors.error : colors.border }]}>
          <Feather name="cpu" size={18} color={notFound ? colors.error : colors.primary} />
          <TextInput
            ref={searchRef}
            style={[styles.scanText, { color: colors.text }]}
            value={search}
            onChangeText={handleSearch}
            placeholder="Escanear o ingresar SKU... (Enter para buscar)"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="search"
            onSubmitEditing={handleEnter}
            autoFocus
            autoCorrect={false}
            autoCapitalize="characters"
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => { setSearch(""); setNotFound(false); }}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.scanIconBtn, { backgroundColor: colors.primary }]}
              onPress={handleEnter}
            >
              <Feather name="search" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
        {notFound && (
          <Text style={[styles.notFoundText, { color: colors.error }]}>
            Producto no encontrado en esta auditoría
          </Text>
        )}
        {/* Demo SKU chips */}
        <FlatList
          data={DEMO_CODES}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.demoChips}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                setSearch(item);
                setNotFound(false);
                const found = myItems.find((i) => i.product.code.toLowerCase() === item.toLowerCase());
                if (found) openQtyModal(found);
                else setNotFound(true);
              }}
            >
              <Feather name="bar-chart-2" size={10} color={colors.primary} />
              <Text style={[styles.chipText, { color: colors.primary }]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Product list */}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        style={[styles.list, { backgroundColor: colors.card }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 + 84 : 110 }}
        ListHeaderComponent={
          <View style={[styles.listHeader, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.listHeaderText, { color: colors.mutedForeground }]}>
              {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
            </Text>
            <View style={styles.listHeaderRight}>
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <Text style={[styles.listHeaderText, { color: colors.mutedForeground }]}>Contado</Text>
              <View style={[styles.dot, { backgroundColor: colors.border }]} />
              <Text style={[styles.listHeaderText, { color: colors.mutedForeground }]}>Pendiente</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="package" size={36} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No hay productos{search ? ` para "${search}"` : ""}
            </Text>
          </View>
        }
      />

      {/* Quantity Modal */}
      <Modal
        visible={!!modalItem}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={closeModal} activeOpacity={1} />
          {modalItem && (
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
              {/* Drag handle */}
              <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />

              {/* Product info (NO system stock – blind count) */}
              <View style={[styles.modalProductCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <View style={[styles.modalProductIcon, { backgroundColor: colors.surface }]}>
                  <Feather name="package" size={22} color={colors.primary} />
                </View>
                <View style={styles.modalProductInfo}>
                  <Text style={[styles.modalCode, { color: colors.mutedForeground }]}>{modalItem.product.code}</Text>
                  <Text style={[styles.modalName, { color: colors.text }]} numberOfLines={2}>{modalItem.product.name}</Text>
                  <View style={styles.modalMeta}>
                    <Text style={[styles.modalMetaText, { color: colors.mutedForeground }]}>{modalItem.product.line}</Text>
                    <Text style={[styles.modalMetaDot, { color: colors.mutedForeground }]}>·</Text>
                    <Text style={[styles.modalMetaText, { color: colors.mutedForeground }]}>{modalItem.product.unit}</Text>
                  </View>
                </View>
              </View>

              {/* Quantity input */}
              <Text style={[styles.modalQtyLabel, { color: colors.text }]}>
                Cantidad contada <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <View style={styles.modalQtyRow}>
                <TouchableOpacity
                  style={[styles.modalQtyBtn, { backgroundColor: colors.errorLight }]}
                  onPress={() => handleQtyIncrement(-1)}
                >
                  <Feather name="minus" size={22} color={colors.error} />
                </TouchableOpacity>
                <View style={[styles.modalQtyInput, { borderColor: colors.primary, backgroundColor: colors.muted }]}>
                  <TextInput
                    ref={qtyRef}
                    style={[styles.modalQtyText, { color: colors.text }]}
                    value={qty}
                    onChangeText={setQty}
                    keyboardType="numeric"
                    textAlign="center"
                    returnKeyType="done"
                    onSubmitEditing={handleContinue}
                    selectTextOnFocus
                  />
                  <Text style={[styles.modalQtyUnit, { color: colors.mutedForeground }]}>
                    {modalItem.product.unit}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.modalQtyBtn, { backgroundColor: colors.successLight }]}
                  onPress={() => handleQtyIncrement(1)}
                >
                  <Feather name="plus" size={22} color={colors.success} />
                </TouchableOpacity>
              </View>

              {/* Quick increments */}
              <View style={styles.quickRow}>
                {[1, 5, 10, 25, 50].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => handleQtyIncrement(n)}
                  >
                    <Text style={[styles.quickBtnText, { color: colors.primary }]}>+{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancel, { borderColor: colors.border }]}
                  onPress={closeModal}
                >
                  <Text style={[styles.modalCancelText, { color: colors.secondary }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalContinue, { backgroundColor: colors.primary }]}
                  onPress={handleContinue}
                >
                  <Text style={styles.modalContinueText}>Continuar</Text>
                  <Feather name="arrow-right" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={{ height: insets.bottom + 8 }} />
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  headerMid: { flex: 1 },
  headerTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginTop: 1 },
  blindBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.25)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  blindBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  progressRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressStats: { flexDirection: "row", gap: 12 },
  progressStat: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  progressStatText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)" },
  progressPct: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  progressTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  scanBar: { borderBottomWidth: 1, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, gap: 8 },
  scanInput: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, height: 46, gap: 10 },
  scanText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  scanIconBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  notFoundText: { fontSize: 12, fontFamily: "Inter_500Medium", paddingLeft: 4 },
  demoChips: { gap: 6, paddingBottom: 2 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  list: { flex: 1 },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1 },
  listHeaderText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  listHeaderRight: { flexDirection: "row", alignItems: "center", gap: 5 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  rowInfo: { flex: 1, gap: 1 },
  rowCode: { fontSize: 10, fontFamily: "Inter_400Regular", letterSpacing: 0.5 },
  rowName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  countedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  countedText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  pendingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", justifyContent: "center", padding: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 14, gap: 14, elevation: 20, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  modalProductCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 12 },
  modalProductIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modalProductInfo: { flex: 1, gap: 3 },
  modalCode: { fontSize: 11, fontFamily: "Inter_400Regular" },
  modalName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  modalMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  modalMetaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  modalMetaDot: { fontSize: 12 },
  modalQtyLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  modalQtyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalQtyBtn: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  modalQtyInput: { flex: 1, height: 68, borderRadius: 16, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  modalQtyText: { fontSize: 36, fontFamily: "Inter_700Bold", width: "100%", textAlign: "center" },
  modalQtyUnit: { fontSize: 11, fontFamily: "Inter_400Regular", position: "absolute", bottom: 8 },
  quickRow: { flexDirection: "row", gap: 6 },
  quickBtn: { flex: 1, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  quickBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  modalActions: { flexDirection: "row", gap: 10 },
  modalCancel: { flex: 1, height: 50, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalContinue: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 14 },
  modalContinueText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
});
