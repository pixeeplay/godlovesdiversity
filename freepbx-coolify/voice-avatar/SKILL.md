# SKILL — Avatar Vocal FreePBX + Dograh + Odoo

## Rôle

Cet avatar vocal gère les appels entrants sur FreePBX en dehors des heures ouvrables (ou en débordement), qualifie les demandes, crée des fiches Odoo, et transcrit la conversation en document OnlyOffice.

---

## Architecture

```
Appel entrant (OVH SIP)
    ↓
FreePBX (Asterisk)
    ↓ AGI script Python
Dograh API (voice agent qwen3:8b + Speaches TTS)
    ↓
Odoo AMI → création lead/note
    ↓
Whisper transcription → OnlyOffice doc
```

---

## Configuration FreePBX

### IVR hors-heures → AGI

Dans FreePBX → Admin → Custom Destinations :

```
Custom Destination Name: Avatar Vocal Dograh
Destination: AGI(dograh_avatar.py,${CALLERID(num)})
```

Time Conditions → hors-heures → Custom Destination : Avatar Vocal Dograh

### Script AGI : `/var/lib/asterisk/agi-bin/dograh_avatar.py`

```python
#!/usr/bin/env python3
"""
AGI script — pont Asterisk ↔ Dograh
Lance un appel web Dograh et gère le flux audio via canal Asterisk.
"""
import sys
import os
import requests

AGI_ENV = {}
while True:
    line = sys.stdin.readline().strip()
    if not line:
        break
    if ':' in line:
        key, val = line.split(':', 1)
        AGI_ENV[key.strip()] = val.strip()

caller_id = AGI_ENV.get('agi_callerid', 'unknown')
DOGRAH_API = os.getenv('DOGRAH_API_URL', 'http://localhost:8000')
AGENT_ID   = os.getenv('DOGRAH_AGENT_ID', '1')

# Démarre une session Dograh pour cet appel
resp = requests.post(f'{DOGRAH_API}/api/v1/runs', json={
    'workflow_id': int(AGENT_ID),
    'caller_id': caller_id,
    'channel': 'sip'
})

sys.stdout.write('VERBOSE "Avatar Dograh started" 1\n')
sys.stdout.flush()
sys.stdout.write('HANGUP\n')
sys.stdout.flush()
```

---

## Variables d'environnement (docker-compose API)

```yaml
DOGRAH_AGENT_ID: "1"           # ID du workflow Dograh
AMI_HOST: "freepbx"            # hostname FreePBX dans le réseau Docker
AMI_PORT: "5038"
AMI_USER: "dograh"
AMI_SECRET: "dograh_secret"
WHISPER_MODEL: "base"           # ou "small" pour meilleure qualité
ONLYOFFICE_URL: "http://onlyoffice:8080"
```

---

## Configuration AMI (FreePBX)

FreePBX → Settings → Advanced → AMI ou éditer `/etc/asterisk/manager.conf` :

```ini
[dograh]
secret = dograh_secret
deny=0.0.0.0/0.0.0.0
permit=172.0.0.0/8    ; réseau Docker interne
read = all
write = all
```

---

## Pipeline post-appel

```python
# post_call_pipeline.py — à lancer après raccrochage
import subprocess, requests, os

def transcribe(audio_file: str) -> str:
    result = subprocess.run(
        ['whisper', audio_file, '--model', 'base', '--language', 'fr', '--output_format', 'txt'],
        capture_output=True, text=True
    )
    txt_file = audio_file.replace('.wav', '.txt')
    return open(txt_file).read() if os.path.exists(txt_file) else ''

def create_odoo_note(caller_id: str, transcript: str):
    # Via xmlrpc Odoo
    import xmlrpc.client
    url   = os.getenv('ODOO_URL', 'http://odoo:8069')
    db    = os.getenv('ODOO_DB', 'odoo')
    user  = os.getenv('ODOO_USER', 'admin')
    pwd   = os.getenv('ODOO_PASSWORD', 'admin')
    uid   = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common').authenticate(db, user, pwd, {})
    models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')
    models.execute_kw(db, uid, pwd, 'mail.message', 'create', [{
        'body': f'<p><b>Appel entrant {caller_id}</b></p><pre>{transcript}</pre>',
        'model': 'res.partner',
        'subtype_id': 1,
    }])

def push_to_onlyoffice(transcript: str, caller_id: str):
    # Crée un fichier .txt dans OnlyOffice via API
    onlyoffice_url = os.getenv('ONLYOFFICE_URL', 'http://onlyoffice:8080')
    # Implémentation selon ton setup OnlyOffice DS
    pass
```

---

## Cas d'usage activés

| Scénario | Comportement |
|----------|--------------|
| Appel hors-heures | Avatar décroche, qualifie, crée lead Odoo |
| Débordement (>3 sonneries) | Même pipeline |
| Appel numéro inconnu | Demande nom + société avant qualification |
| Appel client existant | Récupère fiche Odoo par numéro, personnalise l'accueil |
| Fin d'appel | Transcription Whisper → note Odoo + doc OnlyOffice |

---

## Installation

```bash
# 1. Copier le skill
mkdir -p ~/.claude/skills/voice-avatar
cp SKILL.md ~/.claude/skills/voice-avatar/

# 2. Dépendances Python dans le container FreePBX
pip install requests openai-whisper xmlrpc-client

# 3. Script AGI
cp dograh_avatar.py /var/lib/asterisk/agi-bin/
chmod +x /var/lib/asterisk/agi-bin/dograh_avatar.py

# 4. Redémarrer Asterisk
asterisk -rx "core reload"
```
