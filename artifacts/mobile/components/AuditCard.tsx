import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Audit } from "@/contexts/AuditContext";
import { useColors } from "@/hooks/useColors";
import StatusBadge from "./StatusBadge";

interface Props {
  audit: Audit;
  onPress?: () => void;
}

export default function AuditCard({ audit, onPress }: Props) {
  const colors = useColors();
  const router = useRouter();

  const handlePress = onPress ?? (() => router.push(`/audit/${audit.id}`));

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
            <Feather name="clipboard" size={16} color={colors.primary} />
          </View>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{audit.name}</Text>
        </View>
        <StatusBadge status={audit.status} size="sm" />
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Feather name="home" size={12} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{audit.warehouse}</Text>
        </View>
        <View style={styles.metaDot} />
        <View style={styles.metaItem}>
          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{audit.location}</Text>
        </View>
        {audit.blindCount && (
          <>
            <View style={styles.metaDot} />
            <View style={[styles.blindBadge, { backgroundColor: "#EDE9FE" }]}>
              <Feather name="eye-off" size={10} color="#7C3AED" />
              <Text style={[styles.blindBadgeText, { color: "#7C3AED" }]}>Ciegas</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.progressContainer}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>Avance</Text>
            <Text style={[styles.progressPct, { color: colors.primary }]}>{audit.progress}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: audit.progress === 100 ? colors.success : colors.primary, width: `${audit.progress}%` },
              ]}
            />
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#CBD5E1",
  },
  blindBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  blindBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressContainer: {
    flex: 1,
    gap: 4,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  progressPct: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
});
