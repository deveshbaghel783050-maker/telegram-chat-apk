import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PatternSvg from "../assets/images/pattern.svg";
import { useAuth } from "@/context/AuthContext";

function PatternOverlay() {
  return (
    <View style={[StyleSheet.absoluteFillObject, { opacity: 0.12 }]} pointerEvents="none">
      <PatternSvg width="100%" height="100%" viewBox="0 0 1440 2960" preserveAspectRatio="xMidYMid slice" />
    </View>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  async function handleLogin() {
    const trimmed = key.trim();
    if (!trimmed) return;
    setError(null);
    setLoading(true);
    const result = await login(trimmed);
    setLoading(false);
    if (result.success) {
      router.replace("/");
    } else {
      setError(result.error ?? "Invalid key");
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#1a6b3a", "#2e8b57", "#3aab6a"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <PatternOverlay />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>

          {/* Logo area */}
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="chatbubble-ellipses" size={44} color="#2e8b57" />
            </View>
            <Text style={styles.appName}>Flash Chat</Text>
            <Text style={styles.appSub}>Enter your access key to continue</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Access Key</Text>
            <Text style={styles.cardSub}>Contact admin to get your key</Text>

            <View style={styles.inputWrap}>
              <Ionicons name="key" size={18} color="#3390ec" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={key}
                onChangeText={(t) => { setKey(t); setError(null); }}
                placeholder="Enter key..."
                placeholderTextColor="#bbb"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showKey}
                onSubmitEditing={handleLogin}
                returnKeyType="go"
              />
              <Pressable onPress={() => setShowKey(!showKey)} style={styles.eyeBtn}>
                <Ionicons name={showKey ? "eye-off" : "eye"} size={18} color="#aaa" />
              </Pressable>
            </View>

            {error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={14} color="#e53935" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              style={[styles.loginBtn, (!key.trim() || loading) && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={!key.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="log-in" size={18} color="#fff" />
                  <Text style={styles.loginBtnText}>Continue</Text>
                </>
              )}
            </Pressable>
          </View>

          <Text style={styles.footer}>Powered by Flash Chat</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: "center", gap: 28 },

  logoWrap: { alignItems: "center", gap: 10 },
  logoCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
  },
  appName: { fontSize: 30, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
  appSub:  { fontSize: 14, color: "rgba(255,255,255,0.8)", fontFamily: "Inter_400Regular" },

  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
    gap: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#0a0a0a", fontFamily: "Inter_700Bold" },
  cardSub:   { fontSize: 13, color: "#999", fontFamily: "Inter_400Regular", marginBottom: 4 },

  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: "#3390ec", borderRadius: 14,
    paddingHorizontal: 12, height: 52, gap: 8,
  },
  inputIcon: { marginRight: 2 },
  input: {
    flex: 1, fontSize: 15, color: "#0a0a0a",
    fontFamily: "Inter_400Regular",
  },
  eyeBtn: { padding: 4 },

  errorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  errorText: { fontSize: 13, color: "#e53935", fontFamily: "Inter_400Regular", flex: 1 },

  loginBtn: {
    backgroundColor: "#3390ec", borderRadius: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 15, gap: 8, marginTop: 4,
    shadowColor: "#3390ec", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { fontSize: 16, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },

  footer: { textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular" },
});
