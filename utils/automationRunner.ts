import JSZip from "jszip";
import { Platform } from "react-native";
import { generateChatScreenshot } from "./generateScreenshot";
import {
  WIN_IMAGE_MARKER,
  getRandomUser,
  getWinConversation,
} from "./randomData";

export type AutoMode = "light" | "dark" | "mix";

export type AutoProgress = {
  current: number;
  total: number;
  status: "idle" | "running" | "paused" | "done" | "error" | "stopped";
  message: string;
};

export type AutoResult = {
  zipBlob: Blob;
  count: number;
  folderName: string;
};

// ─── Win images cache ──────────────────────────────────────────────────────────
type WinImage = { name: string; dataUrl: string };
let _winImagesCache: WinImage[] | null = null;

async function loadWinImages(): Promise<WinImage[]> {
  if (_winImagesCache) return _winImagesCache;
  try {
    const res = await fetch("/win-images.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _winImagesCache = await res.json();
    return _winImagesCache!;
  } catch (e) {
    console.warn("Could not load win-images.json:", e);
    return [];
  }
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Pre-warm the cache on app start so first automation is fast */
export async function preloadWinImages(): Promise<void> {
  await loadWinImages();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ─── Automation Controller ─────────────────────────────────────────────────────
/**
 * Shared controller that lets the UI pause/resume/cancel a running automation
 * without needing to cancel the entire async operation.
 */
export class AutomationController {
  private _paused = false;
  private _stopped = false;
  private _resolveResume: (() => void) | null = null;

  get isPaused() { return this._paused; }
  get isStopped() { return this._stopped; }

  pause() {
    this._paused = true;
  }

  resume() {
    this._paused = false;
    this._resolveResume?.();
    this._resolveResume = null;
  }

  stop() {
    this._stopped = true;
    this.resume(); // unblock any waiting pause
  }

  /** Call this at each checkpoint — suspends execution if paused. */
  async checkPoint(): Promise<void> {
    if (this._stopped) throw new StopError("Automation stopped by user");
    if (this._paused) {
      await new Promise<void>((resolve) => {
        this._resolveResume = resolve;
      });
    }
    if (this._stopped) throw new StopError("Automation stopped by user");
  }
}

export class StopError extends Error {
  readonly isStop = true;
  constructor(msg: string) { super(msg); }
}

// ─── Native capture callback (set from UI component) ──────────────────────────
/**
 * On Android native we can't use html2canvas (no DOM).
 * The automation screen mounts a hidden NativeChatCapture component and
 * registers a capture callback here so runAutomation can call it.
 */
type NativeCaptureCallback = (
  user: ReturnType<typeof getRandomUser>,
  messages: ReturnType<typeof getWinConversation>,
  darkMode: boolean,
) => Promise<string>; // returns dataUrl

let _nativeCaptureCallback: NativeCaptureCallback | null = null;

export function registerNativeCaptureCallback(fn: NativeCaptureCallback) {
  _nativeCaptureCallback = fn;
}

export function unregisterNativeCaptureCallback() {
  _nativeCaptureCallback = null;
}

// ─── Main automation runner ────────────────────────────────────────────────────
export async function runAutomation(
  mode: AutoMode,
  count: number,
  projectName: string,
  onProgress: (p: AutoProgress) => void,
  controller?: AutomationController,
): Promise<AutoResult> {
  const ctrl = controller ?? new AutomationController();
  const zip = new JSZip();
  const folderName = projectName.trim() || `screenshots_${Date.now()}`;
  const folder = zip.folder(folderName)!;

  const isNative = Platform.OS !== "web";

  if (isNative && !_nativeCaptureCallback) {
    throw new Error("Native capture not ready. Ensure the automation screen is mounted.");
  }

  onProgress({ current: 0, total: count, status: "running", message: "Loading win images..." });

  // Load win images (web only — on native the capture component handles its own images)
  const winImages: WinImage[] = isNative ? [] : await loadWinImages();

  onProgress({ current: 0, total: count, status: "running", message: "Starting…" });

  for (let i = 0; i < count; i++) {
    await ctrl.checkPoint();

    const user = getRandomUser();
    const messages = getWinConversation(user);

    // Inject win images (web path only)
    if (!isNative && winImages.length > 0) {
      const winImg = pickRandom(winImages);
      for (const msg of messages) {
        if (msg.imageUri === WIN_IMAGE_MARKER) {
          msg.imageUri = winImg.dataUrl;
        }
      }
    } else if (!isNative) {
      for (const msg of messages) {
        if (msg.imageUri === WIN_IMAGE_MARKER) {
          msg.imageUri = undefined;
          if (!msg.text) msg.text = "📸 Dekho ye proof";
        }
      }
    }

    let darkMode: boolean;
    if (mode === "light") darkMode = false;
    else if (mode === "dark") darkMode = true;
    else darkMode = Math.random() > 0.5;

    onProgress({
      current: i + 1,
      total: count,
      status: "running",
      message: `Generating ${i + 1}/${count} — ${user.name} (${darkMode ? "dark" : "light"})`,
    });

    let dataUrl: string;
    if (isNative && _nativeCaptureCallback) {
      dataUrl = await _nativeCaptureCallback(user, messages, darkMode);
    } else {
      dataUrl = await generateChatScreenshot(user, messages, user.name, darkMode);
    }

    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    const modeLabel = darkMode ? "dark" : "light";
    const filename = `chat_${String(i + 1).padStart(3, "0")}_${user.username.replace("@", "")}_${modeLabel}.png`;
    folder.file(filename, base64, { base64: true });

    // Small yield to keep the UI responsive
    await new Promise((r) => setTimeout(r, isNative ? 50 : 80));

    await ctrl.checkPoint();
  }

  onProgress({ current: count, total: count, status: "running", message: "Packing ZIP…" });

  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  onProgress({ current: count, total: count, status: "done", message: `Done! ${count} screenshots ready.` });

  return { zipBlob, count, folderName };
}
