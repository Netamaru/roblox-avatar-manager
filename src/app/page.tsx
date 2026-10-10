"use client";

import BulkDeleteModal from "@/components/BulkDeleteModal";
import CookieModal from "@/components/CookieModal";
import DryRunModal from "@/components/DryRunModal";
import ExecutionModal from "@/components/ExecutionModal";
import ExportImportModal from "@/components/ExportImportModal";
import HelpModal from "@/components/HelpModal";
import Navbar from "@/components/Navbar";
import OutfitCard from "@/components/OutfitCard";
import OutfitDetailModal from "@/components/OutfitDetailModal";
import PatchOutfitModal from "@/components/PatchOutfitModal";
import { extractOutfitColors } from "@/lib/roblox-colors";
import { ArrangedOutfit, RobloxUser } from "@/types/roblox";
import {
  AlertTriangle,
  ArrowUpDown,
  EyeOff,
  KeyRound,
  LayoutGrid,
  List,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

export default function HomePage() {
  const [cookie, setCookie] = useState("");
  const [user, setUser] = useState<RobloxUser | null>(null);
  const [outfits, setOutfits] = useState<ArrangedOutfit[]>([]);
  const [isLoadingOutfits, setIsLoadingOutfits] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterIssuesOnly, setFilterIssuesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [dragState, setDragState] = useState<{
    draggedId: number | null;
    overId: number | null;
    position: "before" | "after" | null;
  }>({
    draggedId: null,
    overId: null,
    position: null,
  });
  const draggedIdRef = useRef<number | null>(null);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [exportImportTab, setExportImportTab] = useState<"export" | "import">(
    "export",
  );
  const [isDryRunOpen, setIsDryRunOpen] = useState(false);
  const [isExecutionOpen, setIsExecutionOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [inspectingOutfit, setInspectingOutfit] =
    useState<ArrangedOutfit | null>(null);
  const [patchingOutfit, setPatchingOutfit] =
    useState<ArrangedOutfit | null>(null);
  const [executionDelay, setExecutionDelay] = useState(1.5);

  useEffect(() => {
    const savedCookie =
      localStorage.getItem("roblox_avatar_manager_cookie") ||
      localStorage.getItem("roblox_arranger_cookie");
    if (savedCookie) {
      handleAuthWithCookie(savedCookie, false);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && draggedIdRef.current !== null) {
        draggedIdRef.current = null;
        setDragState({ draggedId: null, overId: null, position: null });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleAuthWithCookie = async (
    rawCookie: string,
    save = true,
  ): Promise<boolean> => {
    setAuthError(null);
    setIsLoadingOutfits(true);

    try {
      const authRes = await fetch("/api/roblox/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie: rawCookie }),
      });

      const authData = await authRes.json();
      if (!authRes.ok)
        throw new Error(authData.error || "Failed to verify account.");

      setCookie(rawCookie);
      setUser(authData.user);
      if (save) {
        localStorage.setItem("roblox_avatar_manager_cookie", rawCookie);
      }

      const outfitRes = await fetch("/api/roblox/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie: rawCookie, userId: authData.user.id }),
      });

      const outfitData = await outfitRes.json();
      if (!outfitRes.ok)
        throw new Error(outfitData.error || "Failed to load outfits.");

      const initialOutfits: ArrangedOutfit[] = outfitData.outfits.map(
        (o: any, idx: number) => ({
          ...o,
          originalIndex: idx,
          currentIndex: idx,
        }),
      );

      setOutfits(initialOutfits);
      setIsLoadingOutfits(false);

      fetchFullDetailsInBackground(rawCookie, initialOutfits);
      return true;
    } catch (err: any) {
      setAuthError(err.message);
      setIsLoadingOutfits(false);
      return false;
    }
  };

  const fetchFullDetailsInBackground = async (
    activeCookie: string,
    items: ArrangedOutfit[],
  ) => {
    const missing = items.filter((o) => !o.details);
    if (missing.length === 0) return;

    try {
      const batchRes = await fetch("/api/roblox/outfit-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cookie: activeCookie,
          userId: user?.id,
          outfitIds: missing.map((m) => m.id),
        }),
      });

      if (batchRes.ok) {
        const json = await batchRes.json();
        const detailsMap = json.details || {};
        setOutfits((prev) =>
          prev.map((item) => {
            const detail = detailsMap[item.id] || item.details;
            return {
              ...item,
              details: detail,
              hasMissingItems: (detail?.missingAssetIds?.length ?? 0) > 0,
            };
          }),
        );
      }
    } catch (err) {
      console.warn("Background fetch details failed", err);
    }
  };

  const handleDisconnect = () => {
    setUser(null);
    setCookie("");
    setOutfits([]);
    localStorage.removeItem("roblox_avatar_manager_cookie");
    localStorage.removeItem("roblox_arranger_cookie");
  };

  // Drag and drop - ID based & zero mid-flight layout thrashing
  const handleDragStart = (e: React.DragEvent, id: number) => {
    draggedIdRef.current = id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id.toString());
    setDragState({
      draggedId: id,
      overId: null,
      position: null,
    });
  };

  const handleDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const sourceId = draggedIdRef.current;
    if (!sourceId || sourceId === targetId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    let position: "before" | "after";

    if (viewMode === "grid") {
      const midX = rect.left + rect.width / 2;
      position = e.clientX < midX ? "before" : "after";
    } else {
      const midY = rect.top + rect.height / 2;
      position = e.clientY < midY ? "before" : "after";
    }

    if (dragState.overId !== targetId || dragState.position !== position) {
      setDragState({
        draggedId: sourceId,
        overId: targetId,
        position,
      });
    }
  };

  const handleDragEnd = () => {
    draggedIdRef.current = null;
    setDragState({
      draggedId: null,
      overId: null,
      position: null,
    });
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    const sourceId = draggedIdRef.current;
    const position = dragState.position || "before";

    draggedIdRef.current = null;
    setDragState({
      draggedId: null,
      overId: null,
      position: null,
    });

    if (!sourceId || sourceId === targetId) return;

    setOutfits((prev) => {
      const sourceIndex = prev.findIndex((o) => o.id === sourceId);
      const targetIndex = prev.findIndex((o) => o.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;

      const next = [...prev];
      const [movedItem] = next.splice(sourceIndex, 1);

      let insertIndex = next.findIndex((o) => o.id === targetId);
      if (insertIndex === -1) return prev;

      if (position === "after") {
        insertIndex += 1;
      }

      next.splice(insertIndex, 0, movedItem);
      return next.map((item, idx) => ({ ...item, currentIndex: idx }));
    });
  };

  const scrollLockRef = useRef<number | null>(null);

  useEffect(() => {
    if (scrollLockRef.current !== null) {
      const targetY = scrollLockRef.current;
      window.scrollTo({ top: targetY, behavior: "instant" });
      scrollLockRef.current = null;
    }
  }, [outfits]);

  const moveOutfitById = (outfitId: number, targetIndex: number) => {
    if (typeof window !== "undefined") {
      scrollLockRef.current = window.scrollY;
    }

    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }

    setOutfits((prev) => {
      const fromIndex = prev.findIndex((o) => o.id === outfitId);
      if (fromIndex === -1) return prev;
      const clampedTarget = Math.max(0, Math.min(prev.length - 1, targetIndex));
      if (fromIndex === clampedTarget) return prev;

      const updated = [...prev];
      const [item] = updated.splice(fromIndex, 1);
      updated.splice(clampedTarget, 0, item);
      return updated.map((it, idx) => ({ ...it, currentIndex: idx }));
    });

    if (typeof window !== "undefined") {
      const savedY = window.scrollY;
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedY, behavior: "instant" });
      });
    }
  };

  const handleMoveToTop = (id: number) => moveOutfitById(id, 0);
  const handleMoveToBottom = (id: number) =>
    moveOutfitById(id, outfits.length - 1);
  const handleMoveUp = (id: number) => {
    const idx = outfits.findIndex((o) => o.id === id);
    if (idx > 0) moveOutfitById(id, idx - 1);
  };
  const handleMoveDown = (id: number) => {
    const idx = outfits.findIndex((o) => o.id === id);
    if (idx !== -1 && idx < outfits.length - 1) moveOutfitById(id, idx + 1);
  };
  const handleMoveToPosition = (id: number, pos1Based: number) => {
    if (isNaN(pos1Based)) return;
    moveOutfitById(id, pos1Based - 1);
  };

  const handleToggleExclude = (id: number) => {
    setOutfits((prev) =>
      prev.map((o) => (o.id === id ? { ...o, isExcluded: !o.isExcluded } : o)),
    );
  };

  const handleReverseOrder = () => {
    setOutfits((prev) => {
      const reversed = [...prev].reverse();
      return reversed.map((item, idx) => ({ ...item, currentIndex: idx }));
    });
  };

  const handleResetOrder = () => {
    setOutfits((prev) => {
      const sorted = [...prev].sort(
        (a, b) => a.originalIndex - b.originalIndex,
      );
      return sorted.map((item, idx) => ({ ...item, currentIndex: idx }));
    });
  };

  const handleSortAZ = () => {
    setOutfits((prev) => {
      const sorted = [...prev].sort((a, b) => a.name.localeCompare(b.name));
      return sorted.map((item, idx) => ({ ...item, currentIndex: idx }));
    });
  };

  const handleRemoveActiveFromList = () => {
    if (activeCount === 0) return;
    const ok = window.confirm(
      `Remove ${activeCount} active outfit${activeCount === 1 ? "" : "s"} from the local list view? Outfits in your Roblox account will NOT be deleted.`,
    );
    if (!ok) return;
    setOutfits((prev) => {
      const remaining = prev.filter((o) => o.isExcluded);
      return remaining.map((item, idx) => ({
        ...item,
        currentIndex: idx,
        originalIndex: idx,
      }));
    });
  };

  const handleReloadFromRoblox = () => {
    if (!cookie) return;
    handleAuthWithCookie(cookie, false);
  };

  const handleDownloadBackup = () => {
    const manifest = {
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
          assetIds: item.details?.assets
            ? item.details.assets.map((a) => a.id)
            : [],
          assets: item.details?.assets || [],
          thumbnailUrl: item.thumbnailUrl,
          orderIndex: index,
        };
      }),
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: "application/json",
    });
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

  const handleOutfitPatched = (updatedOutfit: ArrangedOutfit) => {
    setOutfits((prev) =>
      prev.map((o) => (o.id === updatedOutfit.id ? { ...o, ...updatedOutfit } : o))
    );
    if (inspectingOutfit && inspectingOutfit.id === updatedOutfit.id) {
      setInspectingOutfit(updatedOutfit);
    }
  };

  const handleImportOutfits = (
    imported: ArrangedOutfit[],
    replace: boolean,
  ) => {
    if (replace) {
      setOutfits(
        imported.map((item, idx) => ({
          ...item,
          currentIndex: idx,
          originalIndex: idx,
        })),
      );
    } else {
      setOutfits((prev) => {
        const merged = [...prev, ...imported];
        return merged.map((item, idx) => ({
          ...item,
          currentIndex: idx,
          originalIndex: idx,
        }));
      });
    }
  };

  const missingOutfitsCount = useMemo(
    () =>
      outfits.filter(
        (o) =>
          o.hasMissingItems ||
          (o.details?.missingAssetIds && o.details.missingAssetIds.length > 0),
      ).length,
    [outfits],
  );

  const activeInspectingOutfit = useMemo(() => {
    if (!inspectingOutfit) return null;
    return outfits.find((o) => o.id === inspectingOutfit.id) || inspectingOutfit;
  }, [inspectingOutfit, outfits]);

  const filteredOutfits = useMemo(() => {
    return outfits.filter((o) => {
      const matchesSearch = o.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (filterIssuesOnly) {
        return (
          o.hasMissingItems ||
          (o.details?.missingAssetIds && o.details.missingAssetIds.length > 0)
        );
      }
      return true;
    });
  }, [outfits, searchQuery, filterIssuesOnly]);

  const hasOrderChanged = outfits.some((o, i) => o.originalIndex !== i);
  const activeCount = outfits.filter((o) => !o.isExcluded).length;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Navbar */}
      <Navbar
        user={user}
        outfitsCount={outfits.length}
        onOpenAuth={() => setIsAuthOpen(true)}
        onDisconnect={handleDisconnect}
        onOpenExport={() => {
          setExportImportTab("export");
          setIsExportImportOpen(true);
        }}
        onOpenImport={() => {
          setExportImportTab("import");
          setIsExportImportOpen(true);
        }}
        onOpenDryRun={() => setIsDryRunOpen(true)}
        onOpenExecution={() => setIsExecutionOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onResetOrder={handleResetOrder}
        hasOrderChanged={hasOrderChanged}
      />

      {/* Main Container */}
      <main
        className={`flex-1 w-full mx-auto px-4 sm:px-6 ${
          user ? "max-w-7xl py-6" : "flex items-center justify-center py-12"
        }`}
      >
        {user ? (
          /* CONNECTED WORKSPACE */
          <div className="space-y-5">
            {/* Account & Stats Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
              <div className="flex items-center gap-3.5">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-800 shrink-0 ring-1 ring-zinc-700">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.name}
                      fill
                      className="object-cover"
                      unoptimized
                      loading="eager"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-200 font-bold text-sm">
                      {user.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-white">
                      {user.displayName}
                    </span>
                    <span className="text-sm text-zinc-400 font-mono">
                      @{user.name}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 mt-0.5">
                    <strong className="text-white font-semibold">{outfits.length}</strong> outfits total •{" "}
                    <strong className="text-sky-400 font-semibold">{activeCount}</strong> active
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {outfits.length !== activeCount && (
                  <button
                    type="button"
                    onClick={handleReloadFromRoblox}
                    className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition cursor-pointer"
                    title="Reload all original outfits from your Roblox account"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">Reload Original</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRemoveActiveFromList}
                  disabled={activeCount === 0}
                  className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition disabled:opacity-40 cursor-pointer"
                  title="Remove active outfits from local list view only (does not delete from Roblox)"
                >
                  <EyeOff className="w-4 h-4 text-zinc-400" />
                  <span>Remove from List ({activeCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteOpen(true)}
                  disabled={activeCount === 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-200 hover:text-white bg-red-950/70 hover:bg-red-900/90 border border-red-800/80 rounded-lg transition disabled:opacity-40 shadow-sm cursor-pointer"
                  title="Permanently delete active outfits directly from your Roblox account"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>Delete from Roblox ({activeCount})</span>
                </button>
              </div>
            </div>

            {/* Toolbar: Search, Sorters, View Switcher */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search outfits by name..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm text-zinc-100 bg-zinc-900/90 border border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-500 placeholder:text-zinc-500 transition"
                />
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleReverseOrder}
                  className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition"
                  title="Reverse sequence"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  <span>Reverse Order</span>
                </button>
                <button
                  onClick={handleSortAZ}
                  className="px-3.5 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition"
                >
                  Sort A-Z
                </button>
                <button
                  type="button"
                  onClick={() => setFilterIssuesOnly((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg border transition cursor-pointer ${
                    filterIssuesOnly
                      ? "bg-amber-500/20 border-amber-500/80 text-amber-200 shadow-sm"
                      : missingOutfitsCount > 0
                      ? "bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-900/50 hover:text-amber-100"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  }`}
                  title={
                    missingOutfitsCount > 0
                      ? `Filter ${missingOutfitsCount} outfits with deleted / unwearable items`
                      : "No outfits with missing items"
                  }
                >
                  <AlertTriangle
                    className={`w-4 h-4 ${
                      filterIssuesOnly || missingOutfitsCount > 0
                        ? "text-amber-400"
                        : "text-zinc-500"
                    }`}
                  />
                  <span>Needs Fix ({missingOutfitsCount})</span>
                </button>

                <div className="flex items-center bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-md transition ${
                      viewMode === "grid"
                        ? "bg-zinc-800 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                    title="Grid view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-md transition ${
                      viewMode === "list"
                        ? "bg-zinc-800 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Missing Items Notice Banner */}
            {missingOutfitsCount > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-700/60 bg-amber-950/30 text-amber-200 shadow-sm animate-in fade-in">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm">
                    <p className="font-semibold text-amber-300">
                      Notice: Detected {missingOutfitsCount} outfit{missingOutfitsCount === 1 ? "" : "s"} with deleted or unwearable items in the Roblox catalog.
                    </p>
                    <p className="text-amber-300/80 mt-0.5 text-xs leading-relaxed">
                      Outfits highlighted with an amber border (&ldquo;Needs Fix&rdquo;) contain items that have been moderated or removed by Roblox. Our reordering process automatically skips missing items so your outfits are safely recreated without HTTP 400 errors.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setFilterIssuesOnly((prev) => !prev)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                      filterIssuesOnly
                        ? "bg-amber-500 text-zinc-950 border-amber-400 font-bold"
                        : "bg-amber-900/60 hover:bg-amber-800 text-amber-100 border-amber-700/80"
                    }`}
                  >
                    {filterIssuesOnly ? "Show All Outfits" : `View ${missingOutfitsCount} Outfits`}
                  </button>
                </div>
              </div>
            )}

            {/* Active Drag Hint Banner */}
            {dragState.draggedId && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-sky-950/70 border border-sky-500/50 rounded-xl text-sm text-sky-200 shadow-md animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                  <span>
                    Moving{" "}
                    <strong className="text-white font-semibold">
                      {outfits.find((o) => o.id === dragState.draggedId)?.name}
                    </strong>{" "}
                    — Drag over any card edge to position before or after.
                  </span>
                </div>
                <span className="text-xs text-sky-300 font-mono">
                  Press Esc to cancel
                </span>
              </div>
            )}

            {/* Outfits List / Grid */}
            {isLoadingOutfits ? (
              <div className="py-24 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
                <p className="text-sm font-medium text-zinc-300">
                  Loading Roblox avatar outfits...
                </p>
              </div>
            ) : filteredOutfits.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-zinc-800 rounded-xl p-8">
                <p className="text-sm text-zinc-400 font-medium">
                  No matching outfits found.
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-2.5 text-sm font-medium text-sky-400 hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              <div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 [overflow-anchor:none]"
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragState((prev) => ({
                      ...prev,
                      overId: null,
                      position: null,
                    }));
                  }
                }}
              >
                {filteredOutfits.map((outfit) => {
                  const actualIndex = outfits.findIndex(
                    (o) => o.id === outfit.id,
                  );
                  const isDragging = dragState.draggedId === outfit.id;
                  const dropIndicator =
                    dragState.overId === outfit.id ? dragState.position : null;

                  return (
                    <OutfitCard
                      key={outfit.id}
                      outfit={outfit}
                      index={actualIndex}
                      actualIndex={actualIndex}
                      totalOutfits={outfits.length}
                      isCompact={false}
                      onMoveToTop={handleMoveToTop}
                      onMoveToBottom={handleMoveToBottom}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                      onMoveToPosition={handleMoveToPosition}
                      onInspect={(o) => setInspectingOutfit(o)}
                      onToggleExclude={handleToggleExclude}
                      onPatch={(o) => setPatchingOutfit(o)}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                      onDrop={handleDrop}
                      isDragging={isDragging}
                      dropIndicator={dropIndicator}
                    />
                  );
                })}
              </div>
            ) : (
              <div
                className="space-y-1.5 [overflow-anchor:none]"
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragState((prev) => ({
                      ...prev,
                      overId: null,
                      position: null,
                    }));
                  }
                }}
              >
                {filteredOutfits.map((outfit) => {
                  const actualIndex = outfits.findIndex(
                    (o) => o.id === outfit.id,
                  );
                  const isDragging = dragState.draggedId === outfit.id;
                  const dropIndicator =
                    dragState.overId === outfit.id ? dragState.position : null;

                  return (
                    <OutfitCard
                      key={outfit.id}
                      outfit={outfit}
                      index={actualIndex}
                      actualIndex={actualIndex}
                      totalOutfits={outfits.length}
                      isCompact={true}
                      onMoveToTop={handleMoveToTop}
                      onMoveToBottom={handleMoveToBottom}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                      onMoveToPosition={handleMoveToPosition}
                      onInspect={(o) => setInspectingOutfit(o)}
                      onToggleExclude={handleToggleExclude}
                      onPatch={(o) => setPatchingOutfit(o)}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                      onDrop={handleDrop}
                      isDragging={isDragging}
                      dropIndicator={dropIndicator}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* SIMPLE CLEAN LOGIN CARD */
          <div className="w-full max-w-lg p-8 rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-md shadow-2xl space-y-6 text-center">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Roblox Avatar Manager
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed max-w-md mx-auto">
                Easily reorder, inspect, and manage your Roblox avatar costumes with seamless drag-and-drop.
              </p>
            </div>

            <div className="pt-1">
              <button
                onClick={() => setIsAuthOpen(true)}
                className="w-full flex items-center justify-center gap-2.5 px-5 py-3 text-sm font-semibold text-zinc-950 bg-white hover:bg-zinc-200 rounded-xl transition shadow-md cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Enter Cookie (.ROBLOSECURITY)</span>
              </button>
            </div>

            <div className="pt-4 border-t border-zinc-800/80 text-xs text-zinc-400 space-y-2.5 text-left">
              <p className="text-zinc-200 font-semibold text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Safety Guarantee:</span>
              </p>
              <ul className="space-y-1.5 text-zinc-400 bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-800/50">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Automatic JSON backup downloaded before any outfit is deleted</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Pre-flight test run to verify connectivity and outfit asset health</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Cookie processed securely in your browser session</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-800/80 py-4 text-center text-sm text-zinc-500">
        <a
          href="https://github.com/Netamaru/roblox-avatar-manager"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition font-medium text-xs sm:text-sm"
        >
          <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            />
          </svg>
          <span>Source Code</span>
        </a>
      </footer>

      {/* Modals */}
      <CookieModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSubmitCookie={(c) => handleAuthWithCookie(c, true)}
        isLoading={isLoadingOutfits}
        errorMessage={authError}
      />

      {activeInspectingOutfit && (
        <OutfitDetailModal
          outfit={activeInspectingOutfit}
          onClose={() => setInspectingOutfit(null)}
          onPatch={(o) => {
            setInspectingOutfit(null);
            setPatchingOutfit(o);
          }}
        />
      )}

      <ExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
        defaultTab={exportImportTab}
        outfits={outfits}
        user={user}
        onImportOutfits={handleImportOutfits}
        onFetchMissingDetails={async () => {
          if (cookie) await fetchFullDetailsInBackground(cookie, outfits);
        }}
      />

      {patchingOutfit && (
        <PatchOutfitModal
          isOpen={!!patchingOutfit}
          onClose={() => setPatchingOutfit(null)}
          outfit={outfits.find((o) => o.id === patchingOutfit.id) || patchingOutfit}
          cookie={cookie}
          userId={user?.id}
          onOutfitPatched={handleOutfitPatched}
        />
      )}

      <DryRunModal
        isOpen={isDryRunOpen}
        onClose={() => setIsDryRunOpen(false)}
        outfits={outfits}
        user={user}
        cookie={cookie}
        onProceedToExecute={(delay) => {
          setExecutionDelay(delay);
          setIsExecutionOpen(true);
        }}
        onDownloadBackup={handleDownloadBackup}
      />

      <ExecutionModal
        isOpen={isExecutionOpen}
        onClose={() => setIsExecutionOpen(false)}
        outfits={outfits}
        user={user}
        cookie={cookie}
        delaySeconds={executionDelay}
        onDownloadBackup={handleDownloadBackup}
        onExecutionComplete={() => {
          if (cookie) {
            handleAuthWithCookie(cookie, false);
          } else {
            setOutfits((prev) =>
              prev.map((item, idx) => ({
                ...item,
                originalIndex: idx,
                currentIndex: idx,
              })),
            );
          }
        }}
      />

      <BulkDeleteModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        outfits={outfits}
        user={user}
        cookie={cookie}
        delaySeconds={executionDelay}
        onDownloadBackup={handleDownloadBackup}
        onDeletionComplete={() => {
          if (cookie) handleAuthWithCookie(cookie, false);
        }}
      />

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
