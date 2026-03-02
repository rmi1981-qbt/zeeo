import sys
sys.path.append('.')
from database import supabase
import json
import traceback

try:
    import datetime
    eta_dt = (datetime.datetime.utcnow() + datetime.timedelta(minutes=15)).isoformat()
    data = {
        'condo_id': '0dd40110-97e6-4a28-9a99-3bae7601c976', 
        'unit': 'Bloco 2 - Apto 21', 
        'status': 'approaching',  
        'platform': 'ifood', 
        'driver_name': 'Fernanda',
        'driver_photo': 'https://example.com/photo.jpg',
        'driver_plate': 'ULA1Z85',
        'eta': eta_dt,
        'created_at': datetime.datetime.utcnow().isoformat(),
        'updated_at': datetime.datetime.utcnow().isoformat()
    }
    import os
    import urllib.request
    
    url = f"{os.getenv('SUPABASE_URL')}/rest/v1/deliveries"
    headers = {
        'apikey': os.getenv('SUPABASE_KEY'),
        'Authorization': f"Bearer {os.getenv('SUPABASE_KEY')}",
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
    try:
        res = urllib.request.urlopen(req)
        print('Success:', res.read().decode())
    except urllib.error.HTTPError as e:
        print('HTTP Error:', e.code)
        print(e.read().decode())
except Exception as e:
    print('Error occurred:')
    if hasattr(e, 'details'):
        print(f"Details: {e.details}")
    if hasattr(e, 'message'):
        print(f"Message: {e.message}")
    else:
        print(e)
