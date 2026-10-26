"use client";

import { getErrorMessage } from "@/lib/error-message";
import { importOutfitsFromJson } from "@/lib/outfit-json";
import { extractOutfitColors } from "@/lib/roblox-colors";
import { ArrangedOutfit, ExportManifest, RobloxUser } from "@/types/roblox";
import { AlertTriangle, Check, Clipboard, Download, Loader2, RefreshCw, Upload, X } from "lucide-react";
import { useState } from "react";

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "export" | "import";
  outfits: ArrangedOutfit[];
  user: RobloxUser | null;
  onImportOutfits: (imported: ArrangedOutfit[], replace: boolean) => void;
  onFetchMissingDetails?: () => Promise<void>;
}

export default function ExportImportModal({
  isOpen,
  onClose,
  defaultTab = "export",
  outfits,
  user,
  onImportOutfits,
  onFetchMissingDetails,
}: ExportImportModalProps) {
  const [activeTab, setActiveTab] = useState<"export" | "import">(defaultTab);
  const [isCopied, setIsCopied] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importPreview, setImportPreview] = useState<ArrangedOutfit[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const missingDetailsCount = outfits.filter((o) => !o.details).length;

  if (!isOpen) return null;

  const manifest: ExportManifest = {
    version: "1.0.0",
    source: "Roblox Avatar Manager",
    exportedAt: new Date().toISOString(),
    user: {
      id: user?.id || 0,
      name: user?.name || "Anonymous",
      displayName: user?.displayName || "Player",
    },
    totalOutfits: outfits.length,
    outfits: outfits.map((item, index) => {
      const colors = extractOutfitColors(item.details || item);
      return {
        id: item.id,
        name: item.name,
        playerAvatarType: item.details?.playerAvatarType || "R15",
        bodyColors: colors.bodyColors,
        bodyColor3s: colors.bodyColor3s,
        scale: item.details?.scale || {
          height: 1,
          width: 1,
          head: 1,
          depth: 1,
          proportion: 0,
          bodyType: 0,
        },
        assetIds: item.details?.assets ? item.details.assets.map((a) => a.id) : [],
        assets: item.details?.assets || [],
        thumbnailUrl: item.thumbnailUrl,
        orderIndex: index,
      };
    }),
  };

  const jsonString = JSON.stringify(manifest, null, 2);

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `roblox-outfits-${user?.name || "backup"}-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        parseAndPreviewJson(text);
      } catch (err) {
        setImportError("Failed to read file: " + getErrorMessage(err, "Could not read file."));
      }
    };
    reader.readAsText(file);
  };

  const parseAndPreviewJson = (raw: string) => {
    setImportError(null);
    try {
      setImportPreview(importOutfitsFromJson(raw));
    } catch (err) {
      setImportError(getErrorMessage(err, "Invalid JSON structure."));
      setImportPreview(null);
    }
  };

  const handleApplyImport = () => {
    if (!importPreview || importPreview.length === 0) return;
    onImportOutfits(importPreview, replaceExisting);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setActiveTab("export")}
              className={`px-3.5 py-1.5 text-sm font-semibold rounded-md transition ${
                activeTab === "export" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white"
              }`}
            >
              Export ({outfits.length})
            </button>
            <button
              onClick={() => setActiveTab("import")}
              className={`px-3.5 py-1.5 text-sm font-semibold rounded-md transition ${
                activeTab === "import" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white"
              }`}
            >
              Import
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {activeTab === "export" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 font-semibold text-sm">JSON Backup Preview</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 rounded-md border border-zinc-800 transition"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clipboard className="w-3.5 h-3.5" />}
                  <span>{isCopied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              {missingDetailsCount > 0 && (
                <div className="p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-xl flex items-start gap-3 text-xs text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <p className="font-semibold text-amber-100">
                      {missingDetailsCount} outfit(s) still loading appearance data
                    </p>
                    <p className="text-amber-300/80 leading-relaxed">
                      Appearance details (exact skin tones and equipped items) are currently being loaded from Roblox. If you download now, default colors will be used for those outfits.
                    </p>
                    {onFetchMissingDetails && (
                      <button
                        type="button"
                        onClick={async () => {
                          setIsFetchingDetails(true);
                          try {
                            await onFetchMissingDetails();
                          } finally {
                            setIsFetchingDetails(false);
                          }
                        }}
                        disabled={isFetchingDetails}
                        className="mt-1 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg border border-amber-500/40 transition disabled:opacity-50 cursor-pointer"
                      >
                        {isFetchingDetails ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isFetchingDetails
                            ? "Fetching Details from Roblox..."
                            : "Fetch All Missing Details Now"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <pre className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-300 max-h-60 overflow-y-auto">
                {jsonString}
              </pre>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4.5 py-2.5 text-sm font-semibold text-zinc-950 bg-white hover:bg-zinc-200 rounded-xl transition shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup File (.json)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File upload */}
              <label className="block p-5 border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 rounded-xl text-center cursor-pointer transition">
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
                <span className="text-zinc-200 font-semibold text-sm block">Choose backup JSON file</span>
                <span className="text-xs text-zinc-500 mt-0.5 block">Supports Roblox Avatar Manager backup format</span>
              </label>

              {/* Paste textarea */}
              <div className="space-y-2">
                <span className="text-zinc-300 font-semibold text-sm">Or paste JSON content:</span>
                <textarea
                  value={importJsonText}
                  onChange={(e) => {
                    setImportJsonText(e.target.value);
                    parseAndPreviewJson(e.target.value);
                  }}
                  rows={3}
                  placeholder='{"outfits": [...]}'
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 resize-none"
                />
              </div>

              {importError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
                  {importError}
                </div>
              )}

              {importPreview && (
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <span className="font-semibold text-sm text-zinc-100">
                    Found {importPreview.length} outfits in file
                  </span>
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={replaceExisting}
                      onChange={(e) => setReplaceExisting(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-900"
                    />
                    <span>Replace all current outfits in workspace</span>
                  </label>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleApplyImport}
                  disabled={!importPreview || importPreview.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-zinc-950 bg-white hover:bg-zinc-200 rounded-xl transition disabled:opacity-40 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Apply Import</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
