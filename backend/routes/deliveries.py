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

def log_delivery_event(delivery_id: str, condo_id: str, event_type: str, 
                       status_update: schemas.DeliveryUpdate = None,
                       target_unit: str = None, metadata: dict = None):
    """Insert an immutable event into delivery_events."""
    try:
        event_data = {
            'id': str(uuid.uuid4()),
            'delivery_id': delivery_id,
            'condo_id': condo_id,
            'event_type': event_type,
            'target_unit': target_unit,
            'metadata': metadata or {},
            'created_at': datetime.utcnow().isoformat()
        }
        
        if status_update:
            if status_update.actor_id:
                event_data['actor_id'] = status_update.actor_id
            if status_update.actor_role:
                event_data['actor_role'] = status_update.actor_role
            if status_update.actor_name:
                event_data['actor_name'] = status_update.actor_name
            if status_update.authorization_method:
                event_data['authorization_method'] = status_update.authorization_method
            if status_update.authorized_by_resident_id:
                event_data['authorized_by_resident_id'] = status_update.authorized_by_resident_id
            if status_update.authorized_by_resident_name:
                event_data['authorized_by_resident_name'] = status_update.authorized_by_resident_name
            if status_update.gate_id:
                event_data['gate_id'] = status_update.gate_id
            if status_update.gate_name:
                event_data['gate_name'] = status_update.gate_name
            if status_update.notes:
                event_data['notes'] = status_update.notes
        
        supabase.table('delivery_events').insert(event_data).execute()
        print(f"📝 Event logged: {event_type} for delivery {delivery_id}", flush=True)
    except Exception as e:
        print(f"⚠️ Failed to log delivery event: {e}", flush=True)

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

@router.get("/events", response_model=list[schemas.DeliveryEvent])
def list_condo_events(condo_id: str = Query(...), limit: int = Query(50, le=200)):
    """List recent delivery events for a condominium"""
    try:
        response = (supabase.table('delivery_events')
            .select('*')
            .eq('condo_id', condo_id)
            .order('created_at', desc=True)
            .limit(limit)
            .execute())
        return response.data
    except Exception as e:
        print(f"❌ Error listing condo events: {str(e)}", flush=True)
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

@router.get("/{delivery_id}/events", response_model=list[schemas.DeliveryEvent])
def list_delivery_events(delivery_id: str):
    """List all events for a specific delivery"""
    try:
        response = (supabase.table('delivery_events')
            .select('*')
            .eq('delivery_id', delivery_id)
            .order('created_at', desc=False)
            .execute())
        return response.data
    except Exception as e:
        print(f"❌ Error listing delivery events: {str(e)}", flush=True)
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
        
        # Log the creation event
        log_delivery_event(
            delivery_id=result['id'],
            condo_id=result['condo_id'],
            event_type='created',
            target_unit=result.get('unit'),
            metadata={
                'driver_name': delivery.driver_name,
                'driver_plate': delivery.driver_plate,
                'platform': delivery.platform
            }
        )
        
        print(f"✅ Delivery created: {result['id']}", flush=True)
        return result
    except Exception as e:
        print(f"❌ Error creating delivery: {str(e)}", flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{delivery_id}/status", response_model=schemas.Delivery)
def update_delivery_status(delivery_id: str, status_update: schemas.DeliveryUpdate):
    """Update delivery status or location, and log the event"""
    print(f"🔄 PUT /deliveries/{delivery_id}/status", flush=True)
    try:
        data = status_update.dict(
            exclude={'driver_lat', 'driver_lng', 'actor_id', 'actor_name', 'actor_role',
                     'authorization_method', 'authorized_by_resident_id', 'authorized_by_resident_name',
                     'gate_id', 'gate_name', 'notes'},
            exclude_unset=True
        )
        data['updated_at'] = datetime.utcnow().isoformat()
        
        if status_update.driver_lat is not None and status_update.driver_lng is not None:
            data['driver_location'] = f"SRID=4326;POINT({status_update.driver_lng} {status_update.driver_lat})"
        
        # Set authorization timestamps based on status
        new_status = status_update.status
        if new_status in ('authorized', 'at_gate') and status_update.authorization_method:
            data['authorized_by'] = status_update.actor_id
            data['authorized_method'] = status_update.authorization_method
            data['authorized_at'] = datetime.utcnow().isoformat()
        
        if new_status == 'inside':
            data['entered_at'] = datetime.utcnow().isoformat()
        
        if new_status == 'exited' or new_status == 'completed':
            data['exited_at'] = datetime.utcnow().isoformat()

        # Update gate_id if provided
        if status_update.gate_id:
            data['current_gate_id'] = status_update.gate_id
        
        response = supabase.table('deliveries').update(data).eq('id', delivery_id).execute()
        
        if not response.data:
             raise HTTPException(status_code=404, detail="Delivery not found")
             
        result = response.data[0]
        lat, lng = parse_location(result.get('driver_location'))
        result['driver_lat'] = lat
        result['driver_lng'] = lng

        # Log the event
        if new_status:
            log_delivery_event(
                delivery_id=delivery_id,
                condo_id=result['condo_id'],
                event_type=new_status,
                status_update=status_update,
                target_unit=result.get('unit')
            )

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
        response = supabase.table('gates').select('*').eq('condo_id', condo_id).is_('deleted_at', 'null').execute()
        gates = response.data
        
        if not gates:
            return
            
        closest_gate = None
        min_dist = float('inf')
        
        for gate in gates:
            if not gate.get('location'): continue
            
            try:
                bin_loc = binascii.unhexlify(gate['location'])
                gate_point = wkb.loads(bin_loc)
                
                dy = (gate_point.y - lat) * 111000
                dx = (gate_point.x - lng) * 111000 * 0.9
                dist = (dx*dx + dy*dy)**0.5
                
                if dist < 300:
                    if dist < min_dist:
                        min_dist = dist
                        closest_gate = gate
                        
            except Exception as e:
                print(f"Error calcing distance: {e}")
                continue
                
        if closest_gate:
            print(f"🔔 Driver is {int(min_dist)}m from gate: {closest_gate['name']}", flush=True)
            try:
                update_data = {
                    'current_gate_id': closest_gate['id'],
                    'updated_at': datetime.utcnow().isoformat()
                }
                
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
                    
                    # Log the proximity-triggered event
                    log_delivery_event(
                        delivery_id=delivery_id,
                        condo_id=condo_id,
                        event_type=new_status,
                        metadata={
                            'trigger': 'proximity',
                            'distance_m': int(min_dist),
                            'gate_name': closest_gate['name']
                        }
                    )

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
        if not response.data:
             pass
        return {"message": "Delivery deleted successfully"}  
    except Exception as e:
        print(f"❌ Error deleting delivery: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))
