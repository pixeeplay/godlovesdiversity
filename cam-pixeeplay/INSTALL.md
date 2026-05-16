# cam.pixeeplay.com — Guide d'installation complet

## Architecture

```
Caméras IP (RTSP)
    ↓
Frigate NVR (Mac Mini M4 Pro)
    ↓ MQTT events
Home Assistant (Raspberry Pi)
    ↓ LLM Vision (HACS)     ↓ REST webhook
Ollama qwen2.5vl:7b         CrewAI Agent (Coolify VPS)
(Mac Mini)                   cam.pixeeplay.com
    ↓                               ↓
Description scène           Rapports / Recherche
    ↓
Notification iPhone (HA Companion)
```

**Réseau privé :** Tailscale relie Mac Mini ↔ Raspberry Pi ↔ VPS Coolify

---

## Phase 1 — Frigate sur Mac Mini (1–2h)

### Prérequis
- Docker Desktop installé sur Mac Mini M4 Pro
- Caméras IP sur le réseau local avec flux RTSP actif

### Installation

```bash
# 1. Copier les fichiers
mkdir -p ~/dev/cam-pixeeplay/frigate
cp frigate/docker-compose.yml ~/dev/cam-pixeeplay/frigate/
cp -r frigate/config ~/dev/cam-pixeeplay/frigate/

# 2. Créer les dossiers de données
mkdir -p ~/dev/cam-pixeeplay/frigate/data/{recordings,clips,exports}

# 3. Éditer la config avec tes vraies IPs caméras
nano ~/dev/cam-pixeeplay/frigate/config/config.yml
# → Remplacer 192.168.1.10/11 par tes vraies IPs
# → Remplacer IP du Pi (MQTT host)
# → Ajuster résolution et FPS selon tes caméras

# 4. Lancer Frigate
cd ~/dev/cam-pixeeplay/frigate
docker compose up -d

# 5. Vérifier
docker logs frigate -f
# Ouvrir : http://localhost:5000
```

### Trouver l'URL RTSP de ta caméra
- **Hikvision :** `rtsp://admin:password@IP:554/Streaming/Channels/101`
- **Dahua :** `rtsp://admin:password@IP:554/cam/realmonitor?channel=1&subtype=0`
- **Reolink :** `rtsp://admin:password@IP:554/h264Preview_01_main`
- **Generic :** Tester avec VLC → Ouvrir un flux réseau

---

## Phase 2 — IA Vision locale (2–3h)

### Ollama — Modèle vision

```bash
# Sur le Mac Mini (Ollama déjà installé)
ollama pull qwen2.5vl:7b        # ~5GB — recommandé
# ou
ollama pull llama3.2-vision:11b  # ~8GB — plus précis

# Tester
ollama run qwen2.5vl:7b "Décris cette image" --image /path/to/test.jpg
```

### LLM Vision dans Home Assistant

1. Sur le Raspberry Pi → **HACS → Intégrations → Rechercher "LLM Vision"**
2. Installer `valentinfrlch/ha-llmvision`
3. **Paramètres → Intégrations → Ajouter → LLM Vision**
4. Provider : **Ollama**, IP : `192.168.1.xx` (IP Mac Mini), port `11434`
5. Modèle : `qwen2.5vl:7b`

### Intégration Frigate dans Home Assistant

1. **HACS → Intégrations → Frigate**
2. URL Frigate : `http://192.168.1.xx:5000` (IP Mac Mini)
3. Activer MQTT dans HA (Paramètres → Intégrations → MQTT)
4. Host : `localhost`, Port : `1883`

### Automations HA

```bash
# Copier les automations dans HA
cp homeassistant/automations.yaml ~/homeassistant/automations/cam_surveillance.yaml
# Puis dans configuration.yaml :
# automation: !include_dir_merge_list automations/
```

Éditer `automations.yaml` :
- Remplacer `192.168.1.xx` par l'IP du Mac Mini
- Remplacer `mobile_app_iphone` par le nom de ton device dans HA

---

## Phase 3 — Bridge Tailscale (1h)

### Installation sur les 3 machines

```bash
# Mac Mini
brew install tailscale
sudo tailscale up

# Raspberry Pi
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# VPS Coolify (en SSH)
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Après `tailscale up` sur chaque machine → **se connecter avec le même compte Tailscale**

```bash
# Vérifier le réseau
tailscale status
# Tu vois les 3 machines avec leurs IPs 100.x.x.x
```

### Mettre à jour les configs avec les IPs Tailscale

Une fois Tailscale actif, remplacer les IPs locales par les IPs Tailscale dans :
- `crewai/docker-compose.yml` (FRIGATE_URL, OLLAMA_URL, HA_URL)
- `homeassistant/llmvision_config.yaml` (option B Tailscale)

---

## Phase 4 — Agent CrewAI sur Coolify (30min)

### Prérequis
- Tailscale actif sur le VPS
- Domain `cam.pixeeplay.com` pointant vers `51.75.31.123`

### Déploiement

1. **Uploader les fichiers CrewAI sur Coolify**

```bash
# Depuis le Mac Mini
scp -r crewai/ user@51.75.31.123:~/cam-pixeeplay/
```

2. **Dans Coolify UI** (http://51.75.31.123:8000) :
   - Nouveau projet → **Docker Compose**
   - Coller le contenu de `crewai/docker-compose.yml`
   - Ajouter le domaine : `cam.pixeeplay.com`
   - Variables d'env : remplir FRIGATE_URL, HA_TOKEN, etc.
   - **Déployer**

3. **DNS** — Ajouter dans ton gestionnaire de domaine :
   ```
   cam.pixeeplay.com → A → 51.75.31.123
   ```

4. **Tester**
   ```bash
   curl https://cam.pixeeplay.com/health
   # {"status": "ok", ...}

   curl -X POST https://cam.pixeeplay.com/summary/daily \
     -H "x-api-key: ChangeMoi2026!" | python3 -m json.tool
   ```

---

## Configuration HA → CrewAI

Ajouter dans `configuration.yaml` du Pi :

```yaml
rest_command:
  cam_agent_analyze:
    url: "https://cam.pixeeplay.com/analyze"
    method: POST
    headers:
      x-api-key: "ChangeMoi2026!"
      content-type: "application/json"
    payload: '{"event_id": "{{ event_id }}", "camera": "{{ camera }}", "label": "{{ label }}", "score": {{ score }}}'
```

---

## Checklist finale

- [ ] Frigate démarre et voit les caméras (`http://mac-mini:5000`)
- [ ] Détection personne visible dans Frigate events
- [ ] MQTT Frigate → HA fonctionnel (check MQTT Explorer)
- [ ] LLM Vision configuré dans HA (test via outils de dev HA)
- [ ] Tailscale actif sur les 3 nœuds
- [ ] CrewAI déployé sur Coolify (`https://cam.pixeeplay.com/health`)
- [ ] Notification iPhone reçue lors d'une détection test
- [ ] Rapport quotidien reçu à 08h00

---

## Cas d'usage exemples

| Demande | Endpoint |
|---------|----------|
| "Résumé de la nuit" | `GET /summary/daily` |
| "Quand est passé le facteur ?" | `POST /search {"query": "facteur"}` |
| "Y a-t-il eu du mouvement à l'entrée ?" | `POST /search {"query": "entrée", "camera": "entree"}` |
| Analyse événement temps réel | `POST /analyze` (via HA automation) |
