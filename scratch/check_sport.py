import os
import re

files_to_check = [
    'src/shared/types.ts',
    'src/shared/constants.ts',
    'src/shared/scoring.ts',
    'src/shared/validation.ts',
    'src/shared/player-sequence.ts',
    'server/room.ts',
    'server/index.ts',
    'prisma/schema.prisma',
    'src/components/CreateRoomModal.tsx',
    'src/app/page.tsx',
    'src/app/room/[code]/page.tsx',
    'src/app/stats/page.tsx'
]

print("=== CHECKING SPORT AND PKL REFERENCES ===")
for fn in files_to_check:
    if os.path.exists(fn):
        with open(fn, 'r', encoding='utf-8') as f:
            content = f.read()
            sport_matches = len(re.findall(r'sport', content, re.IGNORECASE))
            pkl_matches = len(re.findall(r'pkl', content, re.IGNORECASE))
            print(f"{fn}: 'sport'={sport_matches}, 'pkl'={pkl_matches}")
