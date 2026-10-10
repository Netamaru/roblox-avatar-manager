"use client";

import { ArrangedOutfit, DryRunPlanItem, RobloxUser } from "@/types/roblox";
import {
  AlertCircle,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface DryRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  outfits: ArrangedOutfit[];
  user: RobloxUser | null;
  cookie: string;
  onProceedToExecute: (delaySeconds: number) => void;
  onDownloadBackup: () => void;
}

export default function DryRunModal({
  isOpen,
  onClose,
  outfits,
  user,
  cookie,
  onProceedToExecute,
  onDownloadBackup,
}: DryRunModalProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [authStatus, setAuthStatus] = useState<"pending" | "success" | "error">("pending");
  const [csrfStatus, setCsrfStatus] = useState<"pending" | "success" | "error">("pending");
  const [detailsStatus, setDetailsStatus] = useState<"pending" | "success" | "error">("pending");
  const [delaySeconds, setDelaySeconds] = useState(1.5);
  const [planItems, setPlanItems] = useState<DryRunPlanItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [outfitsToDelete, setOutfitsToDelete] = useState<ArrangedOutfit[]>([]);

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen, outfits]);

  const runDiagnostics = async () => {
    setIsTesting(true);
    setAuthStatus("pending");
    setCsrfStatus("pending");
    setDetailsStatus("pending");
    const warnList: string[] = [];

    const activeOutfits = outfits.filter((o) => !o.isExcluded);

    try {
      const authRes = await fetch("/api/roblox/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie }),
      });
      setAuthStatus(authRes.ok ? "success" : "error");
      if (!authRes.ok) warnList.push("Cookie failed account validation.");
    } catch {
      setAuthStatus("error");
    }

    try {
      const csrfRes = await fetch("/api/roblox/csrf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie }),
      });
      setCsrfStatus(csrfRes.ok ? "success" : "error");
      if (!csrfRes.ok) warnList.push("Failed to retrieve CSRF token.");
    } catch {
      setCsrfStatus("error");
    }

    // Query live outfits from Roblox to know what actually exists
    let liveRobloxOutfits: ArrangedOutfit[] = [];
    try {
      const outfitsRes = await fetch("/api/roblox/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie, userId: user?.id }),
      });
      if (outfitsRes.ok) {
        const outfitsJson = await outfitsRes.json();
        liveRobloxOutfits = outfitsJson.outfits || [];
      }
    } catch {
      // ignore
    }

    const excludedIds = new Set(outfits.filter((o) => o.isExcluded).map((o) => o.id));
    const toDelete = liveRobloxOutfits.filter((o) => !excludedIds.has(o.id));
    setOutfitsToDelete(toDelete);

    if (liveRobloxOutfits.length === 0) {
      warnList.push(
        "Your Roblox account currently has 0 outfits. The deletion phase will be skipped, and all active outfits will be created directly."
      );
    }

    const missingDetails = activeOutfits.filter((o) => !o.details);
    if (missingDetails.length === 0) {
      setDetailsStatus("success");
    } else {
      setDetailsStatus("error");
      warnList.push(`${missingDetails.length} outfits are still loading full asset details.`);
    }

    if (activeOutfits.length === 0) {
      warnList.push("All outfits are currently excluded.");
    }

    const outfitsWithMissing = activeOutfits.filter(
      (o) => (o.details?.missingAssetIds?.length ?? 0) > 0 || o.hasMissingItems
    );
    if (outfitsWithMissing.length > 0) {
      const names = outfitsWithMissing.map((o) => `"${o.name}"`).slice(0, 3).join(", ");
      const extra = outfitsWithMissing.length > 3 ? ` (+${outfitsWithMissing.length - 3} more)` : "";
      warnList.push(
        `Detected ${outfitsWithMissing.length} outfit${outfitsWithMissing.length === 1 ? "" : "s"} with deleted or unwearable items (${names}${extra}). The system will automatically skip missing items during recreation to prevent HTTP 400 errors.`
      );
    }

    // Build Plan
    const plan: DryRunPlanItem[] = [];
    let stepNum = 1;

    for (const item of toDelete) {
      plan.push({
        step: stepNum++,
        phase: "delete",
        outfitId: item.id,
        outfitName: item.name,
        description: `Delete existing outfit #${item.id} ("${item.name}") from Roblox`,
      });
    }

    const reversed = [...activeOutfits].reverse();
    reversed.forEach((item, revIdx) => {
      const targetRobloxRank = activeOutfits.length - revIdx;
      const missingCount =
        item.details?.missingAssetIds?.length ?? (item.hasMissingItems ? 1 : 0);
      const cleanNote =
        missingCount > 0
          ? ` (Auto-skip ${missingCount} deleted item${missingCount === 1 ? "" : "s"})`
          : "";
      plan.push({
        step: stepNum++,
        phase: "create",
        outfitId: item.id,
        outfitName: item.name,
        orderNumber: targetRobloxRank,
        description: `Create "${item.name}" -> target rank #${targetRobloxRank}${cleanNote}`,
      });
    });

    setPlanItems(plan);
    setWarnings(warnList);
    setIsTesting(false);
  };

  if (!isOpen) return null;

  const activeCount = outfits.filter((o) => !o.isExcluded).length;
  const totalActions = outfitsToDelete.length + activeCount;
  const estimatedSeconds = Math.round(totalActions * delaySeconds);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Pre-Flight Test Run</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Automated safety diagnostics before executing avatar order</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {/* Checks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200 text-sm">System Health Checks:</span>
              <button
                onClick={runDiagnostics}
                disabled={isTesting}
                className="text-zinc-400 hover:text-white flex items-center gap-1.5 text-xs transition"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
                <span>Retest</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                <span className="text-zinc-400 text-xs block">Account Auth</span>
                <span className="font-semibold text-zinc-100 text-sm mt-0.5 block">
                  {authStatus === "success" ? "✓ Ready" : authStatus === "error" ? "✕ Failed" : "..."}
                </span>
              </div>
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                <span className="text-zinc-400 text-xs block">CSRF Token</span>
                <span className="font-semibold text-zinc-100 text-sm mt-0.5 block">
                  {csrfStatus === "success" ? "✓ Ready" : csrfStatus === "error" ? "✕ Failed" : "..."}
                </span>
              </div>
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                <span className="text-zinc-400 text-xs block">Asset Data</span>
                <span className="font-semibold text-zinc-100 text-sm mt-0.5 block">
                  {detailsStatus === "success" ? "✓ Ready" : detailsStatus === "error" ? "✕ Incomplete" : "..."}
                </span>
              </div>
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs space-y-1.5">
              <span className="font-semibold block text-sm text-amber-300">Safety Warnings:</span>
              <ul className="list-disc list-inside space-y-1 text-amber-300/90 leading-relaxed">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Delay Slider */}
          <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-zinc-200 font-semibold text-sm">Delay per request:</span>
              <span className="font-mono font-bold text-white text-sm">{delaySeconds}s</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.25"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(parseFloat(e.target.value))}
              className="w-full accent-white cursor-pointer"
            />
            <div className="flex justify-between text-xs text-zinc-400">
              <span>1.0s (fast)</span>
              <span>1.5s (recommended)</span>
              <span>3.0s (extra safe)</span>
            </div>
            <div className="pt-2.5 border-t border-zinc-800 text-zinc-300 text-xs flex justify-between">
              <span>Estimated total duration:</span>
              <span className="font-mono font-semibold text-white">~{estimatedSeconds}s</span>
            </div>
          </div>

          {/* Plan list */}
          <div className="space-y-2">
            <span className="font-semibold text-zinc-200 text-sm">
              Execution Sequence ({planItems.length} steps):
            </span>
            <div className="max-h-48 overflow-y-auto divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/50 text-xs">
              {planItems.map((item) => (
                <div key={item.step} className="p-2.5 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-zinc-400 font-mono text-xs w-6">#{item.step}</span>
                    <span className={`px-2 py-0.5 rounded-md font-mono text-xs font-semibold ${
                      item.phase === "delete" ? "bg-red-950 text-red-300 border border-red-800/60" : "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                    }`}>
                      {item.phase}
                    </span>
                    <span className="text-zinc-200 text-sm font-medium truncate">{item.outfitName}</span>
                  </div>
                  {item.orderNumber && (
                    <span className="text-zinc-400 font-mono text-xs shrink-0">
                      will be #{item.orderNumber}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-950">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-lg transition"
          >
            Close
          </button>

          <button
            onClick={() => {
              onClose();
              onProceedToExecute(delaySeconds);
            }}
            disabled={activeCount === 0 || authStatus === "error" || csrfStatus === "error"}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-zinc-950 bg-white hover:bg-zinc-200 rounded-xl transition disabled:opacity-40 shadow-sm cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Proceed to Execution</span>
          </button>
        </div>
      </div>
    </div>
  );
}
