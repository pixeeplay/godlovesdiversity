#!/bin/bash
# Nettoie UNIQUEMENT les vieilles images Docker des apps Pixeesite (admin + render).
# À lancer en SSH sur le serveur 51.75.31.123.
# N'affecte PAS les autres projets Coolify.

set -e

echo "▸ Pixeesite admin (UUID: ocskk8wsg0c4ogo484o04koo)"
ADMIN_IMAGES=$(docker images --format "{{.Repository}}:{{.Tag}} {{.ID}} {{.CreatedSince}}" | grep -i "ocskk8wsg0c4ogo484o04koo\|pixeesite-admin" || true)
if [ -n "$ADMIN_IMAGES" ]; then
  echo "$ADMIN_IMAGES"
  # Garde uniquement la dernière (la plus récente), supprime les autres
  docker images --format "{{.Repository}}:{{.Tag}}" --filter "reference=*ocskk8wsg0c4ogo484o04koo*" | tail -n +2 | xargs -r docker rmi -f 2>/dev/null || true
  docker images --format "{{.Repository}}:{{.Tag}}" --filter "reference=*pixeesite-admin*" | tail -n +2 | xargs -r docker rmi -f 2>/dev/null || true
else
  echo "  Aucune image admin"
fi

echo ""
echo "▸ Pixeesite render (UUID: xg4ocsocgc0gks800cwg80ko)"
RENDER_IMAGES=$(docker images --format "{{.Repository}}:{{.Tag}} {{.ID}} {{.CreatedSince}}" | grep -i "xg4ocsocgc0gks800cwg80ko\|pixeesite-render" || true)
if [ -n "$RENDER_IMAGES" ]; then
  echo "$RENDER_IMAGES"
  docker images --format "{{.Repository}}:{{.Tag}}" --filter "reference=*xg4ocsocgc0gks800cwg80ko*" | tail -n +2 | xargs -r docker rmi -f 2>/dev/null || true
  docker images --format "{{.Repository}}:{{.Tag}}" --filter "reference=*pixeesite-render*" | tail -n +2 | xargs -r docker rmi -f 2>/dev/null || true
else
  echo "  Aucune image render"
fi

echo ""
echo "▸ Build cache des layers Pixeesite (récup espace énorme)"
docker builder prune --filter "label=coolify.app=ocskk8wsg0c4ogo484o04koo" -f 2>/dev/null || true
docker builder prune --filter "label=coolify.app=xg4ocsocgc0gks800cwg80ko" -f 2>/dev/null || true

echo ""
echo "▸ Dangling images (orphelines, sans tag) — toutes apps confondues mais safe"
docker image prune -f 2>&1 | tail -3

echo ""
echo "▸ Disk usage :"
df -h / | tail -2

echo ""
echo "✓ Nettoyage Pixeesite terminé"
