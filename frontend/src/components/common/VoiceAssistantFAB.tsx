import { AlertCircle, Check, Mic, MicOff } from "lucide-react";

import { useVoiceNavigation } from "@/hooks/useVoiceNavigation";
import { cn } from "@/utils/cn";

/**
 * Floating circular voice-assistant button. Fixed bottom-right, above all
 * content, shown on every authenticated page. Pure presentation — it reuses the
 * existing useVoiceNavigation hook and only calls toggle().
 *
 * Sizing: 56px on small screens (16px inset), 64px from sm up (24px inset).
 */
export function VoiceAssistantFAB() {
  const { supported, status, toggle } = useVoiceNavigation();

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        aria-label="Voice Assistant"
        title="Voice navigation isn't supported in this browser"
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-on-surface-variant opacity-60 shadow-lg sm:bottom-6 sm:right-6 sm:h-16 sm:w-16"
      >
        <MicOff className="h-6 w-6" />
      </button>
    );
  }

  const listening = status === "listening";
  const Icon = status === "success" ? Check : status === "error" ? AlertCircle : Mic;
  const title = listening ? "Listening..." : "Voice Assistant";

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {/* Pulsing ring while listening */}
      {listening && (
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" aria-hidden />
      )}
      <button
        type="button"
        onClick={toggle}
        aria-label="Voice Assistant"
        aria-pressed={listening}
        title={title}
        className={cn(
          "relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:h-16 sm:w-16",
          status === "success" && "bg-tertiary-container",
          status === "error" && "bg-error",
          (status === "idle" || listening) && "bg-primary-container hover:bg-primary",
          // Glow while listening
          listening && "ring-4 ring-primary/30 shadow-[0_0_28px_rgba(79,70,229,0.6)]",
        )}
      >
        <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
      </button>
    </div>
  );
}
