"use client";

import { ArrangedOutfit } from "@/types/roblox";
import {
  AlertTriangle,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  ChevronUp,
  Eye,
  EyeOff,
  FileCode,
  GripVertical,
  User,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface OutfitCardProps {
  outfit: ArrangedOutfit;
  index: number;
  actualIndex: number;
  totalOutfits: number;
  isCompact?: boolean;
  onMoveToTop: (id: number) => void;
  onMoveToBottom: (id: number) => void;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
  onMoveToPosition: (id: number, targetPos: number) => void;
  onInspect: (outfit: ArrangedOutfit) => void;
  onToggleExclude: (id: number) => void;
  onPatch?: (outfit: ArrangedOutfit) => void;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDragOver: (e: React.DragEvent, id: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, id: number) => void;
  isDragging?: boolean;
  dropIndicator?: "before" | "after" | null;
}

export default function OutfitCard({
  outfit,
  actualIndex,
  totalOutfits,
  isCompact = false,
  onMoveToTop,
  onMoveToBottom,
  onMoveUp,
  onMoveDown,
  onMoveToPosition,
  onInspect,
  onToggleExclude,
  onPatch,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragging = false,
  dropIndicator = null,
}: OutfitCardProps) {
  const [isJumpOpen, setIsJumpOpen] = useState(false);
  const [jumpValue, setJumpValue] = useState("");

  const isExcluded = !!outfit.isExcluded;
  const isPositionChanged = outfit.originalIndex !== actualIndex;
  const rigType = outfit.details?.playerAvatarType || "R15";
  const missingCount =
    outfit.details?.missingAssetIds?.length ?? (outfit.hasMissingItems ? 1 : 0);
  const hasMissing = missingCount > 0;

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pos = parseInt(jumpValue, 10);
    if (!isNaN(pos) && pos >= 1 && pos <= totalOutfits) {
      onMoveToPosition(outfit.id, pos);
      setIsJumpOpen(false);
    }
  };

  if (isCompact) {
    return (
      <div
        draggable={!isExcluded}
        onDragStart={(e) => onDragStart(e, outfit.id)}
        onDragOver={(e) => onDragOver(e, outfit.id)}
        onDragEnd={onDragEnd}
        onDrop={(e) => onDrop(e, outfit.id)}
        className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all duration-150 select-none ${
          isDragging
            ? "opacity-30 border-dashed border-sky-500 bg-sky-950/20 scale-[0.99]"
            : dropIndicator
            ? "border-sky-500 ring-2 ring-sky-500/50 bg-sky-950/25 shadow-md"
            : isExcluded
            ? "opacity-40 border-zinc-900 bg-zinc-950"
            : hasMissing
            ? "border-amber-500/70 bg-amber-950/20 hover:bg-amber-950/30 hover:border-amber-400 ring-1 ring-amber-500/30"
            : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700"
        }`}
      >
        {/* Insertion Indicator Bars */}
        {dropIndicator === "before" && (
          <div className="absolute -top-1.5 left-2 right-2 h-1 bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 rounded-full shadow-[0_0_12px_rgba(56,189,248,1)] z-40 pointer-events-none flex items-center justify-between">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-300 ring-2 ring-cyan-500/70 shadow-md" />
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-300 ring-2 ring-indigo-500/70 shadow-md" />
          </div>
        )}
        {dropIndicator === "after" && (
          <div className="absolute -bottom-1.5 left-2 right-2 h-1 bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 rounded-full shadow-[0_0_12px_rgba(56,189,248,1)] z-40 pointer-events-none flex items-center justify-between">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-300 ring-2 ring-cyan-500/70 shadow-md" />
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-300 ring-2 ring-indigo-500/70 shadow-md" />
          </div>
        )}

        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`cursor-grab active:cursor-grabbing text-zinc-500 group-hover:text-zinc-300 p-1 rounded-md transition ${
              isExcluded ? "cursor-not-allowed opacity-30" : ""
            }`}
            title="Drag to reorder"
          >
            <GripVertical className="w-4.5 h-4.5" />
          </div>

          {/* Position Badge with Quick Jump */}
          {isJumpOpen ? (
            <form
              onSubmit={handleJumpSubmit}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 z-20"
            >
              <span className="text-xs text-zinc-400 font-mono">#</span>
              <input
                type="number"
                min={1}
                max={totalOutfits}
                value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIsJumpOpen(false);
                }}
                className="w-12 px-1.5 py-1 text-sm bg-zinc-950 border border-sky-500 rounded-md text-white text-center font-mono focus:outline-none"
              />
              <button
                type="submit"
                className="px-2 py-1 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded-md font-medium"
              >
                Go
              </button>
              <button
                type="button"
                onClick={() => setIsJumpOpen(false)}
                className="p-1 text-xs text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </form>
          ) : (
            <button
              type="button"
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {
                setJumpValue(String(actualIndex + 1));
                setIsJumpOpen(true);
              }}
              title="Click to jump to specific position number"
              className="w-9 py-1 text-center font-mono text-sm font-bold text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded-md transition"
            >
              #{actualIndex + 1}
            </button>
          )}

          <div className="relative w-11 h-11 rounded-lg bg-zinc-950 border border-zinc-800 shrink-0 overflow-hidden">
            {outfit.thumbnailUrl ? (
              <Image
                src={outfit.thumbnailUrl}
                alt={outfit.name}
                fill
                className="object-contain p-1"
                unoptimized
                loading={actualIndex < 12 ? "eager" : "lazy"}
                priority={actualIndex < 4}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                <User className="w-5 h-5" />
              </div>
            )}
          </div>

          <div className="min-w-0 truncate">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-100 truncate">{outfit.name}</span>
              {actualIndex === 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-200 font-semibold">
                  Top
                </span>
              )}
              {hasMissing && (
                <span
                  className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/50 shrink-0"
                  title={`${missingCount} item(s) deleted or unwearable (automatically skipped during reorder)`}
                >
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Missing {missingCount}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
              <span className="font-medium">{rigType}</span>
              {isPositionChanged && (
                <span className="text-zinc-500">• Original: #{outfit.originalIndex + 1}</span>
              )}
            </div>
          </div>
        </div>

        <div
          className="flex items-center gap-1.5 shrink-0"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <button
            type="button"
            draggable={false}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              (e.currentTarget as HTMLElement)?.blur();
              onMoveUp(outfit.id);
            }}
            disabled={actualIndex === 0 || isExcluded}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition disabled:opacity-20 cursor-pointer"
            title="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            draggable={false}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              (e.currentTarget as HTMLElement)?.blur();
              onMoveDown(outfit.id);
            }}
            disabled={actualIndex === totalOutfits - 1 || isExcluded}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition disabled:opacity-20 cursor-pointer"
            title="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            draggable={false}
            onClick={() => onInspect(outfit)}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
            title="Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {onPatch && (
            <button
              type="button"
              draggable={false}
              onClick={() => onPatch(outfit)}
              className="p-1.5 text-sky-400 hover:text-sky-200 hover:bg-sky-950/60 rounded-lg transition cursor-pointer"
              title="Update from JSON (Patch avatar)"
            >
              <FileCode className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            draggable={false}
            onClick={() => onToggleExclude(outfit.id)}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
            title={isExcluded ? "Include back" : "Exclude"}
          >
            {isExcluded ? (
              <EyeOff className="w-4 h-4 text-red-400" />
            ) : (
              <EyeOff className="w-4 h-4 opacity-40 hover:opacity-100" />
            )}
          </button>
        </div>
      </div>
    );
  }

  // Grid view card
  return (
    <div
      draggable={!isExcluded}
      onDragStart={(e) => onDragStart(e, outfit.id)}
      onDragOver={(e) => onDragOver(e, outfit.id)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, outfit.id)}
      className={`group relative flex flex-col rounded-xl border transition-all duration-150 select-none overflow-hidden ${
        isDragging
          ? "opacity-30 border-dashed border-sky-500 bg-sky-950/20 scale-[0.98]"
          : dropIndicator
          ? "border-sky-500 ring-2 ring-sky-500/50 bg-sky-950/20 shadow-lg"
          : isExcluded
          ? "opacity-40 border-zinc-900 bg-zinc-950"
          : hasMissing
          ? "border-amber-500/70 bg-gradient-to-b from-amber-950/20 via-zinc-900/70 to-zinc-900/90 hover:border-amber-400 ring-1 ring-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.08)]"
          : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-lg"
      }`}
    >
      {/* Insertion Indicator Bars */}
      {dropIndicator === "before" && (
        <div className="absolute -left-1.5 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 via-sky-400 to-indigo-500 rounded-full shadow-[0_0_12px_rgba(56,189,248,1)] z-40 pointer-events-none flex flex-col items-center justify-between">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-300 ring-2 ring-cyan-500/70 shadow-md -mt-1" />
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-300 ring-2 ring-indigo-500/70 shadow-md -mb-1" />
        </div>
      )}
      {dropIndicator === "after" && (
        <div className="absolute -right-1.5 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 via-sky-400 to-indigo-500 rounded-full shadow-[0_0_12px_rgba(56,189,248,1)] z-40 pointer-events-none flex flex-col items-center justify-between">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-300 ring-2 ring-cyan-500/70 shadow-md -mt-1" />
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-300 ring-2 ring-indigo-500/70 shadow-md -mb-1" />
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-800/80 bg-zinc-950/40">
        <div className="flex items-center gap-2">
          <div
            className={`cursor-grab active:cursor-grabbing text-zinc-500 group-hover:text-zinc-300 p-0.5 rounded transition ${
              isExcluded ? "cursor-not-allowed opacity-30" : ""
            }`}
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Position with Quick Jump */}
          {isJumpOpen ? (
            <form
              onSubmit={handleJumpSubmit}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1 z-20"
            >
              <span className="text-xs text-zinc-400 font-mono">#</span>
              <input
                type="number"
                min={1}
                max={totalOutfits}
                value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIsJumpOpen(false);
                }}
                className="w-11 px-1 py-0.5 text-xs bg-zinc-950 border border-sky-500 rounded text-white text-center font-mono focus:outline-none"
              />
              <button
                type="submit"
                className="px-1.5 py-0.5 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded font-medium"
              >
                Go
              </button>
              <button
                type="button"
                onClick={() => setIsJumpOpen(false)}
                className="p-0.5 text-xs text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </form>
          ) : (
            <button
              type="button"
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {
                setJumpValue(String(actualIndex + 1));
                setIsJumpOpen(true);
              }}
              title="Click to jump to specific position number"
              className="px-2 py-0.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 hover:text-white font-mono font-bold text-xs text-zinc-200 transition"
            >
              #{actualIndex + 1}
            </button>
          )}

          {actualIndex === 0 && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200">
              Top
            </span>
          )}
        </div>

        <div
          className="flex items-center gap-1.5"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {isPositionChanged && !isExcluded && (
            <span className="text-xs text-zinc-400 font-mono">
              (orig #{outfit.originalIndex + 1})
            </span>
          )}
          {onPatch && (
            <button
              type="button"
              draggable={false}
              onClick={() => onPatch(outfit)}
              className="p-1 text-sky-400 hover:text-sky-200 hover:bg-sky-950/60 rounded-md transition cursor-pointer"
              title="Update from JSON (Patch avatar)"
            >
              <FileCode className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            draggable={false}
            onClick={() => onToggleExclude(outfit.id)}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded-md transition"
            title={isExcluded ? "Re-include" : "Exclude"}
          >
            <EyeOff className={`w-4 h-4 ${isExcluded ? "text-red-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Thumbnail */}
      <div className="relative w-full aspect-square bg-zinc-950 flex items-center justify-center p-2.5 overflow-hidden">
        {hasMissing && (
          <div
            className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/90 border border-amber-500/60 text-amber-300 text-[11px] font-semibold backdrop-blur-sm shadow-md"
            title={`${missingCount} item(s) deleted or unwearable in Roblox catalog`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            <span>Needs Fix ({missingCount})</span>
          </div>
        )}

        {outfit.thumbnailUrl ? (
          <Image
            src={outfit.thumbnailUrl}
            alt={outfit.name}
            fill
            className="object-contain p-2 transition-transform duration-200 group-hover:scale-105"
            unoptimized
            loading={actualIndex < 12 ? "eager" : "lazy"}
            priority={actualIndex < 4}
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-600">
            <User className="w-8 h-8" />
          </div>
        )}

        <div
          className="absolute inset-0 bg-zinc-950/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[2px] p-2"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            draggable={false}
            onClick={() => onInspect(outfit)}
            className="w-full max-w-[125px] py-1.5 text-xs font-semibold text-zinc-100 bg-zinc-800/90 hover:bg-zinc-700 rounded-lg border border-zinc-700 shadow-md transition text-center cursor-pointer"
          >
            Details
          </button>
          {onPatch && (
            <button
              type="button"
              draggable={false}
              onClick={() => onPatch(outfit)}
              className="w-full max-w-[125px] py-1.5 text-xs font-semibold text-sky-300 bg-sky-950/90 hover:bg-sky-900 rounded-lg border border-sky-700/80 shadow-md transition flex items-center justify-center gap-1 text-center cursor-pointer"
              title="Update avatar from JSON"
            >
              <FileCode className="w-3.5 h-3.5 text-sky-400" />
              <span>Patch JSON</span>
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <p className="font-semibold text-sm text-zinc-100 truncate" title={outfit.name}>
            {outfit.name}
          </p>
          <div className="flex items-center justify-between gap-1.5 mt-1">
            <span className="text-xs text-zinc-400 font-medium inline-block">
              {rigType}
            </span>
            {hasMissing && (
              <span
                className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0"
                title={`${missingCount} item(s) deleted from Roblox catalog (automatically skipped during reorder)`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                <span>{missingCount} missing</span>
              </span>
            )}
          </div>
        </div>

        {/* Move controls */}
        <div
          className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-zinc-800/80"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="flex items-center gap-1">
            <button
              type="button"
              draggable={false}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                (e.currentTarget as HTMLElement)?.blur();
                onMoveToTop(outfit.id);
              }}
              disabled={actualIndex === 0 || isExcluded}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition disabled:opacity-20 cursor-pointer"
              title="Move to Top (#1)"
            >
              <ChevronsUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              draggable={false}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                (e.currentTarget as HTMLElement)?.blur();
                onMoveUp(outfit.id);
              }}
              disabled={actualIndex === 0 || isExcluded}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition disabled:opacity-20 cursor-pointer"
              title="Move Up 1 slot"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              draggable={false}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                (e.currentTarget as HTMLElement)?.blur();
                onMoveDown(outfit.id);
              }}
              disabled={actualIndex === totalOutfits - 1 || isExcluded}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition disabled:opacity-20 cursor-pointer"
              title="Move Down 1 slot"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              draggable={false}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                (e.currentTarget as HTMLElement)?.blur();
                onMoveToBottom(outfit.id);
              }}
              disabled={actualIndex === totalOutfits - 1 || isExcluded}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition disabled:opacity-20 cursor-pointer"
              title={`Move to Bottom (#${totalOutfits})`}
            >
              <ChevronsDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
