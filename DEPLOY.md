# Deployment Runbook

This is the **only** document you need to deploy this project. If anything else in the repo contradicts it, this file wins.

---

## TL;DR

```bash
./deploy.sh production    # build, push, deploy
./deploy.sh validate      # curl all live URLs, assert HTTP 200
```

That's it. Read the rest of this file the first time, then forget it.

---

## What gets deployed where

| Thing | Value |
|---|---|
| **App** | Gmail Dot Variations Generator (Node 20 / Express) |
| **GitHub** | https://github.com/iExcel-Micah/gmail-dot-email-generator (branch `main`) |
| **Public URL (canonical)** | https://agents.iexcel.co/gmail-dot-variations-generator |
| **Public URL (legacy, kept alive)** | https://agents.iexcel.co/gmail-dot-email-generator |
| **Cloud Run direct URL** | https://ixl-gmail-dot-generator-454575866716.us-central1.run.app |
| **GCP project** | `iexcel-agents` |
| **Cloud Run service** | `ixl-gmail-dot-generator` |
| **Region** | `us-central1` |
| **Container registry** | `gcr.io/iexcel-agents/ixl-gmail-dot-generator:latest` |

---

## Identities (who runs what)

| Identity | Role | Used for |
|---|---|---|
| `ads@iexcel.co` | Human deployer (gcloud account) | Running `./deploy.sh production`. Must have Cloud Run Admin + Cloud Build Editor on `iexcel-agents`. |
| `gmail-dot-gen-sheets@iexcel-agents.iam.gserviceaccount.com` | Cloud Run runtime SA | Reads/writes the Google Sheet at runtime. Already attached to the service. |
| `iExcel-Micah` (GitHub) | Source of truth | Source code lives in `iExcel-Micah/gmail-dot-email-generator`. |

If `ads@iexcel.co` isn't the active gcloud account on your machine:

```bash
gcloud auth login ads@iexcel.co
gcloud config set project iexcel-agents
```

The deploy script passes `--account` and `--project` explicitly, so you don't have to keep them as defaults — but you do have to be **logged in** as `ads@iexcel.co`.

---

## Custom URL — how it actually routes

The `agents.iexcel.co/...` URL is **not** something `deploy.sh` controls. It's an external HTTPS load balancer (or domain mapping) that routes path prefixes to this Cloud Run service. The service then reads `APP_BASE_PATH` to know which prefix it's serving.

- Canonical prefix: `/gmail-dot-variations-generator` → `APP_BASE_PATH`
- Legacy prefix: `/gmail-dot-email-generator` → `APP_LEGACY_BASE_PATHS`

Both env vars are set by `deploy.sh` automatically. **If the canonical URL ever 404s after a deploy, the load balancer routing is the problem, not this app.** Verify with the Cloud Run direct URL first to isolate.

---

## Deploying

From the project root:

```bash
./deploy.sh production
```

What it does (in order):
1. `npm ci` — clean install
2. `npm test` — must pass; deploy aborts on failure
3. `gcloud builds submit` — builds Docker image via Cloud Build, pushes to GCR
4. `gcloud run deploy` — rolls out new revision at 100% traffic

Typical runtime: **3–5 min**.

---

## Validating after deploy

```bash
./deploy.sh validate
```

This curls the canonical URL, the legacy URL, and the Cloud Run direct URL, and exits non-zero if any returns non-200.

Manual spot-check:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://agents.iexcel.co/gmail-dot-variations-generator
```

Expected: `200`. Page title in the response body should be `Free Gmail Dot Variations Generator | iExcel`.

---

## Local development

```bash
./deploy.sh local
```

Serves at http://localhost:8080 with `APP_BASE_PATH=/`. No Cloud Run, no build, just `node server.js`. Reads `.env.local` for credentials.

---

## Troubleshooting

| Symptom | First thing to check |
|---|---|
| `gcloud builds submit` fails with permission error | You're not logged in as `ads@iexcel.co`. Run `gcloud auth login ads@iexcel.co`. |
| Canonical URL 404s, but Cloud Run direct URL works | Load balancer/domain-mapping problem. Not this app. |
| Cloud Run direct URL 5xx | Check Cloud Run logs: `gcloud run services logs read ixl-gmail-dot-generator --region us-central1 --project iexcel-agents`. |
| Sheet rows aren't appearing | Service account `gmail-dot-gen-sheets@…` lost editor access on spreadsheet `12y0qOlzsx5U8sV5jV7sgJW88BOQli9ENC6w1nLiTKLA`. |
| `npm test` fails | Fix the test before deploying. The script intentionally aborts. |

---

## What's intentionally NOT here

- No CI/CD pipeline. Deploys are manual via `./deploy.sh production`.
- No staging environment. Production is the only Cloud Run service.
- No secrets in this file. All credentials live in `.env.local` (local) and the runtime SA (production).
