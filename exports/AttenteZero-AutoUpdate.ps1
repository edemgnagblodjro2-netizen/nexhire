# ============================================================
#  AttenteZero - Mise a jour automatique
#  Double-clique sur "AttenteZero-AutoUpdate.bat" pour lancer
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
Write-Host "  |   ATTENTEZERO - MISE A JOUR AUTOMATIQUE   |" -ForegroundColor Magenta
Write-Host "  +-------------------------------------------+" -ForegroundColor Magenta
Write-Host ""

# === ETAPE 0 : Verifier que le projet existe ===
Write-Step "Etape 0 : Verification du projet"
if (-not (Test-Path $ProjectPath)) {
    Write-Fail "Le dossier projet n'existe pas : $ProjectPath"
    Write-Host ""
    Write-Host "  Modifie la variable `$ProjectPath en haut du script." -ForegroundColor Yellow
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
Write-Step "Etape 5 : Suppression de tous les fichiers map.* (tabs)"
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
# Verification finale
$remaining = Get-ChildItem -Path $mapPattern -ErrorAction SilentlyContinue
if ($remaining -and $remaining.Count -gt 0) {
    Write-Fail "Des fichiers map.* sont encore presents !"
    $remaining | ForEach-Object { Write-Host "    - $($_.Name)" -ForegroundColor Red }
} else {
    Write-OK "Confirmation : aucun map.*.tsx restant"
}

# === ETAPE 6 : Bump versionCode ===
Write-Step "Etape 6 : Incrementation du versionCode"
$appJsonPath = Join-Path $ProjectPath "app.json"
if (Test-Path $appJsonPath) {
    $appJson = Get-Content $appJsonPath -Raw
    if ($appJson -match '"versionCode"\s*:\s*(\d+)') {
        $oldCode = [int]$matches[1]
        $newCode = $oldCode + 1
        $appJson = $appJson -replace '("versionCode"\s*:\s*)\d+', "`${1}$newCode"
        Set-Content -Path $appJsonPath -Value $appJson -NoNewline -Encoding UTF8
        Write-OK "versionCode : $oldCode --> $newCode"
    } else {
        Write-Info "versionCode introuvable dans app.json (a faire manuellement)"
    }
} else {
    Write-Info "app.json introuvable (a faire manuellement)"
}

# === ETAPE 7 : Verifications ===
Write-Step "Etape 7 : Verifications finales"

Write-Host ""
Write-Host "  --- Map cachee ---" -ForegroundColor White
$mapHidden = Select-String -Path "$ProjectPath\app\(tabs)\_layout.tsx" -Pattern 'name="map"'
if ($mapHidden) {
    foreach ($m in $mapHidden) {
        Write-Host "    Ligne $($m.LineNumber) : $($m.Line.Trim())" -ForegroundColor Gray
    }
    Write-OK "Map cachee : trouve $($mapHidden.Count) reference(s)"
} else {
    Write-Fail "Aucune reference 'map' trouvee dans _layout.tsx"
}

Write-Host ""
Write-Host "  --- Banniere slider ---" -ForegroundColor White
$checks = @(
    @{ Path = "$ProjectPath\components\HomeBannerSlider.tsx"; Label = "HomeBannerSlider.tsx" }
    @{ Path = "$ProjectPath\assets\images\banner-community.png"; Label = "banner-community.png" }
    @{ Path = "$ProjectPath\assets\images\banner-help.png"; Label = "banner-help.png" }
)
foreach ($c in $checks) {
    if (Test-Path $c.Path) {
        Write-OK $c.Label
    } else {
        Write-Fail "$($c.Label) MANQUANT"
    }
}

# === ETAPE 8 : Lancer EAS Build (optionnel) ===
Write-Step "Etape 8 : Build APK Android"
Write-Host ""
Write-Host "  Tous les fichiers sont en place !" -ForegroundColor Green
Write-Host ""
$buildResp = Read-Host "  Veux-tu lancer le build APK maintenant ? (O/N)"
if ($buildResp -eq "O" -or $buildResp -eq "o") {
    Write-Host ""
    Write-Info "Lancement du build EAS Android (production)..."
    Write-Host ""
    Set-Location $ProjectPath
    eas build --platform android --profile production --clear-cache
    Write-Host ""
    Write-OK "Commande build envoyee. Suis le lien affiche par EAS pour suivre l'avancement."
} else {
    Write-Host ""
    Write-Info "Build non lance."
    Write-Host ""
    Write-Host "  Pour builder plus tard, ouvre PowerShell et lance :" -ForegroundColor Yellow
    Write-Host "    cd $ProjectPath" -ForegroundColor White
    Write-Host "    eas build --platform android --profile production --clear-cache" -ForegroundColor White
}

Write-Host ""
Write-Host "  +---------------------------------+" -ForegroundColor Magenta
Write-Host "  |   MISE A JOUR TERMINEE !        |" -ForegroundColor Magenta
Write-Host "  +---------------------------------+" -ForegroundColor Magenta
Write-Host ""
Read-Host "Appuie sur Entree pour fermer"
