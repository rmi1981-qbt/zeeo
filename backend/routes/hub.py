from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import os
from supabase import create_client, Client
import json
import schemas
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
    decision: str # authorized or denied
    channel: str # app_zeeo, whatsapp, push, ifood_app
    actor_id: str # (e.g., resident ID, driver ID, or generic string)
    notes: Optional[str] = None
    phone_hash: Optional[str] = None
    document_hash: Optional[str] = None


async def verify_provider_api_key(x_api_key: str = Header(...)):
    """Verifies the API key belongs to an active Hub Provider."""
    if x_api_key == 'ifood_sim_key_123':
        return {'id': 'simulator', 'name': 'ifood'}
    if x_api_key == 'condominio_sim_key_123':
        return {'id': 'simulator', 'name': 'local_condominium'}

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


import asyncio

async def perform_identity_matching(delivery_id: str, condo_id: str, channel: str, phone_hash: Optional[str], document_hash: Optional[str]):
    """Background task to match a pre-authorized delivery against resident Identity Hashes."""
    if not phone_hash and not document_hash:
        return # Nothing to match
        
    try:
        # Match using phone or document hash directly on the condo's units
        # Join residents with units to filter by condo_id
        match_query = supabase.table('residents').select('id, name, unit_id, units!inner(condo_id, label)').eq('units.condo_id', condo_id)
        
        if phone_hash:
            match_query = match_query.eq('phone_hash', phone_hash)
        elif document_hash:
            match_query = match_query.eq('document_hash', document_hash)
            
        res = match_query.execute()
        
        if res.data and len(res.data) > 0:
            resident = res.data[0]
            print(f"✅ Zero-Knowledge Match Success! Resident {resident['name']} ({resident['units']['label']}) authorized delivery.")
            
            from utils.delivery_helpers import generate_qr_token
            from datetime import timedelta
            qr_token = generate_qr_token()
            qr_expiry = (datetime.utcnow() + timedelta(hours=2)).isoformat()
            
            update_data = {
                'status': 'authorized',
                'authorized_method': channel,
                'authorized_by': resident['id'],
                'authorized_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat(),
                'condo_id': condo_id,
                'qr_code_token': qr_token,
                'qr_code_expires_at': qr_expiry
            }
            supabase.table('deliveries').update(update_data).eq('id', delivery_id).execute()
            
            from utils.delivery_helpers import log_delivery_event
            log_delivery_event(
                delivery_id=delivery_id,
                condo_id=condo_id,
                event_type='authorized',
                metadata={
                    'trigger': 'zero_knowledge_match',
                    'resident_id': resident['id'],
                    'resident_name': resident['name'],
                    'unit_label': resident['units']['label']
                }
            )
        else:
            print(f"⚠️ Zero-Knowledge Match Failed: Hash not found in condo {condo_id}")
            # Do not change status. Leave it as pre_authorized.
            
    except Exception as e:
        print(f"❌ Error in perform_identity_matching: {str(e)}")

@router.post("/webhook/approval")
async def receive_provider_approval(
    payload: ProviderApprovalPayload,
    provider_info: dict = Depends(verify_provider_api_key)
):
    """
    Standard webhook for external integrations (WhatsApp bots, Condo Apps, Intercoms) 
    to send resident approvals or denials to SaFE. 
    It supports Zero-Knowledge matching for pre-authorizations.
    """
    if payload.decision not in ('authorized', 'denied', 'pre_authorized'):
        raise HTTPException(status_code=400, detail="Decision must be 'authorized', 'denied' or 'pre_authorized'")

    try:
        # Fetch current delivery
        res = supabase.table('deliveries').select('id, condo_id, status, request_channels, authorized_method').eq('id', payload.delivery_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Delivery not found")
            
        d = res.data[0]
        current_status = d.get('status')
        
        # Conflict logic: first response wins
        conflict = False
        new_status = 'rejected' if payload.decision == 'denied' else ('pre_authorized' if payload.decision == 'pre_authorized' else 'authorized')
        
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
            
            if new_status == 'authorized':
                 update_data['authorized_at'] = datetime.utcnow().isoformat()
                 from utils.delivery_helpers import generate_qr_token
                 from datetime import timedelta
                 update_data['qr_code_token'] = generate_qr_token()
                 update_data['qr_code_expires_at'] = (datetime.utcnow() + timedelta(hours=2)).isoformat()
            
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
        
        
        # Fire Background Matcher if Pre-Authorized and Hashes are provided
        if not conflict and new_status == 'pre_authorized' and (payload.phone_hash or payload.document_hash):
            asyncio.create_task(perform_identity_matching(
                 delivery_id=payload.delivery_id, 
                 condo_id=d['condo_id'], 
                 channel=payload.channel,
                 phone_hash=payload.phone_hash, 
                 document_hash=payload.document_hash
            ))
        
        return {
             "status": "success", 
             "delivery_status": new_status,
             "conflict": conflict
        }
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        print("WEBHOOK ERROR:", err_msg, flush=True)
        raise HTTPException(status_code=500, detail=str(e) + " | " + err_msg)

@router.post("/check-in/qr")
async def check_in_qr(
    payload: schemas.QRCheckInPayload,
    provider_info: dict = Depends(verify_provider_api_key)
):
    """
    Validates a QR Code OTP scanned by the Portaria or App to allow check-in.
    """
    try:
        # Look for active token
        res = supabase.table('deliveries').select('*')\
            .eq('qr_code_token', payload.qr_code_token)\
            .eq('condo_id', payload.condo_id)\
            .eq('status', 'authorized')\
            .execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Invalid, expired, or unused Token.")
            
        delivery = res.data[0]
        
        # Check Expiration
        expiration_str = delivery.get('qr_code_expires_at')
        if not expiration_str:
            raise HTTPException(status_code=400, detail="Token has no expiration data.")
            
        expiration = datetime.fromisoformat(expiration_str.replace("Z", "+00:00"))
        
        # We need utcnow with timezone support for comparison
        from datetime import timezone
        if expiration < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Token Expired.")
            
        # Success. Check-in!
        update_data = {
            'status': 'inside',
            'entered_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            'qr_code_token': None, # Burn token
            'qr_code_expires_at': None
        }
        
        supabase.table('deliveries').update(update_data).eq('id', delivery['id']).execute()
        
        from utils.delivery_helpers import log_delivery_event
        log_delivery_event(
            delivery_id=delivery['id'],
            condo_id=payload.condo_id,
            event_type='inside',
            metadata={
                'method': 'qr_code_otp',
                'provider': provider_info['name']
            }
        )
        
        return {"status": "success", "message": "Delivery successfully checked in.", "delivery_id": delivery['id']}
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        print("QR CHECK-IN ERROR:", err_msg, flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check-in/biometrics")
async def check_in_biometrics(
    payload: schemas.BiometricVerifyPayload,
    provider_info: dict = Depends(verify_provider_api_key)
):
    """
    Simulates a biometric facial recognition check-in from a physical totem or Gatekeeper manual trigger.
    It expects a delivery_id that is already authorized or pre_authorized.
    """
    try:
        res = supabase.table('deliveries').select('*')\
            .eq('id', payload.delivery_id)\
            .eq('condo_id', payload.condo_id)\
            .execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Delivery not found for this condominium.")
            
        delivery = res.data[0]
        
        if delivery['status'] not in ['authorized', 'pre_authorized']:
            raise HTTPException(status_code=400, detail="Delivery is not in an authorized state for biometric check-in.")

        # Simulate Biometric Match logic using provider API 
        # In this mock, we assume success if passing image_b64
        
        update_data = {
            'status': 'inside',
            'entered_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
        }
        
        supabase.table('deliveries').update(update_data).eq('id', delivery['id']).execute()
        
        # Dispatch webhook for realtime updates
        from webhooks import dispatch_webhook
        
        updated_delivery_res = supabase.table('deliveries').select('*').eq('id', delivery['id']).execute()
        if updated_delivery_res.data:
            dispatch_webhook(payload.condo_id, 'location.updated', updated_delivery_res.data[0])
        
        from utils.delivery_helpers import log_delivery_event
        log_delivery_event(
            delivery_id=delivery['id'],
            condo_id=payload.condo_id,
            event_type='inside',
            metadata={
                'method': 'biometrics',
                'provider': provider_info['name'],
                'match_score': 0.98 if payload.image_b64 else 0.85
            }
        )
        
        return {
            "status": "success", 
            "message": "Biometria validada com sucesso.", 
            "delivery_id": delivery['id'],
            "match_score": 0.98 if payload.image_b64 else 0.85
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        print("BIOMETRIC CHECK-IN ERROR:", err_msg, flush=True)
        raise HTTPException(status_code=500, detail=str(e))
