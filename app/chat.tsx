import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import ChatHeader from "@/components/ChatHeader";
import ChatInput from "@/components/ChatInput";
import MessageBubble from "@/components/MessageBubble";
import { Message, useProfile } from "@/context/ProfileContext";
import { useAuth } from "@/context/AuthContext";
import PatternSvg from "../assets/images/pattern.svg";
import { generateChatScreenshot } from "@/utils/generateScreenshot";

const AUTO_REPLIES: [string, string[]][] = [
  ["hi",      ["Hello bhai! 👋", "Haan bol kya scene", "Hi hi!"]],
  ["hello",   ["Hello! 😊", "Haan bhai kya hua", "Bol bhai"]],
  ["how are", ["Main theek hun, tu bata 😄", "Bilkul fit hun bhai!", "Sab sahi hai"]],
  ["fine",    ["Good good 👌", "Achha", "Chal theek hai"]],
  ["ok",      ["Ok ok", "Theek hai", "Achha samjha"]],
  ["kya",     ["Kya hua bhai?", "Bata na", "Haan bata bhai"]],
  ["slow",    ["Haan yaar net bahut slow hai", "Server side issue hai shayad 😅", "Try karo reload"]],
  ["bhai",    ["Bata bhai 🙏", "Haan bhai bol", "Kya baat hai yaar"]],
  ["kuch",    ["Batao batao", "Kya kuch?", "Bol mat ruk"]],
  ["nhi",     ["Kyu nhi?", "Acha theek hai", "No problem"]],
  ["haan",    ["Theek hai bhai", "Ok noted", "Copy that 👍"]],
];

const GENERIC = [
  "Haan bhai 😄", "Ok ok", "Samjha", "Acha", "Theek hai bhai",
  "Dekh raha hun 👀", "Ha sahi hai", "Copy that 👍", "Hmm interesting",
  "Lol 😂", "Sahi keh rha hai", "Bata bhai aage",
];

function getReply(text: string): string {
  const low = text.toLowerCase();
  for (const [key, replies] of AUTO_REPLIES) {
    if (low.includes(key)) return replies[Math.floor(Math.random() * replies.length)];
  }
  return GENERIC[Math.floor(Math.random() * GENERIC.length)];
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function TypingBubble({ darkMode }: { darkMode: boolean }) {
  const bubbleBg = darkMode ? "#1e2c3d" : "#fff";
  const dotColor = darkMode ? "#7c92a3" : "#aaa";
  return (
    <View style={ts.row}>
      <View style={[ts.bubble, { backgroundColor: bubbleBg }]}>
        <View style={ts.dots}>
          <View style={[ts.dot, { backgroundColor: dotColor }]} />
          <View style={[ts.dot, { backgroundColor: dotColor, opacity: 0.55 }]} />
          <View style={[ts.dot, { backgroundColor: dotColor, opacity: 0.25 }]} />
        </View>
      </View>
    </View>
  );
}

const ts = StyleSheet.create({
  row:    { flexDirection: "row", paddingHorizontal: 10, marginVertical: 3 },
  bubble: { borderRadius: 18, borderTopLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 11, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  dots:   { flexDirection: "row", gap: 5, alignItems: "center" },
  dot:    { width: 8, height: 8, borderRadius: 4 },
});

type ListItem = Message | { id: string; _typing: true };

export default function ChatScreen() {
  const {
    messages, addMessage, editMessage, deleteMessage, setMessages,
    theirName, theirUsername, theirPhone, myName, darkMode, toggleDarkMode,
  } = useProfile();
  const { trackDownload } = useAuth();

  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isTyping,      setIsTyping]      = useState(false);
  const [downloading,   setDownloading]   = useState(false);

  // ── Edit mode ────────────────────────────────────────────────────────────────
  const [editMode,       setEditMode]       = useState(false);
  const [editingMsg,     setEditingMsg]     = useState<Message | null>(null);
  const [editDraft,      setEditDraft]      = useState("");

  const flatListRef = useRef<FlatList>(null);

  const bgColor     = darkMode ? "#1c2733" : "#7ab870";
  const patternFill = darkMode ? "#ffffff" : "#559e4e";
  const patternOp   = darkMode ? 0.40 : 0.55;
  const typingColor = darkMode ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.9)";

  // ── Download ─────────────────────────────────────────────────────────────────
  async function handleDownload() {
    if (Platform.OS !== "web") return;
    setDownloading(true);
    try {
      const user = { name: theirName, username: theirUsername, phone: theirPhone, avatarColor: "#3390ec" };
      const dataUrl = await generateChatScreenshot(user, messages, myName, darkMode);
      const link = document.createElement("a");
      link.download = `telegram-${theirName.split(" ")[0].toLowerCase()}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      // Track download in background
      trackDownload(1).catch(() => {});
    } catch (err) {
      console.error("[download] generateChatScreenshot failed:", err);
      alert("Screenshot failed: " + String(err));
    }
    setDownloading(false);
  }

  function scrollToEnd(animated = true) {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated }), 80);
  }

  function handleSend(text: string, imageUri?: string) {
    const userMsg: Message = { id: Date.now().toString(), text, time: nowTime(), sent: true, read: false, imageUri };
    addMessage(userMsg);
    scrollToEnd();
    if (imageUri) return;
    setIsTyping(true);
    const delay = 900 + Math.random() * 1100;
    setTimeout(() => {
      setIsTyping(false);
      const replyMsg: Message = { id: (Date.now() + 1).toString(), text: getReply(text), time: nowTime(), sent: false };
      addMessage(replyMsg);
      scrollToEnd();
    }, delay);
  }

  function handleScroll(e: any) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setShowScrollBtn(contentSize.height - contentOffset.y - layoutMeasurement.height > 150);
  }

  // ── Edit mode handlers ────────────────────────────────────────────────────────
  function openEditText(msg: Message) {
    setEditingMsg(msg);
    setEditDraft(msg.text);
  }

  function saveEditText() {
    if (!editingMsg) return;
    editMessage(editingMsg.id, editDraft.trim());
    setEditingMsg(null);
  }

  function handleDelete(id: string) {
    deleteMessage(id);
  }

  async function handlePickImage(msgId: string) {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.92,
        base64: false,
      });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      setMessages(messages.map((m) =>
        m.id === msgId ? { ...m, imageUri: uri } : m
      ));
    } catch (e) {
      console.warn("Image pick failed:", e);
    }
  }

  const listData: ListItem[] = isTyping
    ? [...messages, { id: "__typing__", _typing: true as const }]
    : messages;

  return (
    <View style={styles.root} nativeID="chat-root">
      {/* Background */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgColor }]} nativeID="chat-bg" />

      {/* Pattern overlay */}
      <View style={[StyleSheet.absoluteFillObject, { opacity: patternOp }]} pointerEvents="none" nativeID="chat-pattern">
        <PatternSvg
          width="100%"
          height="100%"
          viewBox="0 0 1440 2960"
          preserveAspectRatio="xMidYMid slice"
          fill={patternFill}
        />
      </View>

      {/* Dark/Light toggle */}
      <Pressable style={styles.darkToggle} onPress={toggleDarkMode}>
        <Ionicons
          name={darkMode ? "sunny" : "moon"}
          size={20}
          color={darkMode ? "#f0c040" : "#c0d0e0"}
        />
      </Pressable>

      <ChatHeader />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={listData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if ("_typing" in item) return <TypingBubble darkMode={darkMode} />;
            return (
              <MessageBubble
                message={item as Message}
                editMode={editMode}
                onEditText={openEditText}
                onDelete={handleDelete}
                onPickImage={handlePickImage}
              />
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          scrollEventThrottle={100}
          onContentSizeChange={() => scrollToEnd(false)}
          onLayout={() => scrollToEnd(false)}
        />

        {showScrollBtn && (
          <Pressable style={styles.scrollBtn} onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}>
            <Ionicons name="chevron-down" size={20} color="#555" />
          </Pressable>
        )}

        {isTyping && (
          <View style={styles.typingBar}>
            <Text style={[styles.typingText, { color: typingColor }]}>{theirName} is typing...</Text>
          </View>
        )}

        {/* Hide chat input in edit mode */}
        {!editMode && <ChatInput onSend={handleSend} />}

        {/* Edit mode banner */}
        {editMode && (
          <View style={styles.editBanner}>
            <Ionicons name="pencil" size={15} color="#fff" />
            <Text style={styles.editBannerText}>Edit Mode — tap ✏️ 📷 🗑️ on any message</Text>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ── Floating action buttons ────────────────────────────────────────── */}
      {Platform.OS === "web" && (
        <>
          {/* Download */}
          <Pressable
            nativeID="chat-download-btn"
            style={[styles.fab, styles.fabDownload, downloading && { opacity: 0.6 }]}
            onPress={handleDownload}
            disabled={downloading}
          >
            {downloading
              ? <Ionicons name="hourglass-outline" size={20} color="#fff" />
              : <Ionicons name="download-outline" size={20} color="#fff" />
            }
          </Pressable>

          {/* Edit Chat toggle */}
          <Pressable
            style={[styles.fab, styles.fabEdit, editMode && styles.fabEditActive]}
            onPress={() => setEditMode((v) => !v)}
          >
            <Ionicons
              name={editMode ? "checkmark-done" : "pencil"}
              size={20}
              color="#fff"
            />
          </Pressable>
        </>
      )}

      {/* ── Edit Text Modal ───────────────────────────────────────────────── */}
      <Modal
        visible={!!editingMsg}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingMsg(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setEditingMsg(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Edit Message</Text>
            <TextInput
              style={styles.modalInput}
              value={editDraft}
              onChangeText={setEditDraft}
              multiline
              autoFocus
              placeholder="Type message…"
              placeholderTextColor="#aaa"
            />
            <View style={styles.modalBtns}>
              <Pressable style={styles.modalBtnCancel} onPress={() => setEditingMsg(null)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalBtnSave} onPress={saveEditText}>
                <Text style={styles.modalBtnSaveText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  flex:        { flex: 1 },
  listContent: { paddingVertical: 10, paddingBottom: 4, flexGrow: 1, justifyContent: "flex-end" },

  darkToggle: {
    position: "absolute", top: 12, right: 12, zIndex: 100,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.30)",
    alignItems: "center", justifyContent: "center",
  },

  scrollBtn: {
    position: "absolute", right: 16, bottom: 90,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },

  typingBar:  { paddingHorizontal: 14, paddingBottom: 2 },
  typingText: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },

  // Edit mode banner
  editBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#3390ec",
    paddingVertical: 10, paddingHorizontal: 16,
  },
  editBannerText: { color: "#fff", fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },

  // FABs
  fab: {
    position: "absolute",
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 5, elevation: 6,
  },
  fabDownload:    { left: 16,  bottom: 90, backgroundColor: "#3390ec" },
  fabEdit:        { left: 70,  bottom: 90, backgroundColor: "#8e44ad" },
  fabEditActive:  { backgroundColor: "#27ae60" },

  // Edit text modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center", alignItems: "center",
  },
  modalCard: {
    width: "88%", maxWidth: 420,
    backgroundColor: "#fff", borderRadius: 18,
    padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 12,
  },
  modalTitle: {
    fontSize: 17, fontWeight: "700", color: "#111",
    fontFamily: "Inter_700Bold", marginBottom: 14,
  },
  modalInput: {
    borderWidth: 1.5, borderColor: "#e0e0e0", borderRadius: 12,
    padding: 12, fontSize: 15, fontFamily: "Inter_400Regular",
    color: "#111", minHeight: 90, textAlignVertical: "top",
  },
  modalBtns: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 14 },
  modalBtnCancel: {
    paddingVertical: 9, paddingHorizontal: 18,
    borderRadius: 10, borderWidth: 1.5, borderColor: "#ddd",
  },
  modalBtnCancelText: { fontSize: 15, color: "#555", fontFamily: "Inter_600SemiBold" },
  modalBtnSave: {
    paddingVertical: 9, paddingHorizontal: 22,
    borderRadius: 10, backgroundColor: "#3390ec",
  },
  modalBtnSaveText: { fontSize: 15, color: "#fff", fontFamily: "Inter_600SemiBold" },
});
