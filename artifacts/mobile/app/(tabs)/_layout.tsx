import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

function NativeTabLayout({ role }: { role: string }) {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Inicio</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pool">
        <Icon sf={{ default: "list.bullet.clipboard", selected: "list.bullet.clipboard.fill" }} />
        <Label>Pool</Label>
      </NativeTabs.Trigger>
      {(role === "supervisor" || role === "gerente") && (
        <NativeTabs.Trigger name="metrics">
          <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
          <Label>Métricas</Label>
        </NativeTabs.Trigger>
      )}
      {role === "gerente" && (
        <NativeTabs.Trigger name="users">
          <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
          <Label>Usuarios</Label>
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "person.circle", selected: "person.circle.fill" }} />
        <Label>Perfil</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout({ role }: { role: string }) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ) : null,
        tabBarLabelStyle: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: isWeb ? 8 : 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) =>
            isIOS ? <SymbolView name="house" tintColor={color} size={size} /> : <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pool"
        options={{
          title: "Pool",
          tabBarIcon: ({ color, size }) =>
            isIOS ? <SymbolView name="list.bullet.clipboard" tintColor={color} size={size} /> : <Feather name="clipboard" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="metrics"
        options={{
          title: "Métricas",
          href: role === "auxiliar" ? null : undefined,
          tabBarIcon: ({ color, size }) =>
            isIOS ? <SymbolView name="chart.bar" tintColor={color} size={size} /> : <Feather name="bar-chart-2" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Usuarios",
          href: role !== "gerente" ? null : undefined,
          tabBarIcon: ({ color, size }) =>
            isIOS ? <SymbolView name="person.2" tintColor={color} size={size} /> : <Feather name="users" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) =>
            isIOS ? <SymbolView name="person.circle" tintColor={color} size={size} /> : <Feather name="user" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { user } = useAuth();
  const role = user?.role ?? "auxiliar";

  if (isLiquidGlassAvailable()) return <NativeTabLayout role={role} />;
  return <ClassicTabLayout role={role} />;
}
