import sqlite3
from pathlib import Path


DB_PATH = Path("torrenttwist-backend/database.sqlite")

EXCLUDED_TABLES = {
    "user_sessions",
    "sqlite_sequence",
}


def quote_identifier(value):
    return '"' + value.replace('"', '""') + '"'


def get_tables(connection):
    rows = connection.execute("""
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    """).fetchall()

    return [
        row["name"]
        for row in rows
        if row["name"] not in EXCLUDED_TABLES
    ]


def get_table_order(connection, tables):
    dependencies = {
        table: set()
        for table in tables
    }

    children = {
        table: set()
        for table in tables
    }

    for table in tables:
        foreign_keys = connection.execute(
            f"PRAGMA foreign_key_list({quote_identifier(table)})"
        ).fetchall()

        for foreign_key in foreign_keys:
            parent = foreign_key["table"]

            if parent in dependencies and parent != table:
                dependencies[table].add(parent)
                children[parent].add(table)

    remaining = {
        table: set(dependencies[table])
        for table in tables
    }

    ready = sorted(
        table
        for table in tables
        if not remaining[table]
    )

    ordered = []

    while ready:
        table = ready.pop(0)

        if table in ordered:
            continue

        ordered.append(table)

        for child in sorted(children[table]):
            remaining[child].discard(table)

            if (
                not remaining[child]
                and child not in ordered
                and child not in ready
            ):
                ready.append(child)

        ready.sort()

    unresolved = [
        table
        for table in tables
        if table not in ordered
    ]

    if unresolved:
        print()
        print("ERREUR : dépendances circulaires détectées.")
        print()

        for table in unresolved:
            print(
                f"{table} -> "
                f"{sorted(remaining[table])}"
            )

        raise RuntimeError(
            "Impossible de déterminer l'ordre des tables."
        )

    return ordered


def check_foreign_keys(connection, tables, ordered):
    print()
    print("========================================")
    print(" ANALYSE DES CLES ETRANGERES")
    print("========================================")
    print()

    problems = 0

    for table in ordered:
        foreign_keys = connection.execute(
            f"PRAGMA foreign_key_list({quote_identifier(table)})"
        ).fetchall()

        if not foreign_keys:
            continue

        for foreign_key in foreign_keys:
            parent = foreign_key["table"]
            child_column = foreign_key["from"]
            parent_column = foreign_key["to"]

            if parent not in tables:
                continue

            child = quote_identifier(table)
            child_col = quote_identifier(child_column)
            parent_table = quote_identifier(parent)
            parent_col = quote_identifier(parent_column)

            sql = f"""
                SELECT COUNT(*)
                FROM {child} AS child
                WHERE child.{child_col} IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1
                      FROM {parent_table} AS parent
                      WHERE parent.{parent_col}
                            = child.{child_col}
                  )
            """

            count = connection.execute(sql).fetchone()[0]

            if count:
                problems += 1

                print("PROBLEME FK")
                print(
                    f"  {table}.{child_column}"
                    f" -> {parent}.{parent_column}"
                )
                print(f"  Lignes invalides : {count}")
                print()

    if problems == 0:
        print("Aucune violation FK détectée.")
    else:
        print(
            f"Nombre de relations FK problématiques : {problems}"
        )

    return problems


def main():
    if not DB_PATH.exists():
        raise FileNotFoundError(
            f"Base SQLite introuvable : {DB_PATH}"
        )

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row

    try:
        connection.execute("PRAGMA foreign_keys=ON")

        print("========================================")
        print(" DIAGNOSTIC DONNEES D1")
        print("========================================")
        print()

        print(f"Base source : {DB_PATH}")

        integrity = connection.execute(
            "PRAGMA integrity_check"
        ).fetchone()[0]

        print(f"Intégrité SQLite : {integrity}")

        tables = get_tables(connection)

        print(f"Tables : {len(tables)}")

        ordered = get_table_order(
            connection,
            tables,
        )

        print(f"Tables ordonnées : {len(ordered)}")

        print()
        print("========================================")
        print(" ORDRE DE MIGRATION")
        print("========================================")
        print()

        for number, table in enumerate(
            ordered,
            start=1,
        ):
            count = connection.execute(
                f"""
                SELECT COUNT(*)
                FROM {quote_identifier(table)}
                """
            ).fetchone()[0]

            if count > 0:
                print(
                    f"{number:>3}. "
                    f"{table:<35} "
                    f"{count:>6} ligne(s)"
                )

        problems = check_foreign_keys(
            connection,
            tables,
            ordered,
        )

        print()
        print("========================================")
        print(" RESULTAT")
        print("========================================")
        print()

        if problems == 0:
            print(
                "Les données SQLite respectent "
                "toutes les clés étrangères."
            )
        else:
            print(
                "Des problèmes de clés étrangères "
                "ont été détectés."
            )

        print()
        print("Diagnostic terminé.")

    finally:
        connection.close()


if __name__ == "__main__":
    main()