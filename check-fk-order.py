import sqlite3
from collections import defaultdict, deque

DB = "torrenttwist-backend/database.sqlite"

conn = sqlite3.connect(DB)

try:
    tables = {
        row[0]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type=\"table\" AND name NOT LIKE \"sqlite_%\""
        )
        if row[0] != "user_sessions"
    }

    deps = defaultdict(set)
    children = defaultdict(set)

    for table in tables:
        for row in conn.execute(f"PRAGMA foreign_key_list(\"{table}\")"):
            parent = row[2]
            if parent in tables and parent != table:
                deps[table].add(parent)
                children[parent].add(table)

    remaining = {table: set(deps[table]) for table in tables}
    queue = deque(sorted(table for table in tables if not remaining[table]))
    order = []

    while queue:
        table = queue.popleft()
        order.append(table)

        for child in sorted(children[table]):
            remaining[child].discard(table)
            if not remaining[child]:
                queue.append(child)

    print(f"Tables ordonnees : {len(order)} / {len(tables)}")
    print()
    print("ORDRE :")
    for index, table in enumerate(order, 1):
        print(f"{index}. {table}")

    unresolved = sorted(tables - set(order))
    print()
    print("NON ORDONNEES :", unresolved)

finally:
    conn.close()
