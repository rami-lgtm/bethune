import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUp,
  Battery,
  Bot,
  CheckCircle2,
  Circle,
  Clock,
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useVoiceInput, speak } from "@/hooks/use-voice";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardPage,
});

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const suggestions = [
  "Vacuum the living room",
  "Show robot status",
  "Schedule a lawn mow for tomorrow",
  "Run a security sweep",
];

const robots = [
  { name: "Vacuum V3", battery: 87, status: "idle" as const },
  { name: "Mower X1", battery: 42, status: "active" as const },
  { name: "Kitchen K2", battery: 100, status: "charging" as const },
  { name: "Drone S1", battery: 65, status: "idle" as const },
  { name: "Window W1", battery: 0, status: "offline" as const },
];

const todayActivity = [
  { text: "Vacuum V3 cleaned the living room", time: "2 min ago", done: true },
  { text: "Mower X1 is mowing the front yard", time: "12 min ago", done: false },
  { text: "Kitchen K2 finished dishwasher cycle", time: "1 hr ago", done: true },
  { text: "Drone S1 completed perimeter scan", time: "3 hrs ago", done: true },
];

function DashboardPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [wakeWordTriggered, setWakeWordTriggered] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const voice = useVoiceInput();
  const autoSubmitRef = useRef(false);

  const addDebug = (msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setDebugLog((prev) => [`[${ts}] ${msg}`, ...prev].slice(0, 50));
  };

  // Sync voice transcript into input field
  useEffect(() => {
    if (voice.transcript) {
      setInput(voice.transcript);
      addDebug(`Transcript: "${voice.transcript}"`);
    }
  }, [voice.transcript]);

  // Auto-submit when voice recognition produces a final result (wake word flow)
  useEffect(() => {
    if (voice.finalTranscript && autoSubmitRef.current) {
      addDebug(`Auto-submitting: "${voice.finalTranscript}"`);
      // Small delay to ensure state is synced
      setTimeout(() => {
        handleSubmitText(voice.finalTranscript);
        autoSubmitRef.current = false;
      }, 200);
    }
  }, [voice.finalTranscript]);

  // Listen for wake word from native Android app (window.onBethuneWakeWord)
  useEffect(() => {
    (window as any).onBethuneWakeWord = () => {
      addDebug("Wake word detected! Starting voice input...");
      setWakeWordTriggered(true);
      autoSubmitRef.current = true;
      voice.start();
      setTimeout(() => setWakeWordTriggered(false), 2000);
    };
    return () => {
      delete (window as any).onBethuneWakeWord;
    };
  }, [voice.start]);

  // Check if running inside native Android app
  useEffect(() => {
    const isNative = !!(window as any).BethuneNative;
    addDebug(`Platform: ${isNative ? "Android native app" : "Browser"}`);
    addDebug(`Voice supported: ${voice.isSupported}`);
  }, [voice.isSupported]);

  const handleSubmitText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    addDebug(`Sending: "${trimmed}"`);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: getPlaceholderResponse(trimmed),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");

    if (voiceOutputEnabled) {
      speak(assistantMsg.content);
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const handleSubmit = () => {
    handleSubmitText(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Wake word flash indicator */}
      {wakeWordTriggered && (
        <div className="absolute inset-x-0 top-0 z-50 flex items-center justify-center bg-green-500 px-4 py-2 text-sm font-medium text-white animate-pulse">
          Wake word detected — listening...
        </div>
      )}

      {/* Debug panel toggle */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="absolute right-3 top-3 z-50 rounded-lg bg-bethune-black/10 px-2 py-1 text-[10px] font-mono text-bethune-gray hover:bg-bethune-black/20"
      >
        {showDebug ? "Hide Debug" : "Debug"}
      </button>

      {/* Debug log panel */}
      {showDebug && (
        <div className="absolute right-3 top-10 z-50 max-h-60 w-80 overflow-y-auto rounded-xl border border-bethune-black/10 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-bethune-black">Wake Word Debug</span>
            <div className="flex items-center gap-2">
              <span className={`inline-block size-2 rounded-full ${voice.isListening ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
              <span className="text-[10px] text-bethune-muted">
                {voice.isListening ? "Listening" : "Idle"}
              </span>
            </div>
          </div>
          <div className="space-y-0.5">
            {debugLog.length === 0 ? (
              <p className="text-[10px] text-bethune-muted">No events yet. Say "Okay Computer" to trigger.</p>
            ) : (
              debugLog.map((log, i) => (
                <p key={i} className="font-mono text-[10px] text-bethune-gray">{log}</p>
              ))
            )}
          </div>
        </div>
      )}

      {/* Messages / empty state */}
      <div className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          <EmptyState
            onSuggestionClick={(s) => {
              setInput(s);
              textareaRef.current?.focus();
            }}
          />
        ) : (
          <div className="mx-auto max-w-3xl px-6 py-10">
            <div className="flex flex-col gap-6">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={bottomRef} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-bethune-black/5 bg-white px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-3 rounded-2xl border border-bethune-black/10 bg-bethune-cream/50 px-4 py-3 transition-colors focus-within:border-bethune-warm/30 focus-within:bg-white">
            {voice.isSupported && (
              <button
                onClick={voice.isListening ? voice.stop : voice.start}
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-all active:scale-95 ${
                  voice.isListening
                    ? "animate-pulse bg-red-500 text-white"
                    : "bg-bethune-cream text-bethune-gray hover:text-bethune-black"
                }`}
                title={voice.isListening ? "Stop listening" : "Voice input"}
              >
                {voice.isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>
            )}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={voice.isListening ? "Listening..." : "Ask Bethune anything..."}
              rows={1}
              className="max-h-[200px] flex-1 resize-none bg-transparent text-sm text-bethune-black outline-none placeholder:text-bethune-muted"
            />
            <button
              onClick={() => setVoiceOutputEnabled(!voiceOutputEnabled)}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-bethune-cream text-bethune-gray transition-all hover:text-bethune-black active:scale-95"
              title={voiceOutputEnabled ? "Mute voice output" : "Enable voice output"}
            >
              {voiceOutputEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-bethune-warm text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:hover:brightness-100"
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-bethune-muted">
            Bethune can control your robots and answer questions about your home.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Empty state with digest ─── */

function EmptyState({ onSuggestionClick }: { onSuggestionClick: (s: string) => void }) {
  const onlineCount = robots.filter((r) => r.status !== "offline").length;

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl">
        {/* Greeting */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl bg-bethune-cream">
            <Sparkles className="size-5 text-bethune-warm" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-bethune-black">
            Good {getGreeting()}, here's your home
          </h1>
          <p className="mt-1.5 text-sm text-bethune-gray">
            {onlineCount} of {robots.length} robots online
          </p>
        </div>

        {/* Robot status strip */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {robots.map((robot) => (
            <RobotPill key={robot.name} {...robot} />
          ))}
        </div>

        {/* Today's activity */}
        <div className="mb-8 rounded-2xl border border-bethune-black/5 bg-white p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-bethune-muted">
            Today
          </h2>
          <ul className="flex flex-col gap-3">
            {todayActivity.map((item) => (
              <li key={item.text} className="flex items-start gap-3">
                <div className="mt-0.5">
                  {item.done ? (
                    <CheckCircle2 className="size-4 text-green-500" />
                  ) : (
                    <Clock className="size-4 text-bethune-warm" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-bethune-black">{item.text}</p>
                </div>
                <span className="shrink-0 text-xs text-bethune-muted">{item.time}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Suggestions */}
        <div className="flex flex-wrap justify-center gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onSuggestionClick(s)}
              className="rounded-full border border-bethune-black/5 bg-white px-4 py-2 text-sm text-bethune-gray transition-colors hover:border-bethune-warm/20 hover:text-bethune-black"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Robot status pill ─── */

function RobotPill({
  name,
  battery,
  status,
}: {
  name: string;
  battery: number;
  status: "active" | "idle" | "charging" | "offline";
}) {
  const statusDot = {
    active: "bg-green-500",
    idle: "bg-bethune-muted",
    charging: "bg-yellow-400",
    offline: "bg-red-400",
  };

  return (
    <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-bethune-black/5 bg-white px-3.5 py-2.5">
      <div className="relative">
        <Bot className="size-4 text-bethune-gray" />
        <div
          className={`absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-white ${statusDot[status]}`}
        />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-bethune-black">{name}</span>
        <span className="text-[10px] capitalize text-bethune-muted">
          {status} · {battery}%
        </span>
      </div>
    </div>
  );
}

/* ─── Chat bubbles ─── */

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bethune-cream">
          <Bot className="size-4 text-bethune-warm" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-bethune-warm text-white"
            : "border border-bethune-black/5 bg-white text-bethune-black"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function getPlaceholderResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("vacuum") || lower.includes("clean")) {
    return "I've started the Vacuum V3 in the living room. Estimated completion: 25 minutes. I'll notify you when it's done.";
  }
  if (lower.includes("status") || lower.includes("robot")) {
    return "You have 3 robots online: Vacuum V3 (idle, 87%), Lawn Mower X1 (active, 42%), and Kitchen Assist K2 (charging, 100%). Security Drone S1 is idle at 65%. Window Cleaner W1 is offline.";
  }
  if (lower.includes("schedule") || lower.includes("lawn") || lower.includes("mow")) {
    return "Done — I've scheduled the Lawn Mower X1 to mow the front yard tomorrow at 7:00 AM. You can manage this in Scheduled Tasks.";
  }
  if (lower.includes("security") || lower.includes("sweep") || lower.includes("scan")) {
    return "Starting a perimeter security sweep with Drone S1. The scan covers all exterior zones and should take about 12 minutes.";
  }
  return "I understand your request. This feature is coming soon — I'll be able to execute commands and answer questions about your entire robot network in real time.";
}
