from fastapi import APIRouter, HTTPException
from database import supabase
import schemas
from shapely.geometry import Polygon, mapping
from shapely import wkb
import uuid
import traceback
import binascii
import json
from datetime import datetime

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
            "lat": condo.lat,
            "lng": condo.lng,
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
            "lat": condo.lat,
            "lng": condo.lng,
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

# --- Gate Endpoints ---

@router.post("/{condo_id}/gates", response_model=schemas.Gate)
def create_gate(condo_id: str, gate: schemas.GateCreate):
    print(f"🚪 POST /condos/{condo_id}/gates - Creating gate: {gate.name}", flush=True)
    try:
        # Create Geography Point
        # PostGIS syntax: POINT(lng lat)
        location_wkt = f"POINT({gate.lng} {gate.lat})"
        
        data = {
            "condo_id": condo_id,
            "name": gate.name,
            "is_main": gate.is_main,
            "location": f"SRID=4326;{location_wkt}"
        }
        
        response = supabase.table('gates').insert(data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create gate")
            
        result = response.data[0]
        
        # Parse location back to lat/lng for response
        # Result location is likely WKB hex
        if result.get('location'):
            # Simple manual parsing or WKB handling if needed
            # For now, we just pass back what we received in the request to ensure schema match
            # or we ideally parse the returned WKB.
            # Let's trust the request data for the response to avoid WKB complexity in this step
            result['lat'] = gate.lat
            result['lng'] = gate.lng
            
        return result
        
    except Exception as e:
        print(f"❌ Error creating gate: {str(e)}", flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{condo_id}/gates", response_model=list[schemas.Gate])
def list_gates(condo_id: str):
    print(f"📋 GET /condos/{condo_id}/gates", flush=True)
    try:
        # Filter out logically deleted gates
        response = supabase.table('gates').select('*').eq('condo_id', condo_id).is_('deleted_at', 'null').execute()
        
        gates = []
        for g in response.data:
            # Parse location
            lat, lng = 0.0, 0.0
            if g.get('location'):
                try:
                    # Try to parse WKB
                    # If it satisfies the schema, we need lat/lng fields
                    binary = binascii.unhexlify(g['location'])
                    point = wkb.loads(binary)
                    lng = point.x
                    lat = point.y
                except Exception:
                    print(f"⚠️ Failed to parse gate location: {g['location']}")
            
            g['lat'] = lat
            g['lng'] = lng
            gates.append(g)
            
        return gates
    except Exception as e:
        print(f"❌ Error listing gates: {str(e)}", flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{condo_id}/gates/{gate_id}", response_model=schemas.Gate)
def update_gate(condo_id: str, gate_id: str, gate_update: schemas.GateUpdate):
    print(f"🔄 PUT /condos/{condo_id}/gates/{gate_id}", flush=True)
    try:
        data = gate_update.dict(exclude_unset=True)
        
        # Handle location update if lat/lng provided
        if gate_update.lat is not None and gate_update.lng is not None:
            location_wkt = f"POINT({gate_update.lng} {gate_update.lat})"
            data['location'] = f"SRID=4326;{location_wkt}"
            
        # Remove lat/lng from direct update since they map to location
        if 'lat' in data: del data['lat']
        if 'lng' in data: del data['lng']

        if not data:
            raise HTTPException(status_code=400, detail="No fields to update")

        response = supabase.table('gates').update(data).eq('id', gate_id).eq('condo_id', condo_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Gate not found")
            
        result = response.data[0]
        
        # Parse location back
        lat, lng = 0.0, 0.0
        if result.get('location'):
            try:
                binary = binascii.unhexlify(result['location'])
                point = wkb.loads(binary)
                lng = point.x
                lat = point.y
            except:
                pass
        
        result['lat'] = lat
        result['lng'] = lng
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating gate: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{condo_id}/gates/{gate_id}")
def delete_gate(condo_id: str, gate_id: str):
    print(f"🗑️ DELETE gate {gate_id} (Soft Delete)", flush=True)
    try:
        # Soft Delete: Set deleted_at to current timestamp
        data = {"deleted_at": datetime.utcnow().isoformat()}
        
        response = supabase.table('gates').update(data).eq('id', gate_id).eq('condo_id', condo_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Gate not found")
            
        return {"message": "Gate deleted"}
    except Exception as e:
        print(f"❌ Error deleting gate: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))
