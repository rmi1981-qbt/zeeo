
try:
    print("Importing shapely...")
    from shapely.geometry import Point
    print("Shapely imported.")
except Exception as e:
    print(f"Shapely failed: {e}")

try:
    print("Importing database...")
    from database import supabase
    print("Database imported.")
except Exception as e:
    print(f"Database failed: {e}")

try:
    print("Importing main...")
    from main import app
    print("Main imported.")
except Exception as e:
    print(f"Main failed: {e}")
