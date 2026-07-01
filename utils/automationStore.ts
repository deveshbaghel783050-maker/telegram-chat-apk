/**
 * automationStore.ts
 * Persistent automation state backed by AsyncStorage.
 * Survives app kill, restart, and foreground service restarts.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "automation_state_v1";

export type AutomationStatus = "idle" | "running" | "paused" | "done" | "error" | "stopped";

export interface AutomationState {
  taskId: string;
  projectName: string;
  mode: "light" | "dark" | "mix";
  totalCount: number;
  completedCount: number;
  status: AutomationStatus;
  startedAt: number; // epoch ms
  completedAt?: number;
  currentTaskName: string;
  errorMessage?: string;
  outputFiles: Array<{ filename: string; dataUrl: string }>;
  folderName: string;
}

const DEFAULT_STATE: AutomationState = {
  taskId: "",
  projectName: "my_screenshots",
  mode: "mix",
  totalCount: 0,
  completedCount: 0,
  status: "idle",
  startedAt: 0,
  currentTaskName: "",
  outputFiles: [],
  folderName: "",
};

export async function saveAutomationState(state: AutomationState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // Best-effort — don't crash on storage errors
  }
}

export async function loadAutomationState(): Promise<AutomationState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<AutomationState>) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function clearAutomationState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function computeRunningTime(startedAt: number): string {
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
