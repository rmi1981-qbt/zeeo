from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"Connecting to: {DATABASE_URL}")

try:
    engine = create_engine(DATABASE_URL)
    SessionIterator = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionIterator()
    result = db.execute(text("SELECT 1"))
    print("Connection Successful!")
    print(f"Result: {result.fetchone()}")
    db.close()
except Exception as e:
    print(f"Connection Failed: {e}")
