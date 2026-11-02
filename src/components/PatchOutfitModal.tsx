"use client";

import PulseSkeleton from "@/components/PulseSkeleton";
import { getErrorMessage } from "@/lib/error-message";
import {
  ParsedOutfitCandidate,
  parseOutfitCandidates,
} from "@/lib/outfit-json";
import {
  ROBLOX_BRICK_COLORS,
  cleanHex,
  extractOutfitColors,
  formatCssHex,
  normalizeBodyColors,
} from "@/lib/roblox-colors";
import { hdThumbnailUrl } from "@/lib/roblox-thumbnails";
import {
  ArrangedOutfit,
  AVATAR_NAME_MAX_LENGTH,
  RobloxOutfitDetail,
  RobloxScale,
} from "@/types/roblox";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clipboard,
  FileCode,
  Info,
  Loader2,
  Palette,
  RotateCcw,
  Sliders,
  Upload,
  User,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

interface PatchOutfitModalProps {
  isOpen: boolean;
  onClose: () => void;
  outfit: ArrangedOutfit | null;
  cookie: string;
  userId?: number;
  onOutfitPatched: (updatedOutfit: ArrangedOutfit) => void;
}

type BodyColor3Key =
  | "headColor3"
  | "torsoColor3"
  | "leftArmColor3"
  | "rightArmColor3"
  | "leftLegColor3"
  | "rightLegColor3";

type ScaleKey = keyof RobloxScale;

const DEFAULT_SCALE: RobloxScale = {
  height: 1,
  width: 1,
  head: 1,
  depth: 1,
  proportion: 0,
  bodyType: 0,
};

const DEFAULT_COLOR3S: Record<BodyColor3Key, string> = {
  headColor3: "eab892",
  torsoColor3: "eab892",
  leftArmColor3: "eab892",
  rightArmColor3: "eab892",
  leftLegColor3: "eab892",
  rightLegColor3: "eab892",
};

const BODY_PARTS: { key: BodyColor3Key; label: string }[] = [
  { key: "headColor3", label: "Head" },
  { key: "torsoColor3", label: "Torso" },
  { key: "leftArmColor3", label: "L. Arm" },
  { key: "rightArmColor3", label: "R. Arm" },
  { key: "leftLegColor3", label: "L. Leg" },
  { key: "rightLegColor3", label: "R. Leg" },
];

const SCALE_FIELDS: {
  key: ScaleKey;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
    { key: "height", label: "Height", min: 0.9, max: 1.05, step: 0.01 },
    { key: "width", label: "Width", min: 0.7, max: 1, step: 0.01 },
    { key: "head", label: "Head", min: 0.95, max: 1, step: 0.01 },
    { key: "depth", label: "Depth", min: 0.7, max: 1, step: 0.01 },
    { key: "proportion", label: "Proportion", min: 0, max: 1, step: 0.01 },
    { key: "bodyType", label: "Body Type", min: 0, max: 1, step: 0.01 },
  ];

const QUICK_BRICK_IDS = [
  125, 18, 5, 12, 36, 1030, 192, 217, 26, 1, 194, 21, 23, 37, 24, 104,
];

function clampScale(key: ScaleKey, value: number): number {
  const field = SCALE_FIELDS.find((f) => f.key === key);
  if (!field) return value;
  return Math.min(field.max, Math.max(field.min, value));
}

function scaleFromCandidate(scale?: RobloxScale | null): RobloxScale {
  const base = scale || DEFAULT_SCALE;
  return {
    height: clampScale("height", base.height ?? 1),
    width: clampScale("width", base.width ?? 1),
    head: clampScale("head", base.head ?? 1),
    depth: clampScale("depth", base.depth ?? 1),
    proportion: clampScale("proportion", base.proportion ?? 0),
    bodyType: clampScale("bodyType", base.bodyType ?? 0),
  };
}

function color3sFromSource(
  source?: Parameters<typeof extractOutfitColors>[0],
): Record<BodyColor3Key, string> {
  const colors = extractOutfitColors(source);
  return {
    headColor3: colors.bodyColor3s.headColor3 || DEFAULT_COLOR3S.headColor3,
    torsoColor3: colors.bodyColor3s.torsoColor3 || DEFAULT_COLOR3S.torsoColor3,
    leftArmColor3:
      colors.bodyColor3s.leftArmColor3 || DEFAULT_COLOR3S.leftArmColor3,
    rightArmColor3:
      colors.bodyColor3s.rightArmColor3 || DEFAULT_COLOR3S.rightArmColor3,
    leftLegColor3:
      colors.bodyColor3s.leftLegColor3 || DEFAULT_COLOR3S.leftLegColor3,
    rightLegColor3:
      colors.bodyColor3s.rightLegColor3 || DEFAULT_COLOR3S.rightLegColor3,
  };
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
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);
  const [customName, setCustomName] = useState(outfit?.name || "");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [palettePart, setPalettePart] = useState<BodyColor3Key | null>(null);
  const [detailsLoadSettled, setDetailsLoadSettled] = useState(
    Boolean(outfit?.details),
  );

  const [currentDetails, setCurrentDetails] =
    useState<RobloxOutfitDetail | null>(outfit?.details || null);

  // Parent remounts this modal with key={outfit.id}, so initial state is enough
  const [editedColor3s, setEditedColor3s] = useState<
    Record<BodyColor3Key, string>
  >(() => color3sFromSource(outfit?.details || outfit));
  const [editedScale, setEditedScale] = useState<RobloxScale>(() =>
    scaleFromCandidate(outfit?.details?.scale),
  );
  const [editedRig, setEditedRig] = useState<"R6" | "R15">(() =>
    outfit?.details?.playerAvatarType === "R6" ? "R6" : "R15",
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const waitingForDetails =
    isOpen &&
    !!outfit &&
    !outfit.details &&
    !currentDetails &&
    !!cookie &&
    !detailsLoadSettled;
  const isLoadingDetails = waitingForDetails;

  useEffect(() => {
    if (!waitingForDetails || !outfit) return;
    let cancelled = false;

    fetch("/api/roblox/outfit-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cookie,
        outfitId: outfit.id,
        userId,
      }),
    })
      .then((res) => res.json() as Promise<{ details?: RobloxOutfitDetail }>)
      .then((data) => {
        if (!cancelled && data.details) {
          setCurrentDetails(data.details);
          setEditedColor3s(color3sFromSource(data.details));
          setEditedScale(scaleFromCandidate(data.details.scale));
          setEditedRig(
            data.details.playerAvatarType === "R6" ? "R6" : "R15",
          );
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch outfit details in PatchOutfitModal", err);
      })
      .finally(() => {
        if (!cancelled) setDetailsLoadSettled(true);
      });

    return () => {
      cancelled = true;
    };
  }, [waitingForDetails, outfit, cookie, userId]);

  const parsedJson = useMemo(() => parseOutfitCandidates(jsonText), [jsonText]);
  const candidates = parsedJson.candidates;
  const parseError = parsedJson.error;
  const isJsonProvided = jsonText.trim().length > 0;

  const applyAppearanceFromCandidate = (candidate: ParsedOutfitCandidate) => {
    if (candidate.name) setCustomName(candidate.name);
    setEditedColor3s(color3sFromSource(candidate));
    setEditedScale(scaleFromCandidate(candidate.scale));
    setEditedRig(candidate.playerAvatarType === "R6" ? "R6" : "R15");
  };

  const applyJsonText = (text: string) => {
    setJsonText(text);
    const parsed = parseOutfitCandidates(text);
    setSelectedIndex(0);
    if (parsed.candidates[0]) {
      applyAppearanceFromCandidate(parsed.candidates[0]);
    }
  };

  const baseAssetsCandidate = useMemo<ParsedOutfitCandidate>(() => {
    const details = currentDetails || outfit?.details;
    const rawAssets = details?.assets || [];
    return {
      id: outfit?.id,
      name: outfit?.name,
      thumbnailUrl: outfit?.thumbnailUrl,
      assets: rawAssets,
      assetIds: rawAssets.map((asset) => asset.id),
    };
  }, [outfit, currentDetails]);

  const jsonCandidate =
    isJsonProvided && candidates.length > 0
      ? candidates[selectedIndex] || candidates[0]
      : null;

  const assetSource = jsonCandidate || baseAssetsCandidate;

  const resolvedAssetsCount = useMemo(() => {
    if (Array.isArray(assetSource.assets) && assetSource.assets.length > 0) {
      return assetSource.assets.length;
    }
    if (
      Array.isArray(assetSource.assetIds) &&
      assetSource.assetIds.length > 0
    ) {
      return assetSource.assetIds.length;
    }
    return 0;
  }, [assetSource]);

  const resolvedBodyColors = useMemo(
    () => normalizeBodyColors(null, editedColor3s),
    [editedColor3s],
  );

  if (!isOpen || !outfit) return null;

  const bgUrl =
    jsonCandidate?.backgroundUrl ||
    jsonCandidate?.background?.imageUrl ||
    outfit.backgroundUrl ||
    currentDetails?.background?.imageUrl ||
    outfit.details?.background?.imageUrl;

  const showAppearanceSkeleton = isLoadingDetails && !isJsonProvided;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        applyJsonText(text);
        setShowAdvancedJson(true);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        applyJsonText(text);
        setShowAdvancedJson(true);
      }
    } catch {
      // ignore clipboard permission error
    }
  };

  const handleResetOriginalName = () => {
    if (outfit?.name) setCustomName(outfit.name);
  };

  const handleResetAppearance = () => {
    const details = currentDetails || outfit.details;
    setEditedColor3s(color3sFromSource(details || outfit));
    setEditedScale(scaleFromCandidate(details?.scale));
    setEditedRig(details?.playerAvatarType === "R6" ? "R6" : "R15");
  };

  const updateColorPart = (key: BodyColor3Key, rawHex: string) => {
    setEditedColor3s((prev) => ({
      ...prev,
      [key]: cleanHex(rawHex),
    }));
  };

  const applyColorToAll = (hex: string) => {
    const cleaned = cleanHex(hex);
    setEditedColor3s({
      headColor3: cleaned,
      torsoColor3: cleaned,
      leftArmColor3: cleaned,
      rightArmColor3: cleaned,
      leftLegColor3: cleaned,
      rightLegColor3: cleaned,
    });
  };

  const updateScale = (key: ScaleKey, raw: number) => {
    setEditedScale((prev) => ({
      ...prev,
      [key]: clampScale(key, raw),
    }));
  };

  const handleApplyPatch = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const finalName =
        customName.trim() ||
        jsonCandidate?.name ||
        outfit.name ||
        "Avatar";
      const payload = {
        name: finalName,
        playerAvatarType: editedRig,
        scale: editedScale,
        assets: assetSource.assets,
        assetIds: assetSource.assetIds,
        bodyColors: resolvedBodyColors,
        bodyColor3s: editedColor3s,
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
        throw new Error(
          json.error || `Failed to update outfit (HTTP ${res.status})`,
        );
      }

      setSubmitSuccess(
        `Outfit #${outfit.id} successfully updated on Roblox!`,
      );

      const updatedDetails: RobloxOutfitDetail = json.details || {
        id: outfit.id,
        name: finalName,
        playerAvatarType: payload.playerAvatarType,
        bodyColors: resolvedBodyColors,
        bodyColor3s: editedColor3s,
        scale: payload.scale,
        assets:
          assetSource.assets ||
          (assetSource.assetIds || []).map((id) => ({
            id,
            name: `Asset ${id}`,
            assetType: { id: 0, name: "Asset" },
          })),
        isEditable: true,
      };

      const updatedBackground =
        updatedDetails.background ||
        jsonCandidate?.background ||
        outfit.details?.background;
      const updatedBackgroundUrl =
        updatedBackground?.imageUrl ||
        jsonCandidate?.backgroundUrl ||
        outfit.backgroundUrl;

      const updatedArranged: ArrangedOutfit = {
        ...outfit,
        name: finalName,
        thumbnailUrl: json.thumbnailUrl || outfit.thumbnailUrl,
        backgroundUrl: updatedBackgroundUrl,
        backgroundAssetId: updatedBackground?.id || outfit.backgroundAssetId,
        details: updatedDetails,
        isLoaded: true,
        hasMissingItems: (updatedDetails.missingAssetIds?.length ?? 0) > 0,
      };

      onOutfitPatched(updatedArranged);

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setSubmitError(getErrorMessage(err, "Failed to update outfit."));
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
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Edit Avatar</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 font-mono text-zinc-300">
                  #{outfit.id}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Change name, skin colors, and proportions — or paste JSON
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
                {bgUrl && (
                  <Image
                    src={hdThumbnailUrl(bgUrl)}
                    alt="Background"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                )}
                {outfit.thumbnailUrl ? (
                  <Image
                    src={hdThumbnailUrl(outfit.thumbnailUrl)}
                    alt={outfit.name}
                    fill
                    className={`object-contain p-1 relative z-[1] ${bgUrl ? "drop-shadow-sm" : ""}`}
                    unoptimized
                  />
                ) : (
                  <User className="w-6 h-6 text-zinc-600 relative z-[1]" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-xs text-zinc-400 font-medium block">
                  Target Avatar
                </span>
                <p className="text-sm font-semibold text-zinc-100 truncate">
                  {outfit.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                  <span className="font-mono">ID: #{outfit.id}</span>
                  <span>•</span>
                  {showAppearanceSkeleton ? (
                    <PulseSkeleton className="h-3 w-8 align-middle" />
                  ) : (
                    <span>{editedRig}</span>
                  )}
                  <span>•</span>
                  {showAppearanceSkeleton ? (
                    <PulseSkeleton className="h-3 w-12 align-middle" />
                  ) : (
                    <span>{resolvedAssetsCount} items</span>
                  )}
                  {isLoadingDetails && (
                    <>
                      <span>•</span>
                      <span className="text-sky-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading
                        details...
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
                <span
                  className={`text-[11px] font-mono ${customName.length >= AVATAR_NAME_MAX_LENGTH
                    ? "text-amber-400"
                    : "text-zinc-500"
                    }`}
                >
                  {customName.length}/{AVATAR_NAME_MAX_LENGTH}
                </span>
              </div>
            </div>
            <input
              id="patch-avatar-name"
              name="patchAvatarName"
              type="text"
              autoComplete="off"
              maxLength={AVATAR_NAME_MAX_LENGTH}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Enter custom outfit name..."
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          {/* Rig toggle */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-zinc-300">Rig Type</span>
            <div className="flex gap-2">
              {(["R15", "R6"] as const).map((rig) => (
                <button
                  key={rig}
                  type="button"
                  disabled={showAppearanceSkeleton}
                  onClick={() => setEditedRig(rig)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition ${editedRig === rig
                    ? "bg-sky-950/60 border-sky-600 text-sky-200"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                >
                  {rig}
                </button>
              ))}
            </div>
          </div>

          {/* Skin Colors Editor */}
          <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                <Palette className="w-3.5 h-3.5 text-sky-400" />
                <span>Skin Colors</span>
              </div>
              <button
                type="button"
                onClick={handleResetAppearance}
                disabled={showAppearanceSkeleton}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition disabled:opacity-40"
              >
                <RotateCcw className="w-3 h-3" />
                Reset look
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {BODY_PARTS.map((part) => {
                const hex = editedColor3s[part.key];
                return (
                  <div
                    key={part.key}
                    className="p-2.5 bg-zinc-950/60 border border-zinc-800/80 rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-medium text-zinc-400">
                        {part.label}
                      </span>
                      <button
                        type="button"
                        disabled={showAppearanceSkeleton}
                        onClick={() =>
                          setPalettePart(
                            palettePart === part.key ? null : part.key,
                          )
                        }
                        className="text-[10px] text-sky-400 hover:text-sky-300 disabled:opacity-40"
                        title="BrickColor quick pick"
                      >
                        Palette
                      </button>
                    </div>
                    {showAppearanceSkeleton ? (
                      <PulseSkeleton className="h-8 w-full rounded-md" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formatCssHex(hex)}
                          onChange={(e) =>
                            updateColorPart(part.key, e.target.value)
                          }
                          className="w-8 h-8 rounded-md border border-zinc-700 bg-transparent cursor-pointer shrink-0"
                          title={`Pick ${part.label} color`}
                        />
                        <input
                          type="text"
                          value={`#${hex}`}
                          onChange={(e) =>
                            updateColorPart(part.key, e.target.value)
                          }
                          className="flex-1 min-w-0 px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md font-mono text-[11px] text-zinc-200 focus:outline-none focus:border-sky-500 uppercase"
                          spellCheck={false}
                        />
                      </div>
                    )}
                    {palettePart === part.key && (
                      <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
                        <div className="flex flex-wrap gap-1">
                          {QUICK_BRICK_IDS.map((id) => {
                            const entry = ROBLOX_BRICK_COLORS[id];
                            if (!entry) return null;
                            return (
                              <button
                                key={id}
                                type="button"
                                title={`${entry.name} (#${id})`}
                                onClick={() => {
                                  updateColorPart(part.key, entry.hex);
                                  setPalettePart(null);
                                }}
                                className="w-5 h-5 rounded border border-white/10 hover:scale-110 transition"
                                style={{ backgroundColor: entry.hex }}
                              />
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={() => applyColorToAll(hex)}
                          className="text-[10px] text-zinc-400 hover:text-zinc-200"
                        >
                          Apply this color to all parts
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Proportions Editor */}
          <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>Avatar Proportions</span>
            </div>
            <div className="space-y-3">
              {SCALE_FIELDS.map((field) => {
                const value = editedScale[field.key];
                return (
                  <div key={field.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-medium">
                        {field.label}
                      </span>
                      {showAppearanceSkeleton ? (
                        <PulseSkeleton className="h-3 w-10" />
                      ) : (
                        <span className="font-mono text-zinc-200">
                          {Math.round(value * 100)}%
                        </span>
                      )}
                    </div>
                    {showAppearanceSkeleton ? (
                      <PulseSkeleton className="h-2 w-full rounded-full" />
                    ) : (
                      <input
                        type="range"
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={value}
                        onChange={(e) =>
                          updateScale(field.key, Number(e.target.value))
                        }
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Advanced JSON (collapsible) */}
          <div className="border border-zinc-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedJson((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/50 hover:bg-zinc-900 transition text-left"
            >
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-300">
                  Advanced JSON
                </span>
                <span className="text-[11px] text-zinc-500">
                  Optional — replace equipped items via paste/upload
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-zinc-500 transition ${showAdvancedJson ? "rotate-180" : ""
                  }`}
              />
            </button>

            {showAdvancedJson && (
              <div className="p-4 space-y-3 border-t border-zinc-800">
                <div className="flex items-center justify-end gap-1.5">
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
                      onClick={() => {
                        setJsonText("");
                        handleResetAppearance();
                      }}
                      className="text-xs text-zinc-500 hover:text-zinc-300 px-1.5 py-1"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <textarea
                  rows={4}
                  value={jsonText}
                  onChange={(e) => applyJsonText(e.target.value)}
                  placeholder="Paste outfit JSON to replace equipped items (colors & scales sync into the editors above)..."
                  className="w-full p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-200 focus:outline-none focus:border-sky-500 transition resize-y"
                />

                {parseError && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{parseError}</span>
                  </div>
                )}

                {candidates.length > 1 && (
                  <div className="space-y-2 p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                      <span>
                        Select Outfit from JSON ({candidates.length} found)
                      </span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                      {candidates.map((cand, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedIndex(idx);
                            applyAppearanceFromCandidate(cand);
                          }}
                          className={`flex items-center gap-2.5 p-2 rounded-lg border text-left transition ${selectedIndex === idx
                            ? "bg-sky-950/40 border-sky-500/60 ring-1 ring-sky-500/40 text-white"
                            : "bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                            }`}
                        >
                          <div className="relative w-8 h-8 rounded bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                            {(cand.backgroundUrl || cand.background?.imageUrl) && (
                              <Image
                                src={hdThumbnailUrl(cand.backgroundUrl || cand.background!.imageUrl!)}
                                alt="Background"
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            )}
                            {cand.thumbnailUrl ? (
                              <Image
                                src={hdThumbnailUrl(cand.thumbnailUrl)}
                                alt={cand.name || "Outfit"}
                                fill
                                className="object-contain relative z-[1]"
                                unoptimized
                              />
                            ) : (
                              <User className="w-4 h-4 text-zinc-600 relative z-[1]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate">
                              {cand.name || `Outfit #${idx + 1}`}
                            </p>
                            <p className="text-[10px] text-zinc-500 font-mono">
                              {cand.playerAvatarType || "R15"} •{" "}
                              {cand.assets?.length ||
                                cand.assetIds?.length ||
                                0}{" "}
                              items
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isJsonProvided && !parseError && (
                  <div className="p-2.5 bg-sky-950/30 border border-sky-800/40 rounded-lg text-xs text-sky-200 flex items-start gap-2">
                    <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      JSON loaded: equipped items will come from JSON. Skin
                      colors and proportions were synced into the editors —
                      you can still tweak them before saving.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Feedback Banners */}
          {submitError && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl flex items-start gap-2.5 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-100">Update Failed</p>
                <p className="text-red-300/90 leading-relaxed mt-0.5">
                  {submitError}
                </p>
              </div>
            </div>
          )}

          {submitSuccess && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-start gap-2.5 text-xs text-emerald-200">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-100">
                  Update Successful
                </p>
                <p className="text-emerald-300/90 leading-relaxed mt-0.5">
                  {submitSuccess}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-zinc-800 bg-zinc-950/80">
          <button
            type="button"
            onClick={handleApplyPatch}
            disabled={!isFormValidToSubmit}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-lg shadow-sky-600/20 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving to Roblox...</span>
              </>
            ) : (
              <span>Save to Roblox</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
