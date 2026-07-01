import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuditContext, type Product } from "@/contexts/AuditContext";
import { useColors } from "@/hooks/useColors";

const CATEGORIES = ["Todas", "Herramientas", "Eléctricos", "Tornillería", "Pinturas", "Plomería", "Construcción", "Seguridad", "Abrasivos", "Jardín"];

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { searchProducts } = useAuditContext();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const results = searchProducts(query).filter(
    (p) => category === "Todas" || p.category === category
  );

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/scanner?prefill=${item.code}`)}
      activeOpacity={0.75}
    >
      <View style={[styles.productIcon, { backgroundColor: colors.surface }]}>
        <Feather name="package" size={18} color={colors.primary} />
      </View>
      <View style={styles.productInfo}>
        <Text style={[styles.productCode, { color: colors.mutedForeground }]}>{item.code}</Text>
        <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.metaChip, { backgroundColor: colors.surface }]}>
            <Text style={[styles.metaText, { color: colors.primary }]}>{item.category}</Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: colors.muted }]}>
            <Text style={[styles.metaText, { color: colors.secondary }]}>{item.line}</Text>
          </View>
        </View>
      </View>
      <View style={styles.productRight}>
        <View style={[styles.stockBox, { backgroundColor: colors.infoLight }]}>
          <Text style={[styles.stockNum, { color: colors.info }]}>{item.systemStock}</Text>
          <Text style={[styles.stockUnit, { color: colors.info }]}>{item.unit}</Text>
        </View>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPadding + 12 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buscar Productos</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={[styles.searchBar, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Feather name="search" size={16} color="rgba(255,255,255,0.8)" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nombre, código o categoría..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Feather name="x" size={16} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category filter */}
      <View style={[styles.catWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.catChip, { backgroundColor: category === item ? colors.primary : colors.muted, borderColor: category === item ? colors.primary : colors.border }]}
              onPress={() => setCategory(item)}
            >
              <Text style={[styles.catText, { color: category === item ? "#FFFFFF" : colors.secondary }]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Results */}
      <FlatList
        data={results}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 34 : 30 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {results.length} {results.length === 1 ? "producto" : "productos"}
          </Text>
        }
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin resultados</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              No encontramos productos para "{query}"
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  searchBar: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 12, height: 42, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#FFFFFF" },
  catWrap: { borderBottomWidth: 1 },
  catRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  catText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  list: { padding: 16, gap: 0 },
  count: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8 },
  productCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 12, gap: 12, marginBottom: 8 },
  productIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  productInfo: { flex: 1, gap: 4 },
  productCode: { fontSize: 11, fontFamily: "Inter_400Regular" },
  productName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  metaRow: { flexDirection: "row", gap: 6 },
  metaChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  metaText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  productRight: { alignItems: "center", gap: 6 },
  stockBox: { alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  stockNum: { fontSize: 16, fontFamily: "Inter_700Bold" },
  stockUnit: { fontSize: 10, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", padding: 40, borderRadius: 16, borderWidth: 1, gap: 8, marginTop: 20 },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
