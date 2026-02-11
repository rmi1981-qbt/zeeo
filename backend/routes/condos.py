from fastapi import APIRouter, HTTPException
from database import supabase
import schemas
from shapely.geometry import Polygon, mapping
from shapely import wkb
import uuid
import traceback
import binascii
import json

router = APIRouter(prefix="/condos", tags=["condos"])

def parse_perimeter(perimeter_data):
    """
    Convert perimeter data from DB to GeoJSON.
    Supabase/PostGIS with geoalchemy2 often returns WKB hex string.
    """
    if not perimeter_data:
        return None
    
    try:
        # If it's already a dict (GeoJSON), return it
        if isinstance(perimeter_data, dict):
            return perimeter_data
            
        # If it's a string, it might be WKB hex
        if isinstance(perimeter_data, str):
            # Check if it looks like WKB hex (starting with 01...)
            # PostGIS hex output usually starts with 01 (little indian) or 00 (big endian)
            # but we can try to unhexlify it.
            try:
                # geom = wkb.loads(binascii.unhexlify(perimeter_data))
                # GeoAlchemy2 might return it as a string that is already WKB bytes representation or hex.
                # Let's try to handle hex string first.
                binary = binascii.unhexlify(perimeter_data)
                geom = wkb.loads(binary)
                return mapping(geom)
            except binascii.Error:
                # Maybe it's not hex, try loading directly if it was bytes (unlikely if strictly typed as str)
                pass
            except Exception:
                pass
                
        return perimeter_data
    except Exception as e:
        print(f"⚠️ Failed to parse perimeter: {e}", flush=True)
        return None

@router.post("/", response_model=schemas.Condo)
def create_condo(condo: schemas.CondoCreate):
    print(f"\n{'='*60}", flush=True)
    print(f"📝 POST /condos/ - Creating condo: {condo.name}", flush=True)
    try:
        # Build WKT string for geography
        wkt_str = None
        if condo.perimeter_points and len(condo.perimeter_points) >= 3:
            points = []
            for p in condo.perimeter_points:
                lat = p.get('lat') if isinstance(p, dict) else p.lat
                lng = p.get('lng') if isinstance(p, dict) else p.lng
                points.append((lng, lat))
            
            if points[0] != points[-1]:
                points.append(points[0])
            
            poly = Polygon(points)
            wkt_str = poly.wkt
            print(f"🗺️  WKT generated: {wkt_str[:100]}...", flush=True)
        
        # Prepare data for Supabase
        data = {
            "id": str(uuid.uuid4()),
            "name": condo.name,
            "address": condo.address,
            "number": condo.number,
            "neighborhood": condo.neighborhood,
            "city": condo.city,
            "state": condo.state,
            "zip_code": condo.zip_code,
            "perimeter": f"SRID=4326;{wkt_str}" if wkt_str else None
        }
        
        print(f"📤 Sending to Supabase table 'condominiums'...", flush=True)
        
        # Insert via Supabase REST API
        response = supabase.table('condominiums').insert(data).execute()
        
        if not response.data:
            print(f"❌ Insert failed: no data returned", flush=True)
            raise HTTPException(status_code=500, detail="Failed to insert condo")
        
        result = response.data[0]
        # Convert perimeter for response
        if result.get('perimeter'):
            result['perimeter'] = parse_perimeter(result['perimeter'])

        print(f"✅ Condo created successfully! ID: {result['id']}", flush=True)
        print(f"{'='*60}\n", flush=True)
        return result
        
    except Exception as e:
        print(f"❌ Error creating condo: {str(e)}", flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=list[schemas.Condo])
def list_condos():
    print(f"📋 GET /condos/ - Listing all condos", flush=True)
    try:
        response = supabase.table('condominiums').select('*').execute()
        print(f"✅ Found {len(response.data)} condos", flush=True)
        
        condos = response.data
        for condo in condos:
            if condo.get('perimeter'):
                condo['perimeter'] = parse_perimeter(condo['perimeter'])
                
        return condos
    except Exception as e:
        print(f"❌ Error listing condos: {str(e)}", flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{condo_id}", response_model=schemas.Condo)
def get_condo(condo_id: str):
    print(f"🔍 GET /condos/{condo_id}", flush=True)
    try:
        response = supabase.table('condominiums').select('*').eq('id', condo_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Condo not found")
        print(f"✅ Condo found: {response.data[0]['name']}", flush=True)
        
        result = response.data[0]
        if result.get('perimeter'):
            result['perimeter'] = parse_perimeter(result['perimeter'])
            
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting condo: {str(e)}", flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{condo_id}", response_model=schemas.Condo)
def update_condo(condo_id: str, condo: schemas.CondoCreate):
    print(f"📝 PUT /condos/{condo_id} - Updating condo", flush=True)
    try:
        # Prepare update data (address fields always update)
        data = {
            "name": condo.name,
            "address": condo.address,
            "number": condo.number,
            "neighborhood": condo.neighborhood,
            "city": condo.city,
            "state": condo.state,
            "zip_code": condo.zip_code,
        }

        # Only update perimeter if new valid points are provided
        if condo.perimeter_points and len(condo.perimeter_points) >= 3:
            points = []
            for p in condo.perimeter_points:
                lat = p.get('lat') if isinstance(p, dict) else p.lat
                lng = p.get('lng') if isinstance(p, dict) else p.lng
                points.append((lng, lat))
            
            if points[0] != points[-1]:
                points.append(points[0])
            
            poly = Polygon(points)
            wkt_str = poly.wkt
            data["perimeter"] = f"SRID=4326;{wkt_str}"
            print(f"🗺️  Perimeter updated with {len(points)} points", flush=True)
        else:
            print(f"ℹ️  No new perimeter points - keeping existing perimeter", flush=True)
        
        response = supabase.table('condominiums').update(data).eq('id', condo_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Condo not found")
        
        print(f"✅ Condo updated successfully!", flush=True)
        
        result = response.data[0]
        if result.get('perimeter'):
            result['perimeter'] = parse_perimeter(result['perimeter'])
            
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating condo: {str(e)}", flush=True)
        print(traceback.format_exc(), flush=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{condo_id}")
async def delete_condo(condo_id: str):
    """Delete a condominium by ID"""
    print(f"\n{'='*60}", flush=True)
    print(f"🗑️ DELETE /condos/{condo_id}", flush=True)
    
    try:
        # Delete from Supabase
        response = supabase.table('condominiums').delete().eq('id', condo_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Condo not found")
        print(f"✅ Condo deleted successfully!", flush=True)
        return {"message": "Condo deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting condo: {str(e)}", flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
