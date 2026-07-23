#!/usr/bin/env python3
from pathlib import Path
import re

path = Path("src/main.jsx")
if not path.exists():
    raise SystemExit("ERROR: src/main.jsx not found. Run from the repository root.")

text = path.read_text(encoding="utf-8")
pattern = re.compile(
    r"^import\s*\{\s*getManifest\s*,\s*getChapter\s*\}\s*from\s*[\"']\.\/services\/bibleData[\"'];?\s*$",
    re.MULTILINE,
)
matches = list(pattern.finditer(text))
if not matches:
    raise SystemExit("ERROR: no bibleData import found.")
cleaned = pattern.sub("", text).lstrip("\n")
cleaned = 'import { getManifest, getChapter } from "./services/bibleData";\n' + cleaned
if any(line.startswith(("<<<<<<< ", "=======", ">>>>>>> ")) for line in cleaned.splitlines()):
    raise SystemExit("ERROR: Git conflict markers still remain. Resolve those first.")
backup = path.with_suffix(".jsx.duplicate-import-backup")
backup.write_text(text, encoding="utf-8")
path.write_text(cleaned, encoding="utf-8")
print(f"OK: reduced {len(matches)} bibleData import(s) to exactly one.")
print(f"Backup: {backup}")
