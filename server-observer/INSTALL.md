# Server Observer — control.pixeeplay.com

## Architecture

```
Browser (Tailscale requis 100.x.x.x)
    ↓ HTTPS
Traefik (Coolify) → IP whitelist middleware
    ↓
Nginx (observer-ui) → sert index.html
    ↓ /api/*
FastAPI (observer-api) → stats + auth + Coolify proxy
```

**Auth:** Username + Password + TOTP (Authy / Bitwarden / tout app TOTP)
**Réseau:** Accessible uniquement depuis Tailscale

---

## Installation

### Étape 1 — Hash du mot de passe

```bash
cd server-observer/api
python3 hash_password.py
# Entrer ton mot de passe → copier le hash affiché
```

### Étape 2 — Configurer le docker-compose.yml

Éditer `docker-compose.yml` :
```yaml
ADMIN_USERNAME: "arnaud"
ADMIN_PASSWORD_HASH: "le-hash-copié-à-l-étape-1"
COOLIFY_API_TOKEN: "token-depuis-coolify-profile"
JWT_SECRET: "une-longue-chaine-aléatoire"
```

Pour le COOLIFY_API_TOKEN :
- Coolify → Profile (icône en haut à droite) → API Tokens → Créer

### Étape 3 — Setup TOTP (une seule fois)

Déployer d'abord SANS TOTP_SECRET, puis :

```bash
# Depuis Tailscale, appeler l'endpoint de setup
curl https://control.pixeeplay.com/api/setup-2fa
```

Réponse : un secret + un QR code en base64
1. Scanner le QR avec **Authy**, **Bitwarden**, **1Password**, ou **Google Authenticator**
2. Copier le `secret` dans `ADMIN_PASSWORD_HASH` du docker-compose
3. Redéployer

### Étape 4 — Traefik middleware Tailscale

```bash
# SSH sur le VPS
ssh user@51.75.31.123

# Copier le middleware dans le répertoire Traefik Coolify
sudo cp traefik-config/middleware.yml /data/coolify/proxy/dynamic/tailscale.yml

# Vérifier que Coolify's Traefik charge les fichiers dynamiques
cat /data/coolify/proxy/traefik.yml | grep -A5 "providers"
```

Si le dossier dynamic n'existe pas :
```bash
sudo mkdir -p /data/coolify/proxy/dynamic
sudo cp traefik-config/middleware.yml /data/coolify/proxy/dynamic/tailscale.yml
# Redémarrer Traefik dans Coolify : Proxy → Restart
```

### Étape 5 — DNS

Ajouter dans ton gestionnaire DNS :
```
control.pixeeplay.com → A → 51.75.31.123
```

### Étape 6 — Déploiement Coolify

1. Coolify → Nouveau projet "Observer"
2. Nouveau service → Docker Compose
3. Coller le contenu de `docker-compose.yml`
4. Remplir les variables d'environnement
5. Déployer

### Étape 7 — Ajouter Tailscale sur le VPS

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
# Se connecter avec ton compte Tailscale
```

---

## Ajouter un projet au dashboard

Éditer `api/main.py` → section `PROJECTS` :

```python
{"name": "Mon App", "slug": "monapp",
 "frontend_url": "https://monapp.pixeeplay.com",
 "backend_url": "https://monapp.pixeeplay.com/api",
 "repo_url": "https://github.com/arnaud/monapp",
 "description": "Description courte",
 "icon": "🎯"},
```

Puis redéployer.

---

## Checklist

- [ ] Hash mot de passe généré → `ADMIN_PASSWORD_HASH` configuré
- [ ] TOTP scanné dans Authy/Bitwarden → `TOTP_SECRET` configuré
- [ ] `COOLIFY_API_TOKEN` généré dans Coolify profile
- [ ] Traefik middleware `tailscale-only` déployé dans `/data/coolify/proxy/dynamic/`
- [ ] Tailscale actif sur le VPS
- [ ] DNS `control.pixeeplay.com → 51.75.31.123`
- [ ] Service déployé sur Coolify
- [ ] Test depuis Tailscale : `https://control.pixeeplay.com`
- [ ] Test hors Tailscale → doit afficher 403
