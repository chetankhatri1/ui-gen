# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup          # First-time setup: install deps, generate Prisma client, run migrations
npm run dev            # Start dev server (http://localhost:3000) with Turbopack
npm run build          # Production build
npm run lint           # ESLint
npm test               # Run all tests with Vitest
npx vitest run <file>  # Run a single test file
npx prisma studio      # Browse the SQLite database
npm run db:reset       # Reset database (destructive)
```

All `npm run` scripts prepend `NODE_OPTIONS='--require ./node-compat.cjs'` — this is required for Node.js compatibility with the Next.js build.

## Environment

Create `.env` with:
```
ANTHROPIC_API_KEY=...   # Optional — app runs with a mock provider if absent
JWT_SECRET=...          # Optional — defaults to "development-secret-key"
```

## Architecture

UIGen is an AI-powered React component generator. Users chat with Claude, which writes code into a **virtual file system**. The generated code is compiled in-browser and rendered in a live preview iframe.

### Data flow

1. User sends a message → `POST /api/chat` receives `{ messages, files, projectId }`
2. Server reconstructs a `VirtualFileSystem` from the serialized `files` payload
3. `streamText` (Vercel AI SDK) calls Claude with two tools: `str_replace_editor` and `file_manager`
4. Tool calls stream back to the client via `useChat` (AI SDK React hook)
5. `ChatContext` passes each tool call to `FileSystemContext.handleToolCall`, which mutates the in-memory VFS
6. `PreviewFrame` watches `refreshTrigger` and re-renders by running the VFS through the JSX transformer

### Virtual file system (`src/lib/file-system.ts`)

`VirtualFileSystem` is an in-memory tree — nothing is ever written to disk. Key methods:
- `serialize()` / `deserializeFromNodes()` — convert between `Map<string, FileNode>` and a plain JSON-safe object, used to pass VFS state in API request bodies and to persist it in the database
- `replaceInFile()`, `createFileWithParents()`, `insertInFile()`, `viewFile()` — implement the text-editor-style tool commands

### Live preview (`src/lib/transform/jsx-transformer.ts`)

`createImportMap()` takes all VFS files, runs each `.jsx/.tsx/.ts/.js` file through **Babel Standalone**, creates a `Blob` URL per file, and assembles a native ES module import map. Third-party packages resolve to `https://esm.sh/<package>`. Missing local imports get auto-generated stub modules.

`createPreviewHTML()` produces a full HTML document using that import map, injecting Tailwind CSS via CDN. The iframe in `PreviewFrame` renders this HTML.

### AI tools (`src/lib/tools/`)

- `str_replace_editor` — view, create, str_replace, and insert operations on VFS files (mirrors Claude's built-in text editor tool schema)
- `file_manager` — rename and delete operations

### Context providers (`src/lib/contexts/`)

- `FileSystemProvider` — owns the `VirtualFileSystem` instance and exposes CRUD operations + `handleToolCall`. Wraps the whole app.
- `ChatProvider` — wraps Vercel AI SDK's `useChat`, wires `onToolCall` to `FileSystemContext.handleToolCall`, and serializes the VFS into every request body.

### Auth (`src/lib/auth.ts`)

Custom JWT-based auth using `jose`. Sessions stored as httpOnly cookies (7-day expiry). No third-party auth library. Server-only module — never import into client components.

### Database (`prisma/schema.prisma`)

SQLite via Prisma. Two models:
- `User` — email + bcrypt password
- `Project` — stores `messages` (JSON string) and `data` (serialized VFS JSON string), optionally linked to a user

Anonymous users can generate components without signing in; their work is tracked in `src/lib/anon-work-tracker.ts` and can be saved when they register.

### Model selection (`src/lib/provider.ts`)

`getLanguageModel()` returns `anthropic("claude-haiku-4-5")` if `ANTHROPIC_API_KEY` is set, or a `MockLanguageModel` otherwise. The mock produces hardcoded counter/form/card components to allow development without an API key.

## Code style

Use comments sparingly — only comment complex or non-obvious logic.

### Testing

Tests use Vitest with jsdom. Test files live in `__tests__/` directories alongside source files. Run a single test: `npx vitest run src/lib/transform/__tests__/jsx-transformer.test.ts`.
