export interface RobloxUser {
  id: number;
  name: string;
  displayName: string;
  avatarUrl?: string;
}

export interface RobloxOutfitSummary {
  id: number;
  name: string;
  isEditable?: boolean;
}

export interface RobloxAssetMeta {
  position?: { X: number; Y: number; Z: number };
  rotation?: { X: number; Y: number; Z: number };
  scale?: { X: number; Y: number; Z: number };
}

export interface RobloxAsset {
  id: number;
  name: string;
  assetType: {
    id: number;
    name: string;
  };
  meta?: RobloxAssetMeta;
  isOwned?: boolean;
}

export interface RobloxBodyColors {
  headColorId: number;
  torsoColorId: number;
  rightArmColorId: number;
  leftArmColorId: number;
  rightLegColorId: number;
  leftLegColorId: number;
}

export interface RobloxScale {
  height: number;
  width: number;
  head: number;
  depth: number;
  proportion: number;
  bodyType: number;
}

export interface RobloxOutfitDetail {
  id: number;
  name: string;
  assets: RobloxAsset[];
  bodyColors: RobloxBodyColors;
  bodyColor3s?: Record<string, string>;
  scale: RobloxScale;
  playerAvatarType: "R6" | "R15" | string;
  isEditable?: boolean;
  missingAssetIds?: number[];
}

export interface ArrangedOutfit {
  id: number;
  name: string;
  thumbnailUrl?: string;
  details?: RobloxOutfitDetail;
  originalIndex: number;
  currentIndex: number;
  isExcluded?: boolean;
  isLoadingDetails?: boolean;
  isLoaded?: boolean;
  hasMissingItems?: boolean;
}

export interface ExportManifest {
  version: "1.0.0";
  source: "Roblox Avatar Manager" | "Roblox Avatar Arranger";
  exportedAt: string;
  user: {
    id: number;
    name: string;
    displayName: string;
  };
  totalOutfits: number;
  outfits: Array<{
    id: number;
    name: string;
    playerAvatarType: string;
    bodyColors: RobloxBodyColors;
    bodyColor3s?: Record<string, string>;
    scale: RobloxScale;
    assetIds: number[];
    assets?: RobloxAsset[];
    thumbnailUrl?: string;
    orderIndex: number;
  }>;
}

export interface DryRunPlanItem {
  step: number;
  phase: "backup" | "delete" | "create";
  outfitId: number;
  outfitName: string;
  orderNumber?: number;
  description: string;
}

export interface DryRunReport {
  isValid: boolean;
  userValidated: boolean;
  csrfValidated: boolean;
  outfitsCount: number;
  detailsReadyCount: number;
  estimatedSeconds: number;
  warnings: string[];
  plan: DryRunPlanItem[];
}

export interface ExecutionLogEntry {
  id: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
}

export interface ExecutionState {
  status: "idle" | "preparing" | "deleting" | "creating" | "completed" | "error" | "paused";
  currentStep: number;
  totalSteps: number;
  percent: number;
  currentItemName: string;
  currentAction: string;
  logs: ExecutionLogEntry[];
  failedOutfits: Array<{ outfit: ArrangedOutfit; error: string }>;
  successCount: number;
}
