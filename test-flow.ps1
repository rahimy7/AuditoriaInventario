$BASE = "http://localhost:5055/api"
$json = @{ "Content-Type" = "application/json" }

function Show-Step($title) {
  Write-Host "`n=== $title ===" -ForegroundColor Cyan
}

# 1. LOGIN COMO GERENTE
Show-Step "1. LOGIN gerente@inv.com"
$loginGerente = Invoke-RestMethod -Method Post -Uri "$BASE/auth/login" -Body (@{email="gerente@inv.com"; password="1234"} | ConvertTo-Json) -ContentType "application/json"
$tokenG = $loginGerente.token
Write-Host "Token gerente: $tokenG - Nombre: $($loginGerente.user.name)"

# 2. OBTENER ESTADO INICIAL
Show-Step "2. GET /state (con token de gerente)"
$state = Invoke-RestMethod -Method Get -Uri "$BASE/state" -Headers @{Authorization="Bearer $tokenG"}
Write-Host "Usuarios: $($state.users.Count) | Productos: $($state.products.Count) | Auditorias: $($state.audits.Count) | Localidades: $($state.localities.Count)"

$auxiliar = $state.users | Where-Object { $_.role -eq "auxiliar" } | Select-Object -First 1
$supervisor = $state.users | Where-Object { $_.role -eq "supervisor" } | Select-Object -First 1
$productos = $state.products | Select-Object -First 3
Write-Host "Auxiliar seleccionado: $($auxiliar.name) [$($auxiliar.id)]"
Write-Host "Supervisor seleccionado: $($supervisor.name) [$($supervisor.id)]"
Write-Host "Productos a auditar: $(($productos | ForEach-Object { $_.name }) -join ', ')"

# 3. CREAR AUDITORIA
Show-Step "3. POST /audits (gerente crea auditoria)"
$warehouseName = ($state.warehouses | Select-Object -First 1).name
$auditPayload = @{
  name = "Prueba flujo completo - $(Get-Date -Format 'HH:mm:ss')"
  warehouse = $warehouseName
  location = "Pasillo Test"
  supervisorId = $supervisor.id
  assignedTo = @($auxiliar.id)
  productIds = @($productos | ForEach-Object { $_.id })
  blindForAuxiliar = $false
  blindForSupervisor = $false
} | ConvertTo-Json
$audit = Invoke-RestMethod -Method Post -Uri "$BASE/audits" -Body $auditPayload -ContentType "application/json" -Headers @{Authorization="Bearer $tokenG"}
Write-Host "Auditoria creada: $($audit.id) - status: $($audit.status)"

# 4. LOGIN COMO AUXILIAR
Show-Step "4. LOGIN auxiliar@inv.com"
$loginAux = Invoke-RestMethod -Method Post -Uri "$BASE/auth/login" -Body (@{email="auxiliar@inv.com"; password="1234"} | ConvertTo-Json) -ContentType "application/json"
$tokenA = $loginAux.token
Write-Host "Token auxiliar: $tokenA - Nombre: $($loginAux.user.name)"

# 5. AUXILIAR OBTIENE ESTADO Y FILTRA SUS COUNT ITEMS
Show-Step "5. Auxiliar obtiene sus count items"
$stateAux = Invoke-RestMethod -Method Get -Uri "$BASE/state" -Headers @{Authorization="Bearer $tokenA"}
$countItems = $stateAux.countItems | Where-Object { $_.auditId -eq $audit.id }
Write-Host "Count items para la auditoria $($audit.id): $($countItems.Count)"
$countItems | ForEach-Object { Write-Host "  - $($_.id) producto:$($_.productId) status:$($_.status) systemQty:$($_.systemQty)" }

# 6. AUXILIAR CUENTA CADA PRODUCTO
Show-Step "6. Auxiliar registra conteos (PATCH /count-items/:id)"
foreach ($item in $countItems) {
  $countedQty = $item.systemQty + (Get-Random -Minimum -2 -Maximum 3)
  $body = @{ countedQty = $countedQty; notes = "Contado en fisico"; location = "Pasillo Test" } | ConvertTo-Json
  $updated = Invoke-RestMethod -Method Patch -Uri "$BASE/count-items/$($item.id)" -Body $body -ContentType "application/json" -Headers @{Authorization="Bearer $tokenA"}
  Write-Host "  $($updated.id): systemQty=$($updated.systemQty) countedQty=$($updated.countedQty) status=$($updated.status)"
}

# 7. AUXILIAR ENVIA TODOS SUS CONTEOS
Show-Step "7. POST /count-items/submit-all (auxiliar envia sus conteos)"
$submitAll = Invoke-RestMethod -Method Post -Uri "$BASE/count-items/submit-all" -Body (@{ auditId = $audit.id; userId = $auxiliar.id } | ConvertTo-Json) -ContentType "application/json" -Headers @{Authorization="Bearer $tokenA"}
Write-Host "Items enviados: $($submitAll.Count)"
$submitAll | ForEach-Object { Write-Host "  - $($_.id) status:$($_.status)" }

# 8. VERIFICAR ESTADO FINAL DE LA AUDITORIA
Show-Step "8. Estado final de la auditoria"
$stateFinal = Invoke-RestMethod -Method Get -Uri "$BASE/state" -Headers @{Authorization="Bearer $tokenG"}
$auditFinal = $stateFinal.audits | Where-Object { $_.id -eq $audit.id }
Write-Host "Auditoria $($auditFinal.id):"
Write-Host "  Nombre: $($auditFinal.name)"
Write-Host "  Status: $($auditFinal.status)"
Write-Host "  Progress: $($auditFinal.progress)%"
Write-Host "  Warehouse: $($auditFinal.warehouse)"
Write-Host "  Supervisor: $($auditFinal.supervisorId)"

Write-Host "`n=== FLUJO COMPLETADO ===" -ForegroundColor Green
