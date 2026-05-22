# Fix-AllRoutes.ps1 — fixes all .first/.all inline arg issues across project
# Run from repo root: .\Fix-AllRoutes.ps1

function Fix-File {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        Write-Host "SKIP (not found): $Path"
        return
    }

    $content = Get-Content $Path -Raw

    # availability/route.ts
    # .all<BlockedTime>(staffId, date, dow)
    $content = $content -replace '\.all<BlockedTime>\(staffId,\s*date,\s*dow\)', '.bind(staffId, date, dow).all<BlockedTime>()'

    # bookings/route.ts
    # .first<{ id: number; name: string; price: number; duration: number }>(service_id)
    $content = $content -replace '\.first<\{\s*id:\s*number;\s*name:\s*string;\s*price:\s*number;\s*duration:\s*number\s*\}>\(service_id\)', '.bind(service_id).first<{ id: number; name: string; price: number; duration: number }>()'

    # .first<{ name: string }>(staff_id)
    $content = $content -replace '\.first<\{\s*name:\s*string\s*\}>\(staff_id\)', '.bind(staff_id).first<{ name: string }>()'

    # bookings/[id]/route.ts
    # .first<Booking>(status, id)
    $content = $content -replace '\.first<Booking>\(status,\s*id\)', '.bind(status, id).first<Booking>()'

    # .first<Booking>(id)
    $content = $content -replace '\.first<Booking>\(id\)', '.bind(id).first<Booking>()'

    Set-Content $Path $content -NoNewline
    Write-Host "Fixed: $Path"
}

Fix-File "src\app\api\availability\route.ts"
Fix-File "src\app\api\bookings\route.ts"
Fix-File "src\app\api\bookings\[id]\route.ts"

Write-Host "`nDone. Commit and push."
