/**
 * NativeChatCapture.tsx
 * Off-screen React Native component that renders a Telegram-style chat and
 * captures it using react-native-view-shot.
 *
 * Usage:
 *   const captureRef = useRef<NativeChatCaptureHandle>(null);
 *   <NativeChatCapture ref={captureRef} />
 *
 *   const dataUrl = await captureRef.current.capture(user, messages, darkMode);
 */
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
// This file is only bundled on native (.web.tsx stub handles web)
import ViewShot from "react-native-view-shot";

import { Message } from "@/context/ProfileContext";
import { RandomUser } from "@/utils/randomData";

export interface NativeChatCaptureHandle {
  capture(
    user: RandomUser,
    messages: Message[],
    darkMode: boolean,
  ): Promise<string>; // returns base64 dataUrl
}

interface CaptureRequest {
  user: RandomUser;
  messages: Message[];
  darkMode: boolean;
  resolve: (dataUrl: string) => void;
  reject: (err: unknown) => void;
}

const W = 390;
const H = 844;

/** Simplified Telegram-style bubble using React Native views */
function ChatBubble({
  message,
  darkMode,
}: {
  message: Message;
  darkMode: boolean;
}) {
  const { text, time, sent, read } = message;
  if (!text) return null;

  const bubbleBg = sent
    ? darkMode ? "#2b5278" : "#dcf8c6"
    : darkMode ? "#1e2c3d" : "#ffffff";

  const textColor = darkMode ? "#ffffff" : "#0a0a0a";
  const timeColor = sent
    ? darkMode ? "#6d9dc8" : "#6a9a6a"
    : darkMode ? "#7c92a3" : "#999";

  return (
    <View style={[
      styles.bubbleRow,
      sent ? styles.rowSent : styles.rowRecv,
    ]}>
      <View style={[
        styles.bubble,
        { backgroundColor: bubbleBg },
        sent ? styles.bubbleSent : styles.bubbleRecv,
      ]}>
        <Text style={[styles.bubbleText, { color: textColor }]}>{text}</Text>
        <View style={styles.bubbleMeta}>
          <Text style={[styles.bubbleTime, { color: timeColor }]}>{time}</Text>
          {sent && (
            <Text style={{ color: read ? "#3390ec" : "#8ab88a", fontSize: 11, marginLeft: 2 }}>
              ✓✓
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const NativeChatCapture = forwardRef<NativeChatCaptureHandle>((_, ref) => {
  const shotRef = useRef<any>(null);
  const [request, setRequest] = useState<Omit<CaptureRequest, "resolve" | "reject"> | null>(null);
  const pendingRef = useRef<Pick<CaptureRequest, "resolve" | "reject"> | null>(null);

  // After state update + render, capture is called
  const captureAfterRender = useCallback(async () => {
    if (!shotRef.current || !pendingRef.current) return;
    try {
      await new Promise((r) => setTimeout(r, 100)); // let layout settle
      const uri: string = await shotRef.current.capture();
      // view-shot returns file:// URI on native — we need a base64 data URL
      // react-native-view-shot can return base64 directly with format: 'base64'
      const dataUrl = uri.startsWith("data:") ? uri : `data:image/png;base64,${uri}`;
      pendingRef.current.resolve(dataUrl);
    } catch (e) {
      pendingRef.current?.reject(e);
    } finally {
      pendingRef.current = null;
      setRequest(null);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    capture(user, messages, darkMode) {
      return new Promise<string>((resolve, reject) => {
        pendingRef.current = { resolve, reject };
        setRequest({ user, messages, darkMode });
        // trigger capture after render via requestAnimationFrame
        requestAnimationFrame(captureAfterRender);
      });
    },
  }), [captureAfterRender]);

  // This file is only bundled on native (web uses NativeChatCapture.web.tsx stub)
  if (!request) {
    return null; // idle — render nothing until capture is requested
  }

  const { user, messages, darkMode } = request;
  const bg = darkMode ? "#17212b" : "#f0f2f5";
  const headerBg = darkMode ? "#1e2c3d" : "#ffffff";
  const headerText = darkMode ? "#ffffff" : "#0a0a0a";
  const initial = user.name.charAt(0).toUpperCase();

  return (
    <ViewShot
      ref={shotRef}
      options={{ format: "png", quality: 1, result: "base64" }}
      style={[styles.container, { backgroundColor: bg }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <View style={[styles.avatar, { backgroundColor: user.avatarColor }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: headerText }]}>{user.name}</Text>
          <Text style={styles.headerSub}>last seen recently</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.msgList}
        scrollEnabled={false}
      >
        {messages.filter((m) => !!m.text).map((m) => (
          <ChatBubble key={m.id} message={m} darkMode={darkMode} />
        ))}
      </ScrollView>

      {/* Input bar */}
      <View style={[styles.inputBar, { backgroundColor: headerBg }]}>
        <View style={styles.inputPill}>
          <Text style={{ color: "#aaa", fontSize: 16, fontFamily: "Inter_400Regular" }}>Message</Text>
        </View>
        <View style={styles.micBtn}>
          <Text style={{ color: "#fff", fontSize: 18 }}>🎤</Text>
        </View>
      </View>
    </ViewShot>
  );
});

NativeChatCapture.displayName = "NativeChatCapture";

export default NativeChatCapture;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: -9999,
    left: 0,
    width: W,
    height: H,
    zIndex: -1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingTop: 36,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: "700" },
  headerSub: { fontSize: 12, color: "#888", marginTop: 1 },
  msgList: {
    paddingVertical: 8,
    gap: 2,
  },
  bubbleRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    marginVertical: 1,
  },
  rowSent: { justifyContent: "flex-end" },
  rowRecv: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "80%",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 5,
    elevation: 1,
  },
  bubbleSent: { borderBottomRightRadius: 4 },
  bubbleRecv: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 20, fontFamily: "Inter_400Regular" },
  bubbleMeta: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 2 },
  bubbleTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e0e0e0",
  },
  inputPill: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#3390ec",
    alignItems: "center",
    justifyContent: "center",
  },
});
