import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useProfile } from "@/context/ProfileContext";
import PatternSvg from "../assets/images/pattern.svg";

function PatternOverlay() {
  return (
    <View style={[StyleSheet.absoluteFillObject, { opacity: 0.14 }]} pointerEvents="none">
      <PatternSvg width="100%" height="100%" viewBox="0 0 1440 2960" preserveAspectRatio="xMidYMid slice" />
    </View>
  );
}

type EditField = { key: "theirName" | "theirPhone" | "theirUsername" | "theirBio"; label: string };

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const ctx = useProfile();
  const [editField, setEditField] = useState<EditField | null>(null);
  const [editValue, setEditValue] = useState("");
  const [activeTab, setActiveTab] = useState<"you" | "them">("you");
  const avatarFileRef = Platform.OS === "web" ? React.useRef<HTMLInputElement | null>(null) : null;

  const allMsgs = ctx.messages;
  const filteredMsgs = allMsgs.filter((m) => activeTab === "you" ? m.sent : !m.sent).slice(-6);

  function handleTheirAvatarPress() {
    if (Platform.OS === "web") {
      if (avatarFileRef?.current) {
        avatarFileRef.current.value = "";
        avatarFileRef.current.click();
      }
      return;
    }
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        ctx.updateTheirProfile({ avatarUri: result.assets[0].uri });
      }
    })();
  }

  function handleWebAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    ctx.updateTheirProfile({ avatarUri: url });
  }

  function openEdit(key: EditField["key"], label: string, val: string) {
    setEditField({ key, label });
    setEditValue(val);
  }

  function saveEdit() {
    if (!editField) return;
    const trimmed = editValue.trim();
    if (!trimmed) { setEditField(null); return; }
    const k = editField.key;
    if (k === "theirName") ctx.updateTheirProfile({ name: trimmed });
    else if (k === "theirPhone") ctx.updateTheirProfile({ phone: trimmed });
    else if (k === "theirUsername") ctx.updateTheirProfile({ username: trimmed });
    else if (k === "theirBio") ctx.updateTheirProfile({ bio: trimmed });
    setEditField(null);
  }

  const infoRows: Array<{ icon: string; key: EditField["key"]; label: string; val: string; sub: string }> = [
    { icon: "phone",    key: "theirPhone",    label: ctx.theirPhone,    val: ctx.theirPhone,    sub: "Mobile" },
    { icon: "at-sign",  key: "theirUsername", label: ctx.theirUsername, val: ctx.theirUsername, sub: "Username" },
    { icon: "info",     key: "theirBio",      label: ctx.theirBio,      val: ctx.theirBio,      sub: "Bio" },
  ];

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#b2d4a8", "#6aab6a", "#4a8a4a"]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFillObject} />
      <PatternOverlay />

      {Platform.OS === "web" && (
        <input
          ref={avatarFileRef as any}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleWebAvatarChange as any}
        />
      )}

      <View style={[styles.topBar, { paddingTop: Platform.OS === "web" ? 44 : insets.top + 4 }]}>
        <Pressable style={styles.topBarBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.topBarTitle}>Profile</Text>
        <View style={styles.topBarBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <Pressable onPress={handleTheirAvatarPress} style={styles.avatarWrap}>
            <Image
              source={ctx.theirAvatarUri ? { uri: ctx.theirAvatarUri } : require("../assets/images/flash_avatar.jpg")}
              style={styles.avatarImg}
              contentFit="cover"
            />
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={styles.cameraText}>Upload</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => openEdit("theirName", "Name", ctx.theirName)} style={styles.nameWrap}>
            <Text style={styles.profileName}>{ctx.theirName}</Text>
            <Feather name="edit-2" size={13} color="rgba(255,255,255,0.8)" style={{ marginLeft: 6, marginTop: 5 }} />
          </Pressable>
          <Text style={styles.profileStatus}>last seen recently</Text>
        </View>

        <View style={styles.actionRow}>
          {[
            { icon: "chatbubble", label: "Message", action: () => router.push("/chat") },
            { icon: "call",       label: "Call",    action: () => {} },
            { icon: "videocam",   label: "Video",   action: () => {} },
            { icon: "search",     label: "Search",  action: () => {} },
          ].map((btn) => (
            <Pressable key={btn.label} style={styles.actionBtn} onPress={btn.action}>
              <View style={styles.actionIcon}>
                <Ionicons name={btn.icon as any} size={22} color="#3390ec" />
              </View>
              <Text style={styles.actionLabel}>{btn.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          {infoRows.map((row, i) => (
            <Pressable key={row.key} style={[styles.infoRow, i > 0 && styles.rowBorder]} onPress={() => openEdit(row.key, row.sub, row.val)}>
              <Feather name={row.icon as any} size={20} color="#3390ec" style={styles.infoIcon} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoSub}>{row.sub} · tap to edit</Text>
              </View>
              <Feather name="edit-2" size={14} color="#ccc" />
            </Pressable>
          ))}
        </View>

        <View style={styles.tabsCard}>
          <View style={styles.tabHeader}>
            <Pressable style={[styles.tabBtn, activeTab === "you" && styles.tabBtnActive]} onPress={() => setActiveTab("you")}>
              <Ionicons name="person" size={15} color={activeTab === "you" ? "#3390ec" : "#888"} style={{ marginRight: 4 }} />
              <Text style={[styles.tabText, activeTab === "you" && styles.tabTextActive]}>You</Text>
            </Pressable>
            <Pressable style={[styles.tabBtn, activeTab === "them" && styles.tabBtnActive]} onPress={() => setActiveTab("them")}>
              <Ionicons name="person-circle" size={15} color={activeTab === "them" ? "#3390ec" : "#888"} style={{ marginRight: 4 }} />
              <Text style={[styles.tabText, activeTab === "them" && styles.tabTextActive]}>Them</Text>
            </Pressable>
          </View>

          {filteredMsgs.length === 0 && (
            <View style={{ padding: 20, alignItems: "center" }}>
              <Text style={{ color: "#aaa", fontSize: 13, fontFamily: "Inter_400Regular" }}>No messages yet</Text>
            </View>
          )}

          {filteredMsgs.map((msg, i) => (
            <Pressable key={msg.id} style={[styles.msgRow, i > 0 && styles.rowBorder]} onPress={() => router.push("/chat")}>
              <View style={[styles.msgBubblePreview, msg.sent ? styles.msgSent : styles.msgReceived]}>
                <Text style={styles.msgBubbleText} numberOfLines={1}>{msg.text}</Text>
              </View>
              <Text style={styles.msgTime}>{msg.time}</Text>
              {msg.sent && <Ionicons name="checkmark-done" size={14} color="#3390ec" style={{ marginLeft: 3 }} />}
            </Pressable>
          ))}

          <Pressable style={styles.viewAllBtn} onPress={() => router.push("/chat")}>
            <Text style={styles.viewAllText}>Open Full Chat →</Text>
          </Pressable>
        </View>

        <Pressable style={styles.openChatBtn} onPress={() => router.push("/chat")}>
          <Ionicons name="chatbubbles" size={19} color="#fff" />
          <Text style={styles.openChatText}>Open Chat & Download</Text>
        </Pressable>

        <Pressable style={styles.automationBtn} onPress={() => router.push("/automation")}>
          <Ionicons name="flash" size={19} color="#fff" />
          <Text style={styles.automationBtnText}>Batch Automation</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={!!editField} transparent animationType="fade" onRequestClose={() => setEditField(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditField(null)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Edit {editField?.label}</Text>
            <TextInput style={styles.modalInput} value={editValue} onChangeText={setEditValue} autoFocus placeholder={`Enter ${editField?.label}`} placeholderTextColor="#bbb" onSubmitEditing={saveEdit} />
            <View style={styles.modalBtns}>
              <Pressable style={styles.modalCancel} onPress={() => setEditField(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSave} onPress={saveEdit}>
                <Text style={styles.modalSaveText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingBottom: 8, justifyContent: "space-between" },
  topBarBtn: { padding: 8, borderRadius: 20, width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  topBarTitle: { fontSize: 18, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingTop: 10, gap: 12 },

  avatarSection: { alignItems: "center", paddingVertical: 8 },
  avatarWrap: { width: 108, height: 108, borderRadius: 54, overflow: "hidden", borderWidth: 3, borderColor: "#fff", marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 8 },
  avatarImg: { width: "100%", height: "100%" },
  cameraOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.5)", paddingVertical: 6, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 4 },
  cameraText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  nameWrap: { flexDirection: "row", alignItems: "center" },
  profileName: { fontSize: 26, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
  profileStatus: { fontSize: 13, color: "rgba(255,255,255,0.85)", fontFamily: "Inter_400Regular", marginTop: 3 },

  actionRow: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8, justifyContent: "space-around", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  actionBtn: { alignItems: "center", gap: 6 },
  actionIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#eaf4ff", alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 12, color: "#3390ec", fontFamily: "Inter_500Medium" },

  card: { backgroundColor: "#fff", borderRadius: 16, paddingVertical: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 },
  infoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#f0f0f0" },
  infoIcon: { marginRight: 14 },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 15, color: "#0a0a0a", fontFamily: "Inter_400Regular" },
  infoSub: { fontSize: 11.5, color: "#999", marginTop: 2, fontFamily: "Inter_400Regular" },

  tabsCard: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 },
  tabHeader: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#eee" },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabBtnActive: { borderBottomColor: "#3390ec" },
  tabText: { fontSize: 14, color: "#888", fontFamily: "Inter_600SemiBold" },
  tabTextActive: { color: "#3390ec" },
  msgRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  msgBubblePreview: { flex: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 },
  msgSent: { backgroundColor: "#d4f5b8" },
  msgReceived: { backgroundColor: "#f2f2f2" },
  msgBubbleText: { fontSize: 14, color: "#0a0a0a", fontFamily: "Inter_400Regular" },
  msgTime: { fontSize: 11, color: "#999", fontFamily: "Inter_400Regular" },
  viewAllBtn: { paddingVertical: 13, alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#f0f0f0" },
  viewAllText: { fontSize: 14, color: "#3390ec", fontFamily: "Inter_600SemiBold" },

  openChatBtn: { backgroundColor: "#3390ec", borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15, gap: 10, shadowColor: "#3390ec", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  openChatText: { fontSize: 16, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
  automationBtn: { backgroundColor: "#8e44ad", borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15, gap: 10, shadowColor: "#8e44ad", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  automationBtnText: { fontSize: 16, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalBox: { backgroundColor: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 340 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#0a0a0a", fontFamily: "Inter_700Bold", marginBottom: 14 },
  modalInput: { borderWidth: 1.5, borderColor: "#3390ec", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#0a0a0a", fontFamily: "Inter_400Regular", marginBottom: 18 },
  modalBtns: { flexDirection: "row", gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: "#f0f0f0", alignItems: "center" },
  modalCancelText: { fontSize: 15, color: "#555", fontFamily: "Inter_600SemiBold" },
  modalSave: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: "#3390ec", alignItems: "center" },
  modalSaveText: { fontSize: 15, color: "#fff", fontFamily: "Inter_600SemiBold" },
});
