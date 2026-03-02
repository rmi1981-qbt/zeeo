import os
from supabase import create_client

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
print("Connecting to", url)
supabase = create_client(url, key)

res = supabase.table('deliveries').select('*').eq('id', 'fb56f85f-190c-4f67-aa26-3a4bcdfa259c').execute()
print(res.data)
