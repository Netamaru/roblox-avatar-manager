"use client";

import { X } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-base font-bold text-white tracking-tight">Guide & FAQ</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm text-zinc-300 leading-relaxed">
          <div className="space-y-1.5">
            <h4 className="font-semibold text-white">1. Why Delete & Recreate?</h4>
            <p className="text-zinc-400 text-sm">
              Roblox sorts saved outfits chronologically by creation timestamp (most recently created outfit appears at position #1 at the top). Because Roblox provides no reordering API, the only method to change the order is deleting existing outfits and recreating them in reverse sequence (bottom-to-top).
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-semibold text-white">2. Data Safety & Backup</h4>
            <p className="text-zinc-400 text-sm">
              Before any outfit is deleted, the app automatically downloads a full JSON backup to your computer. All outfit names, equipped asset IDs, body color IDs, and scaling values are preserved.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-semibold text-white">3. Request Pacing & Rate Limits</h4>
            <p className="text-zinc-400 text-sm">
              Roblox imposes rate limits on avatar creation and deletion. A safe delay (1.5 seconds default) is enforced between API calls to avoid triggering HTTP 429 Too Many Requests responses.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
