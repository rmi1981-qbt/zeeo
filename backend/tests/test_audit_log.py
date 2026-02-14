
import pytest
import uuid
import time
from database import supabase

# Global var for cleanup
created_delivery_ids = []

@pytest.fixture(autouse=True)
def cleanup_data(client):
    yield
    # Cleanup deliveries
    for d_id in created_delivery_ids:
        try:
            client.delete(f"/deliveries/{d_id}")
        except:
            pass
    created_delivery_ids.clear()

def get_first_condo_id():
    response = supabase.table('condominiums').select('id').limit(1).execute()
    if response.data:
        return response.data[0]['id']
    return None

def test_audit_log_workflow(client):
    """
    Test the full lifecycle of a delivery and verify audit logs at each step.
    1. Create Delivery -> check 'created' event
    2. Update Status to 'at_gate' -> check 'at_gate' event
    3. Authorize -> check 'authorized' event with metadata
    4. Mark Inside -> check 'inside' event
    """
    condo_id = get_first_condo_id()
    if not condo_id:
        pytest.skip("No condominium found")

    # 1. Create Delivery
    payload = {
        "condo_id": condo_id,
        "driver_name": "Audit Log Driver",
        "platform": "other",
        "status": "created"
    }
    
    response = client.post("/deliveries/", json=payload)
    assert response.status_code == 200
    data = response.json()
    delivery_id = data["id"]
    created_delivery_ids.append(delivery_id)

    # Verify 'created' event
    events_res = client.get(f"/deliveries/{delivery_id}/events")
    assert events_res.status_code == 200
    events = events_res.json()
    assert len(events) >= 1
    assert events[0]['event_type'] == 'created'
    assert events[0]['metadata']['driver_name'] == "Audit Log Driver"

    # 2. Update to 'at_gate'
    update_payload = {
        "status": "at_gate",
        "gate_name": "Main Gate" 
    }
    client.put(f"/deliveries/{delivery_id}/status", json=update_payload)
    
    # Verify 'at_gate' event
    events_res = client.get(f"/deliveries/{delivery_id}/events")
    events = events_res.json()
    last_event = events[-1]
    assert last_event['event_type'] == 'at_gate'
    assert last_event['gate_name'] == "Main Gate"

    # 3. Authorize (mocking user/resident)
    auth_payload = {
        "status": "authorized",
        "authorization_method": "app_zeeo",
        "actor_role": "resident",
        "actor_name": "Resident John",
        "authorized_by_resident_name": "Resident John",
        "notes": "Verified via camera"
    }
    client.put(f"/deliveries/{delivery_id}/status", json=auth_payload)

    # Verify 'authorized' event
    events_res = client.get(f"/deliveries/{delivery_id}/events")
    events = events_res.json()
    last_event = events[-1]
    assert last_event['event_type'] == 'authorized'
    assert last_event['authorization_method'] == 'app_zeeo'
    assert last_event['actor_role'] == 'resident'
    assert last_event['notes'] == 'Verified via camera'

    # Verify delivery record has auth timestamps
    del_res = client.get(f"/deliveries/{delivery_id}")
    del_data = del_res.json()
    assert del_data['authorized_method'] == 'app_zeeo'
    assert del_data['authorized_at'] is not None

    # 4. Mark Inside (Concierge action)
    inside_payload = {
        "status": "inside",
        "actor_role": "concierge",
        "authorization_method": "manual" # Should persist from prev or be manual confirmation
    }
    client.put(f"/deliveries/{delivery_id}/status", json=inside_payload)

    # Verify 'inside' event
    events_res = client.get(f"/deliveries/{delivery_id}/events")
    events = events_res.json()
    last_event = events[-1]
    assert last_event['event_type'] == 'inside'
    
    # Verify entered_at set
    del_res = client.get(f"/deliveries/{delivery_id}")
    del_data = del_res.json()
    assert del_data['entered_at'] is not None
