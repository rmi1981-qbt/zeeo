import datetime
import math
from typing import Dict, Any, List
import httpx
import logging

def calculate_distance_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculates the distance between two coordinate points in meters using the Haversine formula."""
    R = 6371e3 # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = math.sin(delta_phi/2) * math.sin(delta_phi/2) + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda/2) * math.sin(delta_lambda/2)
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance = R * c
    return distance

async def dispatch_webhook(condo_id: str, payload: Dict[str, Any], db_client: Any):
    # This queries the condo or external webhooks table for active subscriptions
    try:
        logging.info(f"🚀 Dispatching outbound webhook for Condo {condo_id}: {payload['event']}")
        # In a real scenario, we'd retrieve URLs from a 'webhooks' config table
        # Since this is a demo/simulation, we'll simulate the HTTP POST Request
        # 
        # async with httpx.AsyncClient() as client:
        #     response = await client.post('https://api.partner.com/v1/webhook', json=payload)
        #     return response.status_code
        return 200
    except Exception as e:
        logging.error(f"Failed to dispatch webhook: {e}")


async def process_delivery_alerts(delivery: Dict[str, Any], condo: Dict[str, Any], db_client: Any) -> List[Dict[str, Any]]:
    """
    Evaluates distance and time constraints for a given delivery based on the condominium's alert configuration.
    Returns the updated active_alerts list.
    """
    # Defensive checks
    if not delivery or not condo:
        return []
    
    alert_config = condo.get('alert_config') or {}
    active_alerts = delivery.get('active_alerts') or []
    new_alerts = [] # To accumulate all alerts active right now

    # Current delivery status and location
    status = delivery.get('status')
    driver_lat = delivery.get('driver_lat')
    driver_lng = delivery.get('driver_lng')

    # Ensure gate info is available if needed
    gate_lat = None
    gate_lng = None
    if alert_config.get('gk_approaching_enabled') or alert_config.get('res_approaching_enabled'):
        # For simplicity, if we don't have the current gate linked, we might fallback to condo center.
        # If the gate data isn't joined here, we fetch it or use the condo's generic location. 
        # In a real impl, we should join 'gates' on delivery.current_gate_id
        # We will use the condo's base location as a fallback portaria if gates are missing.
        gate_lat = condo.get('lat')
        gate_lng = condo.get('lng')

    # Distance-based Alerts (Only when moving/approaching)
    if driver_lat and driver_lng and gate_lat and gate_lng and status in ['approaching', 'created', 'driver_assigned']:
        distance = calculate_distance_meters(driver_lat, driver_lng, gate_lat, gate_lng)
        
        # 1. Gatekeeper Approaching Alert
        if alert_config.get('gk_approaching_enabled'):
            threshold = alert_config.get('gk_approaching_dist_m', 500)
            if distance <= threshold:
                new_alerts.append({
                    "id": "gk_approaching",
                    "type": "info",
                    "target": "gatekeeper",
                    "message": f"Motorista a {int(distance)}m da portaria.",
                    "distance_m": int(distance),
                    "timestamp": datetime.datetime.now().isoformat()
                })

        # 2. Resident Approaching Alert
        if alert_config.get('res_approaching_enabled'):
            threshold = alert_config.get('res_approaching_dist_m', 500)
            if distance <= threshold:
                # We would also trigger outbound webhook to App/WhatsApp here if newly added
                new_alerts.append({
                    "id": "res_approaching",
                    "type": "info",
                    "target": "resident",
                    "message": f"Seu motorista está a {int(distance)}m.",
                    "distance_m": int(distance),
                    "timestamp": datetime.datetime.now().isoformat()
                })

    # Time-based Alerts (When Inside)
    if status == 'inside':
        # Safely parse dates if they are strings
        entered_at_str = delivery.get('entered_at')
        if entered_at_str:
            try:
                if isinstance(entered_at_str, str):
                    entered_at = datetime.datetime.fromisoformat(entered_at_str.replace('Z', '+00:00'))
                else: 
                    entered_at = entered_at_str # already datetime (less likely from REST)
                
                # Assume both are timezone-aware or naive. Ensure UTC for both if timezone-aware.
                now = datetime.datetime.now(datetime.timezone.utc) if entered_at.tzinfo else datetime.datetime.now()
                minutes_inside = (now - entered_at).total_seconds() / 60.0

                if alert_config.get('gk_time_limit_enabled'):
                    limit_min = alert_config.get('gk_time_limit_min', 15)
                    if minutes_inside >= limit_min:
                        new_alerts.append({
                            "id": "gk_time_limit",
                            "type": "warning",
                            "target": "gatekeeper",
                            "message": f"Tempo limite excedido. Morador no interior há {int(minutes_inside)} min (Limite: {limit_min}m).",
                            "timestamp": datetime.datetime.now().isoformat()
                        })
            except Exception as e:
                print(f"Error parsing time for alerts: {e}")

    # Fire Webhooks for state transitions that trigger resident/app alerts:
    # (Leaving the condo - 'exited', Entering the turnstile - 'inside')
    
    # We detect newly added alerts to invoke outbound notification webhooks just once:
    existing_alert_ids = {a['id'] for a in active_alerts}
    for alert in new_alerts:
        if alert['id'] not in existing_alert_ids:
            # IT'S A NEW ALERT -> Fire webhook asynchronously
            print(f"🔔 [NEW ALERT FIRED] {alert['target'].upper()}: {alert['message']}")
            
            # Construct Webhook Payload representing this alert
            payload = {
                "event": f"alert.{alert['id']}",
                "timestamp": alert['timestamp'],
                "delivery_id": delivery['id'],
                "condo_id": condo['id'],
                "data": {
                    "distance_m": alert.get('distance_m'),
                    "message": alert['message'],
                    "driver": delivery.get('driver_snapshot', {}).get('name')
                }
            }
            
            # Fire the async dispatcher without awaiting strictly (in real prod, use background tasks)
            await dispatch_webhook(condo['id'], payload, db_client)

    # Update database with new active_alerts list for this delivery
    # Using REST update
    try:
        db_client.table("deliveries").update({"active_alerts": new_alerts}).eq("id", delivery['id']).execute()
    except Exception as e:
        print(f"Error saving updated active_alerts: {e}")

    return new_alerts
