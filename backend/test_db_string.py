from sqlalchemy import create_engine, text
import os

# Connection string from .env
DATABASE_URL = "postgresql://postgres.ppqmjtxsqnlmcdgwshgq:%405MBEtwqP2T%40S5h@aws-1-sa-east-1.pooler.supabase.com:6543/postgres"

print(f"Testing connection to: {DATABASE_URL}")

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        print("Connection successful!")
        print(f"Result: {result.fetchone()}")
except Exception as e:
    print(f"Connection failed: {e}")
