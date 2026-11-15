"""List every file the site needs, so the device can save them all for offline use.

Output:  offline-manifest.json at the site root, read by sw.js (the offline store).
         `files`: paths from the site root. `version`: changes whenever any
         listed file's name or content changes, which tells a device that has
         an older copy to fetch the site again.

What is listed: the page, everything under src/ and public/, and the prepared
data under data/processed/ (including the map tiles and the ground photos).
Not listed: raw downloads, scripts, tests, documents.

Run this after any change to the site's files, before each release:
    python3 scripts/build_offline_manifest.py
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_FILE = REPO_ROOT / "offline-manifest.json"
# Single files at the root, and folders whose every file the site may load.
ROOT_FILES = ["index.html"]
FOLDERS = ["src", "public", "data/processed"]
# Notes and licences that travel with the files but that the site never loads.
SKIPPED_NAMES = {"LICENSE", ".DS_Store"}


def site_files() -> list[Path]:
    """Every file the site may load, in a stable order."""
    files = [REPO_ROOT / name for name in ROOT_FILES]
    for folder in FOLDERS:
        files.extend(path for path in (REPO_ROOT / folder).rglob("*") if path.is_file() and path.name not in SKIPPED_NAMES)
    return sorted(files)


def main() -> None:
    files = site_files()
    digest = hashlib.sha256()
    total_bytes = 0
    for path in files:
        data = path.read_bytes()
        total_bytes += len(data)
        digest.update(path.relative_to(REPO_ROOT).as_posix().encode())
        digest.update(hashlib.sha256(data).digest())
    manifest = {
        "about": "Files the site needs offline. Built by scripts/build_offline_manifest.py; do not edit.",
        "version": digest.hexdigest()[:16],
        "files": [path.relative_to(REPO_ROOT).as_posix() for path in files],
    }
    OUTPUT_FILE.write_text(json.dumps(manifest, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_FILE.name}: {len(files)} files, {total_bytes / 1e6:.1f} MB, version {manifest['version']}")


if __name__ == "__main__":
    main()
