/**
 * backgroundService.ts
 * Android foreground-service keep-alive + background task registration.
 *
 * On Android, showing a persistent sticky notification triggers the OS to treat
 * the app as a "foreground service", which prevents it from being killed while
 * the notification is visible. This is the standard way to keep an Expo/RN app
 * running when minimized.
 *
 * expo-task-manager / expo-background-fetch provide an additional safety net
 * that can re-launch the JS task if the app is killed and the task is still
 * marked as in-progress in AsyncStorage.
 */
import { AppState, AppStateStatus, Platform } from "react-native";

// ─── Task name constant (shared with registration in _layout.tsx) ─────────────
export const AUTOMATION_BG_TASK = "AUTOMATION_BACKGROUND_TASK";

let _appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
let _onBackground: (() => void) | null = null;
let _onForeground: (() => void) | null = null;

/**
 * Subscribe to app state changes so the automation can react when the user
 * minimises/restores the app. On Android this works together with the
 * foreground-service notification that keeps the JS thread alive.
 */
export function subscribeToAppState(
  onBackground: () => void,
  onForeground: () => void,
): () => void {
  _onBackground = onBackground;
  _onForeground = onForeground;

  if (_appStateSubscription) {
    _appStateSubscription.remove();
  }

  _appStateSubscription = AppState.addEventListener(
    "change",
    (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        _onBackground?.();
      } else if (nextState === "active") {
        _onForeground?.();
      }
    },
  );

  return () => {
    _appStateSubscription?.remove();
    _appStateSubscription = null;
    _onBackground = null;
    _onForeground = null;
  };
}

// ─── Background-fetch task (re-launch safety net) ────────────────────────────
let _bgFetchRegistered = false;

export async function registerBackgroundFetchTask(): Promise<void> {
  if (Platform.OS === "web" || _bgFetchRegistered) return;
  try {
    const TaskManager = await import("expo-task-manager");
    const BackgroundFetch = await import("expo-background-fetch");

    // Only register if not already defined
    if (!TaskManager.isTaskDefined(AUTOMATION_BG_TASK)) return; // defined in _layout.tsx

    await BackgroundFetch.registerTaskAsync(AUTOMATION_BG_TASK, {
      minimumInterval: 15,          // seconds (Android minimum is ~15)
      stopOnTerminate: false,        // keep task registered after app is killed
      startOnBoot: false,            // don't auto-start on device reboot
    });
    _bgFetchRegistered = true;
  } catch (e) {
    // Not critical — foreground-service notification is the main mechanism
    console.warn("[BackgroundService] Could not register background fetch:", e);
  }
}

export async function unregisterBackgroundFetchTask(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const BackgroundFetch = await import("expo-background-fetch");
    await BackgroundFetch.unregisterTaskAsync(AUTOMATION_BG_TASK);
    _bgFetchRegistered = false;
  } catch {
    // ignore
  }
}

/**
 * Returns true if Android — where we need extra keep-alive logic.
 * On iOS the JS thread is paused when backgrounded (no foreground service).
 * On web the tab stays alive as long as it isn't closed.
 */
export function needsForegroundService(): boolean {
  return Platform.OS === "android";
}
