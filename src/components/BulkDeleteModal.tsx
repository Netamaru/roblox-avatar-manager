"use client";

import { getErrorMessage } from "@/lib/error-message";
import { hdThumbnailUrl } from "@/lib/roblox-thumbnails";
import { ArrangedOutfit, ExecutionLogEntry, RobloxUser } from "@/types/roblox";
import { AlertTriangle, Pause, Play, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  outfits: ArrangedOutfit[];
  user: RobloxUser | null;
  cookie: string;
  delaySeconds?: number;
  onDownloadBackup: () => void;
  onDeletionComplete: () => void;
}

export default function BulkDeleteModal({
  isOpen,
  onClose,
  outfits,
  user,
  cookie,
  delaySeconds = 1.5,
  onDownloadBackup,
  onDeletionComplete,
}: BulkDeleteModalProps) {
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [currentItemName, setCurrentItemName] = useState("");
  const [logs, setLogs] = useState<ExecutionLogEntry[]>([]);

  const isPausedRef = useRef(false);
  const isAbortedRef = useRef(false);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const targetOutfits = outfits.filter((o) => !o.isExcluded);
  const totalCount = targetOutfits.length;

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const resetState = () => {
    setHasConfirmed(false);
    setConfirmInput("");
    setIsDeleting(false);
    setIsPaused(false);
    setIsCompleted(false);
    setCurrentStep(0);
    setCurrentItemName("");
    setLogs([]);
    isPausedRef.current = false;
    isAbortedRef.current = false;
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  if (!isOpen) return null;

  const addLog = (type: ExecutionLogEntry["type"], message: string) => {
    const timeStr = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, timestamp: timeStr, type, message },
    ]);
  };

  const handleStartDelete = async () => {
    if (confirmInput.trim().toUpperCase() !== "DELETE") return;

    onDownloadBackup();
    setHasConfirmed(true);
    setIsDeleting(true);

    addLog("info", `Starting permanent deletion of ${totalCount} active outfits from Roblox...`);
    addLog("success", "Automatic JSON backup downloaded to your computer.");

    let csrfToken: string | undefined = undefined;
    try {
      const csrfRes = await fetch("/api/roblox/csrf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie }),
      });
      const csrfJson = await csrfRes.json();
      if (csrfJson.csrfToken) csrfToken = csrfJson.csrfToken;
    } catch (e) {
      addLog("warning", "CSRF fallback: " + getErrorMessage(e, "unknown error"));
    }

    const failedList: Array<{ outfit: ArrangedOutfit; error: string }> = [];
    let deletedCount = 0;

    for (let i = 0; i < targetOutfits.length; i++) {
      if (isAbortedRef.current) {
        addLog("error", "Deletion process aborted by user.");
        break;
      }

      while (isPausedRef.current) {
        await new Promise((r) => setTimeout(r, 400));
      }

      const outfit = targetOutfits[i];
      setCurrentStep(i + 1);
      setCurrentItemName(outfit.name);

      addLog("info", `[Delete ${i + 1}/${totalCount}] "${outfit.name}" (ID: #${outfit.id})...`);

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
            addLog("warning", `Rate limited (HTTP 429). Waiting ${waitSec}s before retry (${deleteAttempts}/3)...`);
            await new Promise((r) => setTimeout(r, waitSec * 1000));
            continue;
          }

          const json = await res.json();
          if (json.newCsrfToken) csrfToken = json.newCsrfToken;

          if (json.alreadyDeleted) {
            deleteSuccess = true;
            deletedCount++;
            addLog("info", `[Delete ${i + 1}/${totalCount}] "${outfit.name}" was already deleted on Roblox.`);
            break;
          }

          if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
          deleteSuccess = true;
          deletedCount++;
          addLog("success", `[Delete ${i + 1}/${totalCount}] Deleted from Roblox.`);
        } catch (err) {
          const message = getErrorMessage(err, "Failed to delete outfit.");
          if (deleteAttempts >= 3) {
            addLog("error", `[Delete ${i + 1}/${totalCount}] Failed: ${message}`);
            failedList.push({ outfit, error: message });
            break;
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      await new Promise((r) => setTimeout(r, delaySeconds * 1000));
    }

    setIsDeleting(false);
    setIsCompleted(true);

    if (failedList.length === 0) {
      addLog("success", `🎉 Completed! ${deletedCount} outfits were permanently deleted from Roblox.`);
    } else {
      addLog("warning", `Finished with notes: ${deletedCount} deleted, ${failedList.length} failed.`);
    }

    onDeletionComplete();
  };

  const handlePauseToggle = () => {
    isPausedRef.current = !isPausedRef.current;
    setIsPaused(isPausedRef.current);
  };

  const handleAbort = () => {
    isAbortedRef.current = true;
  };

  const percent = totalCount > 0 ? Math.round((currentStep / totalCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg max-h-[85vh] bg-zinc-950 border border-red-900/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-900/40 bg-red-950/25">
          <div className="flex items-center gap-2.5">
            <Trash2 className="w-5 h-5 text-red-400" />
            <h3 className="text-base font-bold text-red-200 tracking-tight">
              Permanently Delete Outfits from Roblox
            </h3>
          </div>
          {!isDeleting && (
            <button
              onClick={handleClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {!hasConfirmed ? (
            <div className="space-y-4">
              {/* Alert Warning */}
              <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/70 flex items-start gap-3.5">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5 text-zinc-200 leading-relaxed text-sm">
                  <p className="font-bold text-red-300">
                    WARNING: This action is permanent and cannot be undone on Roblox!
                  </p>
                  <p className="text-xs text-zinc-300">
                    <strong className="text-white font-semibold">{totalCount} active outfits</strong> will be permanently deleted directly from your Roblox account (<strong>@{user?.name}</strong>). Excluded outfits will not be affected.
                  </p>
                </div>
              </div>

              {/* Auto Backup Info */}
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1 text-xs">
                <span className="font-semibold text-emerald-400 block text-xs">✓ Automatic Backup Included</span>
                <p className="text-zinc-400 leading-relaxed">
                  A full JSON backup file of all your outfits will automatically download to your computer before deletion begins.
                </p>
              </div>

              {/* Preview of Outfits to be deleted */}
              <div className="space-y-2">
                <span className="text-zinc-300 font-semibold text-xs block">
                  Outfits to be deleted ({totalCount}):
                </span>
                <div className="max-h-40 overflow-y-auto divide-y divide-zinc-850 rounded-xl border border-zinc-800 bg-zinc-900/50 p-1.5">
                  {targetOutfits.map((o) => (
                    <div key={o.id} className="p-2 flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded-lg bg-zinc-800 shrink-0 overflow-hidden">
                        {o.thumbnailUrl ? (
                          <Image
                            src={hdThumbnailUrl(o.thumbnailUrl)}
                            alt={o.name}
                            fill
                            className="object-contain p-0.5"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-800" />
                        )}
                      </div>
                      <span className="text-zinc-100 truncate font-medium text-sm">{o.name}</span>
                      <span className="text-xs text-zinc-500 font-mono ml-auto">#{o.id}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirmation input */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <label className="text-xs text-zinc-300 block font-medium">
                  Type <strong className="text-red-400 font-mono font-bold">DELETE</strong> below to confirm:
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-3.5 py-2 text-sm text-red-200 bg-zinc-900 border border-red-900/60 rounded-xl focus:outline-none focus:border-red-500 font-mono placeholder:text-zinc-600"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={confirmInput.trim().toUpperCase() !== "DELETE" || totalCount === 0}
                  onClick={handleStartDelete}
                  className="px-5 py-2.5 font-semibold text-sm text-white bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:hover:bg-red-600 rounded-xl transition shadow-md cursor-pointer"
                >
                  Backup &amp; Permanently Delete ({totalCount})
                </button>
              </div>
            </div>
          ) : (
            /* PROGRESS DELETION CONSOLE */
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-red-300">
                    {isDeleting ? (isPaused ? "Paused" : "Deleting Outfits...") : "Process Completed"}
                  </span>
                  <span className="font-mono font-bold text-red-400">{percent}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-200"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span className="truncate max-w-xs">{currentItemName || "-"}</span>
                  <span className="font-mono font-medium">{currentStep}/{totalCount}</span>
                </div>
              </div>

              {/* Logs */}
              <div
                ref={logsContainerRef}
                className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl font-mono text-xs max-h-52 overflow-y-auto space-y-1.5"
              >
                {logs.map((log) => (
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
                          : "text-zinc-300"
                      }
                    >
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>

              {/* Controls */}
              {isDeleting && (
                <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                  <div className="flex gap-2.5">
                    <button
                      onClick={handlePauseToggle}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-200 cursor-pointer"
                    >
                      {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      <span>{isPaused ? "Resume" : "Pause"}</span>
                    </button>
                    <button
                      onClick={handleAbort}
                      className="px-3.5 py-1.5 bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 rounded-lg text-xs font-semibold text-red-300 cursor-pointer"
                    >
                      Abort Deletion
                    </button>
                  </div>
                </div>
              )}

              {isCompleted && (
                <div className="flex justify-end pt-2 border-t border-zinc-800">
                  <button
                    onClick={handleClose}
                    className="px-5 py-2 text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
