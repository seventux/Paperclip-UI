# 📎 Paperclip UI — Project Guide

> **Panduan lengkap agar project ini bisa dilanjutkan oleh model AI apapun.**
> Terakhir diperbarui: 17 Agustus 2026

---

## 📋 Daftar Isi

1. [Ringkasan Proyek](#ringkasan-proyek)
2. [Tech Stack](#tech-stack)
3. [Struktur Project](#struktur-project)
4. [Cara Menjalankan](#cara-menjalankan)
5. [Rencana Awal (Original Plan)](#rencana-awal)
6. [Yang Sudah Dilakukan](#yang-sudah-dilakukan)
7. [Yang Harus Dilakukan Selanjutnya](#yang-harus-dilakukan-selanjutnya)
8. [Convention & Standar Kode](#convention--standar-kode)
9. [Koneksi ke Paperclip Server](#koneksi-ke-paperclip-server)
10. [Troubleshooting](#troubleshooting)

---

## Ringkasan Proyek

**Paperclip UI** adalah frontend/ganti visual untuk [Paperclip](https://github.com/seventux/paperclip) — platform orkestrasi AI agent open-source. UI ini menyediakan:

- **Org Chart** dengan drag-and-drop untuk memanajemen hierarki agent
- **Workflow Builder** bergaya n8n untuk automasi pipeline agent
- **Task Board** bergaya Kanban untuk tracking pekerjaan
- **Agent Onboarding** wizard untuk menambah agent baru
- **Dashboard** dengan cost tracking dan heartbeat monitoring

**Repository:** `github.com/seventux/Paperclip-UI`
**Branch:** `main`

---

## Tech Stack

| Library | Versi | Fungsi |
|---------|-------|--------|
| React | 19.x | UI framework |
| TypeScript | 6.x | Type safety |
| Vite | 8.x | Build tool & dev server |
| Tailwind CSS | 4.x | Utility-first styling |
| Framer Motion | 13.x | Animations & transitions |
| @dnd-kit | latest | Drag and drop |
| React Flow | 11.x | Workflow/node graph visualization |
| Zustand | 5.x | State management |
| Lucide React | latest | Icon library |

**Tidak menggunakan:** n8n, Next.js, atau framework lain. Semua custom build.

---

## Struktur Project

```
/home/paperclip-ui/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── api/
│   │   ├── paperclip.ts              # 🔌 Connector ke Paperclip server API + WebSocket client
│   │   └── realtimeSimulator.ts      # 📡 Simulated realtime feed (standalone/demo mode)
│   ├── components/
│   │   ├── ConnectorConfig.tsx        # ⚡ n8n-style workflow pipeline builder
│   │   ├── CostChart.tsx              # 📊 Bar chart token usage per agent
│   │   ├── EmployeePool.tsx           # 📋 Right sidebar: agent list + detail panel
│   │   ├── FloatingBar.tsx            # 🔘 Floating action button (FAB) menu
│   │   ├── Header.tsx                 # 📌 Top bar: search, connection status, notifications
│   │   ├── Hero.tsx                   # 🚀 Landing page hero section
│   │   ├── OnboardingModal.tsx        # 🤖 Agent hiring wizard (3-step modal)
│   │   ├── OrgChart.tsx               # 🏢 Main org chart view with DnD context
│   │   ├── OrgNode.tsx                # 🎴 Individual agent card (draggable, with heartbeat)
│   │   ├── SearchModal.tsx            # 🔍 ⌘K global search modal
│   │   ├── Sidebar.tsx                # 📂 Left navigation panel
│   │   ├── Sparkline.tsx              # 📈 Mini SVG sparkline chart component
│   │   ├── TasksView.tsx              # ✅ Kanban task board
│   │   └── WorkflowPanel.tsx          # 🔗 React Flow graph view (alternate)│   ├── hooks/
│   │   └── useRealtime.ts            # ⚡ Wires WebSocket/simulator events into the store
│   ├── store/
│   │   └── useStore.ts               # 🗄️ Zustand store (employees, connections, tasks)
│   ├── types/
│   │   └── index.ts                   # 📝 TypeScript interfaces
│   ├── App.tsx                        # 🎯 Main app: routing, keyboard shortcuts, modals
│   ├── index.css                      # 🎨 Global styles, glassmorphism, animations
│   └── main.tsx                       # ▶️ Entry point
├── .gitignore
├── .oxlintrc.json
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── PROJECT.md                         # 📖 File ini (panduan project)
└── README.md
```

---

## Cara Menjalankan

```bash
# 1. Install dependencies
cd /home/paperclip-ui
npm install

# 2. Start dev server
npm run dev
# → http://localhost:3101

# 3. (Optional) Connect ke Paperclip server
VITE_PAPERCLIP_API_URL=http://localhost:3100/api npm run dev

# 4. Build untuk production
npm run build

# 5. Typecheck
npx tsc -b

# 6. Preview production build
npm run preview
```

---

## Rencana Awal

Rencana awal ketika project ini dibuat:

### ✅ Fase 1: Foundation
- [x] Buat project baru di `/home/paperclip-ui`
- [x] Setup React + Vite + TypeScript
- [x] Install semua dependencies
- [x] Configure Tailwind CSS v4 dengan custom theme
- [x] Buat glassmorphism design system (CSS classes: `.glass`, `.glass-strong`, `.glow`)

### ✅ Fase 2: Core Components
- [x] Header component (logo, search, status, notifications)
- [x] Sidebar (navigation, stats, add agent button)
- [x] OrgChart view dengan hierarchical tree
- [x] OrgNode card (draggable, budget bar, heartbeat pulse)
- [x] EmployeePool right sidebar (agent list + detail panel)
- [x] TasksView (Kanban board, 4 columns)
- [x] WorkflowPanel (React Flow graph view)

### ✅ Fase 3: Interactions
- [x] Drag-and-drop untuk reassign agent ke manager lain
- [x] Agent onboarding modal (3-step wizard)
- [x] Floating action button (FAB) menu
- [x] Zustand state management

### ✅ Fase 4: API & Polish
- [x] Paperclip API connector module
- [x] Connection status indicator
- [x] ⌘K search modal dengan filtering
- [x] Keyboard shortcuts (1/2/3, N, H, ⌘K, Esc)
- [x] Sparkline charts pada agent cards
- [x] Heartbeat pulse animations

### ✅ Fase 5: Deploy
- [x] Push ke `github.com/seventux/Paperclip-UI`
- [x] README.md dengan dokumentasi lengkap

---

## Yang Sudah Dilakukan

### Component yang sudah selesai:

| Component | Status | Keterangan |
|-----------|--------|------------|
| `Header.tsx` | ✅ Done | Logo, search bar, connection status, active count, notifications, settings |
| `Sidebar.tsx` | ✅ Done | Navigation (Org/Workflow/Tasks), stats overview, Add Agent button |
| `OrgChart.tsx` | ✅ Done | Hierarchical tree rendering, DnD context, drag overlay |
| `OrgNode.tsx` | ✅ Done | Draggable card, heartbeat pulse, budget bar, sparkline, status indicator |
| `EmployeePool.tsx` | ✅ Done | Agent list, detail panel with budget visualization |
| `TasksView.tsx` | ✅ Done | Kanban board (Todo/In Progress/Review/Done) |
| `ConnectorConfig.tsx` | ✅ Done | n8n-style pipeline builder, add/remove/toggle steps, config sidebar |
| `WorkflowPanel.tsx` | ✅ Done | React Flow graph view with animated edges |
| `Hero.tsx` | ✅ Done | Landing page with floating agent particles, CTA buttons |
| `FloatingBar.tsx` | ✅ Done | FAB with expandable quick actions |
| `OnboardingModal.tsx` | ✅ Done | 3-step wizard (Select Role → Configure → Review) |
| `SearchModal.tsx` | ✅ Done | ⌘K modal, search agents/tasks, keyboard navigation |
| `Sparkline.tsx` | ✅ Done | SVG sparkline with gradient fill, animated |
| `CostChart.tsx` | ✅ Done | Bar chart token usage per agent |

### State management:
- `useStore.ts` — Zustand store dengan employees, connections, tasks
- Actions: `reassignEmployee`, `addEmployee`, `removeEmployee`, `setSelectedEmployee`, `setActiveView`
- Realtime actions: `setRealtimeMode`, `updateEmployeeStatus`, `updateEmployeeTokens`, `updateTaskStatus`, `recordHeartbeat`, `applyRealtimeEvent`

### API:
- `paperclip.ts` — Connector class dengan methods: `connect()`, `getCompanies()`, `getAgents()`, `reassignAgent()`, `getTasks()`, `getAgentActivity()`
- `paperclip.ts` — `PaperclipSocket` class: `connect(companyId?)`, `on(listener)`, `onModeChange(listener)`, `disconnect()`, dengan auto-reconnect + ping
- `realtimeSimulator.ts` — `RealtimeSimulator` class: feed simulasi (token/heartbeat/status/task) saat server offline
- `useRealtime.ts` — hook yang menghubungkan socket/simulator ke store, panggil sekali di `App.tsx`

### Responsive:
- Mobile (< `lg`): sidebar jadi drawer off-canvas, task board swipeable, org chart scroll 2 arah, right panel hidden
- Desktop (`lg`+): layout asli tidak berubah (sidebar 220px, right panel 280px, grid 4 kolom)

### Design system (CSS):
- `.glass` — Base glassmorphism panel
- `.glass-strong` — Stronger blur/saturation
- `.glow` — Indigo glow shadow effect
- `.drag-over-indicator` — Dashed outline for drop targets
- Animated background orbs (body::before, body::after)
- Custom scrollbar styling
- React Flow custom theme overrides

---

## Yang Harus Dilakukan Selanjutnya

> **Catatan untuk model AI yang melanjutkan project ini:**
> Baca bagian ini dengan seksama. Kerjakan berdasarkan prioritas.

### 🔴 Prioritas Tinggi (High Priority)

#### 1. Real-time WebSocket Connection ✅ DONE
```
File: src/api/paperclip.ts, src/hooks/useRealtime.ts, src/api/realtimeSimulator.ts, src/store/useStore.ts
```
- ✅ `PaperclipSocket` class: connect/reconnect (exponential backoff), heartbeat ping, typed event emitter
- ✅ Update agent status (active/idle/offline) secara live via `agent_status` events
- ✅ Update token usage counters secara real-time via `token_usage` events
- ✅ Heartbeat state changes: status dot di `OrgNode` berdenyut setiap heartbeat
- ✅ Task updates live via `task_update` events
- ✅ Fallback simulasi: saat server tidak reachable, `RealtimeSimulator` menghasilkan feed yang sama
- ✅ Indikator di header: `Live` / `Demo Feed` / `Connecting` / `Offline`
- ✅ Smoke test: `npx tsx scripts/realtime-smoke.mts`
- Referensi: Paperclip docs ada di `doc/` di repo asli

#### 2. Mobile Responsive Layout ✅ DONE
```
File: src/App.tsx, src/components/Header.tsx, src/components/Sidebar.tsx, src/components/OrgChart.tsx, src/components/TasksView.tsx, src/components/ConnectorConfig.tsx, src/components/OnboardingModal.tsx, src/components/SearchModal.tsx, src/components/Hero.tsx
```
- ✅ Sidebar jadi hamburger menu → off-canvas drawer (spring animation) di layar < `lg`
- ✅ Header responsif: hamburger + search icon di mobile, search input & status chips tersembunyi di layar kecil
- ✅ Org chart: scroll 2 arah di mobile (fix `justify-center` yang meng-clip sisi kiri)
- ✅ Task board: kolom jadi swipeable (horizontal scroll) di mobile, grid 4 kolom di desktop
- ✅ FAB tetap visible di mobile
- ✅ Right panel (EmployeePool/CostChart) tersembunyi di mobile, muncul dari `lg`
- ✅ Modals (Onboarding/Search) pakai `min()` agar tidak overflow; step labels disembunyikan di mobile
- ✅ Workflow config sidebar jadi overlay (dengan tombol close) di mobile
- ✅ Sidebar Add Agent button sekarang berfungsi
- ✅ Verifikasi: `node scripts/mobile-check.mjs <port>` (viewport 390×844) & `node scripts/desktop-check.mjs <port>` (1440×900)

#### 3. Theme Toggle (Dark/Light)
```
File: src/index.css, src/App.tsx, semua components
```
- Tambah theme context/provider
- Light theme dengan glassmorphism tetap (frosted glass on white)
- Toggle button di header
- Save preference ke localStorage
- Detect system preference (`prefers-color-scheme`)

### 🟡 Prioritas Sedang (Medium Priority)

#### 4. Agent Detail Page
```
File: src/components/AgentDetail.tsx (NEW)
```
- Full page view ketika klik agent
- Activity log / timeline
- Token usage history (chart)
- Task assignments
- Heartbeat schedule config
- Budget settings

#### 5. Drag & Drop di Task Board
```
File: src/components/TasksView.tsx
```
- Implement drag-and-drop antar kolom (Todo → In Progress → Review → Done)
- Drag task ke agent untuk assign
- Menggunakan @dnd-kit yang sudah ter-install

#### 6. Workflow Pipeline Improvements
```
File: src/components/ConnectorConfig.tsx
```
- Save/load workflow templates
- Conditional branching visual
- Error handling nodes
- Execution log viewer
- Connect workflow ke actual Paperclip routines API

#### 7. Notifications System
```
File: src/components/Notifications.tsx (NEW)
```
- Dropdown panel dari bell icon di header
- Agent status change notifications
- Budget warning notifications
- Task completion notifications
- Mark as read/unread

### 🟢 Prioritas Rendah (Low Priority)

#### 8. Agent Chat Interface
```
File: src/components/AgentChat.tsx (NEW)
```
- Quick chat dengan agent langsung dari UI
- Thread view untuk conversations
- Tool call tracing display

#### 9. Cost Analytics Dashboard
```
File: src/components/CostDashboard.tsx (NEW)
```
- Full page cost analytics
- Time-series charts (daily/weekly/monthly)
- Per-agent cost breakdown
- Budget forecasting
- Export to CSV

#### 10. Company Settings Page
```
File: src/components/Settings.tsx (NEW)
```
- Company profile settings
- Agent default configurations
- Budget policies
- Governance rules
- Secret management UI

#### 11. Export/Import
```
File: src/utils/portability.ts (NEW)
```
- Export org chart sebagai JSON
- Import company template
- Secret scrubbing saat export
- Share configs antar deployments

---

## Convention & Standar Kode

### Naming Convention
- **Components:** PascalCase (`OrgChart.tsx`, `SearchModal.tsx`)
- **Hooks:** camelCase dengan prefix `use` (`useStore.ts`)
- **Types/Interfaces:** PascalCase (`OrgEmployee`, `Connection`)
- **CSS Classes:** kebab-case (`glass-strong`, `drag-over-indicator`)
- **Files:** Component = PascalCase, utility = camelCase

### Component Pattern
```tsx
// Selalu gunakan typed props
interface MyComponentProps {
  title: string
  onClick: () => void
}

export function MyComponent({ title, onClick }: MyComponentProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass p-4"
    >
      {/* content */}
    </motion.div>
  )
}
```

### State Management
- Gunakan **Zustand** untuk global state
- File: `src/store/useStore.ts`
- Pattern: `create<State>((set) => ({ ... }))`

### Styling
- Gunakan **Tailwind CSS** utility classes
- Glass effect: gunakan class `.glass` atau `.glass-strong`
- Warna accent: `indigo-500` (#6366f1), `purple-600`
- Animations: gunakan **Framer Motion** `<motion.div>`
- Icons: gunakan **Lucide React**

### API Pattern
```tsx
// Connector pattern di src/api/paperclip.ts
class PaperclipConnector {
  async methodName(): Promise<ReturnType> {
    const res = await this.request('/endpoint')
    return (res as ApiResponse)?.field || []
  }
  
  private async request(path: string, options?: RequestInit): Promise<unknown> {
    // Handle auth, errors, offline mode
  }
}
export const paperclip = new PaperclipConnector()
```

### Git Commit Message Format
```
[Type]: [Description]

- [Bullet point detail 1]
- [Bullet point detail 2]

🤖 Generated with Codebuff
Co-Authored-By: Codebuff <noreply@codebuff.com>
```

Types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`

---

## Koneksi ke Paperclip Server

### Environment Variables
```bash
# URL Paperclip API server (default: localhost:3100)
VITE_PAPERCLIP_API_URL=http://localhost:3100/api

# URL WebSocket server (optional). Jika tidak di-set, diturunkan otomatis
# dari VITE_PAPERCLIP_API_URL: http(s) → ws(s), trailing /api → /ws
VITE_PAPERCLIP_WS_URL=ws://localhost:3100/ws
```

### WebSocket Protocol
Server → Client (JSON):
| `type` | Fields | Fungsi |
|--------|--------|--------|
| `agent_status` | `agentId`, `status` (`active`/`idle`/`offline`) | Update status agent live |
| `token_usage` | `agentId`, `tokensUsed` (absolute total) | Update token usage counter |
| `heartbeat` | `agentId`, `timestamp` | Heartbeat pulse (dot berdenyut di OrgNode) |
| `task_update` | `taskId`, `status` (`todo`/`in-progress`/`review`/`done`) | Update status task |

Client → Server (JSON):
| `type` | Fields | Fungsi |
|--------|--------|--------|
| `subscribe` | `companyId` | Minta stream events untuk company tertentu |
| `ping` | — | Keep-alive heartbeat (tiap 30 detik) |

### API Endpoints yang Digunakan
| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/health` | Test koneksi |
| GET | `/companies` | List semua companies |
| GET | `/companies/:id/agents` | List agents per company |
| PATCH | `/companies/:id/agents/:agentId` | Update agent (reassign) |
| GET | `/companies/:id/tasks` | List tasks per company |
| GET | `/companies/:id/agents/:agentId/activity` | Agent activity log |

### Offline Mode
UI berjalan dalam **standalone mode** dengan data demo jika Paperclip server tidak tersedia. Semua API calls di-handle dengan silent fail.

### Data di Store (Hardcoded Demo)
```typescript
// Default agents di useStore.ts:
CEO (Atlas) → CMO (Nova), CFO (Ledger), Admin (Aria)
  CMO → Marketing Lead (Blaze), Content Writer (Quill)
  CFO → Analyst (Sage)
  Admin → Ops Lead (Rivet)
```

---

## Scripts Verifikasi

```bash
# Realtime pipeline smoke test (store + simulator)
npx tsx scripts/realtime-smoke.mts

# Mobile layout check via headless Chrome (jalankan dengan vite dev server aktif)
# 1. Start Chrome headless dengan remote debugging:
#    google-chrome --headless=new --window-size=390,844 --remote-debugging-port=9222 about:blank
# 2. Jalankan check:
node scripts/mobile-check.mjs 9222

# Desktop layout sanity check
node scripts/desktop-check.mjs 9222
```

## Troubleshooting

### Build Errors
```bash
# Clean build
rm -rf dist node_modules
npm install
npm run build
```

### TypeScript Errors
```bash
# Typecheck
npx tsc -b

# Jika ada unused import errors, hapus import yang tidak dipakai
```

### Dev Server Port
- Default: `3101` (dikonfigurasi di `vite.config.ts`)
- Paperclip server: `3100`
- Tidak perlu proxy karena CORS di-handle di Paperclip

### Dependencies Issues
```bash
# Jika ada peer dependency conflicts
npm install --legacy-peer-deps

# Atau gunakan force
npm install --force
```

---

## Catatan untuk Model AI

Ketika melanjutkan project ini, perhatikan hal-hal berikut:

1. **Jangan hapus component yang ada** — Semua sudah bekerja. Tambah baru, jangan hapus.
2. **Gunakan pattern yang ada** — Ikuti coding style yang sudah ada (Framer Motion, Tailwind, Zustand).
3. **Test setelah perubahan** — Jalankan `npx tsc -b` dan `npm run build` untuk verifikasi.
4. **Commit dengan format yang benar** — Ikuti git commit format di atas.
5. **Push ke GitHub** — Setelah selesai, push ke `github.com/seventux/Paperclip-UI`.
6. **Update PROJECT.md** — Setelah menyelesaikan task, update bagian "Yang Sudah Dilakukan" dan "Yang Harus Dilakukan".

### Quick Reference - File yang Paling Sering Diubah:
- `src/store/useStore.ts` — Jika ada perubahan data/state
- `src/App.tsx` — Jika ada view/routing baru
- `src/components/*.tsx` — Untuk UI changes
- `src/index.css` — Untuk style/design changes
- `src/api/paperclip.ts` — WebSocket client & API connector
- `src/hooks/useRealtime.ts` — Logika koneksi realtime (live vs simulasi)
- `src/api/realtimeSimulator.ts` — Feed simulasi untuk demo/standalone
- `vite.config.ts` — Untuk build configuration

---

*File ini dibuat agar project Paperclip UI bisa dilanjutkan oleh model AI apapun tanpa kehilangan konteks.*
