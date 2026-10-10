# Roblox Avatar Manager

A modern, full-featured web application to manage, inspect, backup, and reorder your Roblox saved outfits (costumes).

Roblox organizes outfits strictly by creation date: any newly saved costume is placed at the top (rank #1), with no built-in way to change their sequence. **Roblox Avatar Manager** solves this limitation through an automated, safe **reverse-recreation technique**, giving you full drag-and-drop control over your avatar collection.

---

## Table of Contents

- [How It Works (The Reordering Mechanism)](#how-it-works-the-reordering-mechanism)
  - [Why Direct Creation Fails: The Two-Phase Create & PATCH Pipeline](#why-direct-creation-fails-the-two-phase-create--patch-pipeline)
- [Key Features](#key-features)
- [Self-Healing & Deleted Item Handling ("Needs Fix")](#self-healing--deleted-item-handling-needs-fix)
- [Safety & Pre-Flight Diagnostics](#safety--pre-flight-diagnostics)
- [Getting Started](#getting-started)
- [How to Retrieve Your `.ROBLOSECURITY` Cookie](#how-to-retrieve-your-roblosecurity-cookie)
- [Export & Import JSON Format](#export--import-json-format)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Security & Disclaimer](#security--disclaimer)
- [License](#license)

---

## How It Works (The Reordering Mechanism)

Because the Roblox Avatar API does not provide an endpoint to update costume positions or swap ranks, this application utilizes an automated **Recreate in Reverse Sequence** algorithm:

```
[Target Order]
1. Valkyrie Outfit (Top)
2. Classic Noob
3. Cyberpunk Neon (Bottom)

        ↓ Execution Sequence ↓

Step 1: Download full metadata & assets of all outfits to local memory.
Step 2: Automatically generate and trigger a JSON backup download.
Step 3: Delete existing outfits from your Roblox account (Phase 1).
Step 4: Recreate outfits bottom-to-top (Phase 2):
        • Recreate "Cyberpunk Neon" → initially lands at #1
        • Recreate "Classic Noob"   → lands at #1, pushes "Cyberpunk Neon" to #2
        • Recreate "Valkyrie Outfit" → lands at #1, pushes others down to #2 and #3!
```

By creating outfits from bottom to top, earlier created items are progressively shifted downwards, perfectly achieving your desired custom sequence.

---

### Why Direct Creation Fails: The Two-Phase Create & PATCH Pipeline

A common technical pitfall with Roblox's API is that **creation endpoints (`POST /v1/outfits/create` or `POST /v4/outfits/create`) do NOT accept 3D accessory adjustments or hex body colors (`bodyColor3s`)**:
- When recreating an outfit using standard creation requests, Roblox only records bare asset IDs.
- Any fine-tuned 3D accessory adjustments—such as hat tilt, accessory scaling, shoulder offsets (`meta.position`, `rotation`, `scale`), and precise RGB skin tones—are **completely discarded** by Roblox's create endpoint!

To preserve 100% of your avatar customizations without losing your accessory placements, **Roblox Avatar Manager** implements a specialized 3-stage pipeline:

```
┌────────────────────────────────────────────────────────┐
│ Stage 1: Container Creation                            │
│ POST https://avatar.roblox.com/v4/outfits/create       │
│ • Allocates a new empty outfit container on Roblox.   │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Stage 2: Fetch Newly Generated Outfit ID               │
│ GET https://avatar.roblox.com/v1/users/{id}/outfits    │
│ • Immediately captures the newly generated outfit ID.  │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Stage 3: Full Metadata Injection via PATCH             │
│ PATCH https://avatar.roblox.com/v3/outfits/{outfitId}  │
│ • Injects full 3D meta: position, rotation, scale.     │
│ • Applies exact bodyColor3s and rig scale proportions. │
│ • Preserves all fine-tuned accessory coordinates!      │
└────────────────────────────────────────────────────────┘
```

If Roblox rejects the `PATCH` payload with `HTTP 400 (Code: 5, "Asset is not wearable by you")` due to deleted/moderated items, our **Self-Healing Engine** automatically strips the offending asset IDs and retries the `PATCH` request in real time.

---

## Key Features

### 1. Intuitive Ordering & Layout Controls
- **Drag & Drop**: Seamless drag-and-drop reordering with visual insertion indicators (`before` / `after`).
- **One-Click Movement**: Dedicated buttons to move outfits directly to **Top (#1)**, **Bottom**, or **Up/Down by 1 slot**.
- **Direct Position Jump**: Click on any rank number (`#4`) to jump directly to any specified position.
- **Bulk Sorters**: Reverse sequence, alphabetical sort (A-Z), and reset back to original order.
- **View Modes**: Switch between responsive **Grid View** (with large thumbnails) and compact **List View**.
- **Exclude Outfits**: Mark specific outfits as excluded to keep them untouched during operations.

### 2. Comprehensive Outfit Inspector Modal
- **High-Definition Preview**: 1:1 square preview showcase with glowing highlights.
- **Equipped Assets Tab**: Lists all 3D accessories, clothing, animations, and custom 3D adjustment positions (`meta.position`, `rotation`, `scale`) with direct links to the Roblox catalog.
- **Body & Scaling Tab**: Visualizes exact scaling percentages (Height, Width, Head, Depth, Proportion, Body Type) and BrickColor color swatches for each body part (Head, Torso, Arms, Legs).
- **Raw JSON Tab**: Built-in code editor window with full syntax highlighting, line numbers, word-wrap toggle, clipboard copy, and `.json` download.

### 3. Bulk Management & Backup
- **Export to JSON**: Download all outfits and 3D asset metadata into a portable backup file.
- **Import from JSON**: Restore previous outfit setups or merge backups into your active workspace.
- **Bulk Deletion**: Permanently remove multiple outfits from your Roblox account in a single operation.

### 4. Individual Outfit Patching & Renaming
- **Per-Card Quick Patch**: Directly update or rename any specific outfit without having to recreate the entire collection.
- **Customizable Name**: Rename outfits on the fly or preserve the existing name.
- **JSON Input / Rename-Only Mode**: Paste an outfit JSON payload to update assets, proportions, scales, and body colors, or leave the JSON input empty to quickly rename the outfit without altering its equipment.
- **Live Preview Swatches**: Interactive preview displaying asset count, 6-part skin color swatches (`bodyColor3s`), avatar rig type (R6/R15), and scaling dimensions.

---

## Self-Healing & Deleted Item Handling ("Needs Fix")

### The Problem
When Roblox deletes or moderates an accessory or asset from the catalog, attempting to recreate that outfit via the official Roblox API normally fails with:
```
HTTP 400 Bad Request
{ "code": 5, "message": "Asset is not wearable by you" }
```

### The Solution: Automated Detection & Recovery
1. **Live Ownership Verification**: During background detail synchronization, the application checks each asset against the Roblox Inventory API to detect items that are deleted, moderated, or unwearable.
2. **Visual Badges & Highlighting**:
   - Outfits containing problematic assets receive an amber glow/border in the grid and list views.
   - A **`Needs Fix ({count})`** badge appears on the outfit thumbnail.
   - A dedicated **`Needs Fix`** button in the toolbar filters your collection down to affected avatars in one click.
   - The Outfit Inspector highlights exact unwearable assets with a `Deleted / Unwearable` tag.
3. **Automated Self-Healing Retry**:
   - During execution, the server detects unwearable assets.
   - If Roblox rejects an outfit with error code 5, the app automatically strips the moderated asset IDs from the payload and retries immediately.
   - The outfit is successfully created with all remaining valid items, preventing execution failure.

---

## Safety & Pre-Flight Diagnostics

Before executing any deletion or creation, the app offers a **Pre-Flight Test Run (Dry Run)** modal:
- **Connectivity Checks**: Verifies `.ROBLOSECURITY` cookie authenticity and CSRF token retrieval.
- **Asset Health Audit**: Warns if any outfits are still loading details or contain deleted assets.
- **Step-by-Step Simulation**: Displays the exact 2-phase sequence of delete and create actions.
- **Customizable Rate-Limit Delay**: Adjust the request delay slider (from `1.0s` up to `3.0s`, recommended `1.5s`) to prevent HTTP 429 rate limiting.
- **Mandatory Backup**: An automated backup download is triggered before any outfit is deleted.

---

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (recommended) or [Node.js](https://nodejs.org/) v18+

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Netamaru/roblox-avatar-manager.git
   cd roblox-avatar-manager
   ```

2. **Install dependencies**:
   ```bash
   bun install
   # or
   npm install
   ```

3. **Start the local development server**:
   ```bash
   bun run dev
   # or
   npm run dev
   ```

4. **Open the web application**:
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## How to Retrieve Your `.ROBLOSECURITY` Cookie

To communicate with the Roblox Avatar API on your behalf, the app requires your `.ROBLOSECURITY` session cookie:

1. Open [roblox.com](https://www.roblox.com) and log into your account.
2. Press `F12` (or right-click and select **Inspect**) to open Developer Tools.
3. Go to the **Application** tab (Chrome/Edge) or **Storage** tab (Firefox).
4. In the left sidebar, expand **Cookies** and click `https://www.roblox.com`.
5. Find the row named **`.ROBLOSECURITY`** and copy its full value (starts with `_|WARNING:-DO-NOT-SHARE...`).
6. Paste the cookie into the **Enter Cookie** modal in the app.

> **Privacy Notice**: Your cookie is used exclusively for direct server-side requests to Roblox's official API (`avatar.roblox.com`, `inventory.roblox.com`). It is never stored on any third-party database.

---

## Export & Import JSON Format

Backups are exported in a clean, self-contained JSON manifest:

```json
{
  "version": "1.0.0",
  "source": "Roblox Avatar Manager",
  "exportedAt": "2026-10-09T12:00:00.000Z",
  "user": {
    "id": 123456789,
    "name": "RobloxPlayer",
    "displayName": "Player"
  },
  "totalOutfits": 1,
  "outfits": [
    {
      "id": 987654321,
      "name": "Cool Outfit",
      "playerAvatarType": "R15",
      "bodyColors": {
        "headColorId": 1,
        "torsoColorId": 23,
        "rightArmColorId": 1,
        "leftArmColorId": 1,
        "rightLegColorId": 1,
        "leftLegColorId": 1
      },
      "bodyColor3s": {
        "headColor3": "f8f8f8",
        "torsoColor3": "0d69ac",
        "rightArmColor3": "f8f8f8",
        "leftArmColor3": "f8f8f8",
        "rightLegColor3": "f8f8f8",
        "leftLegColor3": "f8f8f8"
      },
      "scale": {
        "height": 1.0,
        "width": 1.0,
        "head": 1.0,
        "depth": 1.0,
        "proportion": 0.0,
        "bodyType": 0.0
      },
      "assetIds": [123456, 789012],
      "thumbnailUrl": "https://tr.rbxcdn.com/...",
      "orderIndex": 0
    }
  ]
}
```

---

## Architecture & Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Custom Dark Mode palette, Glassmorphism)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Roblox APIs Utilized**:
  - `https://users.roblox.com/v1/users/authenticated` (Authentication verification)
  - `https://auth.roblox.com/v2/login` (CSRF token extraction)
  - `https://avatar.roblox.com/v1/users/{userId}/outfits` (Outfits listing)
  - `https://avatar.roblox.com/v3/outfits/{outfitId}/details` (3D metadata & asset composition)
  - `https://avatar.roblox.com/v4/outfits/create` (Initial outfit container creation)
  - `https://avatar.roblox.com/v3/outfits/{outfitId}` (`PATCH` endpoint for applying 3D accessory meta offsets, scale, and `bodyColor3s`)
  - `https://avatar.roblox.com/v1/outfits/{outfitId}/delete` (Costume deletion endpoint)
  - `https://inventory.roblox.com/v1/users/{userId}/items/0/{assetId}/is-owned` (Deleted item & ownership detection)

---

## Security & Disclaimer

- **Never share your `.ROBLOSECURITY` cookie publicly.** Anyone with this cookie has full access to your Roblox account.
- This project is an independent open-source utility and is not affiliated with, authorized, maintained, or endorsed by Roblox Corporation.
- Always review your backup files and use the **Pre-Flight Test Run** before executing large reordering operations.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
