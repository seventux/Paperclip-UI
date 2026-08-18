# 📎 Paperclip UI

A beautiful, glassmorphism-styled frontend for [Paperclip](https://github.com/seventux/paperclip) — the open-source AI agent orchestration platform.

![Paperclip UI](https://img.shields.io/badge/Built_with-React_19-61DAFB?style=flat-square&logo=react)
![Tailwind](https://img.shields.io/badge/styled_with-Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat-square&logo=typescript)

## ✨ Features

- **🏢 Org Chart** — Drag-and-drop hierarchical agent management
- **⚡ Workflow Builder** — n8n-style visual pipeline for agent automation
- **📊 Task Board** — Kanban-style task tracking across your AI team
- **🤖 Agent Onboarding** — Step-by-step wizard to hire new AI agents
- **💬 Agent Chat** — Quick chat drawer with per-agent threads & tool-call tracing
- **🔍 Agent Detail Page** — Full-page profile with activity timeline, token usage chart, tasks & budget settings
- **💓 Heartbeat Animations** — Real-time visual status for active agents
- **💰 Cost Dashboard** — Full cost analytics: time-series charts (daily/weekly/monthly), per-agent breakdown, budget forecasting & CSV export
- **🔗 Paperclip Connector** — Connects to your Paperclip server API
- **📡 Real-time Updates** — WebSocket feed for live agent status, token usage & heartbeats (simulated feed in demo mode)
- **📱 Fully Responsive** — Hamburger nav drawer, swipeable task columns & 2-axis org chart scroll on mobile
- **🌓 Dark/Light Theme** — Glassmorphism in both themes, toggle in header, remembers your preference
- **🪟 Glassmorphism UI** — iOS-inspired frosted glass design

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# → http://localhost:3101

# Connect to Paperclip server
VITE_PAPERCLIP_API_URL=http://localhost:3100/api npm run dev

# Build for production
npm run build
```

## 📁 Project Structure

```
src/
├── api/
│   └── paperclip.ts          # Paperclip server API connector
├── components/
│   ├── AgentChat.tsx         # Chat drawer with per-agent threads & tool tracing
│   ├── ConnectorConfig.tsx   # n8n-style workflow pipeline builder
│   ├── CostChart.tsx         # Token usage bar chart
│   ├── CostDashboard.tsx     # Cost analytics dashboard (charts, forecast, CSV)
│   ├── EmployeePool.tsx      # Right sidebar agent list & details
│   ├── FloatingBar.tsx       # Floating action button (FAB)
│   ├── Header.tsx            # Top navigation bar
│   ├── Hero.tsx              # Landing page hero section
│   ├── OnboardingModal.tsx   # Agent hiring wizard modal
│   ├── OrgChart.tsx          # Drag-drop org chart tree
│   ├── OrgNode.tsx           # Individual agent card with heartbeat
│   ├── Sidebar.tsx           # Left navigation panel
│   ├── TasksView.tsx         # Kanban task board
│   └── WorkflowPanel.tsx     # React Flow graph view
├── store/
│   └── useStore.ts           # Zustand state management
├── types/
│   └── index.ts              # TypeScript interfaces
├── App.tsx                   # Main app with view routing
├── index.css                 # Global styles & glassmorphism
└── main.tsx                  # Entry point
```

## 🔧 Tech Stack

| Library | Purpose |
|---------|---------|
| React 19 | UI framework |
| Vite | Build tool |
| TypeScript | Type safety |
| Tailwind CSS v4 | Styling |
| Framer Motion | Animations |
| @dnd-kit | Drag and drop |
| React Flow | Workflow visualization |
| Zustand | State management |
| Lucide React | Icons |

## 🎨 Design

The UI features a **glassmorphism** (frosted glass) design inspired by iOS, with:

- Semi-transparent panels with `backdrop-filter: blur()`
- Animated gradient background orbs
- Soft glow effects on active elements
- Smooth transitions powered by Framer Motion
- Heartbeat pulse animations for active AI agents

## 🔗 Connecting to Paperclip

1. Start your Paperclip server (default: `http://localhost:3100`)
2. Set the API URL:
   ```bash
   VITE_PAPERCLIP_API_URL=http://localhost:3100/api npm run dev
   ```
3. The UI will auto-connect and sync org chart data

## 📄 License

MIT
