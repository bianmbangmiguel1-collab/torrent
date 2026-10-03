from pathlib import Path
import re


SOURCE = Path("torrenttwist-dump-d1.sql")
OUTPUT_DIR = Path("d1-data-tables")


def main():
    if not SOURCE.exists():
        raise FileNotFoundError(
            f"Fichier introuvable : {SOURCE}"
        )

    OUTPUT_DIR.mkdir(exist_ok=True)

    text = SOURCE.read_text(
        encoding="utf-8"
    )

    start = text.index("-- DONNEES")
    end = text.index("-- INDEX")

    data = text[start:end]

    pattern = re.compile(
        r'INSERT INTO "([^"]+)"'
    )

    matches = list(pattern.finditer(data))

    if not matches:
        raise RuntimeError(
            "Aucun INSERT INTO trouvé."
        )

    table_order = []
    table_statements = {}

    for match in matches:
        table = match.group(1)

        if table not in table_statements:
            table_order.append(table)
            table_statements[table] = []

    for table in table_order:
        statement_pattern = re.compile(
            rf'INSERT INTO "{re.escape(table)}".*?;\n',
            re.DOTALL,
        )

        statements = statement_pattern.findall(data)

        table_statements[table] = statements

    # Nettoyage des anciens fichiers
    for old_file in OUTPUT_DIR.glob("*.sql"):
        old_file.unlink()

    total = 0

    print()
    print("========================================")
    print(" CREATION DES FICHIERS DE TEST D1")
    print("========================================")
    print()

    for index, table in enumerate(
        table_order,
        start=1,
    ):
        statements = table_statements[table]

        if not statements:
            continue

        filename = (
            OUTPUT_DIR
            / f"{index:03d}-{table}.sql"
        )

        content = (
            "-- TorrentTwist -> D1\n"
            f"-- Table : {table}\n"
            f"-- INSERT : {len(statements)}\n\n"
            + "".join(statements)
        )

        filename.write_text(
            content,
            encoding="utf-8",
            newline="\n",
        )

        total += len(statements)

        print(
            f"{index:>3}. "
            f"{table:<35} "
            f"{len(statements):>6} INSERT"
        )

    print()
    print("========================================")
    print(f"Tables avec données : {len(table_order)}")
    print(f"INSERT total        : {total}")
    print(f"Dossier             : {OUTPUT_DIR}")
    print("========================================")
    print()


if __name__ == "__main__":
    main()