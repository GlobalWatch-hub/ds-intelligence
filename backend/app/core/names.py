"""Repair names mangled during CRM ingest.

A few accented names were decoded with errors='replace' at ingest time, turning
'i'-with-acute (UTF-8 C3 AD) into U+FFFD (replacement char) followed by U+00AD
(soft hyphen). This is the one corruption seen in the live mirror ("Patricia
Vieira"); repair it on read so dropdowns and tables show the correct name.
"""
from __future__ import annotations

# U+FFFD (replacement char) + U+00AD (soft hyphen) -> was "i" with acute (U+00ED).
_BROKEN_I = "�­"


def fix_name(name: str | None) -> str | None:
    if not name:
        return name
    return name.replace(_BROKEN_I, "í")
