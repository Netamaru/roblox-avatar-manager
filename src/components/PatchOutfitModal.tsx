"use client";

import { extractOutfitColors, formatCssHex } from "@/lib/roblox-colors";
import { ArrangedOutfit, RobloxOutfitDetail } from "@/types/roblox";
import {
  AlertCircle,
  Check,
  Clipboard,
  FileCode,
  Info,
  Loader2,
  Palette,
  RotateCcw,
  Sliders,
  Sparkles,
  Upload,
  User,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

interface PatchOutfitModalProps {
  isOpen: boolean;
  onClose: () => void;
  outfit: ArrangedOutfit | null;
  cookie: string;
  userId?: number;
  onOutfitPatched: (updatedOutfit: ArrangedOutfit) => void;
}

interface ParsedCandidate {
  id?: number;
  name?: string;
  thumbnailUrl?: string;
  playerAvatarType?: string;
  bodyColors?: any;
  bodyColor3s?: any;
  scale?: any;
  assets?: any[];
  assetIds?: number[];
}

export default function PatchOutfitModal({
  isOpen,
  onClose,
  outfit,
  cookie,
  userId,
  onOutfitPatched,
}: PatchOutfitModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [customName, setCustomName] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ParsedCandidate[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const [currentDetails, setCurrentDetails] = useState<RobloxOutfitDetail | null>(
    outfit?.details || null
  );
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Track the ID of the outfit for which the modal was initialized to avoid resetting typing
  const initializedOutfitIdRef = useRef<number | null>(null);

  // Initialize state ONLY when modal is newly opened or outfit ID changes
  useEffect(() => {
    if (isOpen && outfit) {
      if (initializedOutfitIdRef.current !== outfit.id) {
        initializedOutfitIdRef.current = outfit.id;
        setCustomName(outfit.name || "");
        setJsonText("");
        setParseError(null);
        setCandidates([]);
        setSelectedIndex(0);
        setSubmitError(null);
        setSubmitSuccess(null);
        setCurrentDetails(outfit.details || null);
      }
    } else {
      initializedOutfitIdRef.current = null;
    }
  }, [isOpen, outfit?.id, outfit?.name, outfit?.details]);

  // If the outfit doesn't have full details loaded yet, fetch them in the background
  useEffect(() => {
    if (isOpen && outfit && !outfit.details && !currentDetails && cookie) {
      setIsLoadingDetails(true);
      fetch("/api/roblox/outfit-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cookie,
          outfitId: outfit.id,
          userId,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.details) {
            setCurrentDetails(data.details);
          }
        })
        .catch((err) => {
          console.warn("Failed to fetch outfit details in PatchOutfitModal", err);
        })
        .finally(() => {
          setIsLoadingDetails(false);
        });
    }
  }, [isOpen, outfit?.id, outfit?.details, currentDetails, cookie, userId]);

  // Parse JSON text whenever it changes
  useEffect(() => {
    const trimmed = jsonText.trim();
    if (!trimmed) {
      setParseError(null);
      setCandidates([]);
      setSelectedIndex(0);
      return;
    }

    try {
      const parsed = JSON.parse(trimmed);
      let list: any[] = [];

      if (parsed.outfits && Array.isArray(parsed.outfits)) {
        list = parsed.outfits;
      } else if (Array.isArray(parsed)) {
        list = parsed;
      } else if (typeof parsed === "object" && parsed !== null) {
        list = [parsed];
      } else {
        throw new Error("Invalid JSON: Expected an outfit object or array.");
      }

      if (list.length === 0) {
        throw new Error("JSON does not contain any outfit data.");
      }

      const formattedCandidates: ParsedCandidate[] = list.map((item, idx) => {
        const details = item.details || item;
        return {
          id: item.id || details.id,
          name: item.name || details.name || `Outfit #${idx + 1}`,
          thumbnailUrl: item.thumbnailUrl || details.thumbnailUrl,
          playerAvatarType: details.playerAvatarType || "R15",
          bodyColors: details.bodyColors,
          bodyColor3s: details.bodyColor3s,
          scale: details.scale,
          assets: details.assets,
          assetIds:
            details.assetIds ||
            (details.assets
              ? details.assets.map((a: any) => (typeof a === "number" ? a : a.id))
              : []),
        };
      });

      setCandidates(formattedCandidates);
      setSelectedIndex(0);
      setParseError(null);

      // Pre-fill custom name from parsed candidate
      const initialCandidate = formattedCandidates[0];
      if (initialCandidate?.name) {
        setCustomName(initialCandidate.name);
      }
    } catch (err: any) {
      setParseError(err.message || "Failed to parse JSON.");
      setCandidates([]);
      setSelectedIndex(0);
    }
  }, [jsonText]);

  // Current outfit candidate (used if JSON is empty, e.g. for renaming only)
  const currentCandidate = useMemo<ParsedCandidate>(() => {
    const details = currentDetails || outfit?.details;
    const colors = extractOutfitColors(details || outfit);
    const rawAssets = details?.assets || [];
    return {
      id: outfit?.id,
      name: customName.trim() || outfit?.name || "Avatar",
      thumbnailUrl: outfit?.thumbnailUrl,
      playerAvatarType: details?.playerAvatarType || "R15",
      bodyColors: colors.bodyColors,
      bodyColor3s: colors.bodyColor3s,
      scale: details?.scale || {
        height: 1,
        width: 1,
        head: 1,
        depth: 1,
        proportion: 0,
        bodyType: 0,
      },
      assets: rawAssets,
      assetIds:
        rawAssets.length > 0
          ? rawAssets.map((a: any) => (typeof a === "number" ? a : a.id))
          : (details as any)?.assetIds || [],
    };
  }, [outfit, currentDetails, customName]);

  const isJsonProvided = jsonText.trim().length > 0;

  // Active candidate: uses parsed candidate if JSON is provided, otherwise falls back to current outfit
  const activeCandidate = useMemo<ParsedCandidate>(() => {
    if (isJsonProvided && candidates.length > 0) {
      return candidates[selectedIndex] || candidates[0];
    }
    return currentCandidate;
  }, [isJsonProvided, candidates, selectedIndex, currentCandidate]);

  // Extract resolved colors for preview and payload
  const resolvedColors = useMemo(() => {
    if (!activeCandidate) return null;
    return extractOutfitColors(activeCandidate);
  }, [activeCandidate]);

  const resolvedAssetsCount = useMemo(() => {
    if (!activeCandidate) return 0;
    if (Array.isArray(activeCandidate.assets) && activeCandidate.assets.length > 0) {
      return activeCandidate.assets.length;
    }
    if (Array.isArray(activeCandidate.assetIds) && activeCandidate.assetIds.length > 0) {
      return activeCandidate.assetIds.length;
    }
    return 0;
  }, [activeCandidate]);

  if (!isOpen || !outfit) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setJsonText(text);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setJsonText(text);
      }
    } catch {
      // ignore clipboard permission error
    }
  };

  const handleResetOriginalName = () => {
    if (outfit?.name) {
      setCustomName(outfit.name);
    }
  };

  const handleApplyPatch = async () => {
    if (!activeCandidate || !resolvedColors) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const finalName = customName.trim() || activeCandidate.name || outfit.name || "Avatar";
      const payload = {
        name: finalName,
        playerAvatarType: activeCandidate.playerAvatarType || "R15",
        scale: activeCandidate.scale || {
          height: 1,
          width: 1,
          head: 1,
          depth: 1,
          proportion: 0,
          bodyType: 0,
        },
        assets: activeCandidate.assets,
        assetIds: activeCandidate.assetIds,
        bodyColors: resolvedColors.bodyColors,
        bodyColor3s: resolvedColors.bodyColor3s,
      };

      const res = await fetch("/api/roblox/patch-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cookie,
          outfitId: outfit.id,
          name: finalName,
          payload,
          userId,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `Failed to update outfit (HTTP ${res.status})`);
      }

      setSubmitSuccess(
        isJsonProvided
          ? `Outfit #${outfit.id} successfully updated with new appearance!`
          : `Outfit #${outfit.id} renamed to "${finalName}" on Roblox!`
      );

      // Prepare updated ArrangedOutfit object
      const updatedDetails: RobloxOutfitDetail = json.details || {
        id: outfit.id,
        name: finalName,
        playerAvatarType: payload.playerAvatarType,
        bodyColors: resolvedColors.bodyColors,
        bodyColor3s: resolvedColors.bodyColor3s,
        scale: payload.scale,
        assets:
          activeCandidate.assets ||
          (activeCandidate.assetIds || []).map((id) => ({
            id,
            name: `Asset ${id}`,
            assetType: { id: 0, name: "Asset" },
          })),
        isEditable: true,
      };

      const updatedArranged: ArrangedOutfit = {
        ...outfit,
        name: finalName,
        thumbnailUrl: json.thumbnailUrl || outfit.thumbnailUrl,
        details: updatedDetails,
        isLoaded: true,
        hasMissingItems: (updatedDetails.missingAssetIds?.length ?? 0) > 0,
      };

      onOutfitPatched(updatedArranged);

      // Close modal after brief success feedback
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to update outfit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValidToSubmit =
    !isSubmitting &&
    !isLoadingDetails &&
    (!isJsonProvided || (!parseError && candidates.length > 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-950/60 border border-sky-800/60 flex items-center justify-center text-sky-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Update Specific Avatar</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 font-mono text-zinc-300">
                  #{outfit.id}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Update name or patch appearance directly from JSON on your Roblox account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {/* Target Avatar Info Banner */}
          <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                {outfit.thumbnailUrl ? (
                  <Image
                    src={outfit.thumbnailUrl}
                    alt={outfit.name}
                    fill
                    className="object-contain p-1"
                    unoptimized
                  />
                ) : (
                  <User className="w-6 h-6 text-zinc-600" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-xs text-zinc-400 font-medium block">Target Avatar</span>
                <p className="text-sm font-semibold text-zinc-100 truncate">{outfit.name}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                  <span className="font-mono">ID: #{outfit.id}</span>
                  <span>•</span>
                  <span>{activeCandidate.playerAvatarType || "R15"}</span>
                  {isLoadingDetails && (
                    <>
                      <span>•</span>
                      <span className="text-sky-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading details...
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-950/60 border border-sky-800/60 text-sky-300">
                Slot #{outfit.currentIndex + 1}
              </span>
            </div>
          </div>

          {/* Custom Avatar Name Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="patch-avatar-name"
                className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5"
              >
                <span>Avatar Name</span>
                <span className="text-zinc-500 font-normal">(Customizable)</span>
              </label>
              <div className="flex items-center gap-2">
                {customName !== outfit.name && (
                  <button
                    type="button"
                    onClick={handleResetOriginalName}
                    className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition"
                    title="Reset to original outfit name"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset original</span>
                  </button>
                )}
                <span className="text-[11px] font-mono text-zinc-500">
                  {customName.length}/50
                </span>
              </div>
            </div>
            <input
              id="patch-avatar-name"
              name="patchAvatarName"
              type="text"
              autoComplete="off"
              maxLength={50}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Enter custom outfit name..."
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500 transition"
            />
            <p className="text-[11px] text-zinc-500">
              Change the name here to rename this avatar on Roblox.
            </p>
          </div>

          {/* JSON Input Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  JSON Data
                </label>
                <span className="text-[11px] text-zinc-500 font-normal">
                  (Optional — leave blank to only rename)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 px-2 py-1 rounded-md border border-zinc-800 transition"
                  title="Paste from clipboard"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste</span>
                </button>
                <label className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 px-2 py-1 rounded-md border border-zinc-800 transition cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload .json</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {jsonText && (
                  <button
                    type="button"
                    onClick={() => setJsonText("")}
                    className="text-xs text-zinc-500 hover:text-zinc-300 px-1.5 py-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={4}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder="Optional: Paste outfit JSON here to replace appearance, or leave empty to keep current look and only rename..."
              className="w-full p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-200 focus:outline-none focus:border-sky-500 transition resize-y"
            />

            {parseError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{parseError}</span>
              </div>
            )}
          </div>

          {/* Multiple Candidates Selector from JSON */}
          {candidates.length > 1 && (
            <div className="space-y-2 p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>Select Outfit from JSON ({candidates.length} found)</span>
                <span className="text-[11px] text-zinc-500">Pick which look to apply</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                {candidates.map((cand, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedIndex(idx);
                      if (cand.name) setCustomName(cand.name);
                    }}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border text-left transition ${
                      selectedIndex === idx
                        ? "bg-sky-950/40 border-sky-500/60 ring-1 ring-sky-500/40 text-white"
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    <div className="relative w-8 h-8 rounded bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                      {cand.thumbnailUrl ? (
                        <Image
                          src={cand.thumbnailUrl}
                          alt={cand.name || "Outfit"}
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      ) : (
                        <User className="w-4 h-4 text-zinc-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">
                        {cand.name || `Outfit #${idx + 1}`}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        {cand.playerAvatarType || "R15"} •{" "}
                        {cand.assets?.length || cand.assetIds?.length || 0} items
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Preview Box (Works whether JSON is pasted or current avatar is kept) */}
          {resolvedColors && (
            <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-3.5">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isJsonProvided ? "bg-emerald-400 animate-pulse" : "bg-sky-400"
                    }`}
                  />
                  <span className="text-xs font-bold text-zinc-200">
                    {isJsonProvided ? "Parsed Appearance from JSON" : "Current Appearance Preserved"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 font-mono text-zinc-300 font-semibold">
                    {activeCandidate.playerAvatarType || "R15"}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 font-mono text-zinc-300 font-semibold">
                    {resolvedAssetsCount} items
                  </span>
                </div>
              </div>

              {/* Informational callout when JSON is empty */}
              {!isJsonProvided && (
                <div className="p-2.5 bg-sky-950/30 border border-sky-800/40 rounded-lg text-xs text-sky-200 flex items-start gap-2">
                  <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    JSON is empty: equipped items, skin colors, and scales will stay identical to
                    the current avatar. Only the name will be updated to{" "}
                    <strong className="text-white font-semibold">
                      &ldquo;{customName.trim() || outfit.name}&rdquo;
                    </strong>{" "}
                    on Roblox.
                  </p>
                </div>
              )}

              {/* Skin Colors Preview */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                  <Palette className="w-3.5 h-3.5 text-sky-400" />
                  <span>Skin Colors (Body Colors)</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    {
                      label: "Head",
                      hex: resolvedColors.bodyColor3s.headColor3,
                      id: resolvedColors.bodyColors.headColorId,
                    },
                    {
                      label: "Torso",
                      hex: resolvedColors.bodyColor3s.torsoColor3,
                      id: resolvedColors.bodyColors.torsoColorId,
                    },
                    {
                      label: "L. Arm",
                      hex: resolvedColors.bodyColor3s.leftArmColor3,
                      id: resolvedColors.bodyColors.leftArmColorId,
                    },
                    {
                      label: "R. Arm",
                      hex: resolvedColors.bodyColor3s.rightArmColor3,
                      id: resolvedColors.bodyColors.rightArmColorId,
                    },
                    {
                      label: "L. Leg",
                      hex: resolvedColors.bodyColor3s.leftLegColor3,
                      id: resolvedColors.bodyColors.leftLegColorId,
                    },
                    {
                      label: "R. Leg",
                      hex: resolvedColors.bodyColor3s.rightLegColor3,
                      id: resolvedColors.bodyColors.rightLegColorId,
                    },
                  ].map((part) => (
                    <div
                      key={part.label}
                      className="p-2 bg-zinc-950/60 border border-zinc-800/80 rounded-lg flex flex-col items-center gap-1.5 text-center"
                    >
                      <div
                        className="w-7 h-7 rounded-md border border-white/10 shadow-sm shrink-0"
                        style={{ backgroundColor: formatCssHex(part.hex) }}
                        title={`Color: #${part.hex} (Brick #${part.id})`}
                      />
                      <span className="text-[10px] text-zinc-400 font-medium">{part.label}</span>
                      <span className="text-[10px] font-mono text-zinc-300 uppercase">
                        #{part.hex.slice(0, 6)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scale Preview */}
              {activeCandidate.scale && (
                <div className="pt-2 border-t border-zinc-800/60">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 mb-1.5">
                    <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Avatar Proportions</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center text-xs">
                    {[
                      { l: "Height", v: activeCandidate.scale.height },
                      { l: "Width", v: activeCandidate.scale.width },
                      { l: "Head", v: activeCandidate.scale.head },
                      { l: "Depth", v: activeCandidate.scale.depth },
                      { l: "Proportion", v: activeCandidate.scale.proportion },
                      { l: "Body Type", v: activeCandidate.scale.bodyType },
                    ].map((s) => (
                      <div key={s.l} className="bg-zinc-950/40 p-1.5 rounded border border-zinc-800/60">
                        <span className="text-[10px] text-zinc-500 block">{s.l}</span>
                        <span className="font-mono text-xs text-zinc-200">
                          {s.v != null ? `${Math.round(s.v * 100)}%` : "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feedback Banners */}
          {submitError && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl flex items-start gap-2.5 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-100">Update Failed</p>
                <p className="text-red-300/90 leading-relaxed mt-0.5">{submitError}</p>
              </div>
            </div>
          )}

          {submitSuccess && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-start gap-2.5 text-xs text-emerald-200">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-100">Update Successful</p>
                <p className="text-emerald-300/90 leading-relaxed mt-0.5">{submitSuccess}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-950/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyPatch}
            disabled={!isFormValidToSubmit}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-lg shadow-sky-600/20 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating on Roblox...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  {isJsonProvided ? "Update Avatar from JSON" : "Save Name to Roblox"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
