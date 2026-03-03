import requests
import json

SUPABASE_URL = 'https://ppqmjtxsqnlmcdgwshgq.supabase.co'
ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwcW1qdHhzcW5sbWNkZ3dzaGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NDQxODMsImV4cCI6MjA4NDUyMDE4M30.uOQr9UzCM9-KGJKftaVDUg_X8RMTSoDT_UGvBIuFxuY'

headers = {
    'apikey': ANON_KEY,
    'Authorization': f'Bearer {ANON_KEY}',
    'Content-Type': 'application/json'
}

# Test fetching condominium_members directly
print('Fetching condominium_members...')
r = requests.get(f'{SUPABASE_URL}/rest/v1/condominium_members?select=*,condominiums(*)&limit=5', headers=headers)
print(f'Status: {r.status_code}')
print('Response:', r.text)

