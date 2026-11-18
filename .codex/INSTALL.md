# Codex Superpowers Setup

This repository uses the global Superpowers installation model for Codex.

## Install

1. Clone Superpowers into your Codex home:

   ```bash
   git clone https://github.com/obra/superpowers.git ~/.codex/superpowers
   ```

2. Expose the skills through Codex native discovery:

   ```bash
   mkdir -p ~/.agents/skills
   ln -s ~/.codex/superpowers/skills ~/.agents/skills/superpowers
   ```

3. Restart Codex so it re-scans `~/.agents/skills/`.

## Verify

```bash
ls -la ~/.agents/skills/superpowers
readlink ~/.agents/skills/superpowers
```

Expected target:

```text
~/.codex/superpowers/skills
```

## Optional: Multi-Agent Skills

Some Superpowers workflows rely on Codex multi-agent support. If you want those skills available, add this to your Codex config:

```toml
[features]
multi_agent = true
```

## Repo Note

This file is checked into the repository so the setup lives with the project. The actual Superpowers checkout remains machine-level under `~/.codex/superpowers`, and Codex discovers it from `~/.agents/skills/`.
