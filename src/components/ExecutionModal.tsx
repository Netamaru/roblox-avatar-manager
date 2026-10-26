"use client";

import { getErrorMessage } from "@/lib/error-message";
import { extractOutfitColors } from "@/lib/roblox-colors";
import { ArrangedOutfit, ExecutionLogEntry, ExecutionState, RobloxUser } from "@/types/roblox";
import {
  ExternalLink,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  outfits: ArrangedOutfit[];
  user: RobloxUser | null;
  cookie: string;
  delaySeconds: number;
  hasBackupThisSession: boolean;
  onDownloadBackupIfNeeded: () => boolean;
  onDownloadBackup: () => boolean;
  onExecutionComplete: () => void;
}

export default function ExecutionModal({
  isOpen,
  onClose,
  outfits,
  user,
  cookie,
  delaySeconds = 1.5,
  hasBackupThisSession,
  onDownloadBackupIfNeeded,
  onDownloadBackup,
  onExecutionComplete,
}: ExecutionModalProps) {
  const [hasConfirmed, setHasConfirmed] = useState(false);

  const [state, setState] = useState<ExecutionState>({
    status: "idle",
    currentStep: 0,
    totalSteps: 0,
    percent: 0,
    currentItemName: "",
    currentAction: "",
    logs: [],
    failedOutfits: [],
    successCount: 0,
  });

  const isPausedRef = useRef(false);
  const isAbortedRef = useRef(false);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [state.logs]);

  if (!isOpen) return null;

  const addLog = (type: ExecutionLogEntry["type"], message: string) => {
    const timeStr = new Date().toLocaleTimeString();
    setState((prev) => ({
      ...prev,
      logs: [
        ...prev.logs,
        {
          id: Math.random().toString(),
          timestamp: timeStr,
          type,
          message,
        },
      ],
    }));
  };

  const handleStartExecution = async () => {
    setHasConfirmed(true);

    const activeOutfits = outfits.filter((o) => !o.isExcluded);
    const totalCount = activeOutfits.length;

    setState({
      status: "preparing",
      currentStep: 0,
      totalSteps: totalCount,
      percent: 0,
      currentItemName: "Checking Roblox account...",
      currentAction: "Initializing",
      logs: [],
      failedOutfits: [],
      successCount: 0,
    });

    isPausedRef.current = false;
    isAbortedRef.current = false;

    addLog("info", "Starting save to Roblox...");

    let csrfToken: string | undefined = undefined;

    try {
      const csrfRes = await fetch("/api/roblox/csrf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie }),
      });
      const csrfJson = await csrfRes.json();
      if (csrfJson.csrfToken) {
        csrfToken = csrfJson.csrfToken;
        addLog("info", "Retrieved fresh CSRF token.");
      }
    } catch (err) {
      addLog("warning", "CSRF token fallback: " + getErrorMessage(err, "unknown error"));
    }

    addLog("info", "Checking existing outfits on your Roblox account...");
    let liveRobloxOutfits: ArrangedOutfit[] = [];
    try {
      const liveRes = await fetch("/api/roblox/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie, userId: user?.id }),
      });
      if (liveRes.ok) {
        const liveJson = await liveRes.json();
        liveRobloxOutfits = (liveJson as { outfits?: ArrangedOutfit[] }).outfits || [];
      }
    } catch (err) {
      addLog("warning", "Roblox outfits query fallback: " + getErrorMessage(err, "unknown error"));
    }

    const excludedIds = new Set(outfits.filter((o) => o.isExcluded).map((o) => o.id));
    const outfitsToDelete = liveRobloxOutfits.filter((o) => !excludedIds.has(o.id));
    const totalDeletes = outfitsToDelete.length;
    const totalSteps = totalDeletes + totalCount;

    setState((prev) => ({
      ...prev,
      totalSteps,
    }));

    let completedSteps = 0;

    // Phase 1: Deletions (only if existing outfits exist on Roblox)
    if (totalDeletes === 0) {
      addLog("info", "Your Roblox account currently has 0 outfits. Skipping deletion phase.");
    } else {
      const didBackup = onDownloadBackupIfNeeded();
      if (didBackup) {
        addLog("success", "JSON backup downloaded.");
      } else if (hasBackupThisSession) {
        addLog("info", "Using JSON backup from earlier this session.");
      }
      setState((prev) => ({
        ...prev,
        status: "deleting",
        currentAction: `Deleting ${totalDeletes} existing outfits`,
      }));
      addLog("info", `Deleting ${totalDeletes} existing outfits from Roblox...`);

      for (let i = 0; i < outfitsToDelete.length; i++) {
        if (isAbortedRef.current) {
          addLog("error", "Process aborted by user.");
          setState((prev) => ({ ...prev, status: "error" }));
          return;
        }

        while (isPausedRef.current) {
          await new Promise((r) => setTimeout(r, 400));
        }

        const outfit = outfitsToDelete[i];
        completedSteps++;
        const pct = Math.round((completedSteps / totalSteps) * 100);

        setState((prev) => ({
          ...prev,
          currentStep: completedSteps,
          percent: pct,
          currentItemName: outfit.name,
        }));

        addLog("info", `[Delete ${i + 1}/${totalDeletes}] "${outfit.name}"...`);

        let deleteSuccess = false;
        let deleteAttempts = 0;
        while (!deleteSuccess && deleteAttempts < 3) {
          deleteAttempts++;
          try {
            const res = await fetch("/api/roblox/delete-outfit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ cookie, outfitId: outfit.id, csrfToken }),
            });
            if (res.status === 429) {
              const waitSec = deleteAttempts * 6;
              addLog("warning", `[Delete ${i + 1}/${totalDeletes}] Rate limited (HTTP 429). Waiting ${waitSec}s before retry (${deleteAttempts}/3)...`);
              await new Promise((r) => setTimeout(r, waitSec * 1000));
              continue;
            }
            const json = await res.json();
            if (json.newCsrfToken) csrfToken = json.newCsrfToken;
            if (json.alreadyDeleted) {
              deleteSuccess = true;
              addLog("info", `[Delete ${i + 1}/${totalDeletes}] "${outfit.name}" was already deleted on Roblox.`);
              break;
            }
            if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
            deleteSuccess = true;
            addLog("success", `[Delete ${i + 1}/${totalDeletes}] Deleted.`);
          } catch (err) {
            if (deleteAttempts >= 3) {
              addLog("warning", `[Delete ${i + 1}/${totalDeletes}] Note: ${getErrorMessage(err, "delete failed")}`);
              break;
            }
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
        await new Promise((r) => setTimeout(r, delaySeconds * 1000));
      }
    }

    // Phase 2: Save bottom-to-top so #1 ends at the top of Roblox inventory
    setState((prev) => ({
      ...prev,
      status: "creating",
      currentAction: `Saving ${totalCount} outfits to Roblox`,
    }));
    addLog("info", `Saving ${totalCount} outfits to Roblox...`);

    const reversed = [...activeOutfits].reverse();
    const failedList: Array<{ outfit: ArrangedOutfit; error: string }> = [];
    let successfulCreations = 0;

    for (let j = 0; j < reversed.length; j++) {
      if (isAbortedRef.current) {
        addLog("error", "Process aborted by user.");
        setState((prev) => ({ ...prev, status: "error" }));
        return;
      }

      while (isPausedRef.current) {
        await new Promise((r) => setTimeout(r, 400));
      }

      const outfit = reversed[j];
      const targetRank = totalCount - j;
      completedSteps++;
      const pct = Math.round((completedSteps / totalSteps) * 100);

      setState((prev) => ({
        ...prev,
        currentStep: completedSteps,
        percent: pct,
        currentItemName: outfit.name,
      }));

      addLog("info", `[Save] ${j + 1}/${totalCount}] "${outfit.name}" -> target rank #${targetRank}...`);

      let createSuccess = false;
      let createAttempts = 0;

      while (!createSuccess && createAttempts < 3) {
        createAttempts++;
        try {
          const details = outfit.details;
          const assetIds = details?.assets && details.assets.length > 0
            ? details.assets.map((a) => a.id)
            : [];

          const colors = extractOutfitColors(details || outfit);
          const res = await fetch("/api/roblox/create-outfit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cookie,
              outfit: {
                name: outfit.name,
                bodyColors: colors.bodyColors,
                bodyColor3s: colors.bodyColor3s,
                assetIds,
                assets: details?.assets || [],
                scale: details?.scale,
                playerAvatarType: details?.playerAvatarType || "R15",
              },
              csrfToken,
            }),
          });

          if (res.status === 429) {
            const waitSec = createAttempts * 7;
            addLog("warning", `[Save] ${j + 1}/${totalCount}] Rate limited (HTTP 429). Waiting ${waitSec}s before retry (${createAttempts}/3)...`);
            await new Promise((r) => setTimeout(r, waitSec * 1000));
            continue;
          }

          const json = await res.json();
          if (json.newCsrfToken) csrfToken = json.newCsrfToken;
          if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
          createSuccess = true;
          if (json.removedAssets && json.removedAssets.length > 0 && json.renamedToDefault) {
            addLog(
              "warning",
              `[Save] ${j + 1}/${totalCount}] Created (Rank #${targetRank}) - Moderated name defaulted to "Avatar", and ${json.removedAssets.length} unwearable asset(s) skipped.`
            );
          } else if (json.renamedToDefault) {
            addLog(
              "warning",
              `[Save] ${j + 1}/${totalCount}] Created (Rank #${targetRank}) - Original name was moderated, safely defaulted to "Avatar".`
            );
          } else if (json.removedAssets && json.removedAssets.length > 0) {
            addLog(
              "warning",
              `[Save] ${j + 1}/${totalCount}] Created (Rank #${targetRank}) - ${json.removedAssets.length} unwearable/deleted asset(s) skipped.`
            );
          } else {
            addLog("success", `[Save] ${j + 1}/${totalCount}] Created (Rank #${targetRank}).`);
          }
          successfulCreations++;
        } catch (err) {
          const message = getErrorMessage(err, "Failed to create outfit.");
          if (createAttempts >= 3) {
            addLog("error", `[Save] ${j + 1}/${totalCount}] Failed after 3 attempts: ${message}`);
            failedList.push({ outfit, error: message });
            break;
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      await new Promise((r) => setTimeout(r, delaySeconds * 1000));
    }

    setState((prev) => ({
      ...prev,
      status: failedList.length === 0 ? "completed" : "error",
      failedOutfits: failedList,
      successCount: successfulCreations,
      percent: 100,
    }));

    if (failedList.length === 0) {
      addLog("success", "Done. All outfits saved to Roblox.");
      onExecutionComplete();
    }
  };

  const handlePauseToggle = () => {
    isPausedRef.current = !isPausedRef.current;
    setState((prev) => ({
      ...prev,
      status: isPausedRef.current ? "paused" : "creating",
    }));
  };

  const handleAbort = () => {
    isAbortedRef.current = true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Save to Roblox</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Create or update outfits on your Roblox account</p>
          </div>
          {state.status === "idle" || state.status === "completed" || state.status === "error" ? (
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          ) : null}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {!hasConfirmed ? (
            <div className="space-y-4">
              <p className="text-zinc-200 leading-relaxed text-sm">
                These outfits will be saved to your Roblox account. If outfits already exist there, they will be replaced first so this list can be saved.
              </p>
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5 text-xs text-zinc-300">
                <p className="text-white font-semibold text-xs">JSON backup</p>
                <p className="text-zinc-400 leading-relaxed">
                  {hasBackupThisSession
                    ? "A JSON backup was already saved this session. No extra file will download."
                    : "A JSON backup downloads only if outfits currently on Roblox will be deleted."}
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartExecution}
                  className="px-5 py-2.5 text-sm font-semibold text-zinc-950 bg-white hover:bg-zinc-200 rounded-xl transition shadow-md cursor-pointer"
                >
                  Start
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-zinc-100">{state.currentAction}</span>
                  <span className="font-mono font-bold text-sky-400">{state.percent}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-200"
                    style={{ width: `${state.percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span className="truncate max-w-xs">{state.currentItemName || "-"}</span>
                  <span className="font-mono font-medium">{state.currentStep}/{state.totalSteps}</span>
                </div>
              </div>

              {/* Logs */}
              <div
                ref={logsContainerRef}
                className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl font-mono text-xs max-h-52 overflow-y-auto space-y-1.5"
              >
                {state.logs.map((log) => (
                  <div key={log.id} className="flex gap-2">
                    <span className="text-zinc-500 shrink-0">[{log.timestamp}]</span>
                    <span
                      className={
                        log.type === "success"
                          ? "text-emerald-400 font-medium"
                          : log.type === "error"
                          ? "text-red-400 font-semibold"
                          : log.type === "warning"
                          ? "text-amber-400"
                          : "text-zinc-200"
                      }
                    >
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>

              {/* Failed Items recovery */}
              {state.failedOutfits.length > 0 && (
                <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-red-200 text-sm">
                      {state.failedOutfits.length} outfits failed to save
                    </span>
                    <button
                      onClick={onDownloadBackup}
                      className="px-3 py-1 text-xs font-semibold bg-red-900 hover:bg-red-800 text-red-100 rounded-lg transition"
                    >
                      Export Failed Data
                    </button>
                  </div>
                  <div className="max-h-24 overflow-y-auto divide-y divide-red-900/40 text-xs">
                    {state.failedOutfits.map((f, i) => (
                      <div key={i} className="py-1.5 flex justify-between gap-2">
                        <span className="text-zinc-200 font-medium">{f.outfit.name}</span>
                        <span className="text-red-400 font-mono">{f.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completion Banner */}
              {state.status === "completed" && (
                <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white text-sm">Done</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {state.successCount} outfits saved to Roblox.
                    </p>
                  </div>
                  <a
                    href="https://www.roblox.com/my/avatar"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-white text-zinc-950 rounded-lg hover:bg-zinc-200 transition"
                  >
                    <span>Open Roblox</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Action Buttons during run */}
              {state.status === "deleting" || state.status === "creating" || state.status === "paused" ? (
                <div className="flex justify-between pt-2">
                  <button
                    onClick={handleAbort}
                    className="px-3.5 py-1.5 text-xs font-semibold text-red-400 hover:text-red-300 rounded-lg transition"
                  >
                    Abort
                  </button>
                  <button
                    onClick={handlePauseToggle}
                    className="px-4 py-1.5 text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
                  >
                    {state.status === "paused" ? "Resume" : "Pause"}
                  </button>
                </div>
              ) : null}

              {state.status === "completed" || state.status === "error" ? (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={onClose}
                    className="px-5 py-2 text-sm font-semibold text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
