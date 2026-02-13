from database import engine
from sqlalchemy import text

def test_connection():
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("\n✅ Database connection successful!")
            print(f"   Result: {result.scalar()}")
    except Exception as e:
        import traceback
        with open("db_error.log", "w") as f:
            f.write(f"Error: {e}\n")
            f.write(traceback.format_exc())
        print("\n❌ Database connection failed! See db_error.log")

if __name__ == "__main__":
    test_connection()
