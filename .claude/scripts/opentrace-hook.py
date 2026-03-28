#!/usr/bin/env python3
"""OpenTrace PreToolUse hook — augments search tool calls with graph context."""

from __future__ import annotations

import json
import os
import re
import shlex
import shutil
import subprocess
import sys

_DEBUG = bool(os.environ.get("OPENTRACE_DEBUG"))

_BASH_FLAG_VALUES = frozenset({
    "-e", "-f", "-A", "-B", "-C",
    "--glob", "--type", "-t", "-i", "-m", "--max-count",
})


def _debug(msg: str) -> None:
    if _DEBUG:
        print(f"[opentrace-hook] {msg}", file=sys.stderr)


def extract_pattern(tool_name: str, tool_input: dict) -> str | None:
    try:
        if tool_name == "Grep":
            return tool_input.get("pattern")
        if tool_name == "Glob":
            raw = tool_input.get("pattern", "")
            m = re.search(r"[A-Za-z_][A-Za-z0-9_]{2,}", raw)
            return m.group(0) if m else None
        if tool_name == "Bash":
            cmd = tool_input.get("command", "")
            tokens = shlex.split(cmd)
            if not tokens:
                return None
            base = os.path.basename(tokens[0])
            if base not in ("rg", "grep"):
                return None
            skip_next = False
            for tok in tokens[1:]:
                if skip_next:
                    skip_next = False
                    continue
                if tok in _BASH_FLAG_VALUES:
                    skip_next = True
                    continue
                if tok.startswith("-"):
                    continue
                if len(tok) >= 3:
                    return tok
    except Exception:
        _debug(f"extract_pattern error for {tool_name}")
    return None


def run_opentraceai(args: list[str], cwd: str, timeout: int = 7) -> str | None:
    try:
        exe = shutil.which("opentraceai")
        if exe:
            cmd = [exe, *args]
        else:
            cmd = ["uvx", "opentraceai", *args]
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd, timeout=timeout)
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except subprocess.TimeoutExpired:
        _debug("opentraceai timed out")
    except Exception as exc:
        _debug(f"opentraceai error: {exc}")
    return None


def handle_pre_tool_use(payload: dict) -> None:
    try:
        cwd = payload.get("cwd", "")
        if not cwd or not os.path.isabs(cwd):
            return
        tool_name = payload.get("tool_name", "")
        tool_input = payload.get("tool_input", {})
        pattern = extract_pattern(tool_name, tool_input)
        if not pattern or len(pattern) < 3:
            return
        _debug(f"augmenting {tool_name} with pattern={pattern!r}")
        result = run_opentraceai(["augment", "--", pattern], cwd=cwd)
        if result:
            print(json.dumps({
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "additionalContext": result,
                }
            }), flush=True)
    except Exception as exc:
        _debug(f"handle_pre_tool_use error: {exc}")


def main() -> None:
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            return
        payload = json.loads(raw)
    except Exception:
        return
    event = payload.get("hook_event_name", "")
    if event == "PreToolUse":
        handle_pre_tool_use(payload)


if __name__ == "__main__":
    main()
