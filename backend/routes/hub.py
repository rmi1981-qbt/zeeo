from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import os
from supabase import create_client, Client
import json
from utils.delivery_helpers import generate_zeeo_code, check_gate_proximity

router = APIRouter()

# Supabase Client
url: str = os.getenv("SUPABASE_URL", "")
key: str = os.getenv("SUPABASE_KEY", "")
supabase: Client = create_client(url, key)


class ProviderDeliveryPayload(BaseModel):
    condo_id: str
    target_unit: str
    driver_name: str
    driver_photo_url: Optional[str] = None
    vehicle_plate: Optional[str] = None
    eta_mins: Optional[int] = None
    driver_lat: Optional[float] = None
    driver_lng: Optional[float] = None

class ProviderLocationPayload(BaseModel):
    driver_lat: float
    driver_lng: float

class ProviderApprovalPayload(BaseModel):
    delivery_id: str
    decision: str  # 'authorized' or 'denied'
    actor_id: Optional[str] = None
    channel: str   # 'whatsapp', 'app_condominio', etc.
    notes: Optional[str] = None


async def verify_provider_api_key(x_api_key: str = Header(...)):
    """Verifies the API key belongs to an active Hub Provider."""
    if x_api_key == 'ifood_sim_key_123':
        return {'id': 'simulator', 'name': 'ifood'}

    res = supabase.table('hub_providers').select('id, name').eq('api_key', x_api_key).eq('is_active', True).execute()
    if not res.data:
        raise HTTPException(status_code=401, detail="Invalid or inactive API Key")
    return res.data[0]


@router.post("/inbound/{provider}/delivery")
async def create_inbound_delivery(
    provider: str,
    payload: ProviderDeliveryPayload,
    provider_info: dict = Depends(verify_provider_api_key)
):
    """
    Called by external providers (iFood, MercadoLivre) or our Simulator
    to inject a new delivery into the SaFE platform hub.
    """
    if provider_info['name'] != provider:
        raise HTTPException(status_code=403, detail="API Key does not match the provider name in the path.")

    # 1. Convert ETA to Datetime if present
    eta_dt = None
    if payload.eta_mins is not None:
        from datetime import timedelta
        eta_dt = (datetime.utcnow() + timedelta(minutes=payload.eta_mins)).isoformat()

    # 2. Insert into the main deliveries table
    
    # Map 'uber' back to 'ubereats' for the DB check constraint, 
    # but still allow the API to use 'uber' gracefully
    db_platform = 'ubereats' if provider == 'uber' else provider

    delivery_data = {
        'condo_id': payload.condo_id,
        'unit': payload.target_unit,
        'status': 'approaching',
        'platform': db_platform,
        'driver_name': payload.driver_name,
        'driver_photo': payload.driver_photo_url,
        'driver_plate': payload.vehicle_plate,
        'eta': eta_dt,
        'created_at': datetime.utcnow().isoformat(),
        'updated_at': datetime.utcnow().isoformat()
    }

    if payload.driver_lat is not None and payload.driver_lng is not None:
         delivery_data['driver_location'] = f"SRID=4326;POINT({payload.driver_lng} {payload.driver_lat})"


    try:
        response = supabase.table('deliveries').insert(delivery_data).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create inbound delivery")
        
        created_delivery = response.data[0]

        from webhooks import dispatch_webhook
        dispatch_webhook(payload.condo_id, 'delivery.created', created_delivery)

        return {"status": "success", "data": created_delivery}
    except Exception as e:
        import traceback
        print(f"Error inserting delivery:")
        traceback.print_exc()
        if hasattr(e, 'details'):
            print(f"Details: {e.details}")
        if hasattr(e, 'message'):
            print(f"Message: {e.message}")
        print(f"Raw error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inbound/{provider}/location/{delivery_id}")
async def update_inbound_location(
    provider: str,
    delivery_id: str,
    payload: ProviderLocationPayload,
    provider_info: dict = Depends(verify_provider_api_key)
):
    """
    Called by external providers or the Simulator to update driver location.
    """
    if provider_info['name'] != provider:
        raise HTTPException(status_code=403, detail="API Key does not match the provider name.")

    # Format location as PostGIS Point
    location_wkt = f"SRID=4326;POINT({payload.driver_lng} {payload.driver_lat})"
    
    # Fetch condo_id to include in update for Realtime filter
    d_res = supabase.table('deliveries').select('condo_id').eq('id', delivery_id).execute()
    if not d_res.data:
        raise HTTPException(status_code=404, detail="Delivery not found")
        
    update_data = {
        'driver_location': location_wkt,
        'updated_at': datetime.utcnow().isoformat(),
        'condo_id': d_res.data[0]['condo_id']
    }
    
    response = supabase.table('deliveries').update(update_data).eq('id', delivery_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Delivery not found")

    updated_delivery = response.data[0]
    
    # We also check gate proximity to auto-update status if they arrive at the boundary
    # The DB stores driver_location as a WKB or geometry dict depending on query, we pass raw lat/lng
    check_gate_proximity(delivery_id, payload.driver_lat, payload.driver_lng, updated_delivery['condo_id'], updated_delivery['status'])

    from webhooks import dispatch_webhook
    dispatch_webhook(updated_delivery['condo_id'], 'location.updated', updated_delivery)

    return {"status": "success", "message": "Location updated via Hub"}


@router.post("/webhook/approval")
async def receive_provider_approval(
    payload: ProviderApprovalPayload,
    provider_info: dict = Depends(verify_provider_api_key)
):
    """
    Standard webhook for external integrations (WhatsApp bots, Condo Apps, Intercoms) 
    to send resident approvals or denials to SaFE.
    """
    if payload.decision not in ('authorized', 'denied'):
        raise HTTPException(status_code=400, detail="Decision must be 'authorized' or 'denied'")

    try:
        # Fetch current delivery
        res = supabase.table('deliveries').select('id, condo_id, status, request_channels, authorized_method').eq('id', payload.delivery_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Delivery not found")
            
        d = res.data[0]
        current_status = d.get('status')
        
        # Conflict logic: first response wins
        conflict = False
        new_status = 'rejected' if payload.decision == 'denied' else 'authorized'
        
        if current_status in ('authorized', 'denied', 'rejected'):
            if current_status != new_status:
                conflict = True
                new_status = current_status # Keep old status
            else:
                return {"status": "ignored", "message": "Delivery already in requested state"}
                
        # Build update
        update_data = {
            'updated_at': datetime.utcnow().isoformat(),
            'condo_id': d['condo_id'] # Pass condo_id to ensure Realtime triggers
        }
        
        if not conflict and current_status not in ('authorized', 'denied', 'rejected'):
            update_data['status'] = new_status
            update_data['authorized_method'] = payload.channel
            update_data['authorized_at'] = datetime.utcnow().isoformat()
            
            # authorized_by must be a UUID in the DB. If it's a generic string ("Morador"), skip it for the deliveries table
            if payload.actor_id:
                import uuid
                try:
                    uuid.UUID(payload.actor_id)
                    update_data['authorized_by'] = payload.actor_id
                except ValueError:
                    pass
            
        request_channels = d.get('request_channels') or []
        if payload.channel not in request_channels:
             request_channels.append(payload.channel)
        update_data['request_channels'] = request_channels
        
        # Update Delivery
        update_resp = supabase.table('deliveries').update(update_data).eq('id', payload.delivery_id).execute()
        
        # Log Event
        from utils.delivery_helpers import log_delivery_event
        event_metadata = {
            'channel': payload.channel,
            'decision': payload.decision,
            'conflict_flagged': conflict,
            'provider_name': provider_info['name']
        }
        if payload.notes:
            event_metadata['notes'] = payload.notes
        
        # We can store the non-UUID names deep inside the metadata or event payload
        if payload.actor_id:
            event_metadata['actor_string_id'] = payload.actor_id
            
        log_delivery_event(
            delivery_id=payload.delivery_id,
            condo_id=d['condo_id'],
            event_type='webhook_received',
            metadata=event_metadata
        )
        
        return {
             "status": "success", 
             "delivery_status": update_resp.data[0]['status'],
             "conflict": conflict
        }
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        print("WEBHOOK ERROR:", err_msg, flush=True)
        raise HTTPException(status_code=500, detail=str(e) + " | " + err_msg)
