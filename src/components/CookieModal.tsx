"use client";

import { AlertCircle, ChevronDown, ChevronRight, Loader2, X } from "lucide-react";
import { useState } from "react";

interface CookieModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitCookie: (cookie: string) => Promise<boolean>;
  isLoading: boolean;
  errorMessage: string | null;
}

export default function CookieModal({
  isOpen,
  onClose,
  onSubmitCookie,
  isLoading,
  errorMessage,
}: CookieModalProps) {
  const [cookieInput, setCookieInput] = useState("");
  const [showTutorial, setShowTutorial] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cookieInput.trim()) return;
    const ok = await onSubmitCookie(cookieInput.trim());
    if (ok) {
      setCookieInput("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-base font-bold text-white tracking-tight">Connect Roblox Account</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-950/50 border border-red-800/70 text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Connection Error</p>
                <p className="text-red-300/90 mt-0.5 text-xs">{errorMessage}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-zinc-200">
                Roblox Cookie (.ROBLOSECURITY)
              </label>
              <button
                type="button"
                onClick={() => setShowTutorial(!showTutorial)}
                className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition"
              >
                <span>How to get cookie</span>
                {showTutorial ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>

            <textarea
              value={cookieInput}
              onChange={(e) => setCookieInput(e.target.value)}
              placeholder="Paste your .ROBLOSECURITY cookie here..."
              rows={3}
              className="w-full px-3.5 py-2.5 text-sm text-zinc-100 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-zinc-500 font-mono resize-none placeholder:text-zinc-600 transition"
            />
          </div>

          {showTutorial && (
            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs text-zinc-300 space-y-2">
              <p className="font-semibold text-white">How to get your cookie in browser:</p>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                <li>Open <a href="https://roblox.com" target="_blank" rel="noreferrer" className="underline text-sky-400">roblox.com</a> and sign in.</li>
                <li>Press <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200">F12</kbd> (Inspect element).</li>
                <li>Go to <strong>Application</strong> &gt; <strong>Cookies</strong> &gt; <strong>https://www.roblox.com</strong> (or <strong>Storage</strong> in Firefox).</li>
                <li>Find the cookie named <code className="text-sky-300 bg-zinc-950 px-1 py-0.5 rounded">.ROBLOSECURITY</code>.</li>
                <li>Double click its value, copy it, and paste it above.</li>
              </ol>
            </div>
          )}

          <p className="text-xs text-zinc-400 leading-relaxed">
            Your cookie is processed locally in this session to communicate with official Roblox endpoints and is never stored on third-party servers.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !cookieInput.trim()}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-zinc-950 bg-white hover:bg-zinc-200 rounded-lg transition disabled:opacity-40 shadow-sm"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Connect</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
