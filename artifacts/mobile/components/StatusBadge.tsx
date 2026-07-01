import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { AuditStatus, CountStatus } from "@/contexts/AuditContext";

const AUDIT_LABELS: Record<AuditStatus, string> = {
  creado: "Creado",
  asignado: "Asignado",
  en_proceso: "En Proceso",
  enviado: "Enviado",
  en_revision: "En Revisión",
  devuelto: "Devuelto",
  aprobado: "Aprobado",
  cerrado: "Cerrado",
};

const COUNT_LABELS: Record<CountStatus, string> = {
  pendiente: "Pendiente",
  contado: "Contado",
  enviado: "Enviado",
  aprobado: "Aprobado",
  devuelto: "Devuelto",
};

interface Props {
  status: AuditStatus | CountStatus;
  type?: "audit" | "count";
  size?: "sm" | "md";
}

export default function StatusBadge({ status, type = "audit", size = "md" }: Props) {
  const colors = useColors();

  const label = type === "audit"
    ? AUDIT_LABELS[status as AuditStatus] ?? status
    : COUNT_LABELS[status as CountStatus] ?? status;

  const getColors = (): { bg: string; text: string } => {
    switch (status) {
      case "creado": return { bg: "#F1F5F9", text: colors.secondary };
      case "asignado": return { bg: colors.surface, text: colors.primary };
      case "en_proceso": return { bg: "#EDE9FE", text: "#5E35B1" };
      case "enviado": return { bg: "#F3E8FF", text: "#8E24AA" };
      case "en_revision": return { bg: colors.warningLight, text: colors.warning };
      case "devuelto": return { bg: colors.errorLight, text: colors.error };
      case "aprobado": return { bg: colors.successLight, text: colors.success };
      case "cerrado": return { bg: "#ECEFF1", text: "#455A64" };
      case "pendiente": return { bg: "#FFF3E0", text: "#E65100" };
      case "contado": return { bg: "#E8EAF6", text: "#3949AB" };
      default: return { bg: colors.muted, text: colors.mutedForeground };
    }
  };

  const { bg, text } = getColors();
  const isSmall = size === "sm";

  return (
    <View style={[styles.badge, { backgroundColor: bg }, isSmall && styles.small]}>
      <View style={[styles.dot, { backgroundColor: text }]} />
      <Text style={[styles.label, { color: text }, isSmall && styles.labelSmall]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
    alignSelf: "flex-start",
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  labelSmall: {
    fontSize: 11,
  },
});
