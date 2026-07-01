import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert, Image, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuditContext } from "@/contexts/AuditContext";
import { useColors } from "@/hooks/useColors";
import StatusBadge from "@/components/StatusBadge";

export default function CountScreen() {
  const { id, blind, prefillQty } = useLocalSearchParams<{ id: string; blind?: string; prefillQty?: string }>();
  const isBlind = blind === "true";
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { countItems, saveCount, submitCount } = useAuditContext();
  const router = useRouter();

  const item = countItems.find((i) => i.id === id);
  const [qty, setQty] = useState(prefillQty ?? item?.countedQty?.toString() ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [photos, setPhotos] = useState<string[]>(item?.photos ?? []);
  const [isSaving, setIsSaving] = useState(false);

  if (!item) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <Text style={{ color: colors.mutedForeground }}>Ítem no encontrado</Text>
    </View>
  );

  const parsedQty = parseFloat(qty);
  const isValid = !isNaN(parsedQty) && parsedQty >= 0;
  const diff = isValid ? parsedQty - item.systemQty : null;
  const hasDiff = diff !== null && diff !== 0;

  const handleSave = async () => {
    if (!isValid) { Alert.alert("Cantidad inválida", "Ingresa una cantidad válida."); return; }
    setIsSaving(true);
    await saveCount(item.id, parsedQty, notes, photos);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSaving(false);
    Alert.alert("Guardado", "Conteo guardado como borrador.", [{ text: "OK", onPress: () => router.back() }]);
  };

  const handleSubmit = async () => {
    if (!isValid) { Alert.alert("Cantidad inválida", "Ingresa una cantidad válida."); return; }
    Alert.alert("Enviar Conteo", "¿Enviar este conteo al supervisor?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Enviar",
        onPress: async () => {
          await saveCount(item.id, parsedQty, notes, photos);
          await submitCount(item.id);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
      },
    ]);
  };

  const handlePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Se necesita acceso a la cámara para tomar fotos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: false });
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0]!.uri]);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleIncrement = (delta: number) => {
    const current = parseFloat(qty) || 0;
    const next = Math.max(0, current + delta);
    setQty(next.toString());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerSub}>Registrar Conteo</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>{item.product.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => router.push({ pathname: "/scanner", params: { returnId: item.id } })}
          >
            <Feather name="camera" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 130 }]} showsVerticalScrollIndicator={false}>
          {/* Product Info */}
          <View style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.productRow}>
              <View style={[styles.productIcon, { backgroundColor: colors.surface }]}>
                <Feather name="package" size={22} color={colors.primary} />
              </View>
              <View style={styles.productInfo}>
                <Text style={[styles.productCode, { color: colors.mutedForeground }]}>{item.product.code}</Text>
                <Text style={[styles.productName, { color: colors.text }]}>{item.product.name}</Text>
                <View style={styles.productMeta}>
                  <View style={styles.metaItem}>
                    <Feather name="layers" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.product.category}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Feather name="grid" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.product.line}</Text>
                  </View>
                </View>
              </View>
              <StatusBadge status={item.status} type="count" size="sm" />
            </View>

            <View style={[styles.locationRow, { borderTopColor: colors.divider, backgroundColor: colors.muted }]}>
              <Feather name="map-pin" size={13} color={colors.mutedForeground} />
              <Text style={[styles.locationText, { color: colors.mutedForeground }]}>{item.location}</Text>
            </View>
          </View>

          {/* System Stock — hidden in blind count mode */}
          {isBlind ? (
            <View style={[styles.stockCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="eye-off" size={16} color={colors.mutedForeground} />
              <View style={styles.stockInfo}>
                <Text style={[styles.stockLabel, { color: colors.mutedForeground }]}>Modo Conteo a Ciegas</Text>
                <Text style={[styles.stockHidden, { color: colors.mutedForeground }]}>Stock del sistema oculto</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.stockCard, { backgroundColor: colors.infoLight, borderColor: `${colors.info}30` }]}>
              <Feather name="database" size={16} color={colors.info} />
              <View style={styles.stockInfo}>
                <Text style={[styles.stockLabel, { color: colors.info }]}>Existencia en Sistema</Text>
                <Text style={[styles.stockNum, { color: colors.info }]}>{item.systemQty} {item.product.unit}</Text>
              </View>
            </View>
          )}

          {/* Count Input */}
          <View style={[styles.countCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.countLabel, { color: colors.text }]}>Cantidad Física Contada</Text>

            <View style={styles.countRow}>
              <TouchableOpacity
                style={[styles.countBtn, { backgroundColor: colors.errorLight }]}
                onPress={() => handleIncrement(-1)}
              >
                <Feather name="minus" size={20} color={colors.error} />
              </TouchableOpacity>

              <View style={[styles.countInput, { borderColor: hasDiff ? colors.error : colors.primary, backgroundColor: colors.muted }]}>
                <TextInput
                  style={[styles.countText, { color: colors.text }]}
                  value={qty}
                  onChangeText={setQty}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  textAlign="center"
                />
                <Text style={[styles.countUnit, { color: colors.mutedForeground }]}>{item.product.unit}</Text>
              </View>

              <TouchableOpacity
                style={[styles.countBtn, { backgroundColor: colors.successLight }]}
                onPress={() => handleIncrement(1)}
              >
                <Feather name="plus" size={20} color={colors.success} />
              </TouchableOpacity>
            </View>

            {/* Quick increment buttons */}
            <View style={styles.quickRow}>
              {[5, 10, 25, 50].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handleIncrement(n)}
                >
                  <Text style={[styles.quickBtnText, { color: colors.primary }]}>+{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Difference indicator — hidden in blind count mode */}
            {!isBlind && diff !== null && (
              <View style={[styles.diffBox, { backgroundColor: hasDiff ? colors.errorLight : colors.successLight }]}>
                <Feather
                  name={hasDiff ? (diff > 0 ? "trending-up" : "trending-down") : "check-circle"}
                  size={16}
                  color={hasDiff ? colors.error : colors.success}
                />
                <Text style={[styles.diffText, { color: hasDiff ? colors.error : colors.success }]}>
                  {diff === 0 ? "Sin diferencia" : `${diff > 0 ? "Sobrante" : "Faltante"}: ${Math.abs(diff)} ${item.product.unit}`}
                </Text>
              </View>
            )}
          </View>

          {/* Notes */}
          <View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Observaciones</Text>
            <TextInput
              style={[styles.notesInput, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.text }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Agregar observaciones, notas de ubicación, condición del producto..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Photos */}
          <View style={[styles.photosCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.photosHeader}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Evidencias Fotográficas</Text>
              <TouchableOpacity onPress={handlePhoto} style={[styles.photoAddBtn, { backgroundColor: colors.surface }]}>
                <Feather name="camera" size={16} color={colors.primary} />
                <Text style={[styles.photoAddText, { color: colors.primary }]}>Foto</Text>
              </TouchableOpacity>
            </View>
            {photos.length === 0 ? (
              <TouchableOpacity
                style={[styles.photosEmpty, { borderColor: colors.border, backgroundColor: colors.muted }]}
                onPress={handlePhoto}
              >
                <Feather name="camera" size={28} color={colors.mutedForeground} />
                <Text style={[styles.photosEmptyText, { color: colors.mutedForeground }]}>Tomar foto como evidencia</Text>
              </TouchableOpacity>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
                {photos.map((uri, i) => (
                  <View key={i} style={styles.photoWrap}>
                    <Image source={{ uri }} style={styles.photo} />
                    <TouchableOpacity
                      style={[styles.photoRemove, { backgroundColor: colors.error }]}
                      onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <Feather name="x" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.photoAdd, { borderColor: colors.border, backgroundColor: colors.muted }]}
                  onPress={handlePhoto}
                >
                  <Feather name="plus" size={22} color={colors.mutedForeground} />
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={[styles.actionBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Feather name="save" size={18} color={colors.primary} />
            <Text style={[styles.saveBtnText, { color: colors.primary }]}>Guardar Borrador</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={isSaving || !isValid}
          >
            <Feather name="send" size={18} color="#FFFFFF" />
            <Text style={styles.submitBtnText}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerContent: { flex: 1 },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  scanBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 14 },
  productCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  productRow: { flexDirection: "row", gap: 12, padding: 14 },
  productIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  productInfo: { flex: 1, gap: 3 },
  productCode: { fontSize: 11, fontFamily: "Inter_400Regular" },
  productName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  productMeta: { flexDirection: "row", gap: 10, marginTop: 2 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, paddingHorizontal: 14, borderTopWidth: 1 },
  locationText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  stockCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  stockInfo: { flex: 1 },
  stockLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  stockNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
  stockHidden: { fontSize: 13, fontFamily: "Inter_500Medium" },
  countCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  countLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  countRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  countBtn: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  countInput: { flex: 1, height: 64, borderRadius: 16, borderWidth: 2, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  countText: { fontSize: 32, fontFamily: "Inter_700Bold", textAlign: "center", width: "100%" },
  countUnit: { fontSize: 12, fontFamily: "Inter_400Regular", position: "absolute", bottom: 8, right: 12 },
  quickRow: { flexDirection: "row", gap: 8 },
  quickBtn: { flex: 1, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  quickBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  diffBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10 },
  diffText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  notesCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  fieldLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  notesInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 80 },
  photosCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  photosHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  photoAddBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  photoAddText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  photosEmpty: { alignItems: "center", justifyContent: "center", gap: 8, padding: 24, borderRadius: 12, borderWidth: 1, borderStyle: "dashed" },
  photosEmptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  photosRow: { gap: 10 },
  photoWrap: { position: "relative" },
  photo: { width: 80, height: 80, borderRadius: 10 },
  photoRemove: { position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  photoAdd: { width: 80, height: 80, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  actionBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 10, padding: 12, borderTopWidth: 1 },
  saveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 14, borderWidth: 1 },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  submitBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 14 },
  submitBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
});
