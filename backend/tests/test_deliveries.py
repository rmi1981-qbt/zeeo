
import pytest
import uuid
import time
from database import supabase

# Global var for cleanup
created_delivery_ids = []
created_gate_ids = []

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
    
    # Cleanup gates
    for g_id in created_gate_ids:
        try:
            # We need to know condo_id to delete gate via API, or use direct DB if possible.
            # But the delete endpoint requires condo_id. 
            # We'll try to store (condo_id, gate_id) or just ignore if it fails, 
            # since test DB might be ephemeral or we don't care about leftover gates in dev.
            # Ideally we'd fix this, but for now let's rely on basic cleanup.
            pass
        except:
            pass

def get_first_condo_id():
    response = supabase.table('condominiums').select('id').limit(1).execute()
    if response.data:
        return response.data[0]['id']
    return None

def test_create_delivery(client):
    condo_id = get_first_condo_id()
    if not condo_id:
        pytest.skip("No condominium found")

    payload = {
        "condo_id": condo_id,
        "driver_name": "Test Driver",
        "platform": "other",
        "status": "created" # Explicitly sending created
    }
    
    response = client.post("/deliveries/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["driver_name"] == "Test Driver"
    assert data["status"] == "created"
    
    created_delivery_ids.append(data["id"])

def test_pre_auth_delivery(client):
    condo_id = get_first_condo_id()
    if not condo_id:
        pytest.skip("No condominium found")

    payload = {
        "condo_id": condo_id,
        "driver_name": "Expected Visitor",
        "unit": "101-A",
        "status": "pre_authorized"
    }
    
    response = client.post("/deliveries/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "pre_authorized"
    assert data["unit"] == "101-A"
    
    created_delivery_ids.append(data["id"])

def test_proximity_integration(client):
    """
    Test that updating location near a gate changes status to approaching/at_gate.
    This requires a Gate to exist.
    """
    condo_id = get_first_condo_id()
    if not condo_id:
        pytest.skip("No condominium found")

    # 1. Create a Gate at a known location (e.g. 0,0 for simplicity, but let's use real coords)
    # Using a slightly offset location to avoid collision with real gates if possible
    gate_lat = -23.5500
    gate_lng = -46.6300
    
    gate_payload = {
        "name": "Proximity Test Gate",
        "lat": gate_lat,
        "lng": gate_lng,
        "is_main": True
    }
    g_res = client.post(f"/condos/{condo_id}/gates", json=gate_payload)
    if g_res.status_code != 200:
        pytest.skip("Failed to create test gate due to setup issues")
        
    gate_data = g_res.json()
    created_gate_ids.append(gate_data["id"])
    
    # Needs to ensure cleanup of this gate!
    # We'll just try to delete it at end of test manually to be safe
    
    try:
        # 2. Create Delivery far away
        d_payload = {
            "condo_id": condo_id,
            "driver_name": "Proximity Driver",
            "driver_lat": -23.6000, # Far away
            "driver_lng": -46.7000,
            "status": "driver_assigned"
        }
        d_res = client.post("/deliveries/", json=d_payload)
        d_data = d_res.json()
        del_id = d_data["id"]
        created_delivery_ids.append(del_id)
        
        # 3. Update Delivery to be CLOSE (< 50m) to the gate
        # 0.0001 deg is roughly 11 meters
        new_lat = gate_lat + 0.0001 
        new_lng = gate_lng
        
        update_payload = {
            "driver_lat": new_lat,
            "driver_lng": new_lng
        }
        
        upd_res = client.put(f"/deliveries/{del_id}/status", json=update_payload)
        assert upd_res.status_code == 200
        
        # 4. Verify Status Change
        # The API updates status synchronously in `check_gate_proximity` (fetched in `update_delivery_status`)
        # logic: if < 50m -> at_gate
        upd_data = upd_res.json()
        
        # We might need to refetch to be sure if the response didn't include the side-effect update?
        # `update_delivery_status` returns the result of the update call, but `check_gate_proximity` does a separate update.
        # So we likely need to GET the delivery again to see the status change.
        
        get_res = client.get(f"/deliveries/{del_id}")
        final_data = get_res.json()
        
        # It should be 'at_gate' (or 'approaching' if logic differs, but <50m is at_gate in code)
        assert final_data['status'] == 'at_gate'
        assert final_data['current_gate']['id'] == gate_data['id']
        
    finally:
        # Cleanup Gate
        client.delete(f"/condos/{condo_id}/gates/{gate_data['id']}")
