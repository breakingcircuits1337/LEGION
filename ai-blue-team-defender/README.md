# AI Blue Team Defender

A self-replicating, multi-agent blue-team dashboard that pairs a modern Next.js UI with a Python microservice capable of driving headless (or full-GUI) browser agents in real time.  
Protects against human or AI red-team adversaries by analyzing traffic, responding automatically, and streaming live telemetry back to the operator.

---

## 1. Overview

- **AI Blue Team Defender dashboard**:  
  A Next.js/React dashboard for configuring, launching, and monitoring active blue-team defense agents.
- **Python defense microservice**:  
  A separately deployed backend service providing browser automation, agent logic, and streaming telemetry. The dashboard communicates with it via REST, Server-Sent Events (SSE), or WebSocket.

---

## 2. Repository layout

```
ai-blue-team-defender/
├─ app/                     # Next.js app-router pages & API proxies
│   └─ api/
│       └─ defense/         # /start  &  /stop proxy routes → Python service
├─ components/              # UI primitives, theme provider, toaster, etc.
├─ lib/                     # TypeScript utilities
├─ styles/                  # Tailwind base + globals.css
├─ tailwind.config.ts       # Custom colors, animations (pulse-fast, etc.)
├─ package.json
└─ README.md
```

A **separate** Python repo (or container) hosts the defense engine (browser agents, deep-search, etc.).  
This README covers both services.

---

## 3. Quick start

### 3.1 Prerequisites

| Requirement                       | Version/Notes                      |
|-----------------------------------|------------------------------------|
| Node.js                           | ≥ 18                               |
| pnpm                              | ≥ 8  (or swap for npm/yarn)        |
| Python                            | ≥ 3.9  (with venv)                 |
| Google Chrome or Chromium         | (unless running headless only)     |
| Docker (optional)                 | For easy multi-service launch      |

---

### 3.2 Clone & install

```bash
git clone https://github.com/your-org/ai-blue-team-defender.git
cd ai-blue-team-defender

# install JS deps
pnpm install
```

---

### 3.3 Environment variables

Create `.env.local` in the project root:

```env
# URL *inside* the cluster / docker-compose network
# e.g. http://defense:7788  or  http://127.0.0.1:7788
DEFENSE_API_BASE=http://127.0.0.1:7788

# Optional bearer-token auth (forwarded by proxy)
DEFENSE_API_TOKEN=my-super-secret

# WebSocket endpoint (defense service must expose it)
NEXT_PUBLIC_DEFENSE_WS=ws://127.0.0.1:7788/ws

# If WS also requires token auth
NEXT_PUBLIC_DEFENSE_WS_TOKEN=my-super-secret
```

---

### 3.4 Run the **Python defense service**

The defense engine lives in its own repository. Typical workflow:

```bash
# Inside python-service directory
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# expose HTTP + WS on :7788
python main.py --ip 0.0.0.0 --port 7788 --theme Ocean
```

Running with Docker?  

```bash
docker build -t defense-service .
docker run -p 7788:7788 --env DEFENSE_API_TOKEN=my-secret defense-service
```

---

### 3.5 Run the **Next.js dashboard**

```bash
pnpm dev          # http://localhost:3000
```

Open the browser and explore:
* Configure API keys (Groq, Gemini, Mistral)  
* “Active Defense” tab → enter a task, start the agent  
* Live screenshots stream in, progress bar updates, model actions/thoughts visible  
* Stop button pulses while agent is active  
* Confetti celebrates successful runs 🎉

---

### 3.6 Docker Compose (optional)

You may use a `docker-compose.yml` to launch both services together.  
See [docker-compose.example.yml](docker-compose.example.yml) for a starting point.

---

## 4. Communication flow

```
Next.js  (port 3000)                 Python defense service (port 7788)
 ┌──────────────────────┐  HTTP/SSE  ┌──────────────────────────────┐
 │  /api/defense/start  ├───────────►│  /run_with_stream            │
 │  /api/defense/stop   │           │                              │
 └──────────────────────┘           └──────────────────────────────┘
           ▲                                   ▲
           │              (optional WS)        │
           └────────────── WebSocket  ◄────────┘
```
* Proxy routes add the bearer token (`Authorization: Bearer …`) if `DEFENSE_API_TOKEN` is set.
* Dashboard first tries **WebSocket** (`NEXT_PUBLIC_DEFENSE_WS`).  
  Falls back to **Server-Sent Events** streaming if WS unavailable.
* Stream payload is a JSON array; indices of interest:  
  - `0`: html screenshot (string)
  - `1`: final result (string)
  - `2`: errors (string)
  - `3`: model actions (string)
  - `4`: model thoughts (string)
  - `5/6`: trace or video file URL (string)
  - `10`: current step (number)
  - `11`: max steps (number)
* The UI parses, updates state, shows progress, handles stalls/retries.

---

## 5. Edge-case handling features

- 10s timeout if defense service doesn’t respond.
- Stream stall >12s → one automatic reconnect; second failure surfaces error.
- JSON parse guard (>20 bad chunks aborts).
- Confetti when run finishes with trace link.
- Start/Stop proxy routes forward all headers and preserve status codes/messages.

---

## 6. Production build steps

```bash
pnpm build
pnpm start   # runs Next.js in production mode (PORT 3000)
```

Behind Nginx or Traefik, proxy `/` → dashboard, `/api/defense/*` already handled inside Next.

---

## 7. Customization tips

1. **Add new AI providers**  
   Edit `app/page.tsx` provider selector & backend `/security-analysis` model switch.
2. **Change colors / animations**  
   Tailwind tokens in `tailwind.config.ts`.
3. **Extend stream schema**  
   Update `useDefenseAgent` parser to read extra indices, then surface in UI.

---

## 8. Troubleshooting

| Symptom                                   | Checklist                                                                   |
|-------------------------------------------|-----------------------------------------------------------------------------|
| “Backend configuration error” toast       | DEFENSE_API_BASE missing or wrong; service not running                      |
| Stream stalls & reconnect fails           | Network drop / WS not exposed; inspect defense service logs                 |
| 504 Gateway Timeout from proxy            | Service took >10s to respond to start/stop; tune timeouts or service perf.  |
| Browser view blank                        | Enable `headless=false` (Python flags) or ensure screenshots emitted        |

---

## 9. Roadmap

- Role-based access & JWT auth  
- Historical dashboard (plots of threats, defender accuracy)  
- Plug-in system for additional blue-team tools (Snyk, OSQuery, etc.)  
- Multi-tenant deployment templates (Kubernetes & Docker Compose)  

Contributions welcome—open issues or PRs!

---

© 2025 Your Company • MIT-licensed