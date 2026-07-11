#!/usr/bin/env bash
# One-shot bootstrap for the GameShop Nepal backend droplet.
#
# Run on a fresh Ubuntu 22.04 or 24.04 droplet as root:
#   curl -fsSL https://raw.githubusercontent.com/sushant-poudel/YesGSN/main/deploy/setup.sh | bash
#
# What it does:
#   1. Installs Docker + Docker Compose plugin
#   2. Clones this repo to /opt/gsn
#   3. Opens the firewall for HTTP/HTTPS
#   4. Copies deploy/.env.example -> deploy/.env if missing, then stops so
#      you can edit .env with real values before starting the stack.
set -euo pipefail

REPO_URL="https://github.com/sushant-poudel/YesGSN.git"
INSTALL_DIR="/opt/gsn"

echo "==> Updating system packages"
apt-get update -y
apt-get install -y ca-certificates curl gnupg git ufw

echo "==> Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
        gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    . /etc/os-release
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
    echo "  docker already installed, skipping"
fi

echo "==> Configuring firewall (allow SSH + HTTP + HTTPS)"
ufw allow OpenSSH || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable

echo "==> Cloning repo to ${INSTALL_DIR}"
if [ -d "${INSTALL_DIR}/.git" ]; then
    git -C "${INSTALL_DIR}" pull --ff-only
else
    git clone "${REPO_URL}" "${INSTALL_DIR}"
fi

cd "${INSTALL_DIR}/deploy"
if [ ! -f .env ]; then
    cp .env.example .env
    echo ""
    echo "======================================================================"
    echo " NEXT STEP: edit ${INSTALL_DIR}/deploy/.env with your real values,"
    echo " then run:"
    echo ""
    echo "   cd ${INSTALL_DIR}/deploy"
    echo "   docker compose up -d --build"
    echo ""
    echo " Once running, confirm with:  curl https://api.gameshopnepal.com/health"
    echo "======================================================================"
else
    echo "==> .env already exists, not overwriting"
fi
