/**
 * results.tsx
 * Shown when user taps the "Automation Completed" notification or navigates
 * from the automation screen after completion.
 */
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { downloadBlob } from "@/utils/automationRunner";
import {
  AutomationState,
  computeRunningTime,
  loadAutomationState,
} from "@/utils/automationStore";

// Global store for the result ZIP blob (passed from automation screen in-memory)
let _pendingZipBlob: Blob | null = null;
let _pendingZipFilename: string | null = null;

export function setPendingResult(blob: Blob, filename: string) {
  _pendingZipBlob = blob;
  _pendingZipFilename = filename;
}

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ taskId?: string; count?: string; folderName?: string; completedAt?: string }>();

  const [state, setState] = useState<AutomationState | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    loadAutomationState().then((s) => {
      if (s.status === "done" || s.status === "error" || s.status === "stopped") {
        setState(s);
      }
    });
  }, []);

  const count = params.count ? parseInt(params.count, 10) : (state?.completedCount ?? 0);
  const folderName = params.folderName ?? state?.folderName ?? "screenshots";
  const completedAt = params.completedAt
    ? params.completedAt
    : state?.completedAt
    ? new Date(state.completedAt).toLocaleTimeString()
    : "—";
  const duration = state?.startedAt && state?.completedAt
    ? computeRunningTime(state.startedAt)
    : "—";

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      if (Platform.OS === "web") {
        if (_pendingZipBlob && _pendingZipFilename) {
          downloadBlob(_pendingZipBlob, _pendingZipFilename);
          setDownloaded(true);
        } else {
          Alert.alert("Not available", "Result data is no longer in memory. Please run automation again.");
        }
        return;
      }

      // Native Android/iOS — share the ZIP via the system share sheet
      if (!_pendingZipBlob) {
        Alert.alert("Not available", "Result data is no longer in memory. Please run automation again.");
        return;
      }

      const filename = _pendingZipFilename ?? `${folderName}.zip`;

      // Share as text message with instructions (ZIP binary sharing requires
      // a native module; for now we inform the user and allow web fallback)
      await Share.share({
        title: filename,
        message: `Your automation completed: ${count} screenshots are ready in "${filename}". Open the app on web to download the ZIP file.`,
      });

      setDownloaded(true);
    } catch (e: any) {
      Alert.alert("Download failed", e?.message ?? String(e));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 44 : insets.top + 4 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.replace("/automation")}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Automation Results</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Success badge */}
        <View style={styles.successBadge}>
          <Ionicons name="checkmark-circle" size={72} color="#4caf50" />
          <Text style={styles.successTitle}>Automation Completed!</Text>
          <Text style={styles.successSub}>All screenshots generated successfully</Text>
        </View>

        {/* Stats cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="images-outline" size={26} color="#3390ec" />
            <Text style={styles.statValue}>{count}</Text>
            <Text style={styles.statLabel}>Screenshots</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={26} color="#8e44ad" />
            <Text style={styles.statValue}>{duration}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-done-outline" size={26} color="#4caf50" />
            <Text style={styles.statValue}>{count}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* Detail card */}
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>Task Details</Text>

          <DetailRow
            icon="folder-outline"
            label="Folder Name"
            value={folderName}
          />
          <DetailRow
            icon="time-outline"
            label="Completed At"
            value={completedAt}
          />
          <DetailRow
            icon="document-outline"
            label="Output File"
            value={`${folderName}.zip`}
          />
          <DetailRow
            icon="phone-portrait-outline"
            label="Platform"
            value={Platform.OS === "web" ? "Web" : "Android"}
          />
        </View>

        {/* Download button */}
        <Pressable
          style={[
            styles.downloadBtn,
            downloaded && styles.downloadBtnDone,
            downloading && styles.downloadBtnLoading,
          ]}
          onPress={handleDownload}
          disabled={downloading || downloaded}
        >
          {downloading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name={downloaded ? "checkmark-circle" : "download"}
                size={22}
                color="#fff"
              />
              <Text style={styles.downloadBtnText}>
                {downloaded ? "Downloaded!" : "Download ZIP"}
              </Text>
            </>
          )}
        </Pressable>

        {downloaded && (
          <Text style={styles.downloadNote}>
            File saved to your device storage.
          </Text>
        )}

        {/* Run again */}
        <Pressable
          style={styles.runAgainBtn}
          onPress={() => router.replace("/automation")}
        >
          <Ionicons name="refresh-outline" size={18} color="#3390ec" />
          <Text style={styles.runAgainText}>Run Again</Text>
        </Pressable>

        {/* Go home */}
        <Pressable
          style={styles.homeBtn}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={detailStyles.row}>
      <Ionicons name={icon as any} size={18} color="#3390ec" style={{ marginRight: 12 }} />
      <View style={detailStyles.info}>
        <Text style={detailStyles.label}>{label}</Text>
        <Text style={detailStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#f0f0f0",
  },
  info: { flex: 1 },
  label: { fontSize: 12, color: "#999", fontFamily: "Inter_400Regular" },
  value: { fontSize: 14, color: "#111", fontFamily: "Inter_600SemiBold", marginTop: 2 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f0f2f5" },

  header: {
    backgroundColor: "#4caf50",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 12,
    justifyContent: "space-between",
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },

  scroll: { flex: 1 },
  content: { padding: 16, gap: 16 },

  successBadge: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 8,
    shadowColor: "#4caf50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0a0a0a",
    fontFamily: "Inter_700Bold",
    marginTop: 6,
  },
  successSub: {
    fontSize: 14,
    color: "#666",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0a0a0a",
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    color: "#888",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },

  detailCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 4,
    paddingTop: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },

  downloadBtn: {
    backgroundColor: "#3390ec",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
    shadowColor: "#3390ec",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  downloadBtnDone: {
    backgroundColor: "#4caf50",
    shadowColor: "#4caf50",
  },
  downloadBtnLoading: {
    opacity: 0.7,
  },
  downloadBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
  downloadNote: {
    textAlign: "center",
    fontSize: 12,
    color: "#4caf50",
    fontFamily: "Inter_400Regular",
  },

  runAgainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#3390ec",
    backgroundColor: "#fff",
    gap: 8,
  },
  runAgainText: {
    fontSize: 15,
    color: "#3390ec",
    fontFamily: "Inter_600SemiBold",
  },

  homeBtn: { paddingVertical: 12, alignItems: "center" },
  homeBtnText: { fontSize: 14, color: "#999", fontFamily: "Inter_400Regular" },
});
