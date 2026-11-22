with open('src/components/FranchiseLogo.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

pkl_codes = ['PAT', 'PUN', 'JPP', 'BB', 'DEL', 'MUM', 'BW', 'GG', 'HAR', 'TAM', 'TEL', 'UP']
for code in pkl_codes:
    has_case = f"case '{code}':" in text
    print(f"{code}: {has_case}")
