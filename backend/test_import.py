import traceback
try:
    import main
    print("Main imported successfully")
except Exception as e:
    print("Error importing main:")
    traceback.print_exc()
