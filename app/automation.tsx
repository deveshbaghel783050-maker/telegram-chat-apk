import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  ActivityIndicator,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import NativeChatCapture, { NativeChatCaptureHandle } from "@/components/NativeChatCapture";
import {
  AutoMode,
  AutomationController,
  StopError,
  downloadBlob,
  preloadWinImages,
  registerNativeCaptureCallback,
  runAutomation,
  unregisterNativeCaptureCallback,
} from "@/utils/automationRunner";
import {
  computeRunningTime,
  loadAutomationState,
  saveAutomationState,
} from "@/utils/automationStore";
import {
  needsForegroundService,
  registerBackgroundFetchTask,
  subscribeToAppState,
  unregisterBackgroundFetchTask,
} from "@/utils/backgroundService";
import {
  dismissPersistentNotification,
  setupNotifications,
  showCompletionNotification,
  showErrorNotification,
  showPersistentNotification,
} from "@/utils/notificationService";
import { setPendingResult } from "./results";

// ─── Mode options ──────────────────────────────────────────────────────────────
const MODE_OPTIONS: { key: AutoMode; label: string; icon: string; desc: string; color: string }[] = [
  { key: "light", label: "Light",  icon: "sunny",   desc: "Green bg",     color: "#4caf50" },
  { key: "dark",  label: "Dark",   icon: "moon",    desc: "Dark navy",    color: "#2b5278" },
  { key: "mix",   label: "Mix",    icon: "shuffle", desc: "Random",       color: "#8e44ad" },
];

// ─── Slider ────────────────────────────────────────────────────────────────────
const TRACK_H = 6;
const THUMB_SIZE = 36;

function CountPicker({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled: boolean }) {
  const trackWidth = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_evt, gs) => {
        if (trackWidth.current === 0) return;
        const startX = ((valueRef.current - 1) / 99) * trackWidth.current;
        const newX = Math.max(0, Math.min(trackWidth.current, startX + gs.dx));
        const newVal = Math.round((newX / trackWidth.current) * 99) + 1;
        if (newVal !== valueRef.current) onChange(newVal);
      },
      onPanResponderRelease: (_evt, gs) => {
        if (trackWidth.current === 0) return;
        const startX = ((valueRef.current - 1) / 99) * trackWidth.current;
        const newX = Math.max(0, Math.min(trackWidth.current, startX + gs.dx));
        const newVal = Math.round((newX / trackWidth.current) * 99) + 1;
        onChange(newVal);
      },
    })
  ).current;

  const fillPct = ((value - 1) / 99) * 100;

  return (
    <View style={sliderStyles.container}>
      <Text style={sliderStyles.label}>{value}</Text>
      <View
        style={sliderStyles.trackWrapper}
        onLayout={(e) => { trackWidth.current = e.nativeEvent.layout.width; }}
      >
        <View style={sliderStyles.trackBg} />
        <View style={[sliderStyles.trackFill, { width: `${fillPct}%` as any }]} />
        <View
          {...pan.panHandlers}
          style={[sliderStyles.thumb, { left: `${fillPct}%` as any }, disabled && sliderStyles.thumbDisabled]}
        >
          <View style={sliderStyles.grip} />
          <View style={sliderStyles.grip} />
          <View style={sliderStyles.grip} />
        </View>
      </View>
      <View style={sliderStyles.minMax}>
        <Text style={sliderStyles.minMaxText}>1</Text>
        <Text style={sliderStyles.minMaxText}>100</Text>
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: { paddingVertical: 8, paddingHorizontal: 4 },
  label: { textAlign: "center", fontSize: 36, fontWeight: "700", color: "#3390ec", fontFamily: "Inter_700Bold", marginBottom: 10 },
  trackWrapper: { height: THUMB_SIZE, justifyContent: "center", marginHorizontal: THUMB_SIZE / 2, position: "relative" },
  trackBg: { position: "absolute", left: 0, right: 0, height: TRACK_H, borderRadius: TRACK_H / 2, backgroundColor: "#dde3ea" },
  trackFill: { position: "absolute", left: 0, height: TRACK_H, borderRadius: TRACK_H / 2, backgroundColor: "#3390ec" },
  thumb: { position: "absolute", width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2, backgroundColor: "#fff", borderWidth: 2.5, borderColor: "#3390ec", marginLeft: -(THUMB_SIZE / 2), shadowColor: "#3390ec", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4, alignItems: "center", justifyContent: "center", gap: 3, flexDirection: "row", cursor: "grab" as any },
  thumbDisabled: { borderColor: "#bbb", shadowOpacity: 0 },
  grip: { width: 2, height: 12, borderRadius: 2, backgroundColor: "#3390ec", opacity: 0.5 },
  minMax: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  minMaxText: { fontSize: 12, color: "#aaa", fontFamily: "Inter_400Regular" },
});

// ─── Main Screen ────────────────────────────────────────────────────────────────
type RunStatus = "idle" | "running" | "paused" | "done" | "stopped" | "error";

export default function AutomationScreen() {
  const insets = useSafeAreaInsets();
  const { trackDownload } = useAuth();

  const [mode, setMode]               = useState<AutoMode>("mix");
  const [count, setCount]             = useState(30);
  const [projectName, setProjectName] = useState("my_screenshots");
  const [runStatus, setRunStatus]     = useState<RunStatus>("idle");
  const [progress, setProgress]       = useState({ current: 0, total: 0, message: "" });
  const [zipResult, setZipResult]     = useState<{ blob: Blob; filename: string } | null>(null);
  const [runningTime, setRunningTime] = useState("0s");
  const [notifGranted, setNotifGranted] = useState(false);
  const [isInBackground, setIsInBackground] = useState(false);
  const [recoveryBanner, setRecoveryBanner] = useState<{ count: number; pct: number } | null>(null);

  const startedAtRef   = useRef(0);
  const controllerRef  = useRef<AutomationController | null>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureRef     = useRef<NativeChatCaptureHandle>(null);

  // ── Setup notifications & app-state listener ────────────────────────────────
  useEffect(() => {
    setupNotifications().then((granted) => setNotifGranted(granted));

    // State recovery — if automation was interrupted (app killed mid-run),
    // show a banner so the user knows and can restart.
    loadAutomationState().then((saved) => {
      if (saved.status === "running" || saved.status === "paused") {
        const pct = saved.totalCount > 0
          ? Math.round((saved.completedCount / saved.totalCount) * 100)
          : 0;
        setRecoveryBanner({ count: saved.completedCount, pct });
        // Pre-fill config from interrupted task
        setProjectName(saved.projectName);
        setMode(saved.mode);
        setCount(saved.totalCount);
      }
    });

    if (Platform.OS === "web") {
      preloadWinImages().catch(() => {});
    }

    // Register native capture callback
    if (Platform.OS !== "web") {
      registerNativeCaptureCallback(async (user, messages, darkMode) => {
        if (!captureRef.current) throw new Error("Capture component not ready");
        return captureRef.current.capture(user, messages, darkMode);
      });
    }

    // Subscribe to app-state changes
    const unsub = subscribeToAppState(
      () => setIsInBackground(true),
      () => setIsInBackground(false),
    );

    return () => {
      unsub();
      if (Platform.OS !== "web") {
        unregisterNativeCaptureCallback();
      }
    };
  }, []);

  // ── Running-time ticker ─────────────────────────────────────────────────────
  function startTimer() {
    stopTimer();
    timerRef.current = setInterval(() => {
      if (startedAtRef.current > 0) {
        setRunningTime(computeRunningTime(startedAtRef.current));
      }
    }, 1000);
  }
  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // ── Start ───────────────────────────────────────────────────────────────────
  async function handleStart() {
    if (runStatus === "running" || runStatus === "paused") return;

    const ctrl = new AutomationController();
    controllerRef.current = ctrl;
    startedAtRef.current  = Date.now();

    setRunStatus("running");
    setZipResult(null);
    setProgress({ current: 0, total: count, message: "Starting…" });
    setRunningTime("0s");

    // Save initial state
    await saveAutomationState({
      taskId: `task_${Date.now()}`,
      projectName,
      mode,
      totalCount: count,
      completedCount: 0,
      status: "running",
      startedAt: startedAtRef.current,
      currentTaskName: "Generating screenshots…",
      outputFiles: [],
      folderName: projectName.trim() || `screenshots_${Date.now()}`,
    });

    // Show persistent notification
    await showPersistentNotification({
      pct: 0,
      current: 0,
      total: count,
      taskName: "Generating screenshots…",
      runningTime: "0s",
    });

    // Register background-fetch task (safety net for Android process restart)
    if (needsForegroundService()) {
      registerBackgroundFetchTask().catch(() => {});
    }

    startTimer();

    try {
      const result = await runAutomation(
        mode,
        count,
        projectName,
        async (p) => {
          const pct = p.total > 0 ? (p.current / p.total) * 100 : 0;
          const rt = computeRunningTime(startedAtRef.current);
          setProgress({ current: p.current, total: p.total, message: p.message });

          // Update persistent notification
          await showPersistentNotification({
            pct,
            current: p.current,
            total: p.total,
            taskName: p.message,
            runningTime: rt,
          });

          // Save progress
          await saveAutomationState({
            taskId: `task_${startedAtRef.current}`,
            projectName,
            mode,
            totalCount: p.total,
            completedCount: p.current,
            status: "running",
            startedAt: startedAtRef.current,
            currentTaskName: p.message,
            outputFiles: [],
            folderName: projectName.trim() || `screenshots_${Date.now()}`,
          });
        },
        ctrl,
      );

      const filename = `${result.folderName}.zip`;
      setZipResult({ blob: result.zipBlob, filename });
      setRunStatus("done");
      stopTimer();
      // Track downloads in background
      trackDownload(result.count).catch(() => {});

      // Store for results page
      setPendingResult(result.zipBlob, filename);

      const completedAt = new Date().toLocaleTimeString();
      await saveAutomationState({
        taskId: `task_${startedAtRef.current}`,
        projectName,
        mode,
        totalCount: count,
        completedCount: count,
        status: "done",
        startedAt: startedAtRef.current,
        completedAt: Date.now(),
        currentTaskName: "Completed",
        outputFiles: [],
        folderName: result.folderName,
      });

      await dismissPersistentNotification();
      if (needsForegroundService()) unregisterBackgroundFetchTask().catch(() => {});
      await showCompletionNotification({
        count: result.count,
        folderName: result.folderName,
        completedAt,
        taskId: `task_${startedAtRef.current}`,
      });

    } catch (e: any) {
      stopTimer();
      await dismissPersistentNotification();
      if (needsForegroundService()) unregisterBackgroundFetchTask().catch(() => {});

      if (e instanceof StopError || e?.isStop) {
        setRunStatus("stopped");
        await saveAutomationState({
          taskId: `task_${startedAtRef.current}`,
          projectName, mode,
          totalCount: count,
          completedCount: progress.current,
          status: "stopped",
          startedAt: startedAtRef.current,
          completedAt: Date.now(),
          currentTaskName: "Stopped by user",
          outputFiles: [],
          folderName: projectName.trim() || "screenshots",
        });
      } else {
        setRunStatus("error");
        const msg = e?.message ?? String(e);
        await showErrorNotification(msg);
        await saveAutomationState({
          taskId: `task_${startedAtRef.current}`,
          projectName, mode,
          totalCount: count,
          completedCount: progress.current,
          status: "error",
          startedAt: startedAtRef.current,
          completedAt: Date.now(),
          currentTaskName: "Error",
          errorMessage: msg,
          outputFiles: [],
          folderName: projectName.trim() || "screenshots",
        });
      }
    }
  }

  function handlePause() {
    controllerRef.current?.pause();
    setRunStatus("paused");
    // Persist paused state immediately so recovery sees it
    saveAutomationState({
      taskId: `task_${startedAtRef.current}`,
      projectName, mode,
      totalCount: progress.total,
      completedCount: progress.current,
      status: "paused",
      startedAt: startedAtRef.current,
      currentTaskName: progress.message,
      outputFiles: [],
      folderName: projectName.trim() || "screenshots",
    }).catch(() => {});
  }

  function handleResume() {
    controllerRef.current?.resume();
    setRunStatus("running");
    saveAutomationState({
      taskId: `task_${startedAtRef.current}`,
      projectName, mode,
      totalCount: progress.total,
      completedCount: progress.current,
      status: "running",
      startedAt: startedAtRef.current,
      currentTaskName: progress.message,
      outputFiles: [],
      folderName: projectName.trim() || "screenshots",
    }).catch(() => {});
  }

  function handleStop() {
    controllerRef.current?.stop();
    stopTimer();
    setRunStatus("stopped");
    if (needsForegroundService()) unregisterBackgroundFetchTask().catch(() => {});
  }

  function handleDownloadZip() {
    if (!zipResult) return;
    if (Platform.OS === "web") {
      downloadBlob(zipResult.blob, zipResult.filename);
    }
  }

  function handleReset() {
    setRunStatus("idle");
    setZipResult(null);
    setProgress({ current: 0, total: 0, message: "" });
    setRunningTime("0s");
  }

  const pct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  const isRunning = runStatus === "running";
  const isPaused  = runStatus === "paused";
  const isDone    = runStatus === "done";
  const isBusy    = isRunning || isPaused;

  return (
    <View style={styles.root}>
      {/* Off-screen native capture component */}
      <NativeChatCapture ref={captureRef} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 44 : insets.top + 4 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} disabled={isBusy}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Batch Automation</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Background indicator */}
      {isBusy && isInBackground && (
        <View style={styles.bgBanner}>
          <Ionicons name="cloud-done-outline" size={14} color="#fff" />
          <Text style={styles.bgBannerText}>Running in background — notification active</Text>
        </View>
      )}

      {/* Notification permission banner */}
      {!notifGranted && Platform.OS !== "web" && (
        <View style={styles.permBanner}>
          <Ionicons name="notifications-off-outline" size={14} color="#e67e22" />
          <Text style={styles.permBannerText}>
            Notification permission denied — background indicator won't show
          </Text>
        </View>
      )}

      {/* Interrupted-session recovery banner */}
      {recoveryBanner && runStatus === "idle" && (
        <Pressable
          style={styles.recoveryBanner}
          onPress={() => setRecoveryBanner(null)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.recoveryTitle}>⚡ Previous session interrupted</Text>
            <Text style={styles.recoverySub}>
              {recoveryBanner.count} screenshot{recoveryBanner.count !== 1 ? "s" : ""} done
              ({recoveryBanner.pct}%) — settings restored. Tap Start to re-run from scratch.
            </Text>
          </View>
          <Ionicons name="close" size={16} color="#2980b9" />
        </Pressable>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Config (hidden when running) ─────────────────────────────── */}
        {!isBusy && runStatus === "idle" && (
          <>
            {/* Project Name */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>📁  Project / Folder Name</Text>
              <TextInput
                style={styles.nameInput}
                value={projectName}
                onChangeText={setProjectName}
                placeholder="my_screenshots"
                placeholderTextColor="#aaa"
              />
            </View>

            {/* Mode */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>🎨  Screenshot Mode</Text>
              <View style={styles.modeRow}>
                {MODE_OPTIONS.map((opt) => {
                  const active = mode === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      style={[styles.modeCard, active && { borderColor: opt.color, backgroundColor: opt.color + "18" }]}
                      onPress={() => setMode(opt.key)}
                    >
                      <Ionicons name={opt.icon as any} size={22} color={active ? opt.color : "#999"} />
                      <Text style={[styles.modeCardLabel, active && { color: opt.color }]}>{opt.label}</Text>
                      <Text style={styles.modeCardDesc}>{opt.desc}</Text>
                      {active && (
                        <View style={[styles.modeCheck, { backgroundColor: opt.color }]}>
                          <Ionicons name="checkmark" size={11} color="#fff" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Count */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>📸  How many screenshots?</Text>
              <View style={styles.pickerRow}>
                <Pressable style={styles.nudgeBtn} onPress={() => setCount((c) => Math.max(1, c - 1))}>
                  <Ionicons name="remove" size={22} color="#3390ec" />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <CountPicker value={count} onChange={setCount} disabled={false} />
                </View>
                <Pressable style={styles.nudgeBtn} onPress={() => setCount((c) => Math.min(100, c + 1))}>
                  <Ionicons name="add" size={22} color="#3390ec" />
                </Pressable>
              </View>
              <Text style={styles.countHint}>Scroll or tap ＋/－ · range 1 – 100</Text>
            </View>

            {/* Summary */}
            <View style={styles.summaryCard}>
              <Ionicons name="information-circle" size={18} color="#3390ec" />
              <Text style={styles.summaryText}>
                Will generate{" "}
                <Text style={{ fontWeight: "700", color: "#3390ec" }}>{count} screenshot{count !== 1 ? "s" : ""}</Text>{" "}
                with <Text style={{ fontWeight: "700", color: "#3390ec" }}>{mode === "mix" ? "random light & dark" : mode + " mode"}</Text>{" "}
                background, packed into{" "}
                <Text style={{ fontWeight: "700", color: "#3390ec" }}>{projectName || "my_screenshots"}.zip</Text>
              </Text>
            </View>

            {/* Info banner for native */}
            {Platform.OS !== "web" && (
              <View style={styles.infoCard}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#27ae60" />
                <Text style={styles.infoCardText}>
                  A persistent notification will keep automation running even when you minimise the app or lock your screen.
                </Text>
              </View>
            )}

            {/* Start button */}
            <Pressable style={styles.startBtn} onPress={handleStart}>
              <Ionicons name="play-circle" size={22} color="#fff" />
              <Text style={styles.startBtnText}>Start Automation</Text>
            </Pressable>
          </>
        )}

        {/* ── Progress Card ─────────────────────────────────────────────── */}
        {isBusy && (
          <View style={styles.progressCard}>
            {/* Running time */}
            <View style={styles.progressHeaderRow}>
              <View style={styles.progressHeaderLeft}>
                {isRunning && <ActivityIndicator color="#3390ec" size="small" />}
                {isPaused  && <Ionicons name="pause-circle" size={20} color="#f39c12" />}
                <Text style={styles.progressTitle}>
                  {isRunning ? "Running…" : "Paused"}
                </Text>
              </View>
              <View style={styles.timerBadge}>
                <Ionicons name="time-outline" size={12} color="#3390ec" />
                <Text style={styles.timerText}>{runningTime}</Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${pct}%` as any, opacity: isPaused ? 0.5 : 1 }]} />
            </View>

            {/* Stats */}
            <View style={styles.progressStats}>
              <Text style={styles.progressPct}>{Math.round(pct)}%</Text>
              <Text style={styles.progressCount}>{progress.current} / {progress.total}</Text>
            </View>

            <Text style={styles.progressLabel} numberOfLines={2}>{progress.message}</Text>

            {/* Folder name */}
            <View style={styles.taskNameRow}>
              <Ionicons name="folder-outline" size={13} color="#888" />
              <Text style={styles.taskNameText}>{projectName || "my_screenshots"}.zip</Text>
            </View>

            {/* Controls */}
            <View style={styles.controlRow}>
              {isRunning && (
                <Pressable style={[styles.controlBtn, styles.pauseBtn]} onPress={handlePause}>
                  <Ionicons name="pause" size={18} color="#f39c12" />
                  <Text style={[styles.controlBtnText, { color: "#f39c12" }]}>Pause</Text>
                </Pressable>
              )}
              {isPaused && (
                <Pressable style={[styles.controlBtn, styles.resumeBtn]} onPress={handleResume}>
                  <Ionicons name="play" size={18} color="#27ae60" />
                  <Text style={[styles.controlBtnText, { color: "#27ae60" }]}>Resume</Text>
                </Pressable>
              )}
              <Pressable style={[styles.controlBtn, styles.stopBtn]} onPress={handleStop}>
                <Ionicons name="stop" size={18} color="#e74c3c" />
                <Text style={[styles.controlBtnText, { color: "#e74c3c" }]}>Stop</Text>
              </Pressable>
            </View>

            {isPaused && (
              <View style={styles.pausedNote}>
                <Ionicons name="information-circle-outline" size={14} color="#f39c12" />
                <Text style={styles.pausedNoteText}>
                  Automation is paused. Current progress is saved.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Stopped card ─────────────────────────────────────────────── */}
        {runStatus === "stopped" && (
          <View style={styles.stoppedCard}>
            <Ionicons name="stop-circle-outline" size={40} color="#e74c3c" />
            <Text style={styles.stoppedTitle}>Automation Stopped</Text>
            <Text style={styles.stoppedSub}>
              {progress.current} of {progress.total} screenshots were generated.
            </Text>
            <Pressable style={styles.runAgainBtn} onPress={handleReset}>
              <Ionicons name="refresh-outline" size={18} color="#3390ec" />
              <Text style={styles.runAgainText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* ── Error card ───────────────────────────────────────────────── */}
        {runStatus === "error" && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={40} color="#e74c3c" />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorSub}>{progress.message}</Text>
            <Pressable style={styles.runAgainBtn} onPress={handleReset}>
              <Ionicons name="refresh-outline" size={18} color="#3390ec" />
              <Text style={styles.runAgainText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* ── Done card ────────────────────────────────────────────────── */}
        {isDone && zipResult && (
          <View style={styles.doneCard}>
            <Ionicons name="checkmark-circle" size={48} color="#4caf50" />
            <Text style={styles.doneTitle}>Done! 🎉</Text>
            <Text style={styles.doneSubtitle}>
              {count} screenshots • {runningTime} total
            </Text>
            <Text style={styles.doneFile}>{zipResult.filename}</Text>

            {Platform.OS === "web" ? (
              <Pressable style={styles.downloadZipBtn} onPress={handleDownloadZip}>
                <Ionicons name="download" size={20} color="#fff" />
                <Text style={styles.downloadZipText}>Download ZIP ({count} files)</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.downloadZipBtn} onPress={() => router.push("/results" as any)}>
                <Ionicons name="open-outline" size={20} color="#fff" />
                <Text style={styles.downloadZipText}>View Results & Download</Text>
              </Pressable>
            )}

            <Pressable style={styles.runAgainBtn} onPress={handleReset}>
              <Ionicons name="refresh-outline" size={18} color="#3390ec" />
              <Text style={styles.runAgainText}>Run Again</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f0f2f5" },

  header: { backgroundColor: "#3390ec", flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingBottom: 12, justifyContent: "space-between" },
  backBtn: { padding: 8, borderRadius: 20, width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },

  recoveryBanner: { backgroundColor: "#d6eaf8", flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderLeftWidth: 4, borderLeftColor: "#3390ec" },
  recoveryTitle: { fontSize: 13, fontWeight: "700", color: "#1a5276", fontFamily: "Inter_700Bold" },
  recoverySub: { fontSize: 12, color: "#2980b9", fontFamily: "Inter_400Regular", marginTop: 2 },

  bgBanner: { backgroundColor: "#27ae60", flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  bgBannerText: { color: "#fff", fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  permBanner: { backgroundColor: "#fff3cd", flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  permBannerText: { color: "#856404", fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  section: { gap: 10 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#555", fontFamily: "Inter_700Bold", letterSpacing: 0.3 },

  nameInput: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: "#111", fontFamily: "Inter_400Regular", borderWidth: 1.5, borderColor: "#e0e0e0" },

  modeRow: { flexDirection: "row", gap: 10 },
  modeCard: { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 12, alignItems: "center", gap: 6, borderWidth: 2, borderColor: "#e8e8e8", position: "relative" },
  modeCardLabel: { fontSize: 12, fontWeight: "700", color: "#666", fontFamily: "Inter_700Bold", textAlign: "center" },
  modeCardDesc: { fontSize: 10, color: "#aaa", fontFamily: "Inter_400Regular", textAlign: "center" },
  modeCheck: { position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },

  pickerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  nudgeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#3390ec", alignItems: "center", justifyContent: "center", shadowColor: "#3390ec", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 2 },
  countHint: { fontSize: 11.5, color: "#999", fontFamily: "Inter_400Regular", textAlign: "center" },

  summaryCard: { backgroundColor: "#e8f1fd", borderRadius: 14, padding: 14, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  summaryText: { flex: 1, fontSize: 13, color: "#333", fontFamily: "Inter_400Regular", lineHeight: 19 },

  infoCard: { backgroundColor: "#e8f8ef", borderRadius: 14, padding: 14, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  infoCardText: { flex: 1, fontSize: 13, color: "#27ae60", fontFamily: "Inter_400Regular", lineHeight: 19 },

  startBtn: { backgroundColor: "#3390ec", borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 10, shadowColor: "#3390ec", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  startBtnText: { fontSize: 16, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },

  // Progress card
  progressCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  progressHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressTitle: { fontSize: 16, fontWeight: "700", color: "#333", fontFamily: "Inter_700Bold" },
  timerBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#e8f1fd", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  timerText: { fontSize: 12, color: "#3390ec", fontFamily: "Inter_600SemiBold" },
  progressBarBg: { height: 10, backgroundColor: "#e8e8e8", borderRadius: 5, overflow: "hidden" },
  progressBarFill: { height: "100%" as any, backgroundColor: "#3390ec", borderRadius: 5 },
  progressStats: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressPct: { fontSize: 22, fontWeight: "700", color: "#3390ec", fontFamily: "Inter_700Bold" },
  progressCount: { fontSize: 13, color: "#888", fontFamily: "Inter_400Regular" },
  progressLabel: { fontSize: 13, color: "#555", fontFamily: "Inter_400Regular" },
  taskNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  taskNameText: { fontSize: 12, color: "#aaa", fontFamily: "Inter_400Regular" },

  // Control buttons
  controlRow: { flexDirection: "row", gap: 10 },
  controlBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, gap: 6 },
  pauseBtn: { borderColor: "#f39c12", backgroundColor: "#fff8f0" },
  resumeBtn: { borderColor: "#27ae60", backgroundColor: "#f0fff5" },
  stopBtn: { borderColor: "#e74c3c", backgroundColor: "#fff5f5" },
  controlBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  pausedNote: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff8f0", borderRadius: 10, padding: 10 },
  pausedNoteText: { flex: 1, fontSize: 12, color: "#f39c12", fontFamily: "Inter_400Regular" },

  // Stopped
  stoppedCard: { backgroundColor: "#fff", borderRadius: 20, padding: 28, alignItems: "center", gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 5 },
  stoppedTitle: { fontSize: 20, fontWeight: "700", color: "#0a0a0a", fontFamily: "Inter_700Bold" },
  stoppedSub: { fontSize: 13, color: "#666", fontFamily: "Inter_400Regular", textAlign: "center" },

  // Error
  errorCard: { backgroundColor: "#fff", borderRadius: 20, padding: 28, alignItems: "center", gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 5 },
  errorTitle: { fontSize: 20, fontWeight: "700", color: "#e74c3c", fontFamily: "Inter_700Bold" },
  errorSub: { fontSize: 13, color: "#666", fontFamily: "Inter_400Regular", textAlign: "center" },

  // Done
  doneCard: { backgroundColor: "#fff", borderRadius: 20, padding: 28, alignItems: "center", gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 5 },
  doneTitle: { fontSize: 26, fontWeight: "700", color: "#0a0a0a", fontFamily: "Inter_700Bold" },
  doneSubtitle: { fontSize: 13, color: "#666", fontFamily: "Inter_400Regular" },
  doneFile: { fontSize: 12, color: "#3390ec", fontFamily: "Inter_400Regular" },
  downloadZipBtn: { marginTop: 8, backgroundColor: "#4caf50", borderRadius: 14, flexDirection: "row", alignItems: "center", paddingVertical: 15, paddingHorizontal: 28, gap: 10, shadowColor: "#4caf50", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 5, width: "100%" as any, justifyContent: "center" },
  downloadZipText: { fontSize: 15, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },

  runAgainBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, paddingHorizontal: 24, gap: 6 },
  runAgainText: { fontSize: 14, color: "#3390ec", fontFamily: "Inter_600SemiBold" },
});
