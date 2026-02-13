from database import supabase
import json

try:
    response = supabase.rpc('get_columns', {'table_name': 'condominium_members'}).execute() 
    # ^ RPC might not exist. Let's try direct select if permissions allow, or just try to insert a dummy with unit_id to see if it fails?
    # Better: just try to select 'unit_id' specifically.
    
    try:
        response = supabase.table('condominium_members').select('unit_id').limit(1).execute()
        print("Column 'unit_id' EXISTS")
    except Exception as e:
        print(f"Column 'unit_id' likely MISSING: {e}")

except Exception as e:
    print(e)
