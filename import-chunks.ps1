# import-tables.ps1 - Import D1 par table complete
$DB_NAME = "torrenttwist-db"
$DUMP_FILE = ".\torrenttwist-dump.sql"
$ERROR_LOG = ".\import-errors.log"

if (Test-Path $ERROR_LOG) { Remove-Item $ERROR_LOG }

Write-Host "Lecture du fichier..."
$content = Get-Content $DUMP_FILE -Raw -Encoding UTF8

# Decouper par instruction complete (CREATE TABLE ... ) et (INSERT ...);
# On cherche les ; suivis d'un saut de ligne, mais SEULEMENT quand la ligne suivante commence par CREATE, INSERT, UPDATE, DELETE, DROP, ALTER, ou PRAGMA
$pattern = ";(?=\s*\r?\n\s*(CREATE|INSERT|UPDATE|DELETE|DROP|ALTER|PRAGMA|COMMIT|BEGIN))"
$statements = [regex]::Split($content, $pattern)

# Nettoyer
$cleanStatements = @()
foreach ($stmt in $statements) {
    $t = $stmt.Trim()
    if ($t -eq "") { continue }
    if ($t.StartsWith("--")) { continue }
    if ($t -match "^(BEGIN TRANSACTION|COMMIT|PRAGMA)") { continue }
    $cleanStatements += $t
}

$total = $cleanStatements.Count
Write-Host "Total instructions : $total"
Write-Host ""

$i = 0
$success = 0
$failed = 0

foreach ($stmt in $cleanStatements) {
    $i++
    $sql = $stmt.Trim()
    if ($sql -eq "") { continue }

    # Verifier taille
    $len = $sql.Length
    if ($len -gt 90000) {
        Write-Host "[$i/$total] TROP LONG ($len chars) - on decoupe par lignes"
        # Decouper par lignes pour les gros blocs
        $lines = $sql -split "`n"
        $buffer = ""
        foreach ($line in $lines) {
            if (($buffer.Length + $line.Length) -gt 90000) {
                $preview = $buffer.Substring(0, [Math]::Min(60, $buffer.Length)) -replace "`n", " "
                Write-Host "    Envoi chunk: $preview..."
                $result = & npx wrangler d1 execute $DB_NAME --remote --command="$buffer" 2>&1
                if ($LASTEXITCODE -ne 0) {
                    $failed++
                    Add-Content -Path $ERROR_LOG -Value "=== Chunk erreur (table $i) ==="
                    Add-Content -Path $ERROR_LOG -Value $buffer.Substring(0, [Math]::Min(500, $buffer.Length))
                    Add-Content -Path $ERROR_LOG -Value $result
                }
                $buffer = ""
            }
            $buffer += $line + "`n"
        }
        if ($buffer.Trim() -ne "") {
            $result = & npx wrangler d1 execute $DB_NAME --remote --command="$buffer" 2>&1
            if ($LASTEXITCODE -eq 0) { $success++ } else { $failed++ }
        }
        continue
    }

    $preview = $sql.Substring(0, [Math]::Min(60, $sql.Length)) -replace "`n", " "
    Write-Host "[$i/$total] $preview..."

    $result = & npx wrangler d1 execute $DB_NAME --remote --command="$sql" 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
        $success++
        Write-Host "   OK"
    } else {
        $failed++
        Write-Host "   ERREUR"
        Add-Content -Path $ERROR_LOG -Value "=== Instruction $i ==="
        Add-Content -Path $ERROR_LOG -Value $sql.Substring(0, [Math]::Min(1000, $sql.Length))
        Add-Content -Path $ERROR_LOG -Value "--- Sortie ---"
        Add-Content -Path $ERROR_LOG -Value $result
        Add-Content -Path $ERROR_LOG -Value ""
    }
}

Write-Host ""
Write-Host "Import termine !"
Write-Host "Succes : $success"
Write-Host "Echecs : $failed"
if ($failed -gt 0) {
    Write-Host "Voir les erreurs dans : $ERROR_LOG"
}