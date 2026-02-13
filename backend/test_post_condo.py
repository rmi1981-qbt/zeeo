import requests
import json

url = "http://localhost:8000/condos/"
payload = {
    "name": "Teste Condomínio API",
    "address": "Rua API Teste",
    "number": "999",
    "neighborhood": "Bairro API",
    "city": "São Paulo",
    "state": "SP",
    "zip_code": "12345-678",
    "perimeter_points": [
        {"lat": -23.55, "lng": -46.63},
        {"lat": -23.56, "lng": -46.63},
        {"lat": -23.56, "lng": -46.64},
        {"lat": -23.55, "lng": -46.64}
    ]
}

print(f"POST {url}")
print(f"Payload: {json.dumps(payload, indent=2)}")

try:
    response = requests.post(url, json=payload)
    print(f"\n✅ Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"\n❌ Error: {e}")
    if hasattr(e, 'response'):
        print(f"Status: {e.response.status_code}")
        print(f"Response: {e.response.text}")
