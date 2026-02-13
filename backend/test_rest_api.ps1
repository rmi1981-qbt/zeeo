$headers = @{"Content-Type" = "application/json" }
$body = @{
    name             = "Teste REST API"
    address          = "Rua REST"
    number           = "100"
    neighborhood     = "Bairro REST"
    city             = "São Paulo"
    state            = "SP"
    zip_code         = "01000-000"
    perimeter_points = @(
        @{ lat = -23.55; lng = -46.63 }
        @{ lat = -23.56; lng = -46.63 }
        @{ lat = -23.56; lng = -46.64 }
    )
} | ConvertTo-Json -Depth 10

Write-Host "🧪 Testing POST /condos/ with REST API"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/condos/" -Method POST -Headers $headers -Body $body
    Write-Host "✅ SUCCESS!"
    Write-Host ($response | ConvertTo-Json -Depth 10)
}
catch {
    Write-Host "❌ ERROR!"
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    if ($_.ErrorDetails) {
        Write-Host "Details: $($_.ErrorDetails.Message)"
    }
}
