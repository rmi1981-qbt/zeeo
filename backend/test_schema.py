import sys
sys.path.append('.')
from database import supabase
import json

res = supabase.table('deliveries').select('*').limit(1).execute()
if res.data:
    print("Columns:", ', '.join(res.data[0].keys()))
else:
    print("No data in deliveries table to infer columns.")
