import glob
import re
import json

# 1. Load squad players
with open('pkl-players-database.json', 'r', encoding='utf-8') as f:
    squad_players = json.load(f)

# 2. Parse all 12 debug stat files
stats_by_category = {}
html_files = glob.glob('debug_stat_*.html')

for fn in html_files:
    cat_key = fn.replace('debug_stat_', '').replace('.html', '')
    with open(fn, 'r', encoding='utf-8') as f:
        html = f.read()
    idx = html.find('window.statsWidgetData')
    if idx != -1:
        end_idx = html.find('</script>', idx)
        json_str = html[idx + len('window.statsWidgetData = '):end_idx].strip()
        if json_str.endswith(';'):
            json_str = json_str[:-1]
        data = json.loads(json_str)
        stats_by_category[cat_key] = data.get('stats', {}).get('data', [])

stat_players = {}
for cat, records in stats_by_category.items():
    for r in records:
        pid = str(r.get('player_id'))
        pname = r.get('player_name', '').strip()
        
        if pid not in stat_players:
            stat_players[pid] = {
                'official_id': pid,
                'name': pname,
                'team': r.get('team_name'),
                'matches': r.get('match_played', 0),
                'metrics': {}
            }
        val = r.get('value', 0)
        stat_players[pid]['metrics'][cat] = val
        if r.get('match_played', 0) > stat_players[pid]['matches']:
            stat_players[pid]['matches'] = r.get('match_played', 0)

registry_players = {}

for sp in squad_players:
    k_id = sp['id']
    sp_off_id = str(sp.get('official_profile_id'))
    sp_norm = re.sub(r'[^a-z0-9]', '', sp.get('name', '').lower())
    
    match = None
    if sp_off_id in stat_players:
        match = stat_players[sp_off_id]
    else:
        for pid, sdata in stat_players.items():
            if re.sub(r'[^a-z0-9]', '', sdata['name'].lower()) == sp_norm:
                match = sdata
                break
                
    if match:
        m = match['metrics']
        s12_stats = {
            'matches': match['matches'],
            'total_points': int(m.get('player_total_points', 0)),
            'raid_points': int(m.get('player_raid_points', 0)),
            'tackle_points': int(m.get('player_tackle_points', 0)),
            'successful_raids': int(m.get('player_successful_raids', 0)),
            'super_raids': int(m.get('player_super_raids', 0)),
            'super_10s': int(m.get('super_10s', 0)),
            'high_5s': int(m.get('high_5s', 0)),
            'super_tackles': int(m.get('player_super_tackles', 0)),
            'do_or_die_points': int(m.get('player_dod_raid_points', 0))
        }
        # In absence of full multi-season career dump, Season 12 serves as current verified season
        # and baseline career total
        registry_players[k_id] = {
            'player_id': k_id,
            'player_name': sp['name'],
            'team': sp['team'],
            'role': sp['role'],
            'tier': sp['tier'],
            'season_12': s12_stats,
            'career': s12_stats,
            'data_status': 'VERIFIED_S12'
        }
    else:
        # Debutant / Reserve squad player
        registry_players[k_id] = {
            'player_id': k_id,
            'player_name': sp['name'],
            'team': sp['team'],
            'role': sp['role'],
            'tier': sp['tier'],
            'season_12': None,
            'career': None,
            'data_status': 'DEBUTANT_BENCH'
        }

output_data = {
    'metadata': {
        'source': 'Official Pro Kabaddi League Match Center (Series 185)',
        'season': 'Season 12 (2025)',
        'last_updated': '2026-11-22T16:30:00Z',
        'total_squad_players': len(squad_players),
        'matched_s12_count': sum(1 for p in registry_players.values() if p['season_12'] is not None),
        'debutant_bench_count': sum(1 for p in registry_players.values() if p['season_12'] is None)
    },
    'players': registry_players
}

with open('src/shared/pkl-player-stats-registry.json', 'w', encoding='utf-8') as f:
    json.dump(output_data, f, indent=2)

print("Updated src/shared/pkl-player-stats-registry.json successfully.")
print(f"Matched Season 12: {output_data['metadata']['matched_s12_count']} / {len(squad_players)}")
print(f"Debutant/Bench: {output_data['metadata']['debutant_bench_count']} / {len(squad_players)}")
