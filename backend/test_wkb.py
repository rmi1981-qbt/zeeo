from shapely import wkb
from shapely.geometry import mapping
import binascii

# Example hex string from the previous output (truncated, but I'll use a valid one if I can or mock it)
# Let's create a real polygon wkb to test
from shapely.geometry import Polygon

poly = Polygon([(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)])
wkb_bytes = wkb.dumps(poly, hex=True)
print(f"Test WKB Hex: {wkb_bytes}")

# Now try to parse it
try:
    # wkb.loads expects bytes, so if it's hex string we need to decode
    # But shapely wkb.loads specificially handles bytes.
    # If the DB returns a hex STRING "0103...", we need to unhexlify it first.
    
    # Simulating what we got from DB (as a string)
    db_return_value = wkb_bytes 
    
    geom = wkb.loads(binascii.unhexlify(db_return_value))
    geojson = mapping(geom)
    print(f"Converted to GeoJSON: {geojson}")
    
except Exception as e:
    print(f"Error: {e}")
