import os
import json
import time
import urllib.request
import hashlib
from datetime import datetime, timezone
from PIL import Image, ImageFilter

RAW_CACHE_DIR = 'cache/pkl-raw-images'
OUT_IMG_DIR = 'public/images/pkl-players'
os.makedirs(RAW_CACHE_DIR, exist_ok=True)
os.makedirs(OUT_IMG_DIR, exist_ok=True)

with open('pkl-players-database.json', 'r', encoding='utf-8') as f:
    players = json.load(f)

print(f"Total players in database: {len(players)}")

images_registry = {}
stats_summary = {
    'total': len(players),
    'with_photo': 0,
    'missing_photo': 0,
    'rejected_placeholders': 0,
    'ambiguous': 0
}
missing_players = []
rejected_players = []
verified_players = []

USER_AGENT = 'SportsAuctionBot/1.0 (PKL Simulation Fan Platform; Contact: admin@sportsauction.local)'

for idx, p in enumerate(players):
    pid = p['id']
    profile_id = p.get('official_profile_id')
    name = p['name']
    team = p['team']
    
    if not profile_id:
        print(f"[{idx+1}/{len(players)}] {pid} {name} - NO official_profile_id")
        stats_summary['missing_photo'] += 1
        missing_players.append({'id': pid, 'name': name, 'team': team, 'reason': 'No official_profile_id'})
        continue
        
    cache_file = os.path.join(RAW_CACHE_DIR, f"{pid}_{profile_id}.png")
    img_url = f"https://www.prokabaddi.com/static-assets/images/players/{profile_id}.png"
    out_webp_path = os.path.join(OUT_IMG_DIR, f"{pid}.webp")
    web_relative_path = f"/images/pkl-players/{pid}.webp"
    
    raw_data = None
    fetch_status = 'CACHED'
    
    if os.path.exists(cache_file):
        with open(cache_file, 'rb') as cf:
            raw_data = cf.read()
    else:
        req = urllib.request.Request(img_url, headers={'User-Agent': USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                raw_data = resp.read()
                fetch_status = f"HTTP_{resp.status}"
                with open(cache_file, 'wb') as cf:
                    cf.write(raw_data)
            time.sleep(1.0) # Polite 1 request/sec delay
        except Exception as e:
            fetch_status = f"FAILED: {e}"
            raw_data = None
            time.sleep(1.0)
            
    if not raw_data or len(raw_data) < 200: # 68 bytes is the 1x1 placeholder
        stats_summary['rejected_placeholders'] += 1
        stats_summary['missing_photo'] += 1
        rejected_players.append({
            'id': pid,
            'name': name,
            'team': team,
            'profile_id': profile_id,
            'reason': f"Empty or 1x1 placeholder ({len(raw_data) if raw_data else 0} bytes)"
        })
        print(f"[{idx+1}/{len(players)}] {pid} {name} ({team}) -> REJECTED PLACEHOLDER ({len(raw_data) if raw_data else 0}b)")
        continue
        
    try:
        import io
        raw_im = Image.open(io.BytesIO(raw_data))
        orig_w, orig_h = raw_im.size
        
        # Check if 1x1 or tiny silhouette
        if orig_w <= 20 or orig_h <= 20:
            stats_summary['rejected_placeholders'] += 1
            stats_summary['missing_photo'] += 1
            rejected_players.append({
                'id': pid,
                'name': name,
                'team': team,
                'profile_id': profile_id,
                'reason': f"Tiny dimensions {orig_w}x{orig_h}"
            })
            print(f"[{idx+1}/{len(players)}] {pid} {name} -> REJECTED TINY ({orig_w}x{orig_h})")
            continue
            
        content_hash = hashlib.sha256(raw_data).hexdigest()
        
        # Process into uniform 600x750 WebP (4:5)
        # Consistent face-centered crop & bottom anchoring
        target_w, target_h = 600, 750
        rgba_im = raw_im.convert('RGBA')
        bbox = rgba_im.getbbox()
        cropped = rgba_im.crop(bbox) if bbox else rgba_im
        cw, ch = cropped.size
        
        # Scale to fit nicely in 600x750: ~90% of card height
        target_player_h = int(target_h * 0.90)
        scale = target_player_h / float(ch)
        new_w = int(cw * scale)
        new_h = target_player_h
        scaled_player = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Center horizontally, place anchored at bottom (5px margin)
        pos_x = (target_w - new_w) // 2
        pos_y = target_h - new_h - 5
        
        # Canvas: transparent RGBA so PlayerPortrait card background shines through
        canvas = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
        canvas.paste(scaled_player, (pos_x, pos_y), scaled_player)
        
        # Save as WebP 600x750 quality 90
        canvas.save(out_webp_path, 'WEBP', quality=90)
        
        fetch_date = datetime.now(timezone.utc).isoformat()
        
        images_registry[pid] = {
            'playerId': pid,
            'playerName': name,
            'team': team,
            'imagePath': web_relative_path,
            'sourceUrl': img_url,
            'sourceName': 'Official Pro Kabaddi League Media Assets',
            'fetchDate': fetch_date,
            'originalDimensions': f"{orig_w}x{orig_h}",
            'contentHash': content_hash,
            'verificationStatus': 'verified',
            'matchConfidence': 1.0,
            'qualityRating': f"High Quality Official Portrait ({orig_w}x{orig_h} -> 600x750 WebP)",
            'status_code': 'verified'
        }
        
        stats_summary['with_photo'] += 1
        verified_players.append({
            'id': pid,
            'name': name,
            'team': team,
            'dim': f"{orig_w}x{orig_h}",
            'hash': content_hash[:10]
        })
        print(f"[{idx+1}/{len(players)}] {pid} {name} ({team}) -> VERIFIED ({orig_w}x{orig_h})")
        
    except Exception as e:
        stats_summary['missing_photo'] += 1
        missing_players.append({'id': pid, 'name': name, 'team': team, 'reason': f"Processing error: {e}"})
        print(f"[{idx+1}/{len(players)}] {pid} {name} -> ERROR: {e}")

# Save registry to src/shared/pkl-player-images.json
with open('src/shared/pkl-player-images.json', 'w', encoding='utf-8') as f:
    json.dump(images_registry, f, indent=2)

print("\nProcessing complete!")
print(f"With photo: {stats_summary['with_photo']}")
print(f"Missing / rejected: {stats_summary['missing_photo']} (placeholders: {stats_summary['rejected_placeholders']})")
