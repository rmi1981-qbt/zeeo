from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import supabase
import schemas
import uuid
import traceback
from datetime import datetime
from shapely import wkb
from shapely.geometry import Point, mapping
import binascii

router = APIRouter(prefix="/deliveries", tags=["deliveries"])

def parse_location(location_data):
    """Parse DB location (WKB/Hex) to (lat, lng)"""
    if not location_data:
        return None, None
    try:
        # If already dict (GeoJSON)
        if isinstance(location_data, dict):
            coords = location_data.get('coordinates')
            if coords:
                return coords[1], coords[0] # lat, lng
        
        # If hex string
        if isinstance(location_data, str):
            try:
                binary = binascii.unhexlify(location_data)
                geom = wkb.loads(binary)
                return geom.y, geom.x # lat, lng
            except:
                pass
                
        return None, None
    except Exception as e:
        print(f"⚠️ Failed to parse location: {e}", flush=True)
        return None, None

@router.get("/", response_model=list[schemas.Delivery])
def list_deliveries(condo_id: str = Query(..., description="Condo ID to filter deliveries"), unit: Optional[str] = Query(None, description="Unit label to filter")):
    """List deliveries for a specific condo, optionally filtered by unit"""
    try:
        query = supabase.table('deliveries').select('*, current_gate:gates(id, name)').eq('condo_id', condo_id)
        
        if unit:
            query = query.eq('unit', unit)
            
        response = query.order('created_at', desc=True).execute()
        
        deliveries = []
        for d in response.data:
            lat, lng = parse_location(d.get('driver_location'))
            d['driver_lat'] = lat
            d['driver_lng'] = lng
            deliveries.append(d)
            
        return deliveries
    except Exception as e:
        print(f"❌ Error listing deliveries: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{delivery_id}", response_model=schemas.Delivery)
def get_delivery(delivery_id: str):
    """Get a specific delivery"""
    try:
        response = supabase.table('deliveries').select('*, current_gate:gates(id, name)').eq('id', delivery_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Delivery not found")
        
        d = response.data[0]
        lat, lng = parse_location(d.get('driver_location'))
        d['driver_lat'] = lat
        d['driver_lng'] = lng
        return d
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting delivery: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=schemas.Delivery)
def create_delivery(delivery: schemas.DeliveryCreate):
    """Create a new delivery"""
    print(f"📝 POST /deliveries/ - {delivery.driver_name}", flush=True)
    try:
        data = delivery.dict(exclude={'driver_lat', 'driver_lng'})
        data['id'] = str(uuid.uuid4())
        data['created_at'] = datetime.utcnow().isoformat()
        data['updated_at'] = datetime.utcnow().isoformat()
        
        # Handle location
        if delivery.driver_lat is not None and delivery.driver_lng is not None:
             data['driver_location'] = f"SRID=4326;POINT({delivery.driver_lng} {delivery.driver_lat})"
        
        response = supabase.table('deliveries').insert(data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create delivery")
            
        result = response.data[0]
        result['driver_lat'] = delivery.driver_lat
        result['driver_lng'] = delivery.driver_lng
        
        print(f"✅ Delivery created: {result['id']}", flush=True)
        return result
    except Exception as e:
        print(f"❌ Error creating delivery: {str(e)}", flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{delivery_id}/status", response_model=schemas.Delivery)
def update_delivery_status(delivery_id: str, status_update: schemas.DeliveryUpdate):
    """Update delivery status or location"""
    print(f"🔄 PUT /deliveries/{delivery_id}/status", flush=True)
    try:
        # data = {k: v for k, v in status_update.dict().items() if v is not None}
        data = status_update.dict(exclude={'driver_lat', 'driver_lng'}, exclude_unset=True)
        data['updated_at'] = datetime.utcnow().isoformat()
        
        if status_update.driver_lat is not None and status_update.driver_lng is not None:
            data['driver_location'] = f"SRID=4326;POINT({status_update.driver_lng} {status_update.driver_lat})"
        
        response = supabase.table('deliveries').update(data).eq('id', delivery_id).execute()
        
        if not response.data:
             raise HTTPException(status_code=404, detail="Delivery not found")
             
        result = response.data[0]
        lat, lng = parse_location(result.get('driver_location'))
        result['driver_lat'] = lat
        result['driver_lng'] = lng

        # Check proximity to gates (logging for now)
        if lat and lng:
            check_gate_proximity(delivery_id, lat, lng, result['condo_id'], result.get('status'))
             
        return result
    except Exception as e:
        print(f"❌ Error updating delivery: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

def check_gate_proximity(delivery_id, lat, lng, condo_id, current_status):
    """
    Check if driver is near any gate of the condo.
    """
    try:
        # ... (logic to get gates)
        
        # Supabase RPC or raw sql is best, but we can also fetch all gates and calculate in python if few.
        # Let's try fetching all gates for condo (usually few, < 10)
        response = supabase.table('gates').select('*').eq('condo_id', condo_id).is_('deleted_at', 'null').execute()
        gates = response.data
        
        if not gates:
            return
            
        closest_gate = None
        min_dist = float('inf')
        
        for gate in gates:
            # We need to parse gate location from HEX/WKB
            if not gate.get('location'): continue
            
            try:
                # Basic python distance check
                bin_loc = binascii.unhexlify(gate['location'])
                gate_point = wkb.loads(bin_loc)
                
                # 0.001 deg ~= 111m.
                dy = (gate_point.y - lat) * 111000
                dx = (gate_point.x - lng) * 111000 * 0.9 # cos(lat) factor roughly
                dist = (dx*dx + dy*dy)**0.5
                
                if dist < 300: # 300 meters threshold
                    if dist < min_dist:
                        min_dist = dist
                        closest_gate = gate
                        
            except Exception as e:
                print(f"Error calcing distance: {e}")
                continue
                
        if closest_gate:
            print(f"🔔 Driver is {int(min_dist)}m from gate: {closest_gate['name']}", flush=True)
            try:
                # Update delivery with current_gate_id
                update_data = {
                    'current_gate_id': closest_gate['id'],
                    'updated_at': datetime.utcnow().isoformat()
                }
                
                # Status Transitions based on distance
                # If < 50m -> at_gate
                # If < 300m -> approaching
                
                new_status = None
                if min_dist < 50:
                     if current_status in ['created', 'driver_assigned', 'on_way', 'approaching']:
                         new_status = 'at_gate'
                elif min_dist < 300:
                     if current_status in ['created', 'driver_assigned', 'on_way']:
                         new_status = 'approaching'
                
                if new_status:
                    update_data['status'] = new_status
                    print(f"🔄 Updating status to {new_status}", flush=True)

                supabase.table('deliveries').update(update_data).eq('id', delivery_id).execute()
            except Exception as e:
                print(f"Error updating gate id/status: {e}")

    except Exception as e:
        print(f"Error in proximity check: {e}")

@router.delete("/{delivery_id}")
def delete_delivery(delivery_id: str):
    """Delete a delivery"""
    try:
        response = supabase.table('deliveries').delete().eq('id', delivery_id).execute()
        if not response.data: # Supabase delete returns the deleted row(s)
             # If no row returned, it might check if it existed? 
             # Actually Supabase DELETE returns data by default
             pass 
             # If strictly checking 404, we might need to select first. 
             # But for DELETE, idempotency is fine or we can assume if no data, it wasn't there.
        return {"message": "Delivery deleted successfully"}  
    except Exception as e:
        print(f"❌ Error deleting delivery: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))
