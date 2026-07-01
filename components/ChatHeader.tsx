import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useProfile } from "@/context/ProfileContext";

export default function ChatHeader() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 8 : insets.top;
  const { theirName, theirAvatarUri, clearMessages, darkMode } = useProfile();

  const initial = theirName.charAt(0).toUpperCase();

  const pillBg    = darkMode ? "#242f3d" : "#ffffff";
  const nameColor = darkMode ? "#ffffff" : "#0a0a0a";
  const subColor  = darkMode ? "#7c92a3" : "#777";
  const iconColor = darkMode ? "#b0bec5" : "#1a1a1a";
  const divColor  = darkMode ? "#3a4f60" : "#e0e0e0";
  const shadowOp  = darkMode ? 0 : 0.12;

  function handleClearChat() {
    if (Platform.OS === "web") { clearMessages(); return; }
    Alert.alert("Clear Chat", "All messages will be deleted. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clearMessages },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.inner}>

        <Pressable
          style={[styles.backCircle, { backgroundColor: pillBg, shadowOpacity: shadowOp }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={iconColor} />
        </Pressable>

        <Pressable
          style={[styles.centerPill, { backgroundColor: pillBg, shadowOpacity: shadowOp }]}
          onPress={() => router.back()}
        >
          {theirAvatarUri ? (
            <Image source={{ uri: theirAvatarUri }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <View style={styles.initialCircle}>
              <Text style={styles.initialText}>{initial}</Text>
            </View>
          )}

          <View style={styles.textBlock}>
            <View style={styles.nameRow}>
              <Text style={[styles.nameText, { color: nameColor }]} numberOfLines={1}>{theirName}</Text>
              <MaterialIcons name="volume-off" size={16} color={subColor} style={{ marginLeft: 4 }} />
            </View>
            <Text style={[styles.statusText, { color: subColor }]} numberOfLines={1}>last seen recently</Text>
          </View>
        </Pressable>

        <View style={[styles.rightPill, { backgroundColor: pillBg, shadowOpacity: shadowOp }]}>
          <Pressable style={styles.pillBtn}>
            <Feather name="phone" size={20} color={iconColor} />
          </Pressable>
          <View style={[styles.pillDivider, { backgroundColor: divColor }]} />
          <Pressable style={styles.pillBtn} onPress={handleClearChat}>
            <Feather name="more-vertical" size={20} color={iconColor} />
          </Pressable>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 10, paddingBottom: 10 },
  inner: { flexDirection: "row", alignItems: "center", gap: 8 },

  backCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  centerPill: {
    flex: 1, flexDirection: "row", alignItems: "center",
    borderRadius: 999, paddingLeft: 8, paddingRight: 14,
    paddingVertical: 8, gap: 10, minHeight: 52,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  avatarImg: { width: 36, height: 36, borderRadius: 18, flexShrink: 0 },
  initialCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#3390ec", alignItems: "center",
    justifyContent: "center", flexShrink: 0,
  },
  initialText: { color: "#fff", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  textBlock: { flex: 1, gap: 1 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  nameText: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statusText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  rightPill: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 999, paddingHorizontal: 6, paddingVertical: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  pillBtn: { paddingHorizontal: 8, paddingVertical: 2, alignItems: "center", justifyContent: "center" },
  pillDivider: { width: 1, height: 18, marginHorizontal: 2 },
});
