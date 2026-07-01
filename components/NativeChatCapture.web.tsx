/**
 * NativeChatCapture.web.tsx
 * Web stub — NativeChatCapture is a no-op on web (html2canvas handles screenshots).
 */
import React, { forwardRef, useImperativeHandle } from "react";

export interface NativeChatCaptureHandle {
  capture(user: any, messages: any, darkMode: boolean): Promise<string>;
}

const NativeChatCapture = forwardRef<NativeChatCaptureHandle>((_, ref) => {
  useImperativeHandle(ref, () => ({
    capture: async () => {
      throw new Error("NativeChatCapture is not available on web");
    },
  }));
  return null;
});

NativeChatCapture.displayName = "NativeChatCapture";
export default NativeChatCapture;
