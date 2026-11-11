#!/usr/bin/env python3
"""
Download and optimize all 36 authentic hands from nilbuild/tinyhand.
Also calculates the exact tip coordinates (tipX, tipY) for each hand.
"""

import os
import json
import urllib.request
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HANDS_DIR = os.path.join(BASE_DIR, "hands")
os.makedirs(HANDS_DIR, exist_ok=True)

# List of all 36 hands and metadata from PointerStyle.swift
TINYHAND_STYLES = [
    {"id": "lavender", "title": "Lavender toy", "ink": "#8E5AF7", "pinned": True},
    {"id": "glove", "title": "Cursor glove", "ink": "#8E5AF7", "pinned": True},
    {"id": "coral", "title": "Coral vinyl", "ink": "#FF3B30", "pinned": True},
    {"id": "plush", "title": "Plush", "ink": "#2F86F0", "pinned": True},
    {"id": "robot", "title": "Robot", "ink": "#16A87A", "pinned": True},
    {"id": "laser", "title": "Laser dot", "ink": "#FF3B30", "pinned": True},
    {"id": "pink", "title": "Bubblegum", "ink": "#EE4F98", "pinned": False},
    {"id": "blue", "title": "Sky", "ink": "#2F86F0", "pinned": False},
    {"id": "mint", "title": "Mint", "ink": "#16A87A", "pinned": False},
    {"id": "lemon", "title": "Lemon", "ink": "#F2B705", "pinned": False},
    {"id": "black", "title": "Midnight", "ink": "#1D1D21", "pinned": False},
    {"id": "chrome", "title": "Chrome", "ink": "#6B7380", "pinned": False},
    {"id": "holo", "title": "Holo", "ink": "#8E5AF7", "pinned": False},
    {"id": "fuzzy", "title": "Fuzzy", "ink": "#8E5AF7", "pinned": False},
    {"id": "wood", "title": "Wood", "ink": "#9A5E2C", "pinned": False},
    {"id": "marble", "title": "Marble", "ink": "#6B7380", "pinned": False},
    {"id": "terrazzo", "title": "Terrazzo", "ink": "#F0561D", "pinned": False},
    {"id": "glass", "title": "Glass", "ink": "#1597E5", "pinned": False},
    {"id": "jelly", "title": "Jelly", "ink": "#A33FE6", "pinned": False},
    {"id": "pastel", "title": "Pastel", "ink": "#EE4F98", "pinned": False},
    {"id": "pixel", "title": "Pixel", "ink": "#1D1D21", "pinned": False},
    {"id": "lowpoly", "title": "Low poly", "ink": "#8E5AF7", "pinned": False},
    {"id": "knit", "title": "Knit", "ink": "#8E5AF7", "pinned": False},
    {"id": "skeleton", "title": "Skeleton", "ink": "#9A5E2C", "pinned": False},
    {"id": "astro", "title": "Astronaut", "ink": "#2F86F0", "pinned": False},
    {"id": "space", "title": "Space", "ink": "#FF3B30", "pinned": False},
    {"id": "monster", "title": "Monster", "ink": "#3E9E2E", "pinned": False},
    {"id": "water", "title": "Water", "ink": "#1597E5", "pinned": False},
    {"id": "lava", "title": "Lava", "ink": "#F0561D", "pinned": False},
    {"id": "grass", "title": "Grass", "ink": "#3E9E2E", "pinned": False},
    {"id": "cactus", "title": "Cactus", "ink": "#3E9E2E", "pinned": False},
    {"id": "choco", "title": "Chocolate", "ink": "#9A5E2C", "pinned": False},
    {"id": "cloud", "title": "Cloud", "ink": "#2F86F0", "pinned": False},
    {"id": "mech", "title": "Mech", "ink": "#F0561D", "pinned": False},
    {"id": "neon", "title": "Neon", "ink": "#E0309A", "pinned": False},
    {"id": "leaf", "title": "Leaf", "ink": "#3E9E2E", "pinned": False},
    {"id": "cookie", "title": "Gingerbread", "ink": "#9A5E2C", "pinned": False},
]

measurements = {}

print("Downloading authentic nilbuild/tinyhand hands...")

for item in TINYHAND_STYLES:
    style_id = item["id"]
    if style_id == "laser":
        continue

    filename = f"hand_{style_id}.png"
    target_path = os.path.join(HANDS_DIR, filename)
    url = f"https://raw.githubusercontent.com/nilbuild/tinyhand/main/assets/{filename}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "TinyHandChrome-Downloader"})
        with urllib.request.urlopen(req) as resp:
            data = resp.read()

        # Load with PIL
        temp_raw_path = f"/tmp/{filename}"
        with open(temp_raw_path, "wb") as f:
            f.write(data)

        im = Image.open(temp_raw_path).convert("RGBA")
        w, h = im.size

        # Measure top, fist, wrist as in nilbuild/tinyhand HandAsset.swift
        counts = []
        for y in range(h):
            c = sum(1 for x in range(w) if im.getpixel((x, y))[3] > 128)
            counts.append(c)
        top = next((y for y, c in enumerate(counts) if c > 0), 0)
        searchEnd = min(h, top + int(0.45 * h))
        maxW = max(counts[top:searchEnd])
        fist = next((y for y in range(top, h) if counts[y] > 0.6 * maxW), 0)
        wrist = next((y for y in range(fist, h) if counts[y] < 0.35 * maxW), 0)

        # Crop to wrist so only the hand + cuff is kept (no baked-in stub rod)
        cropped = im.crop((0, 0, w, wrist))
        crop_w, crop_h = cropped.size

        # Measure exact fingertip on cropped image
        row_top = [x for x in range(crop_w) if cropped.getpixel((x, min(crop_h - 1, top + 2)))[3] > 128]
        tip_x = round(sum(row_top) / len(row_top) / crop_w, 4) if row_top else 0.5
        tip_y = round(top / crop_h, 4)

        # Measure rod/cuff X at bottom
        row_bottom = [x for x in range(crop_w) if cropped.getpixel((x, crop_h - 1))[3] > 128]
        cuff_x = round(sum(row_bottom) / len(row_bottom) / crop_w, 4) if row_bottom else 0.5

        aspect = round(crop_w / crop_h, 4)

        measurements[style_id] = {
            "tipX": tip_x,
            "tipY": tip_y,
            "cuffX": cuff_x,
            "cuffY": 1.0,
            "aspect": aspect,
            "cropW": crop_w,
            "cropH": crop_h
        }

        # Save cropped image with high quality
        cropped.save(target_path, "PNG", optimize=True)

        size_kb = os.path.getsize(target_path) / 1024
        print(f"✓ {style_id}: saved {filename} ({crop_w}x{crop_h}, {size_kb:.1f} KB) - Tip: ({tip_x*100:.1f}%, {tip_y*100:.1f}%)")

    except Exception as e:
        print(f"✗ Failed {style_id}: {e}")

# Save measurements and metadata as JSON
manifest_data = {
    "styles": TINYHAND_STYLES,
    "measurements": measurements
}

json_path = os.path.join(HANDS_DIR, "tinyhand_styles.json")
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(manifest_data, f, indent=2)

print(f"\nMetadata saved to {json_path}")
print("Finished syncing authentic TinyHand assets!")
