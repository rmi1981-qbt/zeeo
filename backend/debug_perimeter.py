import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found in .env")
    exit(1)

supabase: Client = create_client(url, key)

print("Fetching condos...")
response = supabase.table('condominiums').select('*').limit(1).execute()

if response.data:
    condo = response.data[0]
    print(f"Condo Name: {condo.get('name')}")
    print(f"Perimeter Type: {type(condo.get('perimeter'))}")
    print(f"Perimeter Value: {condo.get('perimeter')}")
else:
    print("No condos found.")
