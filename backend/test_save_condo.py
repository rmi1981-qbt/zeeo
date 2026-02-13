import urllib.request
import json

url = "http://127.0.0.1:8000/condos/"
payload = {
    "name": "Test Condo via Script",
    "address": "Rua Teste",
    "number": "123",
    "neighborhood": "Centro",
    "city": "Sao Paulo",
    "state": "SP",
    "zip_code": "01001-000",
    "perimeter_points": [
        {"lat": -23.5505, "lng": -46.6333},
        {"lat": -23.5515, "lng": -46.6333},
        {"lat": -23.5515, "lng": -46.6343},
        {"lat": -23.5505, "lng": -46.6333}
    ]
}

data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

# Check Root
try:
    print(f"Checking root at http://127.0.0.1:8000/ ...")
    with urllib.request.urlopen("http://127.0.0.1:8000/") as response:
        print(f"Root Status: {response.status}")
        print(f"Root Response: {response.read().decode('utf-8')}")
except Exception as e:
    print(f"Root Failed: {e}")
    if hasattr(e, 'read'): print(e.read().decode('utf-8'))

# Check Health
try:
    print(f"Checking health at http://127.0.0.1:8000/health ...")
    with urllib.request.urlopen("http://127.0.0.1:8000/health") as response:
        print(f"Health Status: {response.status}")
        print(f"Health Response: {response.read().decode('utf-8')}")
except Exception as e:
    print(f"Health Failed: {e}")
    if hasattr(e, 'read'): print(e.read().decode('utf-8'))

# Check POST
try:
    print(f"Sending POST to {url}...")
    with urllib.request.urlopen(req) as response:
        print(f"Status: {response.status}")
        print(f"Response: {response.read().decode('utf-8')}")
except Exception as e:
    # If HTTP error, read the error body
    if hasattr(e, 'read'):
         print(f"Failed with HTTP Error: {e}")
         print(f"Error Body: {e.read().decode('utf-8')}")
    else:
         print(f"Failed: {e}")
