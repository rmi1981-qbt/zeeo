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


async def verify_provider_api_key(x_api_key: str = Header(...)):
    """Verifies the API key belongs to an active Hub Provider."""
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
    
    update_data = {
        'driver_location': location_wkt,
        'updated_at': datetime.utcnow().isoformat()
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
