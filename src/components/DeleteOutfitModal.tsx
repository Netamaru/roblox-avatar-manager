"use client";

import { getErrorMessage } from "@/lib/error-message";
import { extractOutfitColors } from "@/lib/roblox-colors";
import { hdThumbnailUrl } from "@/lib/roblox-thumbnails";
import { ArrangedOutfit, RobloxUser } from "@/types/roblox";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface DeleteOutfitModalProps {
  isOpen: boolean;
  onClose: () => void;
  outfit: ArrangedOutfit | null;
  user: RobloxUser | null;
  cookie: string;
  onDeleted: (outfitId: number) => void;
}

export default function DeleteOutfitModal({
  isOpen,
  onClose,
  outfit,
  user,
  cookie,
  onDeleted,
}: DeleteOutfitModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !outfit) return null;

  const downloadOutfitBackup = () => {
    const colors = extractOutfitColors(outfit.details || outfit);
    const manifest = {
      version: "1.0.0",
      source: "Roblox Avatar Manager",
      exportedAt: new Date().toISOString(),
      user: {
        id: user?.id || 0,
        name: user?.name || "Anonymous",
        displayName: user?.displayName || "Player",
      },
      totalOutfits: 1,
      outfits: [
        {
          id: outfit.id,
          name: outfit.name,
          playerAvatarType: outfit.details?.playerAvatarType || "R15",
          bodyColors: colors.bodyColors,
          bodyColor3s: colors.bodyColor3s,
          scale: outfit.details?.scale || {
            height: 1,
            width: 1,
            head: 1,
            depth: 1,
            proportion: 0,
            bodyType: 0,
          },
          assetIds: outfit.details?.assets?.map((asset) => asset.id) || [],
          assets: outfit.details?.assets || [],
          thumbnailUrl: outfit.thumbnailUrl,
          orderIndex: 0,
        },
      ],
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    const safeName = outfit.name.replace(/[^\w.-]+/g, "-").slice(0, 40);
    link.href = url;
    link.download = `roblox-outfit-${safeName || outfit.id}-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    if (isDeleting) return;
    setErrorMessage(null);
    onClose();
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      downloadOutfitBackup();

      const res = await fetch("/api/roblox/delete-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie, outfitId: outfit.id }),
      });
      const json = (await res.json()) as {
        error?: string;
        alreadyDeleted?: boolean;
      };
      if (!res.ok && !json.alreadyDeleted) {
        throw new Error(
          json.error || `Failed to delete outfit (HTTP ${res.status})`,
        );
      }

      onDeleted(outfit.id);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to delete outfit."));
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-zinc-950 border border-red-900/60 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-900/40 bg-red-950/25">
          <div className="flex items-center gap-2.5">
            <Trash2 className="w-5 h-5 text-red-400" />
            <h3 className="text-base font-bold text-red-200 tracking-tight">
              Delete Avatar from Roblox
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm">
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/70 flex items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-zinc-200 leading-relaxed">
              This permanently deletes{" "}
              <strong className="text-white">{outfit.name}</strong> from your
              Roblox account. A JSON backup of this avatar will download first.
            </p>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/60">
            <div className="relative w-14 h-14 rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0">
              {outfit.thumbnailUrl ? (
                <Image
                  src={hdThumbnailUrl(outfit.thumbnailUrl)}
                  alt={outfit.name}
                  fill
                  className="object-contain p-1"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-zinc-800" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-zinc-100 truncate">
                {outfit.name}
              </p>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                #{outfit.id}
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-lg transition disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmDelete()}
              disabled={isDeleting || !cookie}
              className="flex items-center gap-2 px-5 py-2.5 font-semibold text-sm text-white bg-red-600 hover:bg-red-500 disabled:opacity-40 rounded-xl transition shadow-md cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Backup &amp; Delete</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
