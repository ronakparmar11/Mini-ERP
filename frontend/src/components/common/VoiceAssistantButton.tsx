import { Check, Mic, MicOff, X } from "lucide-react";

import { useVoiceNavigation, type VoiceStatus } from "@/hooks/useVoiceNavigation";
import { cn } from "@/utils/cn";

const toneByStatus: Record<VoiceStatus, string> = {
  idle: "border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container",
  listening: "border-error/40 bg-error-container/40 text-error",
  success: "border-tertiary-fixed-dim bg-[#f0fdf4] text-tertiary-container",
  error: "border-error-container bg-error-container/40 text-on-error-container",
};

/**
 * Topbar microphone button: starts/stops voice navigation and reflects the
 * current state (idle / listening / success / error) with text + icon.
 * Degrades gracefully to a disabled control where the Web Speech API is absent.
 */
export function VoiceAssistantButton() {
  const { supported, status, message, toggle } = useVoiceNavigation();

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        title="Voice navigation isn't supported in this browser"
        className="flex h-9 items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-3 text-body-sm font-medium text-on-surface-variant opacity-60"
      >
        <MicOff className="h-4 w-4" />
        Voice
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={status === "listening"}
      aria-label="Voice navigation"
      title="Voice navigation — click and speak a command"
      className={cn(
        "flex h-9 items-center gap-2 rounded-full border px-3 text-body-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        toneByStatus[status],
      )}
    >
      {status === "listening" ? (
        <span className="relative flex h-2.5 w-2.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-error" />
        </span>
      ) : status === "success" ? (
        <Check className="h-4 w-4" />
      ) : status === "error" ? (
        <X className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
      <span className="max-w-[200px] truncate">{message}</span>
    </button>
  );
}
