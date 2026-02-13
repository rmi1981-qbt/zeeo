import requests
import json
import time

BASE_URL = "http://localhost:8000"

def get_first_condo():
    try:
        response = requests.get(f"{BASE_URL}/condos/")
        if response.status_code == 200:
            condos = response.json()
            if condos:
                return condos[0]['id']
    except Exception as e:
        print(f"Failed to fetch condos: {e}")
    return None

def create_delivery(condo_id):
    payload = {
        "condo_id": condo_id,
        "unit": "Test Unit 101",
        "status": "created",
        "platform": "ifood",
        "driver_name": "Test Driver",
        "driver_plate": "TEST-1234",
        "driver_lat": -23.550520,
        "driver_lng": -46.633308
    }
    print(f"Creating delivery for condo {condo_id}...")
    response = requests.post(f"{BASE_URL}/deliveries/", json=payload)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Created Delivery ID: {data['id']}")
        return data['id']
    else:
        print(f"❌ Failed to create delivery: {response.text}")
        return None

def update_delivery(delivery_id):
    payload = {
        "status": "approaching",
        "driver_lat": -23.551000,
        "driver_lng": -46.634000
    }
    print(f"Updating delivery {delivery_id}...")
    response = requests.put(f"{BASE_URL}/deliveries/{delivery_id}/status", json=payload)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Updated Status: {data['status']}")
        print(f"✅ Updated Location: {data['driver_lat']}, {data['driver_lng']}")
        return True
    else:
        print(f"❌ Failed to update delivery: {response.text}")
        return False

if __name__ == "__main__":
    condo_id = get_first_condo()
    if condo_id:
        delivery_id = create_delivery(condo_id)
        if delivery_id:
            # Simulate movement
            time.sleep(1) 
            update_delivery(delivery_id)
    else:
        print("No condo found to test with.")
