$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    name = "Teste POST PowerShell"
    address = "Rua Teste"
    number = "123"
    neighborhood = "Bairro"
    city = "São Paulo"
    state = "SP"
    zip_code = "12345-678"
    perimeter_points = @(
        @{ lat = -23.55; lng = -46.63 }
        @{ lat = -23.56; lng = -46.63 }
        @{ lat = -23.56; lng = -46.64 }
        @{ lat = -23.55; lng = -46.64 }
    )
} | ConvertTo-Json -Depth 10

Write-Host "Sending POST to http://localhost:8000/condos/"
Write-Host "Body: $body"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/condos/" -Method POST -Headers $headers -Body $body
    Write-Host "✅ SUCCESS!"
    Write-Host "Response:" ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ ERROR!"
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Message: $($_.Exception.Message)"
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response body: $responseBody"
}
