# LIFEQUEST AI — Production-Ready Full Stack RPG

> AI-powered real-life RPG that transforms your goals, habits, and personal development into epic quests. Level up your character, fight weekly bosses, earn rewards, and let **AURA** — your AI Game Master — guide your journey.

---

## 🎮 Demo Credentials

```
Email:    demo@lifequest.ai
Password: demo1234
```

The demo user starts at **Level 12**, with a **17-day streak**, active boss battle, and 22 seeded quests.

---

## 🏗️ Architecture

```
lifequest-ai/
├── frontend/          # Next.js 16 + TypeScript + Tailwind + Framer Motion
├── backend/           # FastAPI + SQLAlchemy + Alembic (Python)
└── docker-compose.yml # PostgreSQL container (optional)
```

**Security model:**
- JWT Bearer tokens (server-issued, client-stored)
- All XP/Gold calculations server-side — never trusted from frontend
- All AI API keys server-side — never exposed to browser
- User ownership verified on every protected endpoint
- Pydantic validation on all AI output before DB writes

---

## ⚡ Quick Start

### 1. Clone & Backend

```bash
cd lifequest-ai/backend
python -m venv venv
.\venv\Scripts\activate      # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
cp .env.example .env
# Edit .env: add GEMINI_API_KEY
alembic upgrade head
python seed_demo.py
uvicorn app.main:app --reload --port 8000
```

Backend runs at: `http://localhost:8000`  
API docs at: `http://localhost:8000/docs`

### 2. Frontend

```bash
cd lifequest-ai/frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend runs at: `http://localhost:3000`

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLite (`sqlite:///./lifequest.db`) or PostgreSQL URL |
| `SECRET_KEY` | Random secret for JWT signing |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Default: 43200 (30 days) |
| `AI_PROVIDER` | `gemini` (default) — swap to add new providers |
| `GEMINI_API_KEY` | Google Gemini API key |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend URL (`http://localhost:8000`) |

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login (returns JWT) |
| GET | `/character/` | Get character + XP progress |
| GET | `/character/attributes` | Get all attribute stats |
| GET | `/quests/` | List all quests |
| POST | `/quests/` | Create a quest |
| PUT | `/quests/{id}` | Update quest |
| DELETE | `/quests/{id}` | Delete quest |
| POST | `/quests/{id}/complete` | Complete quest (awards XP/Gold server-side) |
| GET | `/shop` | List all shop items |
| GET | `/inventory` | Get user inventory |
| POST | `/inventory/purchase` | Buy item (server-validated) |
| GET | `/boss/current` | Get active weekly boss |
| POST | `/boss/{id}/damage` | Deal damage to boss |
| GET | `/analytics/` | Get aggregated stats |
| POST | `/ai/generate-campaign` | Goal → full quest campaign |
| POST | `/ai/game-master` | AURA contextual advice |
| GET | `/ai/aura-tip` | Quick AURA dashboard tip |

---

## 🗄️ Database

Uses **SQLite** by default (no setup needed). Switch to **PostgreSQL** by updating `DATABASE_URL` in `.env`.

```bash
# Generate new migration after model changes
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Seed demo data
python seed_demo.py
```

---

## 🤖 AI Architecture

The AI layer is fully abstracted via `app/ai/base.py`:

```
AI_PROVIDER env var
      │
      ▼
app/ai/factory.py  ← lru_cache singleton
      │
      ▼
GeminiProvider (default)
      │              ↕ swap by changing AI_PROVIDER
OpenAIProvider  (future)
AnthropicProvider (future)
```

All prompts are in `app/ai/prompts.py`. Responses are validated via Pydantic before any DB write.

---

## 🎯 Hackathon Demo Flow

1. Open `http://localhost:3000`
2. Click **START YOUR JOURNEY** → Register
3. Navigate to **AURA CAMPAIGN FORGE** (`/campaign`)
4. Enter: *"I want to become good at Data Science"*
5. Watch AURA generate a full campaign
6. Go to Dashboard → complete a quest
7. See XP animation + attribute increase
8. Check **Analytics** (`/analytics`) for charts
9. Visit **Shop** (`/shop`) → purchase an item
10. Refresh browser → all data persists from DB ✅

---

## 🚀 Deployment

**Frontend → Vercel:**
```bash
cd frontend
vercel --prod
# Set NEXT_PUBLIC_API_URL to your backend URL
```

**Backend → Railway/Render:**
```bash
# Set env vars in Railway dashboard
# Use PostgreSQL add-on for DATABASE_URL
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

---

## 🧪 Testing Backend

```bash
cd backend
.\venv\Scripts\activate

# Test auth
curl -X POST http://localhost:8000/auth/login \
  -d "username=demo@lifequest.ai&password=demo1234"

# Test character (replace TOKEN)
curl -H "Authorization: Bearer TOKEN" http://localhost:8000/character/
```

---

## 📁 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4 |
| Animations | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| UI Components | shadcn/ui (Base UI) |
| Backend | FastAPI, Python 3.13 |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| Auth | JWT (python-jose) + bcrypt |
| AI | Google Gemini 2.0 Flash (swappable) |
| Database | SQLite (dev) / PostgreSQL (prod) |

---

*Built for Hackathon 2026 · LIFEQUEST AI*
