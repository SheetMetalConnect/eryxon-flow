# Claude Code Superpowers Setup

This repository expects the Superpowers Claude plugin to be installed at the machine level and enabled for the project.

## Install

```bash
claude plugins install superpowers@claude-plugins-official
```

If the plugin is already installed but disabled, enable it:

```bash
claude plugins enable superpowers@claude-plugins-official
```

## Repo Integration

This repository includes `.claude/settings.json`, which enables the `superpowers@claude-plugins-official` plugin for the project scope.

## Verify

```bash
claude plugins list
```

Expected state:

- `superpowers@claude-plugins-official`
- `Scope: project`
- `Status: enabled`

User-scope installation is also fine and can coexist with project scope.
