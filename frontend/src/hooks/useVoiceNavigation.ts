import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export type VoiceStatus = "idle" | "listening" | "success" | "error";

interface VoiceCommand {
  /** Human label used in feedback ("Navigating to <label>"). */
  label: string;
  /** Route to navigate to. */
  path: string;
  /** When true, open that page's "New" drawer on arrival. */
  create?: boolean;
  /** Matches a normalized (lowercase) transcript. */
  test: (t: string) => boolean;
}

const has = (t: string, ...words: string[]) => words.some((w) => t.includes(w));

/**
 * Language-aware voice command registry.
 *
 * Each key is a supported i18n language code. The active language's commands
 * are loaded at runtime by useVoiceNavigation().
 *
 * PHASE 1: English commands are fully wired; Gujarati registry is intentionally
 * empty — it will be populated in a later phase when Gujarati voice support is
 * added. The hook falls back to English commands when the active language has
 * no registered commands.
 */
export const VOICE_COMMAND_REGISTRY: Record<string, VoiceCommand[]> = {
  en: [
    {
      label: "Sales Order",
      path: "/sales",
      create: true,
      test: (t) => has(t, "create", "new", "add") && has(t, "sales", "order"),
    },
    {
      label: "Product",
      path: "/products",
      create: true,
      test: (t) => has(t, "create", "new", "add") && has(t, "product"),
    },
    { label: "Dashboard", path: "/dashboard", test: (t) => has(t, "dashboard", "home", "overview") },
    { label: "Products", path: "/products", test: (t) => has(t, "product") },
    { label: "Sales Orders", path: "/sales", test: (t) => has(t, "sales", "sale") },
    { label: "Invoices", path: "/invoices", test: (t) => has(t, "invoice", "billing") },
    { label: "Purchase Orders", path: "/purchase-orders", test: (t) => has(t, "purchase", "purchasing") },
    {
      label: "Bills of Materials",
      path: "/bom",
      test: (t) =>
        t.includes("bom") ||
        t.includes("bill of material") ||
        t.includes("bills of material") ||
        t.includes("bill materials") ||
        t.includes("materials"),
    },
    { label: "Manufacturing Orders", path: "/manufacturing", test: (t) => has(t, "manufactur", "production") },
    { label: "Inventory", path: "/inventory", test: (t) => has(t, "inventory", "stock") },
    { label: "Audit Logs", path: "/audit-logs", test: (t) => has(t, "audit", "log") },
  ],
  // Gujarati voice commands — to be implemented in Phase 2.
  gu: [],
};

/** Returns the command list for the active language, falling back to English. */
function getCommandsForLanguage(lang: string): VoiceCommand[] {
  const commands = VOICE_COMMAND_REGISTRY[lang];
  return commands && commands.length > 0 ? commands : (VOICE_COMMAND_REGISTRY["en"] ?? []);
}

// ── Minimal Web Speech API typings (not in the standard lib.dom types) ───────
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onresult: ((event: any) => void) | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const IDLE_LABEL = "Voice";
const RESET_MS = 2600;

/**
 * Encapsulates browser speech recognition + command routing. No backend calls.
 * Returns the current status, a feedback message, and a toggle to start/stop.
 *
 * The recognition language follows the active i18n language. Commands are
 * sourced from the VOICE_COMMAND_REGISTRY for the active language.
 */
export function useVoiceNavigation() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [message, setMessage] = useState(IDLE_LABEL);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const resolvedRef = useRef(false); // true once a transcript has been handled
  const resetTimer = useRef<number | null>(null);
  const supported = !!getRecognitionCtor();

  const scheduleReset = useCallback(() => {
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => {
      setStatus("idle");
      setMessage(IDLE_LABEL);
    }, RESET_MS);
  }, []);

  const handleTranscript = useCallback(
    (transcript: string) => {
      resolvedRef.current = true;
      const t = transcript.toLowerCase().trim();
      const commands = getCommandsForLanguage(i18n.language);
      const cmd = commands.find((c) => c.test(t));
      if (!cmd) {
        setStatus("error");
        setMessage("Command not recognized");
        scheduleReset();
        return;
      }
      if (cmd.create) {
        navigate(cmd.path, { state: { create: true } });
        setMessage(`Opening new ${cmd.label}`);
      } else {
        navigate(cmd.path);
        setMessage(`Navigating to ${cmd.label}`);
      }
      setStatus("success");
      scheduleReset();
    },
    [navigate, scheduleReset, i18n.language],
  );

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    // Use the BCP-47 tag for the active language; default to en-US.
    recognition.lang = i18n.language === "gu" ? "gu-IN" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    resolvedRef.current = false;

    recognition.onstart = () => {
      setStatus("listening");
      setMessage("Listening...");
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript: string = event?.results?.[0]?.[0]?.transcript ?? "";
      handleTranscript(transcript);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        setStatus("error");
        setMessage("Microphone blocked");
      } else if (!resolvedRef.current) {
        setStatus("error");
        setMessage("Command not recognized");
      }
      scheduleReset();
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      // Stopped with no result and no error → quietly return to idle.
      if (!resolvedRef.current) {
        setStatus((s) => (s === "listening" ? "idle" : s));
        setMessage((m) => (m === "Listening..." ? IDLE_LABEL : m));
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // start() throws if invoked while already active; safe to ignore.
    }
  }, [handleTranscript, scheduleReset, i18n.language]);

  const toggle = useCallback(() => {
    if (status === "listening") recognitionRef.current?.stop();
    else start();
  }, [status, start]);

  // Cleanup on unmount.
  useEffect(
    () => () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      recognitionRef.current?.abort();
    },
    [],
  );

  return { supported, status, message, listening: status === "listening", toggle };
}
