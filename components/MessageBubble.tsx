import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Message, useProfile } from "@/context/ProfileContext";

type Props = {
  message: Message;
  editMode?: boolean;
  onEditText?: (msg: Message) => void;
  onDelete?: (id: string) => void;
  onPickImage?: (id: string) => void;
};

export default function MessageBubble({ message, editMode, onEditText, onDelete, onPickImage }: Props) {
  const { text, time, sent, edited, read, imageUri } = message;
  const { darkMode } = useProfile();

  const bubbleBg  = sent
    ? (darkMode ? "#2b5278" : "#dcf8c6")
    : (darkMode ? "#1e2c3d" : "#ffffff");
  const textColor = darkMode ? "#ffffff" : "#0a0a0a";
  const timeColor = sent
    ? (darkMode ? "#6d9dc8" : "#6a9a6a")
    : (darkMode ? "#7c92a3" : "#999");
  const tickColor = read
    ? (darkMode ? "#6d9dc8" : "#3390ec")
    : (darkMode ? "#4a6a88" : "#8ab88a");

  return (
    <View style={[styles.row, sent ? styles.rowSent : styles.rowReceived]}>

      {/* Edit-mode action strip — left of bubble for sent, right for received */}
      {editMode && (
        <View style={[
          styles.actions,
          sent ? styles.actionsLeft : styles.actionsRight,
        ]}>
          <Pressable style={styles.actionBtn} onPress={() => onEditText?.(message)}>
            <Ionicons name="pencil" size={15} color="#3390ec" />
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => onPickImage?.(message.id)}>
            <Ionicons name="image-outline" size={15} color="#27ae60" />
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => onDelete?.(message.id)}>
            <Ionicons name="trash-outline" size={15} color="#e74c3c" />
          </Pressable>
        </View>
      )}

      <View style={[
        styles.bubble,
        sent ? styles.bubbleSent : styles.bubbleReceived,
        { backgroundColor: bubbleBg },
        editMode && styles.bubbleEditHighlight,
      ]}>
        {imageUri ? (
          <View style={styles.imageWrap}>
            <Image source={{ uri: imageUri }} style={styles.msgImage} contentFit="cover" />
            {text ? (
              <Text style={[styles.text, styles.captionPad, { color: textColor }]}>
                {text}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text style={[styles.text, { color: textColor }]} selectable>
            {edited && (
              <Text style={[styles.editedTag, { color: timeColor }]}>edited </Text>
            )}
            {text}
          </Text>
        )}

        <View style={[styles.meta, styles.metaRight]}>
          <Text style={[styles.time, { color: timeColor }]}>{time}</Text>
          {sent && (
            <Ionicons name="checkmark-done" size={13} color={tickColor} style={{ marginLeft: 2 }} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginVertical: 1,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  rowSent:     { justifyContent: "flex-end" },
  rowReceived: { justifyContent: "flex-start" },

  bubble: {
    maxWidth: "75%",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleReceived:    { borderBottomLeftRadius: 4 },
  bubbleSent:        { borderBottomRightRadius: 4 },
  bubbleEditHighlight: { opacity: 0.85 },

  text: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  captionPad: { marginTop: 5 },

  meta:      { flexDirection: "row", alignItems: "center", marginTop: 2 },
  metaRight: { justifyContent: "flex-end" },

  time: { fontSize: 11, fontFamily: "Inter_400Regular" },
  editedTag: { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic" },

  imageWrap: { borderRadius: 12, overflow: "hidden" },
  msgImage:  { width: 220, height: 220, borderRadius: 12 },

  // Action strip
  actions: {
    flexDirection: "column",
    gap: 4,
    marginHorizontal: 4,
  },
  actionsLeft:  { marginRight: 4 },
  actionsRight: { marginLeft: 4 },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
});
