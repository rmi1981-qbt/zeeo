import os
import json
import hmac
import hashlib
import asyncio
import httpx
from datetime import datetime
from typing import Any, Dict

def sign_payload(payload: str, secret: str) -> str:
    """Generate HMAC-SHA256 signature for the webhook payload."""
    if not secret:
        return ""
    signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return f"sha256={signature}"

async def _send_webhook(url: str, secret: str, event_type: str, payload: Dict[str, Any]):
    """Actually sends the HTTP request."""
    # We wrap the payload in a standard event envelope
    envelope = {
        "event": event_type,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "data": payload
    }
    
    payload_str = json.dumps(envelope)
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "SaFE-Hub/1.0",
        "X-SaFE-Event": event_type
    }
    
    if secret:
        headers["X-SaFE-Signature"] = sign_payload(payload_str, secret)
        
    async with httpx.AsyncClient() as client:
        try:
            # Short timeout to avoid blocking if the condo server is down
            response = await client.post(url, content=payload_str, headers=headers, timeout=5.0)
            print(f"Webhook [{event_type}] sent to {url} - Status: {response.status_code}")
        except Exception as e:
            print(f"Failed to send webhook [{event_type}] to {url}: {str(e)}")

def dispatch_webhook(condominium_id: str, event_type: str, payload: Dict[str, Any]):
    """
    Triggered by the Hub APIs. Look up any active webhooks for this condo
    and dispatch them asynchronously.
    """
    # Import supabase within the function to avoid circular imports if any
    from supabase import create_client, Client
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_KEY", "")
    supabase: Client = create_client(url, key)
    
    # Query active webhooks for this condo
    res = supabase.table('condominium_webhooks').select('url, secret_key, events').eq('condominium_id', condominium_id).eq('is_active', True).execute()
    
    webhooks = res.data or []
    for wh in webhooks:
        events = wh.get('events', [])
        # If '{all}' is in events, or the exact event_type is listed, we send
        if '{all}' in events or event_type in events:
            # We schedule the task to run in the background so we don't block the API response
            asyncio.create_task(_send_webhook(wh['url'], wh.get('secret_key', ''), event_type, payload))
