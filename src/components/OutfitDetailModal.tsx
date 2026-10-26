"use client";

import PulseSkeleton from "@/components/PulseSkeleton";
import { formatCssHex } from "@/lib/roblox-colors";
import { hdThumbnailUrl } from "@/lib/roblox-thumbnails";
import { ArrangedOutfit } from "@/types/roblox";
import {
  AlertTriangle,
  Check,
  Code,
  Copy,
  Download,
  ExternalLink,
  FileCode,
  Layers,
  Palette,
  Sliders,
  Sparkles,
  User,
  WrapText,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

interface OutfitDetailModalProps {
  outfit: ArrangedOutfit | null;
  cookie: string;
  onClose: () => void;
  onPatch?: (outfit: ArrangedOutfit) => void;
  isFetchingDetails?: boolean;
}

// Common Roblox BrickColor preview palette
const BRICK_COLOR_MAP: Record<number, string> = {
  1: "#F2F3F3", // White
  2: "#A1A5A2", // Grey
  5: "#D7C59A", // Brick yellow
  9: "#E8BAC8", // Light reddish violet
  11: "#80BBDB", // Pastel Blue
  18: "#CC8E69", // Nougat
  21: "#C4281B", // Bright red
  23: "#0D69AC", // Bright blue
  24: "#F5CD30", // Bright yellow
  26: "#1B2A35", // Black
  28: "#28272A", // Dark green
  37: "#4B974B", // Bright green
  101: "#DA8641", // Medium red
  102: "#6E99CA", // Medium blue
  106: "#DA2B34", // Bright red
  119: "#A4BD47", // Brilliant yellowish green
  125: "#EAB892", // Light orange
  135: "#74869D", // Sand blue
  141: "#27462D", // Earth green
  151: "#789082", // Sand green
  194: "#A3A2A5", // Medium stone grey
  199: "#635F62", // Dark stone grey
  217: "#7C5C45", // Brown
  359: "#AFB5D7", // Ghost blue
  1001: "#F8F8F8", // Institutional white
  1002: "#CDCDCD", // Mid gray
  1003: "#111111", // Really black
  1004: "#FF6666", // Really red
  1005: "#FF66CC", // Deep orange
  1006: "#E29B40", // Alder
  1007: "#A05F35", // Dust
  1008: "#C7AC78", // Olive
  1010: "#4B974B", // Camouflage
  1020: "#002060", // Navy blue
  1024: "#AF7432", // Pastel yellow
  1028: "#CC8E69", // Medium nougat
};

function getBrickColorHex(id: number | undefined): string {
  if (!id) return "#27272a";
  return BRICK_COLOR_MAP[id] || "#3f3f46";
}

interface JsonToken {
  type:
    | "key"
    | "colon"
    | "string"
    | "number"
    | "boolean"
    | "null"
    | "punctuation"
    | "whitespace"
    | "text";
  text: string;
}

const JSON_TOKEN_REGEX =
  /("(?:\\.|[^"\\])*"(?=\s*:))|(:)|("(?:\\.|[^"\\])*")|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(\b(?:true|false)\b)|(\bnull\b)|([{}[\],])|(\s+)|([^\s]+)/g;

function tokenizeJsonLine(line: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let match: RegExpExecArray | null;
  JSON_TOKEN_REGEX.lastIndex = 0;
  while ((match = JSON_TOKEN_REGEX.exec(line)) !== null) {
    if (match[1]) tokens.push({ type: "key", text: match[1] });
    else if (match[2]) tokens.push({ type: "colon", text: match[2] });
    else if (match[3]) tokens.push({ type: "string", text: match[3] });
    else if (match[4]) tokens.push({ type: "number", text: match[4] });
    else if (match[5]) tokens.push({ type: "boolean", text: match[5] });
    else if (match[6]) tokens.push({ type: "null", text: match[6] });
    else if (match[7]) tokens.push({ type: "punctuation", text: match[7] });
    else if (match[8]) tokens.push({ type: "whitespace", text: match[8] });
    else if (match[9]) tokens.push({ type: "text", text: match[9] });
  }
  return tokens;
}

function renderJsonToken(token: JsonToken, idx: number) {
  switch (token.type) {
    case "key":
      return (
        <span key={idx} className="text-sky-300 font-medium">
          {token.text}
        </span>
      );
    case "colon":
      return (
        <span key={idx} className="text-zinc-500 font-normal">
          {token.text}
        </span>
      );
    case "string":
      return (
        <span key={idx} className="text-emerald-300 break-all">
          {token.text}
        </span>
      );
    case "number":
      return (
        <span key={idx} className="text-amber-300 font-mono font-medium">
          {token.text}
        </span>
      );
    case "boolean":
      return (
        <span key={idx} className="text-purple-400 font-semibold">
          {token.text}
        </span>
      );
    case "null":
      return (
        <span key={idx} className="text-rose-400 italic font-semibold">
          {token.text}
        </span>
      );
    case "punctuation":
      return (
        <span key={idx} className="text-zinc-400 font-medium">
          {token.text}
        </span>
      );
    case "whitespace":
      return (
        <span key={idx} className="whitespace-pre">
          {token.text}
        </span>
      );
    default:
      return (
        <span key={idx} className="text-zinc-300">
          {token.text}
        </span>
      );
  }
}

function CatalogAssetThumb({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return <span className="w-24 min-h-16 self-stretch shrink-0" aria-hidden />;
  }

  return (
    <span className="relative w-24 min-h-16 self-stretch shrink-0">
      <Image
        src={hdThumbnailUrl(imageUrl)}
        alt={name}
        fill
        className="object-contain"
        unoptimized
        onError={() => setFailed(true)}
      />
    </span>
  );
}

export default function OutfitDetailModal({
  outfit,
  cookie,
  onClose,
  onPatch,
  isFetchingDetails = false,
}: OutfitDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"items" | "body" | "json">(
    "items",
  );
  const [copiedId, setCopiedId] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [isWordWrap, setIsWordWrap] = useState(true);
  const [assetThumbs, setAssetThumbs] = useState<{
    key: string;
    map: Record<number, string>;
  }>({ key: "", map: {} });

  const jsonString = useMemo(
    () => (outfit ? JSON.stringify(outfit, null, 2) : ""),
    [outfit],
  );
  const jsonLines = useMemo(
    () => (jsonString ? jsonString.split("\n") : []),
    [jsonString],
  );
  const assetIdsKey =
    outfit?.details?.assets?.map((asset) => asset.id).join(",") ?? "";

  useEffect(() => {
    if (!cookie || !assetIdsKey) return;

    const assetIds = assetIdsKey.split(",").map(Number);
    let cancelled = false;

    fetch("/api/roblox/asset-thumbnails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cookie, assetIds }),
    })
      .then(
        (res) => res.json() as Promise<{ thumbnails?: Record<number, string> }>,
      )
      .then((data) => {
        if (!cancelled && data.thumbnails) {
          setAssetThumbs({ key: assetIdsKey, map: data.thumbnails });
        }
      })
      .catch(() => {
        /* keep previous map; CatalogAssetThumb falls back when missing */
      });

    return () => {
      cancelled = true;
    };
  }, [cookie, assetIdsKey]);

  const resolvedAssetThumbs =
    assetThumbs.key === assetIdsKey ? assetThumbs.map : {};

  if (!outfit) return null;

  const details = outfit.details;
  const isDetailsPending = isFetchingDetails && !details;
  const rigType = details?.playerAvatarType;
  const bodyColors = details?.bodyColors;
  const scale = details?.scale;
  const assets = details?.assets || [];

  const missingAssetIds = new Set(details?.missingAssetIds || []);
  const isAssetMissing = (asset: { id: number; isOwned?: boolean }) =>
    asset.isOwned === false || missingAssetIds.has(asset.id);
  const missingAssetsCount = assets.filter(isAssetMissing).length;

  const handleCopyId = () => {
    navigator.clipboard.writeText(String(outfit.id));
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `outfit-${outfit.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const bodyParts = [
    {
      label: "Head",
      id: bodyColors?.headColorId,
      hex: details?.bodyColor3s?.headColor3,
    },
    {
      label: "Torso",
      id: bodyColors?.torsoColorId,
      hex: details?.bodyColor3s?.torsoColor3,
    },
    {
      label: "Left Arm",
      id: bodyColors?.leftArmColorId,
      hex: details?.bodyColor3s?.leftArmColor3,
    },
    {
      label: "Right Arm",
      id: bodyColors?.rightArmColorId,
      hex: details?.bodyColor3s?.rightArmColor3,
    },
    {
      label: "Left Leg",
      id: bodyColors?.leftLegColorId,
      hex: details?.bodyColor3s?.leftLegColor3,
    },
    {
      label: "Right Leg",
      id: bodyColors?.rightLegColorId,
      hex: details?.bodyColor3s?.rightLegColor3,
    },
  ];

  const scaleMetrics = [
    {
      label: "Height",
      value: scale?.height != null ? `${Math.round(scale.height * 100)}%` : "-",
    },
    {
      label: "Width",
      value: scale?.width != null ? `${Math.round(scale.width * 100)}%` : "-",
    },
    {
      label: "Head",
      value: scale?.head != null ? `${Math.round(scale.head * 100)}%` : "-",
    },
    {
      label: "Depth",
      value: scale?.depth != null ? `${Math.round(scale.depth * 100)}%` : "-",
    },
    {
      label: "Proportion",
      value:
        scale?.proportion != null
          ? `${Math.round(scale.proportion * 100)}%`
          : "-",
    },
    {
      label: "Body Type",
      value:
        scale?.bodyType != null ? `${Math.round(scale.bodyType * 100)}%` : "-",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <Sparkles className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Outfit Inspector
                </h3>
              </div>
              <p className="text-xs text-zinc-400">
                Inspect equipped 3D assets, body scaling, and color codes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onPatch && (
              <button
                onClick={() => onPatch(outfit)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-300 bg-sky-950/70 hover:bg-sky-900 border border-sky-800/80 rounded-lg transition cursor-pointer"
                title="Update this avatar from JSON"
              >
                <FileCode className="w-3.5 h-3.5 text-sky-400" />
                <span>Patch from JSON</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Body */}
        <div className="relative flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row md:items-stretch">
          {/* Left Column: Square Avatar Showcase & Quick Info (Defines natural height) */}
          <div className="w-full md:w-[350px] lg:w-[370px] shrink-0 p-6 flex flex-col gap-4 bg-gradient-to-b from-zinc-900/40 via-zinc-950/60 to-zinc-950 md:border-r border-zinc-800">
            <div className="space-y-4">
              {/* Square Aspect Ratio Showcase Box */}
              <div className="relative w-full aspect-square rounded-xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 shadow-inner flex items-center justify-center p-4 overflow-hidden group">
                {/* Radial Glow Highlight */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.12),transparent_70%)] pointer-events-none" />

                {outfit.thumbnailUrl ? (
                  <Image
                    src={hdThumbnailUrl(outfit.thumbnailUrl)}
                    alt={outfit.name}
                    fill
                    className="object-contain p-3 drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                    loading="eager"
                    priority
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-600 gap-2">
                    <User className="w-16 h-16" />
                    <span className="text-xs text-zinc-500 font-medium">
                      No preview available
                    </span>
                  </div>
                )}

                {/* Rig Badge Pinned Top-Right */}
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-zinc-900/90 border border-zinc-700/80 text-zinc-200 text-xs font-mono font-semibold backdrop-blur-sm shadow-md">
                  {isDetailsPending ? (
                    <PulseSkeleton className="h-3 w-8 align-middle" />
                  ) : (
                    rigType
                  )}
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-white tracking-tight break-words">
                  {outfit.name}
                </h4>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleCopyId}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-md transition cursor-pointer"
                    title="Click to copy Outfit ID"
                  >
                    {copiedId ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-sans">
                          Copied!
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span>ID: #{outfit.id}</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`https://www.roblox.com/bundles/${outfit.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-400 hover:text-sky-400 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-md transition"
                  >
                    <span>View on Roblox</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80">
              <div className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800">
                <span className="text-xs text-zinc-400 block font-medium">
                  Equipped Items
                </span>
                {isDetailsPending ? (
                  <PulseSkeleton className="h-5 w-16 mt-1" />
                ) : (
                  <span className="text-base font-bold text-white">
                    {assets.length} items
                  </span>
                )}
              </div>
              <div className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800">
                <span className="text-xs text-zinc-400 block font-medium">
                  Avatar Model
                </span>
                {isDetailsPending ? (
                  <PulseSkeleton className="h-5 w-14 mt-1" />
                ) : (
                  <span className="text-base font-bold text-white">
                    {rigType ? `${rigType} Rig` : "—"}
                  </span>
                )}
              </div>
            </div>

            {/* Missing Assets Warning Card */}
            {missingAssetsCount > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Needs Fix ({missingAssetsCount} missing item
                    {missingAssetsCount === 1 ? "" : "s"})
                  </span>
                </div>
                <p className="text-[11px] text-amber-300/80 leading-snug">
                  Contains deleted or unwearable items. Missing items are
                  skipped when saving to Roblox.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Tabbed Detailed Content (Follows Left Column height) */}
          <div className="flex-1 md:absolute md:inset-y-0 md:right-0 md:left-[350px] lg:md:left-[370px] flex flex-col bg-zinc-950 overflow-hidden border-t md:border-t-0 border-zinc-800">
            {/* Tabs Navigation */}
            <div className="shrink-0 flex items-center gap-2 px-6 pt-4 border-b border-zinc-800 bg-zinc-950/60">
              <button
                onClick={() => setActiveTab("items")}
                className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition ${
                  activeTab === "items"
                    ? "border-sky-500 text-white"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Equipped Assets</span>
                {isDetailsPending ? (
                  <PulseSkeleton className="h-5 w-7 rounded-full" />
                ) : (
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-mono ${
                      activeTab === "items"
                        ? "bg-sky-950 text-sky-400 border border-sky-800/60"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                    }`}
                  >
                    {assets.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("body")}
                className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition ${
                  activeTab === "body"
                    ? "border-sky-500 text-white"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Body & Proportions</span>
              </button>

              <button
                onClick={() => setActiveTab("json")}
                className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition ${
                  activeTab === "json"
                    ? "border-sky-500 text-white"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Code className="w-4 h-4" />
                <span>Raw JSON</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div
              className={`flex-1 min-h-0 ${
                activeTab === "json"
                  ? "p-4 sm:p-5 flex flex-col overflow-hidden"
                  : "p-6 overflow-y-auto space-y-6"
              }`}
            >
              {activeTab === "items" ? (
                <div className="space-y-3">
                  {isDetailsPending ? (
                    <div className="space-y-2.5">
                      {Array.from({ length: 4 }, (_, index) => (
                        <div
                          key={index}
                          className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-2"
                        >
                          <PulseSkeleton className="h-4 w-40" />
                          <PulseSkeleton className="h-3 w-24" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {missingAssetsCount > 0 && (
                        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-700/60 text-amber-200 space-y-1.5">
                          <div className="flex items-center gap-2 font-semibold text-sm text-amber-300">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>
                              Notice: Detected {missingAssetsCount} deleted /
                              unwearable item
                              {missingAssetsCount === 1 ? "" : "s"}
                            </span>
                          </div>
                          <p className="text-xs text-amber-200/80 leading-relaxed">
                            Items labeled{" "}
                            <strong className="text-amber-200 font-semibold">
                              &ldquo;Deleted / Unwearable&rdquo;
                            </strong>{" "}
                            below have been moderated or removed from the Roblox
                            catalog. Missing items are skipped when saving to
                            Roblox.
                          </p>
                        </div>
                      )}

                      {assets.length > 0 ? (
                        <div className="space-y-2.5">
                          {assets.map((asset) => {
                            const isMissing = isAssetMissing(asset);
                            return (
                              <div
                                key={asset.id}
                                className={`relative rounded-xl border transition flex items-stretch overflow-hidden group ${
                                  isMissing
                                    ? "border-amber-500/70 bg-gradient-to-r from-amber-950/30 to-zinc-900/60 hover:bg-amber-950/40 hover:border-amber-400 ring-1 ring-amber-500/30"
                                    : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80 hover:border-zinc-700"
                                }`}
                              >
                                <CatalogAssetThumb
                                  name={asset.name}
                                  imageUrl={resolvedAssetThumbs[asset.id]}
                                />
                                <div className="min-w-0 flex-1 space-y-1 py-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold text-sm text-zinc-100 truncate group-hover:text-white">
                                      {asset.name}
                                    </p>
                                    {isMissing && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/50 text-amber-300 font-semibold flex items-center gap-1 shrink-0">
                                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                                        Deleted / Unwearable
                                      </span>
                                    )}
                                    {asset.meta && (
                                      <span
                                        className="text-[10px] px-2 py-0.5 rounded-md bg-sky-950/80 border border-sky-800 text-sky-300 font-mono shrink-0"
                                        title={`Custom Pos: [${asset.meta.position?.X?.toFixed(2)}, ${asset.meta.position?.Y?.toFixed(2)}, ${asset.meta.position?.Z?.toFixed(2)}]`}
                                      >
                                        3D Adjustments
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-sans font-medium">
                                      {asset.assetType?.name || "Accessory"}
                                    </span>
                                    <span>ID: #{asset.id}</span>
                                  </div>
                                  {isMissing && (
                                    <p className="text-[11px] text-amber-400/90 font-sans mt-0.5">
                                      Item is unlisted or unwearable in Roblox.
                                      It will be skipped when saving to Roblox.
                                    </p>
                                  )}
                                </div>

                                <a
                                  href={`https://www.roblox.com/catalog/${asset.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-2 mr-2 self-center text-zinc-400 hover:text-sky-400 hover:bg-zinc-800/80 rounded-lg transition shrink-0"
                                  title="Open in Roblox Catalog"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-12 text-center border border-dashed border-zinc-800 rounded-xl p-6">
                          <Layers className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                          <p className="text-sm text-zinc-400 font-medium">
                            No assets equipped
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">
                            This outfit doesn&apos;t have any accessories or
                            catalog items attached.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : activeTab === "body" ? (
                <div className="space-y-6">
                  {isDetailsPending ? (
                    <>
                      <div className="space-y-3">
                        <PulseSkeleton className="h-4 w-40" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {Array.from({ length: 6 }, (_, index) => (
                            <div
                              key={index}
                              className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2"
                            >
                              <PulseSkeleton className="h-3 w-14" />
                              <PulseSkeleton className="h-5 w-12" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <PulseSkeleton className="h-4 w-28" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {Array.from({ length: 6 }, (_, index) => (
                            <div
                              key={index}
                              className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center gap-3"
                            >
                              <PulseSkeleton className="w-8 h-8 rounded-lg" />
                              <div className="space-y-1.5">
                                <PulseSkeleton className="h-3 w-12" />
                                <PulseSkeleton className="h-3 w-16" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Proportions & Scaling */}
                      {scale ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                            <Sliders className="w-4 h-4 text-sky-400" />
                            <span>Scaling & Proportions</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {scaleMetrics.map((item) => (
                              <div
                                key={item.label}
                                className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl"
                              >
                                <span className="text-xs text-zinc-400 block font-medium">
                                  {item.label}
                                </span>
                                <span className="text-base font-bold font-mono text-zinc-100 mt-0.5 block">
                                  {item.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* Body Colors */}
                      {bodyColors ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                            <Palette className="w-4 h-4 text-sky-400" />
                            <span>Body Colors</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {bodyParts.map((part) => {
                              const hex = part.hex
                                ? formatCssHex(part.hex)
                                : getBrickColorHex(part.id);
                              return (
                                <div
                                  key={part.label}
                                  className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center gap-3"
                                >
                                  <div
                                    className="w-8 h-8 rounded-lg border border-white/10 shadow-sm shrink-0"
                                    style={{ backgroundColor: hex }}
                                    title={`Color: ${hex} (ID: #${part.id || 0})`}
                                  />
                                  <div className="min-w-0">
                                    <span className="text-xs text-zinc-400 block font-medium">
                                      {part.label}
                                    </span>
                                    <span className="text-xs font-mono font-semibold text-zinc-200 block truncate">
                                      {part.hex
                                        ? `#${part.hex.toLowerCase()}`
                                        : `Brick #${part.id || 0}`}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ) : (
                /* Raw JSON Tab */
                <div className="h-full flex flex-col min-h-[420px] md:min-h-0 space-y-3">
                  {/* Code Editor Window Container */}
                  <div className="flex-1 min-h-[340px] md:min-h-0 flex flex-col rounded-xl border border-zinc-800 bg-[#0d1117] overflow-hidden shadow-2xl">
                    {/* Editor Toolbar */}
                    <div className="shrink-0 bg-zinc-900/90 border-b border-zinc-800/80 px-3.5 py-2.5 flex items-center justify-between gap-3">
                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Word Wrap Toggle */}
                        <button
                          onClick={() => setIsWordWrap(!isWordWrap)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition cursor-pointer ${
                            isWordWrap
                              ? "bg-sky-950/80 text-sky-300 border-sky-800/80 shadow-xs"
                              : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-750 hover:bg-zinc-750"
                          }`}
                          title={
                            isWordWrap
                              ? "Word wrap is active: text breaks to new lines without clipping"
                              : "Word wrap is off: lines extend horizontally"
                          }
                        >
                          <WrapText className="w-3.5 h-3.5" />
                          <span>Wrap: {isWordWrap ? "ON" : "OFF"}</span>
                        </button>

                        {/* Export JSON */}
                        <button
                          onClick={handleDownloadJson}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 rounded-lg transition cursor-pointer"
                          title={`Download outfit-${outfit.id}.json`}
                        >
                          <Download className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="hidden sm:inline">Export</span>
                        </button>

                        {/* Copy JSON */}
                        <button
                          onClick={handleCopyJson}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                            copiedJson
                              ? "bg-emerald-950/80 border-emerald-800 text-emerald-300"
                              : "bg-zinc-850 hover:bg-zinc-800 border-zinc-750 text-zinc-200 hover:text-white"
                          }`}
                          title="Copy full JSON payload"
                        >
                          {copiedJson ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Copy JSON</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Code Lines Canvas */}
                    <div
                      className={`flex-1 min-h-0 overflow-y-auto p-3 font-mono text-xs leading-relaxed selection:bg-sky-500/30 ${
                        isWordWrap ? "overflow-x-hidden" : "overflow-x-auto"
                      }`}
                    >
                      {jsonLines.map((line, lineIdx) => {
                        const tokens = tokenizeJsonLine(line);
                        return (
                          <div
                            key={lineIdx}
                            className="flex items-start hover:bg-zinc-800/40 px-1.5 py-0.5 rounded transition-colors group"
                          >
                            <span className="w-9 shrink-0 pr-2.5 mr-2 text-right select-none text-zinc-600 group-hover:text-zinc-400 font-mono text-[11px] leading-5 border-r border-zinc-800/80 sticky left-0 bg-[#0d1117] group-hover:bg-[#161b22]">
                              {lineIdx + 1}
                            </span>
                            <div
                              className={`flex-1 min-w-0 font-mono text-xs leading-5 ${
                                isWordWrap
                                  ? "whitespace-pre-wrap break-all"
                                  : "whitespace-pre"
                              }`}
                            >
                              {tokens.map((token, tokIdx) =>
                                renderJsonToken(token, tokIdx),
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Syntax Highlight Legend */}
                    <div className="shrink-0 bg-zinc-900/70 border-t border-zinc-800/80 px-3.5 py-1.5 flex items-center justify-between gap-2 text-[11px] text-zinc-400 select-none">
                      <div className="flex items-center gap-3 overflow-x-auto py-0.5">
                        <span className="text-zinc-500 font-medium">
                          Syntax:
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
                          <span className="text-sky-300 font-medium">Key</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                          <span className="text-emerald-300 font-medium">
                            String
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                          <span className="text-amber-300 font-medium">
                            Number
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                          <span className="text-purple-300 font-medium">
                            Boolean
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                          <span className="text-rose-300 font-medium">
                            Null
                          </span>
                        </span>
                      </div>
                      <span className="hidden sm:inline text-zinc-500 font-mono text-[10px]">
                        UTF-8 • JSON
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-950">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
