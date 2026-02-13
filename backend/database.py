import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY in .env file")

print(f"🔑 API Key (first 20 chars): {SUPABASE_KEY[:20]}...", flush=True)
print(f"🔑 API Key (last 10 chars): ...{SUPABASE_KEY[-10:]}", flush=True)

# Create single Supabase client instance
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print(f"✅ Supabase REST API client initialized: {SUPABASE_URL}", flush=True)
