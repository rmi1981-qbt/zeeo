from database import supabase
import schemas
import uuid
from datetime import datetime
from shapely import wkb
from shapely.geometry import Point
import binascii
import random
import traceback

def generate_zeeo_code():
    """Generate a random 4-digit Zeeo code for the delivery."""
    return str(random.randint(1000, 9999))

def generate_qr_token():
    """Generate a secure 6-character alphanumeric QR Code token."""
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" # Excluded O,0,1,I for readability
    return ''.join(random.choice(chars) for _ in range(6))

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
