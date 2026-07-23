#!/usr/bin/env python3
"""Remove Git conflict blocks from src/main.jsx, keeping the HEAD/current-branch side.
Run from the Bible-Reader repository root:
    python scripts/resolve_main_conflict.py
"""
from pathlib import Path
import sys

path = Path("src/main.jsx")
if not path.exists():
    raise SystemExit("ERROR: src/main.jsx was not found. Run this from the repository root.")

text = path.read_text(encoding="utf-8")
lines = text.splitlines(keepends=True)
out = []
i = 0
resolved = 0

while i < len(lines):
    if lines[i].startswith("<<<<<<< "):
        resolved += 1
        i += 1
        current = []
        while i < len(lines) and not lines[i].startswith("======="):
            current.append(lines[i])
            i += 1
        if i >= len(lines):
            raise SystemExit("ERROR: malformed conflict: missing =======")
        i += 1
        depth = 1
        while i < len(lines):
            if lines[i].startswith("<<<<<<< "):
                depth += 1
            elif lines[i].startswith(">>>>>>> "):
                depth -= 1
                if depth == 0:
                    break
            i += 1
        if i >= len(lines):
            raise SystemExit("ERROR: malformed conflict: missing >>>>>>>")
        out.extend(current)
        i += 1
    else:
        out.append(lines[i])
        i += 1

if resolved == 0:
    print("No conflict markers found in src/main.jsx.")
else:
    backup = path.with_suffix(".jsx.conflict-backup")
    backup.write_text(text, encoding="utf-8")
    path.write_text("".join(out), encoding="utf-8")
    print(f"Resolved {resolved} conflict block(s), keeping HEAD/current code.")
    print(f"Backup written to {backup}")

# Refuse success if any marker remains anywhere in main.jsx.
result = path.read_text(encoding="utf-8")
markers = ("<<<<<<<", "=======", ">>>>>>>")
remaining = [m for m in markers if m in result]
if remaining:
    raise SystemExit(f"ERROR: conflict markers remain: {remaining}")
print("OK: src/main.jsx contains no Git conflict markers.")
