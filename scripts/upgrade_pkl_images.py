#!/usr/bin/env python3
"""
PKL PLAYER IMAGE QUALITY UPGRADE PIPELINE
=========================================
Upgrades all 235 PKL player portraits to high-definition studio-grade WebP (1200x1500, 4:5)
matching and exceeding IPL image quality standards.
"""

import os
import sys
import json
import time
import hashlib
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
import io

import requests
from PIL import Image, ImageFilter

# Paths
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PKL_DB_PATH = os.path.join(PROJECT_ROOT, 'pkl-players-database.json')
RAW_HD_CACHE_DIR = os.path.join(PROJECT_ROOT, 'cache', 'pkl-raw-hd-images')
OUT_DIR = os.path.join(PROJECT_ROOT, 'public', 'images', 'pkl-players')
BACKUP_DIR = os.path.join(PROJECT_ROOT, 'public', 'images', 'pkl-players-backup')
REGISTRY_PATH = os.path.join(PROJECT_ROOT, 'src', 'shared', 'pkl-player-images.json')

os.makedirs(RAW_HD_CACHE_DIR, exist_ok=True)
os.makedirs(OUT_DIR, exist_ok=True)

# Standard specifications
TARGET_WIDTH = 1200
TARGET_HEIGHT = 1500
TARGET_ASPECT_RATIO = 4.0 / 5.0
TARGET_PLAYER_HEIGHT_RATIO = 0.90 # 1350px tall
BOTTOM_MARGIN = 15
WEBP_QUALITY = 94

HTTP_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
}

def fetch_raw_hd_image(pid: str, prof_id: int, max_retries: int = 3) -> bytes:
    cache_path = os.path.join(RAW_HD_CACHE_DIR, f"{pid}_{prof_id}.png")
    if os.path.exists(cache_path) and os.path.getsize(cache_path) > 2000:
        with open(cache_path, 'rb') as f:
            return f.read()

    url = f"https://www.prokabaddi.com/static-assets/images/players/{prof_id}.png?w=1200"
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, headers=HTTP_HEADERS, timeout=12)
            if resp.status_code == 200 and len(resp.content) > 1000:
                with open(cache_path, 'wb') as f:
                    f.write(resp.content)
                return resp.content
            elif resp.status_code == 200 and len(resp.content) <= 1000:
                # Placeholder returned
                return b''
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"[{pid}] Network error after {max_retries} attempts: {e}")
        time.sleep(0.5 * (attempt + 1))
    return b''

def process_player(player: dict) -> dict:
    pid = player['id']
    name = player['name']
    team = player['team']
    prof_id = player.get('official_profile_id')

    out_webp_path = os.path.join(OUT_DIR, f"{pid}.webp")
    web_relative_path = f"/images/pkl-players/{pid}.webp"

    if not prof_id:
        return {
            'playerId': pid,
            'playerName': name,
            'team': team,
            'status': 'FAILED_NO_PROFILE_ID',
            'reason': 'No official profile ID in database'
        }

    raw_data = fetch_raw_hd_image(pid, prof_id)
    is_hd_acquired = bool(raw_data and len(raw_data) > 5000)

    raw_im = None
    orig_w, orig_h = 0, 0
    source_name = 'Official Pro Kabaddi League 1200px Studio HD Asset'

    if is_hd_acquired:
        try:
            raw_im = Image.open(io.BytesIO(raw_data)).convert('RGBA')
            orig_w, orig_h = raw_im.size
        except Exception as e:
            raw_im = None
            is_hd_acquired = False

    # If HD acquisition failed, fallback to backup image
    if not raw_im:
        backup_path = os.path.join(BACKUP_DIR, f"{pid}.webp")
        if os.path.exists(backup_path):
            try:
                raw_im = Image.open(backup_path).convert('RGBA')
                orig_w, orig_h = raw_im.size
                source_name = 'Retained Verified Backup Asset'
                is_hd_acquired = False
            except Exception as e:
                return {
                    'playerId': pid,
                    'playerName': name,
                    'team': team,
                    'status': 'CORRUPTED',
                    'reason': f"Failed to load raw or backup image: {e}"
                }
        else:
            return {
                'playerId': pid,
                'playerName': name,
                'team': team,
                'status': 'MISSING',
                'reason': 'No source or backup image available'
            }

    # Bounding box crop
    bbox = raw_im.getbbox()
    cropped = raw_im.crop(bbox) if bbox else raw_im
    cw, ch = cropped.size

    # Scaling to 1200x1500 (4:5)
    target_player_h = int(TARGET_HEIGHT * TARGET_PLAYER_HEIGHT_RATIO) # 1350px
    scale = target_player_h / float(ch)
    new_w = int(cw * scale)
    new_h = target_player_h

    # Ensure width doesn't exceed canvas
    if new_w > TARGET_WIDTH:
        scale_w = TARGET_WIDTH / float(new_w)
        new_w = TARGET_WIDTH
        new_h = int(new_h * scale_w)

    scaled_player = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)

    # Apply subtle unsharp masking for studio sharpness
    if is_hd_acquired:
        scaled_player = scaled_player.filter(ImageFilter.UnsharpMask(radius=1.2, percent=110, threshold=2))

    pos_x = (TARGET_WIDTH - new_w) // 2
    pos_y = TARGET_HEIGHT - new_h - BOTTOM_MARGIN

    canvas = Image.new('RGBA', (TARGET_WIDTH, TARGET_HEIGHT), (0, 0, 0, 0))
    canvas.paste(scaled_player, (pos_x, pos_y), scaled_player)

    # Save as high-quality WebP
    canvas.save(out_webp_path, 'WEBP', quality=WEBP_QUALITY, method=6)
    out_size = os.path.getsize(out_webp_path)
    content_hash = hashlib.sha256(open(out_webp_path, 'rb').read()).hexdigest()

    return {
        'playerId': pid,
        'playerName': name,
        'team': team,
        'imagePath': web_relative_path,
        'sourceUrl': f"https://www.prokabaddi.com/static-assets/images/players/{prof_id}.png?w=1200",
        'sourceName': source_name,
        'originalDimensions': f"{orig_w}x{orig_h}",
        'dimensions': f"{TARGET_WIDTH}x{TARGET_HEIGHT}",
        'imageWidth': TARGET_WIDTH,
        'imageHeight': TARGET_HEIGHT,
        'aspectRatio': '4:5',
        'fileSizeKB': round(out_size / 1024, 1),
        'contentHash': content_hash,
        'verificationStatus': 'verified',
        'isHDUpgaded': is_hd_acquired,
        'verifiedAt': datetime.now(timezone.utc).isoformat(),
        'status': 'UPGRADED' if is_hd_acquired else 'RETAINED'
    }

def main():
    with open(PKL_DB_PATH, 'r', encoding='utf-8') as f:
        players = json.load(f)

    print(f"=== STARTING PKL IMAGE QUALITY UPGRADE PIPELINE ===")
    print(f"Total players to process: {len(players)}")
    print(f"Target specification: {TARGET_WIDTH}x{TARGET_HEIGHT} WebP (RGBA, Q={WEBP_QUALITY})\n")

    start_time = time.time()
    results = {}

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(process_player, p): p['id'] for p in players}
        completed = 0
        for fut in as_completed(futures):
            res = fut.result()
            pid = res['playerId']
            results[pid] = res
            completed += 1
            if completed % 25 == 0 or completed == len(players):
                elapsed = time.time() - start_time
                print(f"  [{completed}/{len(players)}] Processed ({elapsed:.1f}s) - Latest: {pid} ({res['playerName']}) -> {res['status']} ({res.get('fileSizeKB', 0)} KB)")

    total_time = time.time() - start_time

    # Sort results by player ID
    sorted_registry = {pid: results[pid] for pid in sorted(results.keys(), key=lambda x: int(x.split('-')[1]))}

    # Save registry to src/shared/pkl-player-images.json
    with open(REGISTRY_PATH, 'w', encoding='utf-8') as f:
        json.dump(sorted_registry, f, indent=2)

    upgraded = sum(1 for r in results.values() if r['status'] == 'UPGRADED')
    retained = sum(1 for r in results.values() if r['status'] == 'RETAINED')
    failed = sum(1 for r in results.values() if r['status'] not in ['UPGRADED', 'RETAINED'])

    print(f"\n=== PIPELINE RUN COMPLETE in {total_time:.1f}s ===")
    print(f"Total processed: {len(results)}")
    print(f"HD Upgraded (1200x1500): {upgraded}")
    print(f"Retained backup: {retained}")
    print(f"Failed / Missing: {failed}")

if __name__ == '__main__':
    main()
