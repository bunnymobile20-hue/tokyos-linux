"""
Tokyo IA — Memory Loop
Salva histórico de comandos, resultados e aprendizados em SQLite.
"""

import json
import os
import sqlite3
from datetime import datetime, timezone
from typing import Optional

MEMORY_DB = "/opt/tokyos/tokyo-ia/data/tokyo_memory.db"


def _get_conn() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(MEMORY_DB), exist_ok=True)
    conn = sqlite3.connect(MEMORY_DB)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = _get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS commands (
            id TEXT PRIMARY KEY,
            source TEXT,
            user TEXT,
            raw_text TEXT,
            intent TEXT,
            selected_tool TEXT,
            status TEXT,
            created_at TEXT,
            result_summary TEXT
        );
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT,
            context TEXT,
            content TEXT,
            tags TEXT,
            created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS tool_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            command_id TEXT,
            tool_id TEXT,
            action TEXT,
            status TEXT,
            result TEXT,
            created_at TEXT
        );
    """)
    conn.commit()
    conn.close()


def save_command(cmd: dict) -> str:
    init_db()
    conn = _get_conn()
    conn.execute(
        """INSERT OR REPLACE INTO commands (id, source, user, raw_text, intent, selected_tool, status, created_at, result_summary)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            cmd.get("id", ""),
            cmd.get("source", ""),
            cmd.get("user", ""),
            cmd.get("raw_text", ""),
            cmd.get("intent", ""),
            cmd.get("selected_tool", ""),
            cmd.get("status", ""),
            cmd.get("timestamp", datetime.now(timezone.utc).isoformat()),
            cmd.get("result_summary", ""),
        ),
    )
    conn.commit()
    conn.close()
    return cmd.get("id", "")


def save_memory(user: str, context: str, content: str, tags: Optional[list[str]] = None) -> int:
    init_db()
    conn = _get_conn()
    cur = conn.execute(
        "INSERT INTO memories (user, context, content, tags, created_at) VALUES (?, ?, ?, ?, ?)",
        (user, context, content, json.dumps(tags or []), datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()
    mem_id = cur.lastrowid
    conn.close()
    return mem_id


def save_tool_result(command_id: str, tool_id: str, action: str, status: str, result: str):
    init_db()
    conn = _get_conn()
    conn.execute(
        "INSERT INTO tool_results (command_id, tool_id, action, status, result, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (command_id, tool_id, action, status, result, datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()
    conn.close()


def get_recent_commands(limit: int = 10) -> list[dict]:
    init_db()
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM commands ORDER BY created_at DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_recent_memories(limit: int = 5) -> list[dict]:
    init_db()
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM memories ORDER BY created_at DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
