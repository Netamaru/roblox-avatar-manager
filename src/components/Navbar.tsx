"use client";

import { RobloxUser } from "@/types/roblox";
import {
  ArrowDownUp,
  Download,
  HelpCircle,
  KeyRound,
  LogOut,
  Play,
  RotateCcw,
  Save,
  TestTube2,
  Upload,
} from "lucide-react";
import Image from "next/image";

interface NavbarProps {
  user: RobloxUser | null;
  outfitsCount: number;
  onOpenAuth: () => void;
  onDisconnect: () => void;
  onOpenExport: () => void;
  onOpenImport: () => void;
  onOpenDryRun: () => void;
  onOpenExecution: () => void;
  onOpenHelp: () => void;
  onResetOrder: () => void;
  hasOrderChanged: boolean;
}

export default function Navbar({
  user,
  outfitsCount,
  onOpenAuth,
  onDisconnect,
  onOpenExport,
  onOpenImport,
  onOpenDryRun,
  onOpenExecution,
  onOpenHelp,
  onResetOrder,
  hasOrderChanged,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/60 flex items-center justify-center shadow-inner">
            <ArrowDownUp className="w-4.5 h-4.5 text-zinc-100" />
          </div>
          <span className="font-bold text-base tracking-tight text-white">
            Roblox Avatar Manager
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {hasOrderChanged && (
            <button
              onClick={onResetOrder}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-850 rounded-lg transition"
              title="Reset to initial order"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          {user && (
            <>
              <button
                onClick={onOpenImport}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Import</span>
              </button>

              <button
                onClick={onOpenExport}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>

              <button
                onClick={onOpenDryRun}
                disabled={outfitsCount === 0}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition disabled:opacity-40"
              >
                <TestTube2 className="w-4 h-4 text-zinc-400" />
                <span>Test Run</span>
              </button>

              <button
                onClick={onOpenExecution}
                disabled={outfitsCount === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-zinc-950 bg-white hover:bg-zinc-200 rounded-lg transition disabled:opacity-40 shadow-sm"
              >
                <Save className="w-3.5 h-3.5 text-black" />
                <span>Save to Roblox</span>
              </button>
            </>
          )}

          <button
            onClick={onOpenHelp}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition"
            title="Help & Guide"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* User Profile */}
          {user ? (
            <div className="flex items-center gap-2.5 pl-2.5 border-l border-zinc-800">
              <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                {user.avatarUrl ? (
                  <div className="relative w-6 h-6 rounded-full overflow-hidden bg-zinc-800 ring-1 ring-zinc-700">
                    <Image
                      src={user.avatarUrl}
                      alt={user.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-200 flex items-center justify-center text-xs font-bold ring-1 ring-zinc-700">
                    {user.name.charAt(0)}
                  </div>
                )}
                <span className="text-sm font-medium text-zinc-200 max-w-[120px] truncate">
                  {user.name}
                </span>
              </div>
              <button
                onClick={onDisconnect}
                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-lg transition"
                title="Disconnect"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          ) : (
            <></>
          )}
        </div>
      </div>
    </header>
  );
}
