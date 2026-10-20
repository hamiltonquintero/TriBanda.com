# Prueba E2E: 10 jugadores, torneo con fase grupos + llaves, partidas de grupo, confirmar, ranking, bracket, finalizar.
$ErrorActionPreference = "Stop"
$base = "http://localhost:3000/api/v1"
$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Uri,
    [hashtable]$Headers = @{},
    $Body = $null
  )
  $params = @{ Method = $Method; Uri = $Uri; Headers = $Headers }
  if ($null -ne $Body) {
    $params.ContentType = "application/json"
    $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
  }
  return Invoke-RestMethod @params
}

Write-Host "== Login admin =="
$loginBody = @{ email = "admin@billar.com"; password = "admin1234" }
$auth = Invoke-Api -Method Post -Uri "$base/auth/login" -Body $loginBody
$token = $auth.token
$adminId = $auth.usuario.id
$h = @{ Authorization = "Bearer $token" }

Write-Host "== Crear 10 jugadores =="
$jugadorIds = @()
1..10 | ForEach-Object {
  $n = "Pru$suffix$_"
  $a = "Apellido$_"
  $created = Invoke-Api -Method Post -Uri "$base/jugadores" -Headers $h -Body @{
    nombre       = $n
    apellido     = $a
    club_ciudad  = "Club Test"
    ciudad       = "Pasto"
    pais         = "Colombia"
    categoria    = "A"
  }
  $jugadorIds += $created.id
  Write-Host "  $($created.nombre_completo) -> $($created.id)"
}

Write-Host "== Crear torneo =="
$fechaIni = (Get-Date).ToUniversalTime().ToString("o")
$fechaFin = (Get-Date).AddDays(7).ToUniversalTime().ToString("o")
$torneo = Invoke-Api -Method Post -Uri "$base/torneos" -Headers $h -Body @{
  nombre       = "Torneo E2E $suffix"
  descripcion  = "Script de prueba"
  fecha_inicio = $fechaIni
  fecha_fin    = $fechaFin
  sede         = "Sede Test"
  incremento   = 0.3
}
$tid = $torneo.id
Write-Host "  Torneo: $tid"

Write-Host "== Fases: grupos + llaves =="
$fGrupos = Invoke-Api -Method Post -Uri "$base/torneos/$tid/fases" -Headers $h -Body @{
  tipo  = "grupos"
  fecha = $fechaIni
  orden = 1
}
$fLlaves = Invoke-Api -Method Post -Uri "$base/torneos/$tid/fases" -Headers $h -Body @{
  tipo  = "llaves"
  fecha = $fechaFin
  orden = 2
}
Write-Host "  Fase grupos: $($fGrupos.id); llaves: $($fLlaves.id)"

Write-Host "== 3 grupos =="
$g1 = Invoke-Api -Method Post -Uri "$base/grupos" -Headers $h -Body @{ fase_id = $fGrupos.id; numero = 1 }
$g2 = Invoke-Api -Method Post -Uri "$base/grupos" -Headers $h -Body @{ fase_id = $fGrupos.id; numero = 2 }
$g3 = Invoke-Api -Method Post -Uri "$base/grupos" -Headers $h -Body @{ fase_id = $fGrupos.id; numero = 3 }
Write-Host "  Grupos OK"

Write-Host "== Sorteo 10 jugadores =="
Invoke-Api -Method Post -Uri "$base/grupos/$($fGrupos.id)/sorteo" -Headers $h -Body @{
  fase_id     = $fGrupos.id
  jugador_ids = $jugadorIds
} | Out-Null

Write-Host "== Listar grupos =="
$grupos = Invoke-Api -Method Get -Uri "$base/grupos/$($fGrupos.id)" -Headers $h

function Get-Pairs($ids) {
  $p = @()
  for ($i = 0; $i -lt $ids.Count; $i++) {
    for ($j = $i + 1; $j -lt $ids.Count; $j++) {
      $p += , @($ids[$i], $ids[$j])
    }
  }
  return $p
}

Write-Host "== Crear partidas round-robin por grupo =="
$partidaIds = @()
foreach ($g in $grupos) {
  $ids = @($g.jugadores | ForEach-Object { $_.jugador_id })
  Write-Host "  Grupo $($g.numero): $($ids.Count) jugadores"
  $pairs = Get-Pairs $ids
  foreach ($pair in $pairs) {
    $p = Invoke-Api -Method Post -Uri "$base/partidas" -Headers $h -Body @{
      fase_id       = $fGrupos.id
      grupo_id      = $g.id
      jugador_a_id  = $pair[0]
      jugador_b_id  = $pair[1]
      juez_id       = $adminId
      fecha         = $fechaIni
      hora          = "10:00"
    }
    $partidaIds += $p.id
  }
}
Write-Host "  Total partidas: $($partidaIds.Count)"

Write-Host "== Activar torneo =="
Invoke-Api -Method Patch -Uri "$base/torneos/$tid/estado" -Headers $h -Body @{ estado = "activo" } | Out-Null

Write-Host "== Jugar y confirmar (A gana en 2 sets) =="
$idx = 0
foreach ($partidaId in $partidaIds) {
  $idx++
  Invoke-Api -Method Patch -Uri "$base/partidas/$partidaId/iniciar" -Headers $h | Out-Null
  $done = $false
  foreach ($set in 1..3) {
    if ($done) { break }
    foreach ($ent in 1..13) {
      $resp = Invoke-Api -Method Post -Uri "$base/partidas/$partidaId/entrada" -Headers $h -Body @{
        set_numero      = $set
        numero_entrada  = $ent
        carambolas_a    = 7
        carambolas_b    = 3
      }
      if ($resp.estado -eq "finalizada") {
        $done = $true
        break
      }
    }
  }
  Invoke-Api -Method Patch -Uri "$base/partidas/$partidaId/confirmar" -Headers $h | Out-Null
  if ($idx % 4 -eq 0) { Write-Host "  ... $idx / $($partidaIds.Count)" }
}

Write-Host "== Ranking =="
$rank = Invoke-Api -Method Get -Uri "$base/ranking/$tid" -Headers $h
Write-Host "  Filas ranking: $($rank.Count)"
if ($rank.Count -lt 1) { throw "Ranking vacío" }

Write-Host "== Generar bracket (clasificados desde fase grupos, automático en backend) =="
Invoke-Api -Method Post -Uri "$base/bracket/$($fLlaves.id)/generar" -Headers $h -Body @{} | Out-Null
$bracket = Invoke-Api -Method Get -Uri "$base/bracket/$($fLlaves.id)" -Headers $h
Write-Host "  Rondas bracket: $($bracket.rondas.Count)"

Write-Host "== Finalizar torneo =="
Invoke-Api -Method Patch -Uri "$base/torneos/$tid/estado" -Headers $h -Body @{ estado = "finalizado" } | Out-Null

Write-Host "== OK Torneo $tid. Top 3 ranking =="
$rank | Select-Object -First 3 | ForEach-Object {
  Write-Host "  #$($_.posicion) $($_.nombre_completo) pts=$($_.puntos) ranking=$($_.puntos_ranking)"
}
Write-Host "== E2E completado =="
