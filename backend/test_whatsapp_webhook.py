import os
import requests
from supabase import create_client, Client

url: str = os.getenv("SUPABASE_URL", "")
key: str = os.getenv("SUPABASE_KEY", "")
# if run outside uvicorn might not have env vars if not loaded. Let's rely on .env
from dotenv import load_dotenv
load_dotenv()

supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# 1. Setup a dummy unit and resident for testing
print("Ensuring a mock resident exists...")
condo_res = supabase.table('condominiums').select('id').limit(1).execute()
if not condo_res.data:
    print("No condos found. Cannot test.")
    exit(1)
condo_id = condo_res.data[0]['id']

unit_res = supabase.table('units').select('id, label').eq('condo_id', condo_id).limit(1).execute()
if not unit_res.data:
    # create one
    u_res = supabase.table('units').insert({'condo_id': condo_id, 'number': '999A', 'label': '999A'}).execute()
    unit_id = u_res.data[0]['id']
else:
    unit_id = unit_res.data[0]['id']

test_phone = "5511999999999"
res_res = supabase.table('residents').select('id').eq('phone', test_phone).execute()
if not res_res.data:
    supabase.table('residents').insert({
        'unit_id': unit_id,
        'name': 'Test OCR Resident',
        'phone': test_phone,
        'can_authorize_deliveries': True
    }).execute()
    print("Created mock resident.")
else:
    print("Mock resident already exists.")

# 2. Call the webhook
print("\nCalling Webhook...")
api_url = "http://localhost:8000/api/hub/webhook/whatsapp"
headers = {"x-api-key": "ifood_sim_key_123"}
payload = {
    "phone": test_phone,
    "image_url": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000&auto=format&fit=crop" # A random image, gemini might just say "Not a delivery screen" or we can mock a delivery map
}

try:
    resp = requests.post(api_url, json=payload, headers=headers)
    print("Status Code:", resp.status_code)
    print("Response JSON:", resp.json())
except Exception as e:
    print("Error calling webhook:", e)
