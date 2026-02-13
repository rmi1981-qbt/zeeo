import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

# Fetch variables - Supabase recommended approach
USER = os.getenv("user")
PASSWORD = os.getenv("password")
HOST = os.getenv("host")
PORT = os.getenv("port")
DBNAME = os.getenv("dbname")

print(f"Testing connection to: {USER}@{HOST}:{PORT}/{DBNAME}")

try:
    conn = psycopg2.connect(
        user=USER,
        password=PASSWORD,
        host=HOST,
        port=PORT,
        dbname=DBNAME,
        sslmode='require'
    )
    print("✅ Connection successful!")
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()
    print(f"PostgreSQL version: {version[0]}")
    cursor.close()
    conn.close()
except Exception as e:
    print(f"❌ Connection failed: {e}")
    import traceback
    traceback.print_exc()
