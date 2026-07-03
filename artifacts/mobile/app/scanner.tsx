import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditContext } from "@/contexts/AuditContext";
import { useColors } from "@/hooks/useColors";

export default function ScannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { returnId, auditId } = useLocalSearchParams<{ returnId?: string; auditId?: string }>();
  const { searchProducts, countItems } = useAuditContext();
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<ReturnType<typeof searchProducts>[0] | null>(null);
  const [notFound, setNotFound] = useState(false);

  // When launched from an auxiliary's counting sheet, resolve a scanned code to
  // their count item in this audit and open it directly to enter the quantity.
  const openInAudit = (productCode: string) => {
    if (!auditId) return;
    const item = countItems.find(
      (i) => i.auditId === auditId
        && i.product.code.toLowerCase() === productCode.toLowerCase()
        && (!user || i.assignedTo === user.id)
    );
    if (item) { router.replace({ pathname: "/audit/[id]", params: { id: auditId, scanItem: item.id } }); return; }
    const inCatalog = searchProducts(productCode)[0];
    if (inCatalog && inCatalog.code.toLowerCase() === productCode.toLowerCase()) {
      Alert.alert("Producto no asignado", `${inCatalog.code} no está en tu hoja de conteo de esta auditoría.`);
    } else {
      handleSearch(productCode);
    }
  };

  const handleSearch = (query: string) => {
    setCode(query);
    setNotFound(false);
    setResult(null);
    if (!query.trim()) return;
    const products = searchProducts(query);
    if (products.length > 0 && products[0]) {
      setResult(products[0]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (query.length >= 3) {
      setNotFound(true);
    }
  };

  const handleSelect = () => {
    if (!result) return;
    if (auditId) {
      openInAudit(result.code);
    } else if (returnId) {
      router.back();
    } else {
      router.push(`/search?query=${encodeURIComponent(result.code)}`);
    }
  };

  const simulateScan = (code: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (auditId) {
      openInAudit(code);
    } else {
      handleSearch(code);
    }
  };

  const DEMO_CODES = ["001-MART", "002-TADR", "003-TORN", "005-TUBE", "013-GUAD"];

  return (
    <View style={[styles.container, { backgroundColor: "#0A0A0A" }]}>
      {/* Simulated camera viewfinder */}
      <View style={[styles.viewfinder, { paddingTop: insets.top }]}>
        <View style={styles.viewfinderHeader}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => router.back()}
          >
            <Feather name="x" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.viewfinderTitle}>Escanear Código</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Scanner frame */}
        <View style={styles.scannerArea}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          <View style={styles.scanLine} />
          <Text style={styles.scanHint}>Centra el código de barras en el recuadro</Text>
        </View>

        {/* Demo codes for scanning simulation */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Simular escaneo (demo):</Text>
          <View style={styles.demoRow}>
            {DEMO_CODES.map((c) => (
              <TouchableOpacity
                key={c}
                style={styles.demoChip}
                onPress={() => simulateScan(c)}
              >
                <Feather name="cpu" size={12} color="#1E88E5" />
                <Text style={styles.demoChipText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Bottom panel */}
      <View style={[styles.bottomPanel, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
        <Text style={[styles.panelTitle, { color: colors.text }]}>O ingresa el código manualmente</Text>
        <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.muted }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={code}
            onChangeText={handleSearch}
            placeholder="Código de producto (ej: 001-MART)"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => handleSearch(code)}
          />
          {code.length > 0 && (
            <TouchableOpacity onPress={() => { setCode(""); setResult(null); setNotFound(false); }}>
              <Feather name="x-circle" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Result */}
        {result && (
          <TouchableOpacity
            style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}
            onPress={handleSelect}
            activeOpacity={0.8}
          >
            <View style={styles.resultLeft}>
              <View style={[styles.resultIcon, { backgroundColor: colors.primary }]}>
                <Feather name="package" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.resultInfo}>
                <Text style={[styles.resultCode, { color: colors.mutedForeground }]}>{result.code}</Text>
                <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>{result.name}</Text>
                <Text style={[styles.resultMeta, { color: colors.mutedForeground }]}>{result.category} · {result.line}</Text>
              </View>
            </View>
            <View style={styles.resultRight}>
              <View style={[styles.stockBadge, { backgroundColor: colors.infoLight }]}>
                <Text style={[styles.stockNum, { color: colors.info }]}>{result.systemStock}</Text>
                <Text style={[styles.stockUnit, { color: colors.info }]}>{result.unit}</Text>
              </View>
              <Feather name="arrow-right" size={18} color={colors.primary} />
            </View>
          </TouchableOpacity>
        )}

        {notFound && (
          <View style={[styles.notFoundCard, { backgroundColor: colors.errorLight, borderColor: `${colors.error}30` }]}>
            <Feather name="alert-circle" size={18} color={colors.error} />
            <Text style={[styles.notFoundText, { color: colors.error }]}>
              Código "{code}" no encontrado en el catálogo
            </Text>
          </View>
        )}

        {!result && !notFound && (
          <TouchableOpacity
            style={[styles.searchCatalogBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push("/search")}
          >
            <Feather name="grid" size={16} color={colors.primary} />
            <Text style={[styles.searchCatalogText, { color: colors.primary }]}>Buscar en Catálogo</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  viewfinder: { flex: 1, alignItems: "center" },
  viewfinderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", paddingHorizontal: 16, paddingVertical: 12 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  viewfinderTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  scannerArea: {
    width: 260,
    height: 200,
    marginTop: 40,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  corner: { position: "absolute", width: 28, height: 28, borderColor: "#1E88E5", borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  scanLine: {
    position: "absolute",
    width: "90%",
    height: 2,
    backgroundColor: "#1E88E5",
    opacity: 0.8,
  },
  scanHint: { position: "absolute", bottom: -30, fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", textAlign: "center" },
  demoSection: { marginTop: 60, alignItems: "center", gap: 10 },
  demoTitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },
  demoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", paddingHorizontal: 20 },
  demoChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(30,136,229,0.15)", borderColor: "rgba(30,136,229,0.3)", borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  demoChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#1E88E5" },
  bottomPanel: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  panelTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 50 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  resultCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 2, padding: 12, gap: 10 },
  resultLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  resultIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  resultInfo: { flex: 1, gap: 2 },
  resultCode: { fontSize: 11, fontFamily: "Inter_400Regular" },
  resultName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  resultMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  resultRight: { alignItems: "center", gap: 6 },
  stockBadge: { alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  stockNum: { fontSize: 16, fontFamily: "Inter_700Bold" },
  stockUnit: { fontSize: 10, fontFamily: "Inter_400Regular" },
  notFoundCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  notFoundText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  searchCatalogBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 46, borderRadius: 12, borderWidth: 1 },
  searchCatalogText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
