import zipfile
import json

with zipfile.ZipFile('PKL_DATABASE.zip', 'r') as z:
    teams = json.loads(z.read('PKL_DATABASE/teams/teams.json').decode('utf-8'))

for t in teams:
    print(json.dumps(t, indent=2))
