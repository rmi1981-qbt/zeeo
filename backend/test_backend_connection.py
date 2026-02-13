import requests
import json

url = "http://localhost:8000/condos/"
payload = {
    "name": "Test Condo",
    "address": "Rua Teste",
    "number": "123",
    "neighborhood": "Bairro Teste",
    "city": "Cidade Teste",
    "state": "SP",
    "zip_code": "12345-678",
    "perimeter_points": [
        {"lat": -23.55, "lng": -46.63},
        {"lat": -23.56, "lng": -46.63},
        {"lat": -23.56, "lng": -46.64},
        {"lat": -23.55, "lng": -46.63}
    ]
}

try:
    print(f"Sending POST to {url}")
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
