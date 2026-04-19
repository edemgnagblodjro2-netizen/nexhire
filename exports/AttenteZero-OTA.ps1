# ============================================================
#  AttenteZero - OTA Update (rapide)
#  Pousse les changements via EAS Update (1-2 min au lieu de 20)
#  Pas besoin d'incrementer versionCode ni de soumettre Play Store
# ============================================================

$ErrorActionPreference = "Stop"

# --- CONFIGURATION (modifie ici si tes chemins changent) ---
$ProjectPath  = "D:\attentezero-app"
$ZipPath      = "$env:USERPROFILE\Downloads\service-qc-update.zip"
$BackupPath   = "$env:USERPROFILE\Downloads\package-backup.json"
# -----------------------------------------------------------

function Write-Step {
    param([string]$Message, [string]$Color = "Cyan")
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor $Color
    Write-Host "  $Message" -ForegroundColor $Color
    Write-Host "===========================================" -ForegroundColor $Color
}

function Write-OK    { param([string]$m) Write-Host "  [OK] $m" -ForegroundColor Green }
function Write-Info  { param([string]$m) Write-Host "  [..] $m" -ForegroundColor Yellow }
function Write-Fail  { param([string]$m) Write-Host "  [!!] $m" -ForegroundColor Red }

# === BANNIERE ===
Clear-Host
Write-Host ""
Write-Host "  +-------------------------------------------+" -ForegroundColor Magenta
Write-Host "  |   ATTENTEZERO - OTA UPDATE (RAPIDE)       |" -ForegroundColor Magenta
Write-Host "  |   Mise a jour sans rebuild APK            |" -ForegroundColor Magenta
Write-Host "  +-------------------------------------------+" -ForegroundColor Magenta
Write-Host ""

# === ETAPE 0 : Verifier que le projet existe ===
Write-Step "Etape 0 : Verification du projet"
if (-not (Test-Path $ProjectPath)) {
    Write-Fail "Le dossier projet n'existe pas : $ProjectPath"
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}
Write-OK "Projet trouve : $ProjectPath"

# === ETAPE 1 : Verifier que le zip est telecharge ===
Write-Step "Etape 1 : Verification du zip"
if (-not (Test-Path $ZipPath)) {
    Write-Fail "Le zip n'a pas ete telecharge : $ZipPath"
    Write-Host ""
    Write-Host "  --> Va dans Replit, ouvre le dossier 'exports/'," -ForegroundColor Yellow
    Write-Host "      clic droit sur 'service-qc-update.zip' --> Download," -ForegroundColor Yellow
    Write-Host "      puis relance ce script." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}
$zipInfo = Get-Item $ZipPath
$zipSizeKB = [math]::Round($zipInfo.Length / 1KB, 1)
$zipAge = [math]::Round((New-TimeSpan -Start $zipInfo.LastWriteTime -End (Get-Date)).TotalMinutes, 0)
Write-OK "Zip trouve : $zipSizeKB KB (telecharge il y a $zipAge min)"

if ($zipAge -gt 60) {
    Write-Host ""
    Write-Info "Attention : ton zip date de plus d'1 heure."
    $resp = Read-Host "  Continuer quand meme ? (O/N)"
    if ($resp -ne "O" -and $resp -ne "o") {
        Write-Host "  Annule. Telecharge le zip plus recent depuis Replit." -ForegroundColor Yellow
        Read-Host "Appuie sur Entree pour fermer"
        exit 0
    }
}

# === ETAPE 2 : Sauvegarde package.json ===
Write-Step "Etape 2 : Sauvegarde de package.json"
if (Test-Path "$ProjectPath\package.json") {
    Copy-Item "$ProjectPath\package.json" $BackupPath -Force
    Write-OK "Sauvegarde dans : $BackupPath"
} else {
    Write-Fail "package.json introuvable dans le projet !"
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}

# === ETAPE 3 : Extraction du zip ===
Write-Step "Etape 3 : Extraction du zip"
try {
    Expand-Archive -Path $ZipPath -DestinationPath $ProjectPath -Force
    Write-OK "Extraction reussie"
} catch {
    Write-Fail "Echec de l'extraction : $_"
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}

# === ETAPE 4 : Restauration package.json ===
Write-Step "Etape 4 : Restauration de package.json"
Copy-Item $BackupPath "$ProjectPath\package.json" -Force
Write-OK "package.json restaure"

# === ETAPE 5 : Suppression de TOUS les fichiers map.* ===
Write-Step "Etape 5 : Suppression des fichiers map.* (tabs)"
$mapPattern = Join-Path $ProjectPath "app\(tabs)\map*.tsx"
$mapFiles = Get-ChildItem -Path $mapPattern -ErrorAction SilentlyContinue
if ($mapFiles -and $mapFiles.Count -gt 0) {
    foreach ($f in $mapFiles) {
        Remove-Item $f.FullName -Force
        Write-OK "Supprime : $($f.Name)"
    }
} else {
    Write-Info "Aucun fichier map.* trouve (OK)"
}

# === ETAPE 6 : Demande du message de l'update ===
Write-Step "Etape 6 : Message de l'update"
Write-Host ""
Write-Host "  Decris brievement ce que contient cette MAJ" -ForegroundColor Yellow
Write-Host "  (ex: 'Audit services -17 doublons, -61 URLs')" -ForegroundColor Gray
Write-Host ""
$updateMessage = Read-Host "  Message"
if ([string]::IsNullOrWhiteSpace($updateMessage)) {
    $updateMessage = "OTA update " + (Get-Date -Format "yyyy-MM-dd HH:mm")
    Write-Info "Message par defaut : $updateMessage"
}

# === ETAPE 7 : Push EAS Update ===
Write-Step "Etape 7 : Push OTA via EAS Update"
Write-Host ""
Write-Info "Lancement de eas update --branch production..."
Write-Host ""

Set-Location $ProjectPath

try {
    eas update --branch production --message "$updateMessage"
    Write-Host ""
    Write-OK "OTA update pousse avec succes !"
    Write-Host ""
    Write-Host "  Les utilisateurs recevront la MAJ automatiquement" -ForegroundColor Green
    Write-Host "  a la prochaine ouverture de l'app (quelques secondes)." -ForegroundColor Green
} catch {
    Write-Fail "Echec du push OTA : $_"
    Write-Host ""
    Write-Host "  Causes possibles :" -ForegroundColor Yellow
    Write-Host "    - eas update pas encore configure (lance 'eas update:configure' une fois)" -ForegroundColor Yellow
    Write-Host "    - Pas connecte a EAS (lance 'eas login')" -ForegroundColor Yellow
    Write-Host "    - Channel 'production' inexistant (verifie eas.json)" -ForegroundColor Yellow
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}

Write-Host ""
Write-Host "  +---------------------------------+" -ForegroundColor Magenta
Write-Host "  |   OTA UPDATE TERMINE !          |" -ForegroundColor Magenta
Write-Host "  +---------------------------------+" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Note : Pour les changements de code natif" -ForegroundColor Gray
Write-Host "  (nouvelles permissions, plugins, etc.)," -ForegroundColor Gray
Write-Host "  utilise plutot AttenteZero-AutoUpdate.bat (build complet)." -ForegroundColor Gray
Write-Host ""
Read-Host "Appuie sur Entree pour fermer"
