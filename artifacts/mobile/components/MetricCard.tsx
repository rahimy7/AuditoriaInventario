import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
}

export default function MetricCard({ label, value, icon, color, sub, trend }: Props) {
  const colors = useColors();
  const accentColor = color ?? colors.primary;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconBox, { backgroundColor: `${accentColor}15` }]}>
        <Feather name={icon as any} size={18} color={accentColor} />
      </View>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {sub && (
        <View style={styles.subRow}>
          {trend === "up" && <Feather name="trending-up" size={10} color={colors.success} />}
          {trend === "down" && <Feather name="trending-down" size={10} color={colors.error} />}
          <Text style={[styles.sub, { color: trend === "up" ? colors.success : trend === "down" ? colors.error : colors.mutedForeground }]}>{sub}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
    alignItems: "flex-start",
    minWidth: 140,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  value: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    lineHeight: 28,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  sub: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
