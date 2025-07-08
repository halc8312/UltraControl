# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

UltraControl is a monorepo that integrates three AI development tools:
- **bolt.new-any-llm-main**: Browser-based AI-powered full-stack web development
- **devin-clone-mvp**: AI software engineer assistant with Next.js frontend and FastAPI backend
- **ultracontrol-app**: Main React/Vite application that orchestrates the integrated environment

## Critical Commands

### Main Application (ultracontrol-app)
```bash
cd packages/ultracontrol-app
pnpm install     # Install dependencies
pnpm dev         # Start development server (http://localhost:5173)
pnpm build       # Build for production
pnpm lint        # Run ESLint
```

### Devin Clone MVP
```bash
cd packages/devin-clone-mvp
pnpm install            # Install all dependencies
pnpm dev                # Run frontend dev server
pnpm build              # Build frontend
pnpm lint               # Lint frontend code
pnpm type-check         # Type check frontend
pnpm test               # Run frontend tests
```

### OpenHands Backend Server
```bash
cd packages/OpenHands-main
poetry install   # Install Python dependencies
poetry run uvicorn openhands.server.app:app --reload --host 0.0.0.0 --port 8000
```

## Key Architecture Components

### 1. LLM Integration Layer (`packages/ultracontrol-app/src/lib/llm/`)
- **LLMManager**: Orchestrates multiple AI providers (Anthropic, OpenAI, Cohere, Ollama)
- **ContextManager**: Handles conversation history and token management
- **PromptChain**: Enables complex sequential/parallel prompt workflows
- **Provider Factory**: Creates and manages provider instances with retry logic

### 2. State Management (`packages/ultracontrol-app/src/lib/store/`)
- Uses Nanostores for reactive state management
- Key stores: `boltSessions`, `devinTasks`, `openHandsAgents`, `userPreferences`
- Persistent storage via `@nanostores/persistent`

### 3. Event System (`packages/ultracontrol-app/src/lib/services/EventService.ts`)
- WebSocket-based real-time communication
- Event types: Action, Observation, Notification, System, StateUpdate
- Automatic reconnection and state synchronization

### 4. Plugin Architecture
- Defined in `PLUGINS_ARCHITECTURE.md`
- Supports backend (Python) and frontend (TypeScript) plugins
- Manifest-based (`plugin.json`) with permissions and capabilities

## Development Workflow

### Running the Full Stack
1. Start OpenHands backend server (port 8000)
2. Start ultracontrol-app frontend (port 5173)
3. WebSocket connection established automatically at `ws://localhost:8000/ws/events`

### Adding New LLM Providers
1. Create provider class extending `BaseLLMProvider` in `packages/ultracontrol-app/src/lib/llm/providers/`
2. Implement required methods: `complete()`, `stream()`, `countTokens()`
3. Register in `LLMProviderFactory`

### State Updates
- Use Nanostores atoms for reactive state
- State changes automatically propagate to UI components
- Persist critical state using `persistentAtom`

### WebSocket Events
- Actions: Client → Server commands
- Observations: Server → Client updates
- Use `EventService` for subscriptions and sending events

## Important Patterns

### Error Handling
- All LLM providers implement exponential backoff retry
- Structured error types in `interfaces/llm.ts`
- WebSocket reconnection with configurable retry attempts

### Type Safety
- Comprehensive TypeScript interfaces in `lib/interfaces/`
- Use discriminated unions for event payloads
- Strict null checks enabled

### Testing
- Unit tests use Vitest (`.spec.ts` files)
- Mock providers available for testing LLM integration
- Test files colocated with source files

## Environment Configuration
- Frontend env vars prefixed with `VITE_`
- Backend configuration in `packages/OpenHands-main/config.toml`
- API keys and secrets in `.env` files (never commit)

## Common Tasks

### Debugging WebSocket Connection
- Check browser DevTools Network tab for WS connection
- Verify backend server is running on port 8000
- Look for connection logs in `EventService`

### Adding New State
1. Define interface in `lib/interfaces/`
2. Create atom in `lib/store/`
3. Export from `lib/store/index.ts`
4. Use `useStore` hook in React components

### Modifying LLM Behavior
- Context window limits in `ContextManager`
- Retry configuration in `BaseLLMProvider`
- Provider-specific settings in individual provider classes