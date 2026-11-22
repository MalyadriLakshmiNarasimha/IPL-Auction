import zipfile
import json
import re

with zipfile.ZipFile('PKL_DATABASE.zip', 'r') as z:
    squads = json.loads(z.read('PKL_DATABASE/raw_data/team_squads.json').decode('utf-8'))
    master = json.loads(z.read('PKL_DATABASE/players/players_master.json').decode('utf-8'))
    teams = json.loads(z.read('PKL_DATABASE/teams/teams.json').decode('utf-8'))

print(f"Total teams: {len(teams)}")
print(f"Total squads: {len(squads)}")
print(f"Total master players: {len(master)}")

# Examine all roles, nationalities, position details from squad cards
parsed_players = []
for idx, s in enumerate(squads, 1):
    card = s.get('card_text', '').replace('View profile', '').strip()
    url = s.get('profile_url', '')
    profile_id = url.split('-')[-1] if '-' in url else str(idx)
    
    # Check for specific patterns:
    # e.g. "Phool Chandra Defender, right cover India"
    # e.g. "Ankush Rathee Defender India"
    # e.g. "Ahmad Reza Asgari All Rounder Iran"
    
    # Match defender with subposition
    m_def_sub = re.search(r'^(.*?)\s+Defender,\s*(left corner|right corner|left cover|right cover|cover|corner)\s+(.*?)$', card, re.IGNORECASE)
    m_role = re.search(r'^(.*?)\s+(All Rounder|Raider|Defender)\s+(.*?)$', card, re.IGNORECASE)
    
    if m_def_sub:
        name = m_def_sub.group(1).strip()
        subpos = m_def_sub.group(2).strip().title()
        nat = m_def_sub.group(3).strip()
        role = 'Defender'
    elif m_role:
        name = m_role.group(1).strip()
        role = m_role.group(2).strip()
        if role.lower() == 'all rounder':
            role = 'All-Rounder'
            subpos = 'All-Rounder'
        elif role.lower() == 'raider':
            subpos = 'Raider'
        else:
            subpos = 'Defender'
        nat = m_role.group(3).strip()
    else:
        name = card
        role = 'Raider'
        subpos = 'Raider'
        nat = 'India'

    parsed_players.append({
        'id': f"k-{idx:03d}",
        'official_id': profile_id,
        'name': name,
        'team_name': s.get('team_name'),
        'team_code': s.get('team_code'),
        'role': role,
        'position_detail': subpos,
        'nationality': nat,
        'card_text': card,
        'profile_url': url
    })

print(f"\nParsed {len(parsed_players)} players.")
print("\nSample 10 parsed players:")
for p in parsed_players[:10]:
    print(f"  {p['id']} | {p['name']} | Team: {p['team_name']} | Role: {p['role']} ({p['position_detail']}) | Nat: {p['nationality']}")

# Roles breakdown
r_counts = {}
for p in parsed_players:
    r_counts[p['role']] = r_counts.get(p['role'], 0) + 1
print("\nRoles breakdown:", r_counts)

# Nationality breakdown
n_counts = {}
for p in parsed_players:
    n_counts[p['nationality']] = n_counts.get(p['nationality'], 0) + 1
print("Nationalities breakdown:", n_counts)
