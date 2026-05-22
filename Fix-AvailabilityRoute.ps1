# Fix-AvailabilityRoute.ps1
# Run from repo root: .\Fix-AvailabilityRoute.ps1
# Or pass path: .\Fix-AvailabilityRoute.ps1 -FilePath "src\app\api\availability\route.ts"

param(
    [string]$FilePath = "src\app\api\availability\route.ts"
)

$content = Get-Content $FilePath -Raw

# Fix .first<Availability>(staffId, dow) → .bind(staffId, dow).first<Availability>()
$content = $content -replace '\.first<Availability>\(staffId,\s*dow\)', '.bind(staffId, dow).first<Availability>()'

# Fix .first<{ duration: number }>(serviceId) → .bind(serviceId).first<{ duration: number }>()
$content = $content -replace '\.first<\{\s*duration:\s*number\s*\}>\(serviceId\)', '.bind(serviceId).first<{ duration: number }>()'

Set-Content $FilePath $content -NoNewline
Write-Host "Fixed: $FilePath"
