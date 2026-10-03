
import sqlite3
from pathlib import Path


DB_PATH = Path("torrenttwist-backend/database.sqlite")
OUTPUT_PATH = Path("torrenttwist-dump-d1.sql")

EXCLUDED_TABLES = {
    "user_sessions",
    "sqlite_sequence",
}


def quote_identifier(value: str) -> str:
    """
    Protège un identifiant SQLite avec des guillemets doubles.
    """
    return '"' + value.replace('"', '""') + '"'


def quote_value(value):
    """
    Convertit une valeur SQLite en littéral SQL compatible avec D1.
    """
    if value is None:
        return "NULL"

    if isinstance(value, bool):
        return "1" if value else "0"

    if isinstance(value, int):
        return str(value)

    if isinstance(value, float):
        return repr(value)

    if isinstance(value, bytes):
        return f"X'{value.hex()}'"

    text = str(value)
    text = text.replace("'", "''")

    return f"'{text}'"


def get_tables(connection):
    """
    Récupère toutes les tables à migrer et les ordonne
    selon leurs dépendances de clés étrangères.

    Une table enfant est placée après les tables parentes.
    """

    rows = connection.execute("""
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    """).fetchall()

    tables = [
        row["name"]
        for row in rows
        if row["name"] not in EXCLUDED_TABLES
    ]

    dependencies = {
        table: set()
        for table in tables
    }

    children = {
        table: set()
        for table in tables
    }

    # Analyse des clés étrangères
    for table in tables:
        foreign_keys = connection.execute(
            f"PRAGMA foreign_key_list({quote_identifier(table)})"
        ).fetchall()

        for foreign_key in foreign_keys:
            parent = foreign_key["table"]

            # On ignore :
            # - les tables exclues
            # - les références vers elles-mêmes
            if parent in dependencies and parent != table:
                dependencies[table].add(parent)
                children[parent].add(table)

    # Copie des dépendances restantes
    remaining = {
        table: set(dependencies[table])
        for table in tables
    }

    # Tables sans dépendance
    ready = sorted(
        table
        for table in tables
        if not remaining[table]
    )

    ordered_tables = []

    # Tri topologique
    while ready:
        table = ready.pop(0)

        if table in ordered_tables:
            continue

        ordered_tables.append(table)

        for child in sorted(children[table]):
            remaining[child].discard(table)

            if (
                not remaining[child]
                and child not in ordered_tables
                and child not in ready
            ):
                ready.append(child)

        ready.sort()

    # Vérification des tables impossibles à ordonner
    unresolved = [
        table
        for table in tables
        if table not in ordered_tables
    ]

    if unresolved:
        unresolved_details = []

        for table in unresolved:
            deps = sorted(remaining[table])

            unresolved_details.append(
                f"{table} -> {deps}"
            )

        raise RuntimeError(
            "Impossible de déterminer l'ordre des tables.\n"
            "Dépendances circulaires détectées :\n"
            + "\n".join(unresolved_details)
        )

    return ordered_tables


def write_table_schemas(connection, output, tables):
    """
    Écrit toutes les structures CREATE TABLE.
    """

    for table_name in tables:
        row = connection.execute(
            """
            SELECT sql
            FROM sqlite_master
            WHERE type = 'table'
              AND name = ?
            """,
            (table_name,),
        ).fetchone()

        if row is None or row["sql"] is None:
            continue

        output.write(row["sql"])
        output.write(";\n\n")


def write_table_data(connection, output, tables):
    """
    Écrit les INSERT dans le même ordre que les tables
    calculées par get_tables().
    """

    for table_name in tables:
        columns = connection.execute(
            f"PRAGMA table_info({quote_identifier(table_name)})"
        ).fetchall()

        if not columns:
            continue

        column_names = [
            quote_identifier(column["name"])
            for column in columns
        ]

        rows = connection.execute(
            f"SELECT * FROM {quote_identifier(table_name)}"
        )

        row_count = 0

        for row in rows:
            values = [
                quote_value(row[column["name"]])
                for column in columns
            ]

            output.write(
                f"INSERT INTO {quote_identifier(table_name)} "
                f"({', '.join(column_names)}) VALUES "
                f"({', '.join(values)});\n"
            )

            row_count += 1

        if row_count > 0:
            output.write("\n")


def write_indexes(connection, output):
    """
    Écrit les index après l'insertion des données.
    """

    indexes = connection.execute("""
        SELECT sql
        FROM sqlite_master
        WHERE type = 'index'
          AND sql IS NOT NULL
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    """).fetchall()

    for index_row in indexes:
        output.write(index_row["sql"])
        output.write(";\n")


def write_triggers(connection, output):
    """
    Écrit les triggers après les données et les index.
    """

    triggers = connection.execute("""
        SELECT sql
        FROM sqlite_master
        WHERE type = 'trigger'
          AND sql IS NOT NULL
        ORDER BY name
    """).fetchall()

    for trigger_row in triggers:
        output.write(trigger_row["sql"])
        output.write(";\n\n")


def write_views(connection, output):
    """
    Écrit les vues SQLite.

    Les vues sont écrites à la fin car elles dépendent
    généralement des tables déjà créées.
    """

    views = connection.execute("""
        SELECT sql
        FROM sqlite_master
        WHERE type = 'view'
          AND sql IS NOT NULL
        ORDER BY name
    """).fetchall()

    for view_row in views:
        output.write(view_row["sql"])
        output.write(";\n\n")


def print_migration_order(tables):
    """
    Affiche l'ordre final de migration.
    """

    print()
    print("Ordre de migration des tables :")
    print("----------------------------------------")

    for index, table_name in enumerate(tables, start=1):
        print(f"{index:>3}. {table_name}")

    print("----------------------------------------")
    print(f"Total : {len(tables)} tables")
    print()


def main():
    if not DB_PATH.exists():
        raise FileNotFoundError(
            f"Base SQLite introuvable : {DB_PATH}"
        )

    print("========================================")
    print(" TorrentTwist -> Cloudflare D1")
    print(" Génération du dump SQL")
    print("========================================")
    print()
    print(f"Base source : {DB_PATH}")
    print(f"Dump cible  : {OUTPUT_PATH}")
    print()

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row

    try:
        # Vérification de l'intégrité SQLite
        integrity = connection.execute(
            "PRAGMA integrity_check"
        ).fetchone()[0]

        print(f"Intégrité SQLite : {integrity}")

        if integrity != "ok":
            raise RuntimeError(
                f"La base SQLite n'est pas intègre : {integrity}"
            )

        # Récupération + ordre des tables
        tables = get_tables(connection)

        print(f"Tables à migrer : {len(tables)}")

        print_migration_order(tables)

        # Comptage des objets SQLite
        view_count = connection.execute("""
            SELECT COUNT(*)
            FROM sqlite_master
            WHERE type = 'view'
        """).fetchone()[0]

        trigger_count = connection.execute("""
            SELECT COUNT(*)
            FROM sqlite_master
            WHERE type = 'trigger'
        """).fetchone()[0]

        index_count = connection.execute("""
            SELECT COUNT(*)
            FROM sqlite_master
            WHERE type = 'index'
              AND sql IS NOT NULL
              AND name NOT LIKE 'sqlite_%'
        """).fetchone()[0]

        print(f"Index à migrer    : {index_count}")
        print(f"Triggers à migrer : {trigger_count}")
        print(f"Vues à migrer     : {view_count}")
        print()

        with OUTPUT_PATH.open(
            "w",
            encoding="utf-8",
            newline="\n",
        ) as output:

            # ========================================
            # EN-TÊTE
            # ========================================

            output.write(
                "-- TorrentTwist -> Cloudflare D1\n"
            )
            output.write(
                "-- Généré automatiquement depuis SQLite\n"
            )
            output.write(
                "-- Encodage UTF-8\n"
            )
            output.write(
                "-- Les tables sont ordonnées selon leurs dépendances FK\n"
            )
            output.write(
                "-- user_sessions est volontairement exclue\n"
            )
            output.write("\n")

            # ========================================
            # PRAGMA
            # ========================================

            output.write(
                "PRAGMA foreign_keys=OFF;\n"
            )

            output.write(
                "PRAGMA defer_foreign_keys=ON;\n"
            )

            output.write("\n")

            # ========================================
            # TABLES
            # ========================================

            output.write(
                "-- TABLES\n"
            )
            output.write(
                "-- ========================================\n\n"
            )

            write_table_schemas(
                connection,
                output,
                tables,
            )

            # ========================================
            # DONNEES
            # ========================================

            output.write(
                "-- DONNEES\n"
            )
            output.write(
                "-- ========================================\n\n"
            )

            write_table_data(
                connection,
                output,
                tables,
            )

            # ========================================
            # INDEX
            # ========================================

            output.write(
                "-- INDEX\n"
            )
            output.write(
                "-- ========================================\n\n"
            )

            write_indexes(
                connection,
                output,
            )

            output.write("\n")

            # ========================================
            # TRIGGERS
            # ========================================

            output.write(
                "-- TRIGGERS\n"
            )
            output.write(
                "-- ========================================\n\n"
            )

            write_triggers(
                connection,
                output,
            )

            # ========================================
            # VIEWS
            # ========================================

            output.write(
                "-- VIEWS\n"
            )
            output.write(
                "-- ========================================\n\n"
            )

            write_views(
                connection,
                output,
            )

        print("========================================")
        print(" Dump généré avec succès")
        print("========================================")
        print()
        print(f"Fichier : {OUTPUT_PATH}")
        print(
            f"Taille  : {OUTPUT_PATH.stat().st_size:,} octets"
        )
        print()

    finally:
        connection.close()


if __name__ == "__main__":
    main()


