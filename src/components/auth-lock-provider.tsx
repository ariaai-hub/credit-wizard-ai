"use client";

import { useEffect, useState, useCallback, createContext, useContext } from "react";

const INACTIVITY_MS = 5 * 60 * 1000; // 5 minutes
const CHECK_INTERVAL_MS = 30 * 1000; // check every 30s

type AuthLockContextType = {
  isLocked: boolean;
  lastActiveAt: number;
  touchActivity: () => void;
  unlock: () => void;
};

const AuthLockContext = createContext<AuthLockContextType>({
  isLocked: false,
  lastActiveAt: Date.now(),
  touchActivity: () => {},
  unlock: () => {},
});

export function useAuthLock() {
  return useContext(AuthLockContext);
}

function getLastActive(): number {
  if (typeof window === "undefined") return Date.now();
  return Number(sessionStorage.getItem("auth_last_active") || Date.now());
}

function setLastActive(ts: number) {
  sessionStorage.setItem("auth_last_active", String(ts));
}

export function AuthLockProvider({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);

  const touchActivity = useCallback(() => {
    setLastActive(Date.now());
  }, []);

  useEffect(() => {
    setLastActive(Date.now());

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, touchActivity, { passive: true }));

    const interval = setInterval(() => {
      const elapsed = Date.now() - getLastActive();
      if (elapsed >= INACTIVITY_MS && !isLocked) {
        setIsLocked(true);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      events.forEach((e) => window.removeEventListener(e, touchActivity));
      clearInterval(interval);
    };
  }, [touchActivity, isLocked]);

  const unlock = useCallback(() => {
    setLastActive(Date.now());
    setIsLocked(false);
  }, []);

  return (
    <AuthLockContext.Provider value={{ isLocked, lastActiveAt: getLastActive(), touchActivity, unlock }}>
      {children}
      {isLocked && <LockScreen onUnlock={unlock} />}
    </AuthLockContext.Provider>
  );
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        onUnlock();
      } else {
        setError(data.message || "Incorrect password. Try again.");
        setPassword("");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#081120] p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-sky-500/20 bg-sky-500/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-sky-400">
              <path d="M12 2C9.24 2 7 4.24 7 7v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7c0-2.76-2.24-5-5-5zm0 2c1.65 0 3 1.35 3 3v3H9V7c0-1.65 1.35-3 3-3zm0 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" fill="currentColor"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white">Session locked</h2>
          <p className="mt-2 text-sm text-slate-400">You were inactive for 5 minutes. Enter your password to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 backdrop-blur-sm focus:border-sky-500 focus:outline-none"
            />
          </div>
          {error && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-xl bg-sky-500 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Unlock session"}
          </button>
        </form>
      </div>
    </div>
  );
}
