# MCP Servers in GachaVerse

MCP (Model Context Protocol) servers are plugins that give Claude live access to external tools and data — your database, GitHub, design files, etc. — so you don't have to copy-paste context manually.

Instead of describing your data to Claude, Claude reads it directly and acts on it in one step.

---

## Most Useful Servers for This Stack

| MCP Server | What It Unlocks |
|---|---|
| **PostgreSQL** (`@bytebase/dbhub`) | Claude queries your DB directly — inspect schema, write migrations, analyze live data |
| **GitHub** | Claude reads issues, reviews PRs, creates tickets without leaving chat |
| **Figma** *(Phase 2+)* | Sync design specs directly to React component work |

---

## Setup

### PostgreSQL

Run this once your local database is running:

```powershell
claude mcp add --transport stdio db -- npx -y @bytebase/dbhub --dsn "postgresql://gachaverse_user:your_password@localhost:5432/gachaverse_dev" --scope project
```

### GitHub

1. Go to **github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Generate a new token with `repo` scope
3. Run:

```powershell
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ --header "Authorization: Bearer ghp_your_token" --scope project
```

### Verify

```powershell
claude mcp list
```

---

## How Scope Works

`--scope project` writes the server config to `.mcp.json` in the repo root — it gets committed to Git and shared with your team.

| Scope | Stored In | Shared? |
|---|---|---|
| `project` | `.mcp.json` (repo root) | Yes, via Git |
| `user` | `~/.claude.json` | No, just you |
| `local` | `~/.claude.json` | No, just you |

> **Note:** Never commit tokens or passwords into `.mcp.json`. Use environment variables (e.g., `$env:GITHUB_PAT`) and reference them in the config instead.

---

## What Changes in Practice

**Without MCP servers:**
- You manually query the DB and paste results into chat
- You describe GitHub issues from memory
- Claude works from whatever context you provide

**With MCP servers:**
- Claude queries PostgreSQL directly and works with real, live data
- Claude reads, creates, and comments on GitHub issues and PRs
- Multi-tool workflows happen in a single prompt

**Example for GachaVerse:**

> *"Find users with no posts in the last 30 days and open a GitHub issue for a re-engagement campaign."*

With MCP connected, Claude:
1. Queries PostgreSQL → retrieves actual user data
2. Opens a GitHub issue with the findings attached
3. Suggests a feature implementation

Without MCP, all three steps are manual.

---

## Relevant Config Files

| File | Purpose |
|---|---|
| `.mcp.json` | Shared MCP server definitions (commit to Git) |
| `~/.claude.json` | Your personal MCP servers and user settings (not shared) |
| `.claude/settings.json` | Shared project permissions and env vars |
| `.claude/settings.local.json` | Your personal overrides (gitignored) |
