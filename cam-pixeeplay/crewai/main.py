"""
cam.pixeeplay.com — Agent CrewAI pour surveillance intelligente
FastAPI wrapper exposant les endpoints webhook + CrewAI agents
"""
import os
import httpx
import base64
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from crewai import Agent, Task, Crew, Process
from crewai.tools import tool
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================
# Configuration
# ============================================================
FRIGATE_URL   = os.getenv("FRIGATE_URL", "http://localhost:5000")
OLLAMA_URL    = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL  = os.getenv("OLLAMA_MODEL", "qwen2.5vl:7b")
HA_URL        = os.getenv("HA_URL", "http://localhost:8123")
HA_TOKEN      = os.getenv("HA_TOKEN", "")
API_SECRET    = os.getenv("API_SECRET_KEY", "ChangeMoi2026!")

app = FastAPI(
    title="cam.pixeeplay.com — Surveillance Agent",
    description="Agent CrewAI pour analyse intelligente des caméras Frigate",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Auth simple
# ============================================================
def verify_api_key(x_api_key: str = Header(default=None)):
    if x_api_key != API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


# ============================================================
# Modèles Pydantic
# ============================================================
class FrigateEvent(BaseModel):
    event_id: str
    camera: str
    label: str          # person, car, package...
    score: float
    snapshot_url: Optional[str] = None
    timestamp: Optional[str] = None

class SearchQuery(BaseModel):
    query: str
    camera: Optional[str] = None
    date_from: Optional[str] = None  # ISO format
    date_to: Optional[str] = None

class AnalysisResponse(BaseModel):
    event_id: str
    camera: str
    label: str
    description: str
    notification_sent: bool


# ============================================================
# CrewAI Tools
# ============================================================
@tool("get_frigate_events")
def get_frigate_events(camera: str = None, label: str = None, limit: int = 10) -> str:
    """Récupère les événements récents depuis l'API Frigate."""
    params = {"limit": limit}
    if camera:
        params["camera"] = camera
    if label:
        params["label"] = label
    try:
        resp = httpx.get(f"{FRIGATE_URL}/api/events", params=params, timeout=10)
        resp.raise_for_status()
        events = resp.json()
        if not events:
            return "Aucun événement trouvé."
        result = []
        for e in events[:limit]:
            result.append(
                f"[{e.get('start_time', 'N/A')}] {e.get('label', '?')} "
                f"sur {e.get('camera', '?')} (score: {e.get('top_score', 0):.0%})"
            )
        return "\n".join(result)
    except Exception as ex:
        return f"Erreur API Frigate: {ex}"


@tool("analyze_snapshot")
def analyze_snapshot(event_id: str, camera: str) -> str:
    """Télécharge le snapshot d'un événement Frigate et l'analyse avec Ollama Vision."""
    try:
        # Télécharge le snapshot depuis Frigate
        snap_url = f"{FRIGATE_URL}/api/events/{event_id}/snapshot.jpg"
        snap_resp = httpx.get(snap_url, timeout=15)
        snap_resp.raise_for_status()
        image_b64 = base64.b64encode(snap_resp.content).decode()

        # Appel Ollama Vision
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": (
                "Tu es un système de surveillance intelligent. "
                "Décris précisément ce que tu vois dans cette image de caméra de sécurité : "
                "nombre de personnes, leurs actions, objets notables, véhicules, heure approximative. "
                "Sois concis (2-3 phrases maximum). Réponds en français."
            ),
            "images": [image_b64],
            "stream": False,
        }
        ollama_resp = httpx.post(
            f"{OLLAMA_URL}/api/generate",
            json=payload,
            timeout=60
        )
        ollama_resp.raise_for_status()
        description = ollama_resp.json().get("response", "Description indisponible")
        return description

    except Exception as ex:
        return f"Erreur analyse: {ex}"


@tool("send_ha_notification")
def send_ha_notification(title: str, message: str, camera: str, event_id: str) -> str:
    """Envoie une notification push à l'iPhone via Home Assistant."""
    if not HA_TOKEN:
        return "HA_TOKEN non configuré — notification ignorée"
    try:
        snapshot_url = f"{FRIGATE_URL}/api/events/{event_id}/snapshot.jpg"
        payload = {
            "message": message,
            "title": title,
            "data": {
                "image": snapshot_url,
                "url": f"{FRIGATE_URL}/events?camera={camera}",
                "actions": [
                    {"action": "URI", "title": "Voir caméra", "uri": f"{FRIGATE_URL}/cameras/{camera}"}
                ]
            }
        }
        headers = {
            "Authorization": f"Bearer {HA_TOKEN}",
            "Content-Type": "application/json"
        }
        resp = httpx.post(
            f"{HA_URL}/api/services/notify/mobile_app_iphone",  # CHANGE THIS — nom de ton device HA
            json=payload,
            headers=headers,
            timeout=10
        )
        resp.raise_for_status()
        return "Notification envoyée avec succès"
    except Exception as ex:
        return f"Erreur notification HA: {ex}"


@tool("query_camera_history")
def query_camera_history(query: str, camera: str = None, hours: int = 24) -> str:
    """Recherche dans l'historique Frigate (dernières N heures)."""
    try:
        after = int((datetime.now() - timedelta(hours=hours)).timestamp())
        params = {"after": after, "limit": 50}
        if camera:
            params["camera"] = camera
        resp = httpx.get(f"{FRIGATE_URL}/api/events", params=params, timeout=10)
        resp.raise_for_status()
        events = resp.json()
        if not events:
            return f"Aucun événement dans les {hours} dernières heures."
        # Filtrage simple basé sur le query
        query_lower = query.lower()
        relevant = []
        for e in events:
            label = e.get("label", "")
            cam = e.get("camera", "")
            ts = datetime.fromtimestamp(e.get("start_time", 0)).strftime("%H:%M")
            if any(word in query_lower for word in [label, cam, "personne", "voiture", "colis"]):
                relevant.append(f"[{ts}] {label} sur {cam}")
        return "\n".join(relevant) if relevant else f"Aucun événement correspondant à '{query}'"
    except Exception as ex:
        return f"Erreur recherche: {ex}"


# ============================================================
# CrewAI Agents
# ============================================================
def build_crew(task_description: str, tools_list: list) -> Crew:
    """Construit un Crew CrewAI minimal pour une tâche donnée."""

    camera_analyst = Agent(
        role="Analyste Caméra",
        goal="Analyser les événements de surveillance et décrire précisément ce qui se passe",
        backstory=(
            "Expert en sécurité visuelle, tu analyses les images des caméras "
            "et fournis des descriptions claires et factuelles des événements détectés."
        ),
        tools=tools_list,
        verbose=False,
        allow_delegation=False,
    )

    security_agent = Agent(
        role="Agent Sécurité",
        goal="Évaluer le niveau de risque et décider si une alerte doit être envoyée",
        backstory=(
            "Professionnel de la sécurité avec 10 ans d'expérience. "
            "Tu distingues les faux positifs des vraies alertes et évites les notifications inutiles."
        ),
        tools=tools_list,
        verbose=False,
        allow_delegation=True,
    )

    task = Task(
        description=task_description,
        expected_output="Rapport structuré avec description, niveau de risque, et action prise.",
        agent=security_agent,
    )

    crew = Crew(
        agents=[camera_analyst, security_agent],
        tasks=[task],
        process=Process.sequential,
        verbose=False,
    )
    return crew


# ============================================================
# Endpoints FastAPI
# ============================================================

@app.get("/")
def root():
    return {"service": "cam.pixeeplay.com", "status": "running", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_event(event: FrigateEvent, api_key: str = Depends(verify_api_key)):
    """
    Webhook appelé par Home Assistant quand Frigate détecte un événement.
    Analyse le snapshot avec Ollama et envoie une notification iPhone.
    """
    logger.info(f"Analyse event: {event.event_id} — {event.label} sur {event.camera}")

    # Analyse directe (sans CrewAI pour la rapidité)
    description = analyze_snapshot(event.event_id, event.camera)
    notification_sent = False

    # Envoyer notification si c'est une personne ou un colis
    if event.label in ["person", "package"] and event.score > 0.75:
        title = f"🔔 {event.label.capitalize()} détecté — {event.camera}"
        result = send_ha_notification(title, description, event.camera, event.event_id)
        notification_sent = "succès" in result.lower()

    return AnalysisResponse(
        event_id=event.event_id,
        camera=event.camera,
        label=event.label,
        description=description,
        notification_sent=notification_sent,
    )


@app.get("/summary/daily")
async def daily_summary(camera: Optional[str] = None, api_key: str = Depends(verify_api_key)):
    """
    Génère un résumé quotidien des activités via CrewAI.
    Appelable par HA via webhook à 08h00.
    """
    task_desc = (
        f"Génère un résumé des activités des dernières 24h "
        f"{'pour la caméra ' + camera if camera else 'pour toutes les caméras'}. "
        "Utilise get_frigate_events pour récupérer les données. "
        "Résume en bullet points : nombre de détections par type, "
        "heures de pic d'activité, anomalies notables."
    )
    crew = build_crew(task_desc, [get_frigate_events, query_camera_history])
    result = crew.kickoff()
    return {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "camera": camera or "all",
        "summary": str(result),
    }


@app.post("/search")
async def search_history(query: SearchQuery, api_key: str = Depends(verify_api_key)):
    """
    Recherche en langage naturel dans l'historique des caméras.
    Ex: 'montre-moi quand le facteur est passé hier'
    """
    task_desc = (
        f"L'utilisateur recherche: '{query.query}'. "
        f"{'Caméra: ' + query.camera if query.camera else 'Toutes les caméras.'} "
        "Utilise query_camera_history pour trouver les événements correspondants. "
        "Retourne une liste chronologique des correspondances trouvées."
    )
    crew = build_crew(task_desc, [get_frigate_events, query_camera_history])
    result = crew.kickoff()
    return {
        "query": query.query,
        "results": str(result),
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/webhook/frigate")
async def frigate_webhook(payload: dict):
    """
    Webhook direct Frigate → Coolify (sans auth, appelé par HA automation).
    Reçoit l'événement Frigate brut et déclenche l'analyse.
    """
    event_type = payload.get("type", "")
    after = payload.get("after", {})

    if event_type not in ["new", "update"]:
        return {"status": "ignored"}

    if after.get("score", 0) < 0.70:
        return {"status": "score_too_low"}

    event = FrigateEvent(
        event_id=after.get("id", "unknown"),
        camera=after.get("camera", "unknown"),
        label=after.get("label", "unknown"),
        score=after.get("score", 0),
    )

    # Analyse asynchrone légère
    description = analyze_snapshot(event.event_id, event.camera)
    if event.label in ["person", "package"]:
        send_ha_notification(
            f"🔔 {event.label} — {event.camera}",
            description,
            event.camera,
            event.event_id
        )

    return {"status": "processed", "description": description[:100] + "..."}
