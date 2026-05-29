"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Message = {
  id: string;
  role: "CLIENT" | "BOT" | "STAFF";
  content: string;
  createdAt: string;
  sentAt?: string;
};

type Props = {
  token: string;
  clientName: string;
  /** Opens the widget automatically when mounted (for direct-link use) */
  autoOpen?: boolean;
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return formatTime(dateStr);
  if (diff < 172800000) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ChatWidget({ token, clientName, autoOpen = false }: Props) {
  const [open, setOpen] = useState(autoOpen);

  // Listen for a custom event to open the widget (fired by external "Message support" buttons)
  useEffect(() => {
    function handleOpenChat() {
      setOpen(true);
    }
    window.addEventListener("open-chat-widget", handleOpenChat);
    return () => window.removeEventListener("open-chat-widget", handleOpenChat);
  }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<number>(0);
  const [ratedExchangeIds, setRatedExchangeIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/messages?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data.ok && data.messages) {
        setMessages(data.messages as Message[]);
      }
    } catch { /* ignore poll errors */ }
  }, [token]);

  // Initial load and polling
  useEffect(() => {
    fetchMessages();
    if (open) {
      pollRef.current = setInterval(fetchMessages, 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // Close input if we just sent (enforce delay)
  useEffect(() => {
    if (sending) return;
    const timeSinceLastSent = Date.now() - lastSentAt;
    if (timeSinceLastSent < 2000 && lastSentAt > 0) {
      // Still in delay window
      inputRef.current?.focus();
    }
  }, [sending, lastSentAt]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    // Enforce minimum delay since last bot response (no instant replies)
    const timeSinceLastBot = Date.now() - lastSentAt;
    const minDelay = 120_000; // 2 minutes between sends to look human
    if (timeSinceLastBot < minDelay && lastSentAt > 0) {
      const remaining = Math.ceil((minDelay - timeSinceLastBot) / 1000);
      // Silently ignore — user can try again
      return;
    }

    setInput("");
    setSending(true);
    setLastSentAt(Date.now());

    try {
      await fetch(`/api/chat/message?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      // Optimistically add client message
      setMessages((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          role: "CLIENT",
          content: text,
          createdAt: new Date().toISOString(),
        },
      ]);
      // Start polling for response
    } catch (e) {
      // On error, restore input
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const unreadCount = messages.filter(
    (m) => m.role !== "CLIENT" && !m.sentAt
  ).length;

  const timeSinceLastBot = Date.now() - lastSentAt;
  const minDelay = 120_000;
  const canSend = !sending && (lastSentAt === 0 || timeSinceLastBot >= minDelay);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-stone-900 shadow-lg shadow-stone-900/30 transition hover:bg-stone-800"
        aria-label="Open chat"
      >
        {open ? (
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[90vw] max-w-md rounded-2xl border border-stone-200 bg-white shadow-2xl flex flex-col overflow-hidden max-h-[70vh]">
          {/* Header */}
          <div className="bg-stone-900 px-5 py-4 flex items-center justify-between shrink-0">
            <div>
              <div className="font-semibold text-white">Support Chat</div>
              <div className="text-xs text-stone-400 mt-0.5">
                {clientName ? `Helping ${clientName.split(" ")[0]}` : "How can we help?"}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-stone-400">Typically replies in a few minutes</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8 text-stone-400 text-sm">
                <div className="text-3xl mb-3">👋</div>
                Hey {clientName ? clientName.split(" ")[0] : "there"} — send us a message and we&apos;ll get right back to you.
              </div>
            )}
            {messages.map((message, idx) => {
              const isClient = message.role === "CLIENT";
              const isBot = message.role === "BOT";
              const isStaff = message.role === "STAFF";
              const prevMessage = idx > 0 ? messages[idx - 1] : null;
              // Show rating on the FIRST bot message that follows a client message (one rating per exchange)
              const isFirstBotOfExchange = isBot && prevMessage?.role === "CLIENT";
              const exchangeClientId = prevMessage?.role === "CLIENT" ? prevMessage.id : null;
              const exchangeRated = exchangeClientId ? ratedExchangeIds.has(exchangeClientId) : false;
              return (
                <div
                  key={message.id}
                  className={`flex ${isClient ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isClient
                        ? "bg-stone-900 text-white rounded-br-md"
                        : isStaff
                        ? "bg-amber-50 border border-amber-200 text-stone-800 rounded-bl-md"
                        : "bg-stone-100 text-stone-800 rounded-bl-md"
                    }`}
                  >
                    {!isClient && (
                      <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${isBot ? "text-sky-500" : "text-amber-600"}`}>
                        {isBot ? "Support" : "Support (follow-up coming)"}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className={`text-[10px] mt-1.5 ${isClient ? "text-stone-400 text-right" : "text-stone-400"}`}>
                      {formatDate(message.createdAt)} · {formatTime(message.createdAt)}
                    </div>

                    {/* Star rating — once per conversation exchange, on the first bot reply */}
                    {isFirstBotOfExchange && !exchangeRated && exchangeClientId && (
                      <div className="mt-2 pt-2 border-t border-stone-200/50 flex items-center gap-1">
                        {[1,2,3,4,5].map((star) => (
                          <button
                            key={star}
                            onClick={() => {
                              if (!exchangeClientId || exchangeRated) return;
                              setRatedExchangeIds((prev) => new Set([...prev, exchangeClientId]));
                              fetch(`/api/chat/evaluate`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ messageId: message.id, feedbackRating: star }),
                              }).catch(() => {});
                            }}
                            className="text-stone-400 hover:text-amber-400 transition-colors text-base"
                            aria-label={`Rate exchange ${star} star`}
                          >
                            ★
                          </button>
                        ))}
                        <span className="text-[10px] text-stone-400 ml-1">How was this exchange?</span>
                      </div>
                    )}
                    {isFirstBotOfExchange && exchangeRated && (
                      <div className="mt-2 pt-2 border-t border-stone-200/50 text-[10px] text-emerald-500 flex items-center gap-1">
                        ★ Thanks for the feedback!
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-stone-200 p-4 shrink-0">
            <form onSubmit={handleSend} className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={canSend ? "Type a message..." : "Please wait a moment before sending another message..."}
                className="flex-1 resize-none rounded-xl border border-stone-300 px-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                rows={2}
                disabled={!canSend}
              />
              <button
                type="submit"
                disabled={!canSend || !input.trim()}
                className="shrink-0 rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
            {!canSend && lastSentAt > 0 && (
              <div className="mt-2 text-center text-xs text-stone-400">
                We take our time — no instant replies here. You can send again shortly.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
