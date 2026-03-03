from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import supabase
import schemas
import uuid
import traceback
from datetime import datetime, timedelta
from shapely import wkb
from shapely.geometry import Point, mapping
import binascii

from utils.delivery_helpers import parse_location, log_delivery_event, check_gate_proximity, generate_zeeo_code

router = APIRouter(prefix="/deliveries", tags=["deliveries"])
@router.get("/active", response_model=list[schemas.Delivery])
def list_active_deliveries(condo_id: str = Query(..., description="Condo ID to filter deliveries")):
    """List active processes for the gatekeeper dashboard.
       Includes incoming, at gate, inside, and recently exited (< visibility timeout)."""
    try:
        # Get condo timeout config
        timeout_mins = 5
        try:
            config_res = supabase.table('condominiums').select('exit_visibility_timeout_mins').eq('id', condo_id).execute()
            if config_res.data and config_res.data[0].get('exit_visibility_timeout_mins'):
                timeout_mins = config_res.data[0]['exit_visibility_timeout_mins']
        except Exception as config_err:
            print(f"⚠️ Could not fetch exit_visibility_timeout_mins (column may not exist): {config_err}", flush=True)

        # Calculate cutoff time for exiting early
        cutoff_time = datetime.utcnow() - timedelta(minutes=timeout_mins)
        
        # We fetch all deliveries from the last 24h to be safe, then filter in python
        yesterday = (datetime.utcnow() - timedelta(days=1)).isoformat()
        response = supabase.table('deliveries').select('*, current_gate:gates(id, name)').eq('condo_id', condo_id).gte('updated_at', yesterday).order('updated_at', desc=True).execute()
        
        active_deliveries = []
        for d in response.data:
            status = d.get('status')
            
            # If final status, check if it was recently exited/completed/rejected/denied
            if status in ('exited', 'completed', 'rejected', 'superseded', 'denied'):
                updated_at_str = d.get('updated_at') or d.get('created_at')
                # Try to parse standard ISO format handling Z
                if updated_at_str.endswith('Z'):
                    updated_at_str = updated_at_str[:-1]
                try:
                    # Strip fractional seconds for standard parsing if needed, but fromisoformat handles simple cases in 3.11+
                    updated_dt = datetime.fromisoformat(updated_at_str.split('+')[0])
                    if updated_dt < cutoff_time:
                        continue # Skip, it's older than timeout
                except Exception as e:
                    print(f"Time parse error for delivery {d['id']}: {e}")
                    pass
            
            lat, lng = parse_location(d.get('driver_location'))
            d['driver_lat'] = lat
            d['driver_lng'] = lng
            active_deliveries.append(d)
            
        return active_deliveries
    except Exception as e:
        print(f"❌ Error listing active deliveries: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook", response_model=schemas.Delivery)
def authorization_webhook(payload: schemas.WebhookPayload):
    """Webhook for WhatsApp/Push auto-approval (first response wins)."""
    print(f"🔔 Webhook received for {payload.delivery_id} via {payload.channel} (Decision: {payload.decision})", flush=True)
    try:
        # Fetch current delivery
        response = supabase.table('deliveries').select('*').eq('id', payload.delivery_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Delivery not found")
        
        d = response.data[0]
        current_status = d.get('status')
        existing_method = d.get('authorized_method')
        
        # If already authorized or denied, flag conflict if decision is different
        conflict = False
        new_status = payload.decision
        
        if current_status in ('authorized', 'denied', 'rejected'):
            if current_status != new_status:
                conflict = True
                print(f"⚠️ Conflict detected: Delivery {d['id']} was {current_status} by {existing_method}, now webhook says {new_status} via {payload.channel}")
                # We do not override the first response. The first response wins.
                new_status = current_status # Keep old status
            else:
                # Same decision, ignore redundant webhook
                return d
        
        # Build update
        update_data = {
            'updated_at': datetime.utcnow().isoformat()
        }
        
        if not conflict and current_status not in ('authorized', 'denied', 'rejected'):
            # First response!
            update_data['status'] = new_status
            update_data['authorized_method'] = payload.channel
            update_data['authorized_by'] = payload.actor_id
            update_data['authorized_at'] = datetime.utcnow().isoformat()
            
        # Add to request channels
        request_channels = d.get('request_channels') or []
        if payload.channel not in request_channels:
            request_channels.append(payload.channel)
        update_data['request_channels'] = request_channels
            
        # Execute update
        update_resp = supabase.table('deliveries').update(update_data).eq('id', payload.delivery_id).execute()
        result = update_resp.data[0]
        
        # Log event
        event_metadata = {
            'channel': payload.channel,
            'decision': payload.decision,
            'conflict_flagged': conflict
        }
        if payload.notes:
            event_metadata['notes'] = payload.notes
            
        log_delivery_event(
            delivery_id=payload.delivery_id,
            condo_id=d['condo_id'],
            event_type='webhook_received',
            target_unit=d.get('unit'),
            metadata=event_metadata
        )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in webhook: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

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
        
        # Include condo_id so Supabase Realtime doesn't filter out the UPDATE
        res_condo = supabase.table('deliveries').select('condo_id').eq('id', delivery_id).execute()
        if res_condo.data:
            data['condo_id'] = res_condo.data[0]['condo_id']

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
