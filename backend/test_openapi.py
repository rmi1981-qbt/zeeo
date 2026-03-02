import os
import urllib.request
import json
import traceback

from dotenv import load_dotenv
load_dotenv('.env')

url = f"{os.getenv('SUPABASE_URL')}/rest/v1/"
headers = {
    'apikey': os.getenv('SUPABASE_KEY'),
    'Authorization': f"Bearer {os.getenv('SUPABASE_KEY')}",
    'Accept': 'application/openapi+json'
}
req = urllib.request.Request(url, headers=headers, method='GET')
try:
    res = urllib.request.urlopen(req)
    openapi = json.loads(res.read().decode())
    
    print("Tables in OpenAPI spec:")
    for table_name in openapi['definitions'].keys():
        print(f" - {table_name}")
        
except Exception as e:
    print('Error occurred:', e)
