import requests
import json

# Test data matching frontend structure
test_data = {
    "name": "Test Condo",
    "address": "Rua Test",
    "number": "123",
    "neighborhood": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zip_code": "01000-000",
    "perimeter_points": [
        {"lat": -23.550520, "lng": -46.633308},
        {"lat": -23.551520, "lng": -46.633308},
        {"lat": -23.551520, "lng": -46.634308},
        {"lat": -23.550520, "lng": -46.634308}
    ]
}

# Target existing condo ID from user logs
condo_id = "0dd40110-97e6-4a28-9a99-3bae7601c976"

url = f"http://localhost:8000/condos/{condo_id}"

print(f"Testing PUT {url}")
print(f"Payload: {json.dumps(test_data, indent=2)}")
print("\n" + "="*50 + "\n")

try:
    response = requests.put(url, json=test_data, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
