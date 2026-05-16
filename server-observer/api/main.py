"""
Server Observer API — control.pixeeplay.com
FastAPI backend: stats système, auth TOTP, proxy Coolify
"""
import os, time, ipaddress, hashlib, secrets
from datetime import datetime, timedelta
from typing import Optional

import httpx
import psutil
import pyotp
import qrcode
import io, base64
from fastapi import FastAPI, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, JWTError

# ============================================================
# Config
# ============================================================
ADMIN_USERNAME     = os.getenv("ADMIN_USERNAME", "arnaud")
ADMIN_PASSWORD_HASH= os.getenv("ADMIN_PASSWORD_HASH", "")  # sha256 hex
TOTP_SECRET        = os.getenv("TOTP_SECRET", "")
JWT_SECRET         = os.getenv("JWT_SECRET", "change-me")
COOLIFY_URL        = os.getenv("COOLIFY_URL", "http://localhost:8000")
COOLIFY_API_TOKEN  = os.getenv("COOLIFY_API_TOKEN", "")
REQUIRE_TAILSCALE  = os.getenv("REQUIRE_TAILSCALE", "true").lower() == "true"
TAILSCALE_SUBNET   = ipaddress.ip_network(os.getenv("TAILSCALE_SUBNET", "100.0.0.0/8"))

app = FastAPI(title="Server Observer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)

# In-memory rate limiter
_login_attempts: dict = {}

# ============================================================
# Helpers
# ============================================================
def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "0.0.0.0"

def is_tailscale_ip(ip: str) -> bool:
    try:
        return ipaddress.ip_address(ip) in TAILSCALE_SUBNET
    except ValueError:
        return False

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(username: str) -> str:
    exp = datetime.utcnow() + timedelta(hours=8)
    return jwt.encode({"sub": username, "exp": exp}, JWT_SECRET, algorithm="HS256")

def verify_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def check_tailscale(request: Request):
    if not REQUIRE_TAILSCALE:
        return
    ip = get_client_ip(request)
    if not is_tailscale_ip(ip):
        raise HTTPException(
            status_code=403,
            detail=f"Access denied. Connect via Tailscale first. Your IP: {ip}"
        )

# ============================================================
# Models
# ============================================================
class LoginRequest(BaseModel):
    username: str
    password: str
    totp_code: str

class ProjectConfig(BaseModel):
    name: str
    frontend_url: Optional[str] = None
    backend_url: Optional[str] = None
    repo_url: Optional[str] = None
    description: Optional[str] = ""

# ============================================================
# Static project config (customize here)
# ============================================================
PROJECTS = [
    {"name": "FreePBX", "slug": "freepbx",
     "frontend_url": "https://phone.pixeeplay.com",
     "backend_url": "http://51.75.31.123:8089",
     "repo_url": None,
     "description": "Téléphonie SIP / IVR vocal Dograh",
     "icon": "📞"},
    {"name": "cam.pixeeplay.com", "slug": "cam",
     "frontend_url": "https://cam.pixeeplay.com",
     "backend_url": "https://cam.pixeeplay.com/docs",
     "repo_url": None,
     "description": "Surveillance IA — Frigate + CrewAI",
     "icon": "📷"},
    {"name": "Coolify", "slug": "coolify",
     "frontend_url": "http://51.75.31.123:8000",
     "backend_url": None,
     "repo_url": None,
     "description": "Plateforme de déploiement",
     "icon": "🚀"},
    # CHANGE THIS — ajouter tes autres projets ici
]

# ============================================================
# Routes publiques
# ============================================================
@app.get("/health")
def health(request: Request):
    ip = get_client_ip(request)
    return {
        "status": "ok",
        "tailscale": is_tailscale_ip(ip),
        "client_ip": ip,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/setup-2fa")
def setup_2fa(request: Request):
    """
    Génère le secret TOTP et le QR code au premier démarrage.
    À appeler une seule fois, puis configurer TOTP_SECRET dans l'env.
    Accessible UNIQUEMENT depuis Tailscale.
    """
    check_tailscale(request)
    if TOTP_SECRET:
        return {"message": "TOTP already configured. Remove TOTP_SECRET env var to reset."}
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=ADMIN_USERNAME, issuer_name="PixeePlay Control")
    # Génère QR code en base64
    qr = qrcode.QRCode()
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()
    return {
        "secret": secret,
        "qr_code": f"data:image/png;base64,{qr_b64}",
        "instructions": f"1. Ajouter TOTP_SECRET={secret} dans ton docker-compose env\n2. Scanner le QR avec Authy, Bitwarden, ou tout app TOTP\n3. Redémarrer le container"
    }

# ============================================================
# Auth
# ============================================================
@app.post("/auth/login")
async def login(req: LoginRequest, request: Request):
    check_tailscale(request)

    # Rate limiting
    ip = get_client_ip(request)
    now = time.time()
    attempts = _login_attempts.get(ip, [])
    attempts = [t for t in attempts if now - t < 60]  # Fenêtre 1 min
    if len(attempts) >= 5:
        raise HTTPException(status_code=429, detail="Too many attempts. Wait 1 minute.")
    _login_attempts[ip] = attempts + [now]

    # Vérification username
    if req.username != ADMIN_USERNAME:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Vérification password
    if not ADMIN_PASSWORD_HASH:
        raise HTTPException(status_code=500, detail="Password not configured. Run hash_password.py")
    if hash_password(req.password) != ADMIN_PASSWORD_HASH:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Vérification TOTP
    if not TOTP_SECRET:
        raise HTTPException(status_code=500, detail="TOTP not configured. Call /setup-2fa first")
    totp = pyotp.TOTP(TOTP_SECRET)
    if not totp.verify(req.totp_code, valid_window=1):
        raise HTTPException(status_code=401, detail="Invalid TOTP code")

    return {"token": create_token(req.username), "expires_in": 28800}

# ============================================================
# Stats système (protégé par JWT)
# ============================================================
@app.get("/stats")
def get_stats(request: Request, user: str = Depends(verify_token)):
    check_tailscale(request)
    cpu = psutil.cpu_percent(interval=0.5)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    net = psutil.net_io_counters()
    temps = {}
    try:
        sensor_temps = psutil.sensors_temperatures()
        if sensor_temps:
            for name, entries in sensor_temps.items():
                if entries:
                    temps[name] = round(entries[0].current, 1)
    except Exception:
        pass

    return {
        "cpu": {"percent": cpu, "cores": psutil.cpu_count()},
        "memory": {
            "total_gb": round(mem.total / 1e9, 1),
            "used_gb": round(mem.used / 1e9, 1),
            "percent": mem.percent,
        },
        "disk": {
            "total_gb": round(disk.total / 1e9, 1),
            "used_gb": round(disk.used / 1e9, 1),
            "percent": disk.percent,
        },
        "network": {
            "bytes_sent_mb": round(net.bytes_sent / 1e6, 1),
            "bytes_recv_mb": round(net.bytes_recv / 1e6, 1),
        },
        "uptime_hours": round((time.time() - psutil.boot_time()) / 3600, 1),
        "temperatures": temps,
        "timestamp": datetime.now().isoformat(),
    }

# ============================================================
# Projets + statut
# ============================================================
@app.get("/projects")
async def get_projects(request: Request, user: str = Depends(verify_token)):
    check_tailscale(request)
    results = []
    async with httpx.AsyncClient(timeout=5) as client:
        for p in PROJECTS:
            status = "unknown"
            if p.get("frontend_url"):
                try:
                    r = await client.get(p["frontend_url"], follow_redirects=True)
                    status = "up" if r.status_code < 500 else "degraded"
                except Exception:
                    status = "down"
            results.append({**p, "status": status})
    return results

# ============================================================
# Proxy Coolify API
# ============================================================
@app.get("/coolify/services")
async def coolify_services(request: Request, user: str = Depends(verify_token)):
    check_tailscale(request)
    if not COOLIFY_API_TOKEN:
        return {"error": "COOLIFY_API_TOKEN not configured", "services": []}
    headers = {"Authorization": f"Bearer {COOLIFY_API_TOKEN}"}
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(f"{COOLIFY_URL}/api/v1/services", headers=headers)
            return r.json()
        except Exception as e:
            return {"error": str(e), "services": []}

@app.get("/coolify/deployments")
async def coolify_deployments(request: Request, user: str = Depends(verify_token)):
    check_tailscale(request)
    if not COOLIFY_API_TOKEN:
        return {"error": "COOLIFY_API_TOKEN not configured"}
    headers = {"Authorization": f"Bearer {COOLIFY_API_TOKEN}"}
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(f"{COOLIFY_URL}/api/v1/deployments", headers=headers)
            return r.json()
        except Exception as e:
            return {"error": str(e)}
