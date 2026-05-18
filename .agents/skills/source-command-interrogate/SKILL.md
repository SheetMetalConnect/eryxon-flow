---
name: "source-command-interrogate"
description: "Answer a question about the codebase without making any changes."
---

# source-command-interrogate

Use this skill when the user asks a read-only question about the codebase.

Answer the user's question. **Do NOT make any changes** — read-only.

1. Use OpenTrace graph tools + file reading to build a complete answer
2. Reference specific files and line numbers
3. Show relationships between components if applicable
4. Stay read-only — no edits, no new files, no git operations
