import urllib.request
import json
import traceback

req = urllib.request.Request(
    'http://localhost:8002/api/hub/inbound/ifood/delivery', 
    data=json.dumps({
        'condo_id': '0dd40110-97e6-4a28-9a99-3bae7601c976', 
        'target_unit': 'Bloco 2 - Apto 21', 
        'driver_name': 'Fernanda Santos', 
        'vehicle_plate': 'ULA1Z85', 
        'eta_mins': 15
    }).encode('utf-8'), 
    headers={
        'Content-Type': 'application/json', 
        'x-api-key': 'sim-key-ifood-123'
    }
)

try:
    resp = urllib.request.urlopen(req)
    print("Success:", resp.read().decode())
except Exception as e:
    print("Failed")
    if hasattr(e, 'read'):
        print(e.read().decode())
    else:
        traceback.print_exc()
