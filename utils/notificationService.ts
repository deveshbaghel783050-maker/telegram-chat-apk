/**
 * notificationService.ts
 * Manages persistent foreground-service notification (Android) and
 * completion notification. Web uses the Notifications API.
 */
import { Platform } from "react-native";

// ─── Native (Expo Notifications) ─────────────────────────────────────────────
let Notifications: typeof import("expo-notifications") | null = null;

async function getNativeNotifications() {
  if (Platform.OS === "web") return null;
  if (!Notifications) {
    Notifications = await import("expo-notifications");
  }
  return Notifications;
}

const CHANNEL_RUNNING = "automation-running";
const CHANNEL_DONE    = "automation-done";
const PERSISTENT_ID   = "automation-persistent-notif";

export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === "web") {
    if (typeof Notification === "undefined") return false;
    const perm = await Notification.requestPermission();
    return perm === "granted";
  }

  const N = await getNativeNotifications();
  if (!N) return false;

  const perms = await N.requestPermissionsAsync();
  if (!((perms as any).granted ?? (perms as any).status === "granted")) return false;

  if (Platform.OS === "android") {
    await N.setNotificationChannelAsync(CHANNEL_RUNNING, {
      name: "Automation Running",
      importance: N.AndroidImportance.HIGH,
      enableVibrate: false,
      showBadge: false,
      lockscreenVisibility: N.AndroidNotificationVisibility.PUBLIC,
    });
    await N.setNotificationChannelAsync(CHANNEL_DONE, {
      name: "Automation Completed",
      importance: N.AndroidImportance.HIGH,
      enableVibrate: true,
      showBadge: true,
    });
  }
  return true;
}

export interface ProgressPayload {
  pct: number;
  current: number;
  total: number;
  taskName: string;
  runningTime: string;
}

export async function showPersistentNotification(p: ProgressPayload): Promise<void> {
  if (Platform.OS === "web") {
    // Web: update document title as a lightweight indicator
    document.title = `⚡ ${Math.round(p.pct)}% — ${p.taskName}`;
    return;
  }

  const N = await getNativeNotifications();
  if (!N) return;

  await N.scheduleNotificationAsync({
    identifier: PERSISTENT_ID,
    content: {
      title: "⚡ Automation Running",
      body: `${p.taskName}\n${Math.round(p.pct)}% • ${p.current}/${p.total} • ${p.runningTime}`,
      data: { type: "automation_progress" },
      sticky: true,
      autoDismiss: false,
      android: {
        channelId: CHANNEL_RUNNING,
        ongoing: true,
        sticky: true,
        progress: { max: 100, current: Math.round(p.pct) },
        color: "#3390ec",
      },
    } as any,
    trigger: null,
  });
}

export async function updatePersistentNotification(p: ProgressPayload): Promise<void> {
  // expo-notifications replaces by identifier automatically
  await showPersistentNotification(p);
}

export async function dismissPersistentNotification(): Promise<void> {
  if (Platform.OS === "web") {
    document.title = "Telegram Chat UI";
    return;
  }
  const N = await getNativeNotifications();
  if (!N) return;
  await N.dismissNotificationAsync(PERSISTENT_ID).catch(() => {});
}

export interface CompletionPayload {
  count: number;
  folderName: string;
  completedAt: string;
  taskId: string;
}

export async function showCompletionNotification(payload: CompletionPayload): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      const n = new Notification("✅ Automation Completed!", {
        body: `${payload.count} screenshots ready in ${payload.folderName}\nCompleted at ${payload.completedAt}`,
        icon: "/icon.png",
        tag: "automation-done",
        requireInteraction: true,
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    }
    return;
  }

  const N = await getNativeNotifications();
  if (!N) return;

  await N.scheduleNotificationAsync({
    content: {
      title: "✅ Automation Completed Successfully",
      body: `${payload.count} screenshots ready\nFolder: ${payload.folderName}\nCompleted: ${payload.completedAt}`,
      data: {
        type: "automation_complete",
        taskId: payload.taskId,
        count: payload.count,
        folderName: payload.folderName,
        completedAt: payload.completedAt,
        screen: "results",
      },
      android: {
        channelId: CHANNEL_DONE,
        color: "#4caf50",
        priority: "high",
      },
    } as any,
    trigger: null,
  });
}

export async function showErrorNotification(message: string): Promise<void> {
  if (Platform.OS === "web") return;
  const N = await getNativeNotifications();
  if (!N) return;

  await N.scheduleNotificationAsync({
    content: {
      title: "❌ Automation Failed",
      body: message,
      data: { type: "automation_error", screen: "automation" },
      android: { channelId: CHANNEL_DONE, color: "#e53935" },
    } as any,
    trigger: null,
  });
}
