#!/bin/bash

# =============================================================================
# DEPLOYMENT SCRIPT FOR GMAIL DOT EMAIL GENERATOR
# =============================================================================
# DEPLOYMENT URL: https://agents.iexcel.co/gmail-dot-email-generator
# NO EXCEPTIONS.
# =============================================================================

set -euo pipefail

# Configuration
DEPLOYMENT_URL="https://agents.iexcel.co/gmail-dot-email-generator"
BASE_PATH="/gmail-dot-email-generator"
SERVICE_NAME="ixl-gmail-dot-generator"
REGION="us-central1"
PROJECT_ID="iexcel-agents"
GCLOUD_ACCOUNT="ads@iexcel.co"
IMAGE_URI="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

# =============================================================================
# USAGE
# =============================================================================
#
# LOCAL DEVELOPMENT:
#   ./deploy.sh local
#   Then visit: http://localhost:8080
#
# PRODUCTION DEPLOYMENT:
#   ./deploy.sh production
#   Will deploy to: https://agents.iexcel.co/gmail-dot-email-generator
#
# =============================================================================

show_help() {
    echo ""
    echo "Usage: ./deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  local       Run locally (base path: /)"
    echo "  production  Build and deploy to Cloud Run (base path: ${BASE_PATH})"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh local        # Start local dev server at http://localhost:8080"
    echo "  ./deploy.sh production   # Deploy to ${DEPLOYMENT_URL}"
    echo ""
    echo "Cloud target (pinned):"
    echo "  project: ${PROJECT_ID}"
    echo "  account: ${GCLOUD_ACCOUNT}"
    echo "  service: ${SERVICE_NAME}"
    echo ""
}

run_local() {
    echo ""
    echo "=============================================="
    echo "  LOCAL DEVELOPMENT SERVER"
    echo "=============================================="
    echo ""
    echo "  URL: http://localhost:8080"
    echo ""
    echo "  Press Ctrl+C to stop"
    echo ""
    echo "=============================================="
    echo ""

    pkill -f "node server.js" 2>/dev/null || true

    APP_BASE_PATH="/" node server.js
}

deploy_production() {
    echo ""
    echo "=============================================="
    echo "  PRODUCTION DEPLOYMENT"
    echo "=============================================="
    echo ""
    echo "  TARGET URL: ${DEPLOYMENT_URL}"
    echo "  BASE PATH:  ${BASE_PATH}"
    echo ""
    echo "  NO EXCEPTIONS."
    echo ""
    echo "=============================================="

    # Step 1: Install dependencies
    echo ""
    echo "[1/4] Installing dependencies..."
    npm ci

    # Step 2: Run tests
    echo ""
    echo "[2/4] Running tests..."
    npm test

    # Step 3: Build & push Docker image via Cloud Build
    echo ""
    echo "[3/4] Building Docker image via Cloud Build..."
    gcloud builds submit \
        --tag "${IMAGE_URI}" \
        --project "${PROJECT_ID}" \
        --account "${GCLOUD_ACCOUNT}"

    # Step 4: Deploy to Cloud Run
    echo ""
    echo "[4/4] Deploying to Google Cloud Run..."
    gcloud run deploy "${SERVICE_NAME}" \
        --image "${IMAGE_URI}" \
        --platform managed \
        --region "${REGION}" \
        --allow-unauthenticated \
        --project "${PROJECT_ID}" \
        --account "${GCLOUD_ACCOUNT}" \
        --port 8080 \
        --memory 256Mi \
        --cpu 1 \
        --concurrency 80 \
        --timeout 60 \
        --max-instances 10 \
        --set-env-vars "APP_BASE_PATH=${BASE_PATH},NODE_ENV=production"

    echo ""
    echo "=============================================="
    echo "  DEPLOYMENT COMPLETE"
    echo "=============================================="
    echo ""
    echo "  Cloud Run service deployed."
    echo ""
    echo "  REQUIRED: Ensure your load balancer routes:"
    echo "    ${DEPLOYMENT_URL}"
    echo "  to this Cloud Run service."
    echo ""
    echo "  NO EXCEPTIONS."
    echo ""
    echo "=============================================="
}

# =============================================================================
# MAIN
# =============================================================================

if [ ! -f "package.json" ]; then
    echo "ERROR: package.json not found. Run this script from the project root."
    exit 1
fi

case "${1:-help}" in
    local)
        run_local
        ;;
    production)
        deploy_production
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
