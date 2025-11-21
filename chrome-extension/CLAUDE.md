# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mms-todo** is a Chrome MV3 extension that synchronizes Microsoft To Do tasks in real-time with the Microsoft Graph API. Users authenticate with their Microsoft account and can manage task lists and individual tasks across multiple interfaces: Popup, Side Panel, and Options page.

**Key characteristics:**
- Cloud-synced with Microsoft Graph API (no local storage of tasks)
- OAuth 2.0 authentication with PKCE security
- Three user interfaces: Popup (quick access), Side Panel (full-featured), Options (settings)
- Internationalization: English and Traditional Chinese
- Built with React 18 + TypeScript + Tailwind CSS + shadcn/ui
- Version: 0.0.3 (active development on feat/temp-auth branch)

## Common Development Commands

```bash
# Install dependencies
pnpm i

# Development mode with hot reload
pnpm dev
# Then load unpacked extension from build/chrome-mv3-dev in Chrome

# Production build
pnpm build
# Output: build/chrome-mv3-prod/

# Create .zip for Chrome Web Store
pnpm package
# Output: build/chrome-mv3-prod.zip

# Code formatting (applied automatically)
npx prettier --write .
```

## Architecture and High-Level Design

### Core Technology Stack
- **React 18.2** + **TypeScript 5.3** for UI
- **Plasmo 0.90.5** - Chrome MV3 build framework
- **TanStack React Query v5** - Server state management with caching
- **Microsoft Graph API** - Backend for all task data
- **Tailwind CSS 3.4** + **shadcn/ui** + **Radix UI** - Styling
- **Framer Motion 11.3** - Smooth animations
- **Chrome Identity API** - OAuth 2.0 flow with PKCE

### High-Level Architecture

```
Extension Entry Points (3)
├── popup.tsx           → Quick-access interface (420px wide)
├── sidepanel.tsx       → Full-featured side panel
└── options.tsx         → User settings/preferences

Core Services
├── hooks/useAuth.ts          → OAuth 2.0 + Token management (340 lines)
├── hooks/useMsTodos.ts       → React Query hooks for all Graph API calls (513 lines)
├── hooks/useSettings.ts      → User preferences (font family, font size)
├── lib/msgraph.ts            → Graph API client wrapper
├── background.ts             → Service worker for notifications + token refresh
└── providers.tsx             → React Query client configuration

UI Components
├── components/ui/            → Reusable base components (button, input, checkbox, etc.)
├── components/ui/auth-gate.tsx → Auth state wrapper
├── components/sidepanel/     → Sidebar for list management
└── ui/TodoList.tsx           → Main task display component

Data & Localization
├── locales/                  → i18n messages (en, zh_TW)
├── _locales/                 → Chrome native i18n format
└── styles/globals.css        → Tailwind variables + theme
```

### Data Flow Pattern

```
UI Component
  ↓
  useAuth() → Gets/refreshes access token
  ↓
  useMsTask/useMsTasks/useMutation() → React Query hooks
  ↓
  graphFetch() → API call with Bearer token
  ↓
  Microsoft Graph API (/me/todo/lists, /todo/lists/{id}/tasks, etc.)
  ↓
  React Query cache → Component rerender
```

### Key Architectural Patterns

#### 1. OAuth 2.0 + PKCE Authentication (`hooks/useAuth.ts`)
- User clicks "Sign In" → Generates code_verifier + code_challenge
- `chrome.identity.launchWebAuthFlow()` opens Microsoft login window
- Authorization code exchanged for access_token + refresh_token
- Tokens stored in `chrome.storage.local['auth.ms']`
- Automatic token refresh 5 minutes before expiry
- Token refresh failures prompt user to re-login

#### 2. React Query Server State Management (`hooks/useMsTodos.ts`)
- All Microsoft Graph queries organized under `msq` namespace
- Query keys: `["msgraph", "lists"]`, `["msgraph", "tasks", listId]`, etc.
- Cache config: staleTime 30s, gcTime 30m, retry once
- Optimistic updates with automatic rollback on error
- Automatic cache invalidation after mutations
- localStorage persistence with 24h max age

#### 3. Cross-Context Communication
- Service worker broadcasts messages to all UI contexts
- Message types: `token_refreshed`, `account_changed`, `notify_login_success`
- All contexts listen via `chrome.runtime.onMessage`
- Used for cache invalidation and state synchronization

#### 4. Responsive UI Components
- **AuthGate** wrapper (`components/ui/auth-gate.tsx`) manages auth state display
- Shows loading state, token refresh state, or login prompt as needed
- Takes optional pre-computed `auth` object to avoid redundant calls
- Used in `popup.tsx` and `sidepanel.tsx`

#### 5. Internationalization
- Message files in `locales/{locale}/messages.json`
- Chrome native i18n in `_locales/{locale}/messages.json`
- Runtime lookup with Chrome i18n API fallback to loaded JSON
- Locales: `en` (English), `zh_TW` (Traditional Chinese, default)

### Storage Keys (chrome.storage.local)

| Key | Type | Purpose |
|-----|------|---------|
| `auth.ms` | AuthState | Access/refresh tokens, expiration timestamp |
| `ms_account` | MeProfile | Logged-in user profile (name, email, ID) |
| `rq-mms-todo` | Object | React Query cache (persisted) |
| `settings` | Object | User prefs (fontFamily, fontSize) |
| `sidebarCollapsed` | Boolean | UI state for sidebar |

### Microsoft Graph API Endpoints Used

- `GET /me` - Get current user profile
- `GET /me/todo/lists` - Get all task lists
- `POST /me/todo/lists` - Create new list
- `PATCH /me/todo/lists/{listId}` - Rename list
- `DELETE /me/todo/lists/{listId}` - Delete list
- `GET /me/todo/lists/{listId}/tasks` - Get tasks in list
- `POST /me/todo/lists/{listId}/tasks` - Create task
- `PATCH /me/todo/lists/{listId}/tasks/{taskId}` - Update task (status, title, importance, etc.)
- `DELETE /me/todo/lists/{listId}/tasks/{taskId}` - Delete task
- `GET /me/todo/lists/{listId}/tasks/{taskId}/attachments` - Get task attachments

## Important Files and Their Roles

| File | Lines | Key Responsibility |
|------|-------|-------------------|
| `hooks/useAuth.ts` | 340 | OAuth 2.0 + token refresh logic, login/logout |
| `hooks/useMsTodos.ts` | 513 | All React Query hooks for Graph API calls and mutations |
| `background.ts` | 179 | Service worker, token refresh scheduler, account detection |
| `providers.tsx` | 92 | React Query client config with localStorage persistence |
| `popup.tsx` | 143 | Quick-access popup interface |
| `sidepanel.tsx` | 143 | Full-featured side panel view |
| `options.tsx` | 60+ | Settings page for font preferences |
| `ui/TodoList.tsx` | 80+ | Main task list component with animations |
| `components/ui/auth-gate.tsx` | 93 | Auth state wrapper (loading/token refresh/login states) |
| `lib/msgraph.ts` | 33 | Graph API client with Bearer token injection |
| `lib/i18n.ts` | 121 | Internationalization system |
| `styles/globals.css` | - | CSS variables and Tailwind theme configuration |

## Code Conventions and Patterns

### Naming Conventions
- **Hooks**: `use*` prefix (useAuth, useMsTodos, useSettings)
- **Components**: PascalCase (TodoList, AuthGate, AppSidebar)
- **Query Keys**: `msq.*` namespace (msq.lists, msq.tasks(listId))
- **Types**: PascalCase (TodoTask, AuthState, MeProfile)
- **CSS Classes**: Tailwind + shadcn component patterns
- **Event handlers**: `on*` prefix (onClick, onSuccess, onError)

### Type Definitions

Located in various files (no single types file):

```typescript
// From hooks/useAuth.ts
type AuthState = {
  accessToken?: string
  refreshToken?: string
  expiresAt?: number      // epoch milliseconds
}

// From hooks/useMsTodos.ts
type TodoTaskList = {
  id: string
  displayName: string
  wellknownListName?: string
  isOwner?: boolean
}

type TodoTask = {
  id: string
  title: string
  status: "notStarted" | "inProgress" | "completed" | "waitingOnOthers" | "deferred"
  importance?: "low" | "normal" | "high"
  dueDateTime?: { dateTime?: string; timeZone?: string }
  body?: { content?: string; contentType?: "text" | "html" }
}

type MeProfile = {
  id: string
  displayName?: string
  userPrincipalName?: string
  mail?: string
}
```

### Query Key Structure

All defined in `hooks/useMsTodos.ts`:

```typescript
const msq = {
  root: ["msgraph"],
  me: () => ["msgraph", "me"],
  lists: () => ["msgraph", "lists"],
  tasks: (listId) => ["msgraph", "tasks", listId],
  task: (listId, taskId) => ["msgraph", "task", listId, taskId],
  attachments: (listId, taskId) => ["msgraph", "attachments", listId, taskId]
}
```

### Error Handling Pattern

Mutations use `onError` callback to show toast notifications:

```typescript
const mutation = useMutation({
  mutationFn: async (data) => { /* ... */ },
  onError: (error) => {
    emitToast({
      title: "Error",
      description: error.message,
      variant: "destructive"
    })
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: msq.lists() })
  }
})
```

### Component Pattern with AuthGate

```typescript
export default function MyPage() {
  const auth = useAuth()
  return (
    <AuthGate auth={auth}>
      {/* Content only shown when authenticated */}
      <MainContent />
    </AuthGate>
  )
}
```

## Configuration Details

### Tailwind CSS (`tailwind.config.js`)
- Content scanning: `{components,ui,hooks,lib}/**/*.{ts,tsx}` + entry files
- Dark mode: class-based (`class` strategy)
- Extended colors using CSS variables (HSL format)
- Animation plugins included from tailwindcss-animate

### TypeScript (`tsconfig.json`)
- Extends Plasmo template base config
- Path alias: `~*` → `./src/*`
- Includes generated types from `.plasmo/index.d.ts`

### Code Formatting (`.prettierrc.mjs`)
- Line width: 80 characters
- Import sorting: builtin → third-party → plasmo → local
- No trailing commas, double quotes

### Chrome Manifest (via package.json)
- **OAuth**: client_id `c9f320b3-a966-4bb7-8d88-3b51ae7f632f`
- **Scopes**: Tasks.ReadWrite, User.Read, offline_access
- **Permissions**: identity, storage, notifications, alarms
- **Host Permissions**: graph.microsoft.com, login.microsoftonline.com
- **Entry Points**: popup.html, sidepanel.html, options.html

## Common Modification Scenarios

### Adding a New Graph API Scope

1. Add scope to `package.json` manifest.oauth2.scopes
2. Update `hooks/useAuth.ts` login and refreshAccessToken functions to include new scope
3. Clear `auth.ms` from chrome.storage.local to force user re-login with new permissions

### Creating a New Task Field (e.g., priority)

1. Update TodoTask type in `hooks/useMsTodos.ts`
2. Add field to patch object in `useCreateMsTask` and `useUpdateMsTask`
3. Update UI components to display/edit the field
4. Add i18n messages for new field labels

### Calling a New Graph API Endpoint

1. Add fetch wrapper to `lib/msgraph.ts` if special handling needed
2. Create React Query hook in `hooks/useMsTodos.ts`
3. Define new query key in msq object
4. Use graphFetch with Bearer token
5. Invalidate related query keys on mutations

### Updating Localization

1. Add new messages to `locales/en/messages.json` and `locales/zh_TW/messages.json`
2. Update Chrome i18n files in `_locales/` directories
3. Use Chrome i18n API or custom i18n helper for runtime lookup

## Build System (Plasmo)

- **Dev build**: `build/chrome-mv3-dev` with sourcemaps and hot reload
- **Prod build**: `build/chrome-mv3-prod` optimized and minified
- **Manifest generation**: Plasmo auto-generates from package.json settings
- **Code splitting**: Separate bundles for popup.js, sidepanel.js, options.js, background.js
- **Post-build**: copy-locales.mjs copies _locales/ directory to final build

## Recent Improvements (Nov 2024)

**12 Major Improvements** addressing authentication, logout, and cross-context sync:

### Improvements 1-6: Login Persistence Fixes
- localStorage synchronous access replacing chrome.storage.local
- StorageEvent cross-Context synchronization
- Smart token refresh with retry logic (3 retries, exponential backoff)
- Code Verifier recovery in localStorage
- Enhanced ensureValidToken function
- 30-second delayed retry for transient errors

### Improvements 7-9: Logout & Account Switching
- Complete logout flow clearing 6 state locations
- Background service worker logout handling
- React Query cache complete clearance

### Improvements 10-12: Cross-Context Synchronization
- Immediate auth state updates on login
- Phase and flowStep synchronization across contexts
- logout_completed message listener
- Shared useAuth instance in Popup to prevent state divergence

### Improvement 13: Popup Login UX Optimization
- Open SidePanel when user clicks login in Popup
- Auto-close Popup after 500ms to prevent UI blocking
- Provide ample space for OAuth flow in SidePanel
- Fallback to direct login if Chrome API unavailable

**See docs/ directory for detailed documentation:**
- `docs/CHANGES_SUMMARY.md` - ⭐ Start here: 13 improvements overview
- `docs/POPUP_LOGIN_UX_IMPROVEMENT.md` - Improvement 13 detailed guide
- `docs/IMPLEMENTATION_SUMMARY.md` - Full implementation details and verification
- `docs/FIX_VERIFICATION.md` - UI update fix verification and testing
- `docs/COMPREHENSIVE_TEST_PLAN.md` - Test plan for improvements 1-12
- `docs/AUTH_FIX_GUIDE.md` - Detailed problem analysis and solutions
- `docs/TESTING_GUIDE.md` - Login persistence testing procedures
- `docs/LOGOUT_AND_ACCOUNT_FIX.md` - Logout/account switching guide
- `docs/DIAGNOSTIC_SCRIPT.js` - Automated diagnostics tool

## Known Limitations and TODOs

From AGENT.md:
- [x] ✅ Full logout functionality clearing all user caches (Improvement 7-9)
- [x] ✅ Account switching support (Improvements 7-9)
- [x] ✅ Cross-Context synchronization (Improvements 10-12)
- [ ] Unit tests for useAuth and useMsTodos hooks
- [ ] Clearer UI error messages when token refresh fails
- [ ] Formal testing framework integration
- [ ] MSAL library migration (long-term architectural improvement)
- [ ] chrome.alarms persistent token refresh (currently setTimeout-based)

## Performance Considerations

- React Query caches with 30s staleTime to minimize API calls
- Automatic invalidation after mutations prevents stale data
- localStorage persistence reduces server calls on extension reload (now synchronous)
- Token refresh 5 minutes before expiry prevents auth failures mid-operation
- Optimistic updates provide instant UI feedback
- Cross-Context communication via StorageEvent + chrome.runtime.sendMessage ensures <200ms sync

## Security Considerations

- OAuth 2.0 PKCE prevents authorization code interception
- Tokens stored in localStorage (sync + auto-sync across contexts) and chrome.storage.local (backup)
- All API requests use Bearer token authentication
- Automatic token refresh with secure storage
- No credentials stored in code or manifests (client_id is public)
- Complete token cleanup on logout to prevent data leakage
