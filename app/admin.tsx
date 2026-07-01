import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

type KeyEntry = {
  id: number;
  keyValue: string;
  label: string;
  createdAt: string;
  expiresAt: string | null;
  downloadCount: number;
  isActive: boolean;
};

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysLeft(iso: string | null): string {
  if (!iso) return "No expiry";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const d = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `${d} day${d !== 1 ? "s" : ""} left`;
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { logout, session } = useAuth();
  const [keys, setKeys] = useState<KeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [newLabel, setNewLabel] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.token ?? ""}`,
    };
  }

  const fetchKeys = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/keys`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to fetch keys");
      const data: KeyEntry[] = await res.json();
      setKeys(data.sort((a, b) => b.id - a.id));
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  async function handleCreate() {
    if (!newLabel.trim()) { setCreateError("Label is required"); return; }
    setCreating(true);
    setCreateError(null);
    try {
      const days = durationDays.trim() ? parseInt(durationDays.trim(), 10) : null;
      const res = await fetch(`${API_BASE}/admin/keys`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ label: newLabel.trim(), durationDays: isNaN(days as any) ? null : days }),
      });
      if (!res.ok) {
        const d = await res.json();
        setCreateError(d.error ?? "Failed to create key");
        return;
      }
      setShowCreate(false);
      setNewLabel("");
      setDurationDays("");
      fetchKeys();
    } catch {
      setCreateError("Network error");
    } finally {
      setCreating(false);
    }
  }

  function confirmDelete(k: KeyEntry) {
    if (Platform.OS === "web") {
      if (window.confirm(`Delete key for "${k.label}"?`)) doDelete(k.id);
      return;
    }
    Alert.alert("Delete Key", `Delete key for "${k.label}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => doDelete(k.id) },
    ]);
  }

  async function doDelete(id: number) {
    await fetch(`${API_BASE}/admin/keys/${id}`, { method: "DELETE", headers: authHeaders() });
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }

  const totalDownloads = keys.reduce((sum, k) => sum + k.downloadCount, 0);
  const activeKeys = keys.filter((k) => k.isActive).length;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 20 : insets.top + 4 }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="shield-checkmark" size={22} color="#fff" />
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <Text style={styles.headerSub}>Key Management</Text>
        </View>
        <Pressable style={styles.logoutBtn} onPress={async () => { await logout(); router.replace("/login"); }}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="key" size={22} color="#3390ec" />
          <Text style={styles.statValue}>{keys.length}</Text>
          <Text style={styles.statLabel}>Total Keys</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={22} color="#43a047" />
          <Text style={styles.statValue}>{activeKeys}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="cloud-download" size={22} color="#8e44ad" />
          <Text style={styles.statValue}>{totalDownloads}</Text>
          <Text style={styles.statLabel}>Downloads</Text>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3390ec" />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchKeys(true); }} tintColor="#3390ec" />
          }
          showsVerticalScrollIndicator={false}
        >
          {keys.length === 0 && (
            <View style={styles.emptyBox}>
              <Ionicons name="key-outline" size={44} color="#ccc" />
              <Text style={styles.emptyText}>No keys yet</Text>
              <Text style={styles.emptySub}>Tap + to create the first key</Text>
            </View>
          )}
          {keys.map((k) => (
            <View key={k.id} style={[styles.keyCard, !k.isActive && styles.keyCardExpired]}>
              <View style={styles.keyCardTop}>
                <View style={[styles.statusDot, { backgroundColor: k.isActive ? "#43a047" : "#e53935" }]} />
                <Text style={styles.keyLabel} numberOfLines={1}>{k.label}</Text>
                <View style={styles.downloadBadge}>
                  <Ionicons name="cloud-download-outline" size={13} color="#8e44ad" />
                  <Text style={styles.downloadCount}>{k.downloadCount}</Text>
                </View>
                <Pressable style={styles.deleteBtn} onPress={() => confirmDelete(k)}>
                  <Ionicons name="trash-outline" size={18} color="#e53935" />
                </Pressable>
              </View>

              <View style={styles.keyValueRow}>
                <Ionicons name="key-outline" size={13} color="#3390ec" />
                <Text style={styles.keyValue} numberOfLines={1} selectable>{k.keyValue}</Text>
              </View>

              <View style={styles.keyMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={12} color="#aaa" />
                  <Text style={styles.metaText}>Created {formatDate(k.createdAt)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={12} color={k.isActive ? "#43a047" : "#e53935"} />
                  <Text style={[styles.metaText, !k.isActive && { color: "#e53935" }]}>
                    {daysLeft(k.expiresAt)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      <Pressable style={[styles.fab, { bottom: insets.bottom + 20 }]} onPress={() => { setShowCreate(true); setCreateError(null); }}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Create Key Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCreate(false)}>
          <Pressable style={[styles.modalBox, { paddingBottom: insets.bottom + 20 }]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Create New Key</Text>

            <Text style={styles.fieldLabel}>User / Label *</Text>
            <TextInput
              style={styles.fieldInput}
              value={newLabel}
              onChangeText={(t) => { setNewLabel(t); setCreateError(null); }}
              placeholder="e.g. Rahul, Team A..."
              placeholderTextColor="#bbb"
              autoFocus
            />

            <Text style={styles.fieldLabel}>Valid for (days) — leave blank for no expiry</Text>
            <TextInput
              style={styles.fieldInput}
              value={durationDays}
              onChangeText={setDurationDays}
              placeholder="e.g. 30"
              placeholderTextColor="#bbb"
              keyboardType="number-pad"
            />

            {createError && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={14} color="#e53935" />
                <Text style={styles.errorText}>{createError}</Text>
              </View>
            )}

            <View style={styles.modalBtns}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.createBtn, (!newLabel.trim() || creating) && styles.btnDisabled]}
                onPress={handleCreate}
                disabled={!newLabel.trim() || creating}
              >
                {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.createBtnText}>Create Key</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f4f6fa" },

  header: {
    backgroundColor: "#2e8b57",
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingBottom: 14, gap: 10,
  },
  headerLeft: { padding: 8, width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  logoutBtn: { padding: 8, borderRadius: 20, width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular" },

  statsRow: { flexDirection: "row", gap: 10, padding: 16, paddingTop: 12 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14,
    alignItems: "center", paddingVertical: 14, gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  statValue: { fontSize: 22, fontWeight: "700", color: "#0a0a0a", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, color: "#888", fontFamily: "Inter_400Regular" },

  list: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  emptyBox: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#bbb", fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 13, color: "#ccc", fontFamily: "Inter_400Regular" },

  keyCard: {
    backgroundColor: "#fff", borderRadius: 14, marginBottom: 10, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  keyCardExpired: { opacity: 0.6 },
  keyCardTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  keyLabel: { flex: 1, fontSize: 16, fontWeight: "600", color: "#0a0a0a", fontFamily: "Inter_600SemiBold" },
  downloadBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#f3e5f5", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  downloadCount: { fontSize: 13, fontWeight: "600", color: "#8e44ad", fontFamily: "Inter_600SemiBold" },
  deleteBtn: { padding: 6, borderRadius: 8, backgroundColor: "#fdecea" },

  keyValueRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  keyValue: {
    flex: 1, fontSize: 13, color: "#3390ec",
    fontFamily: "Inter_400Regular",
    backgroundColor: "#eaf4ff", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },

  keyMeta: { flexDirection: "row", gap: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11.5, color: "#aaa", fontFamily: "Inter_400Regular" },

  fab: {
    position: "absolute", right: 20,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: "#3390ec",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#3390ec", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45, shadowRadius: 10, elevation: 8,
  },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 10 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#0a0a0a", fontFamily: "Inter_700Bold", marginBottom: 8 },
  fieldLabel: { fontSize: 13, color: "#555", fontFamily: "Inter_500Medium" },
  fieldInput: {
    borderWidth: 1.5, borderColor: "#dde3ea", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: "#0a0a0a", fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  errorText: { fontSize: 13, color: "#e53935", fontFamily: "Inter_400Regular" },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#f0f0f0", alignItems: "center" },
  cancelBtnText: { fontSize: 15, color: "#555", fontFamily: "Inter_600SemiBold" },
  createBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#3390ec", alignItems: "center" },
  btnDisabled: { opacity: 0.6 },
  createBtnText: { fontSize: 15, color: "#fff", fontFamily: "Inter_600SemiBold" },
});
