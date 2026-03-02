import requests
import time
import random

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

def create_delivery(condo_id, driver_name, status, lat_offset, lng_offset, request_channels=[], authorized_by=None):
    # Create payload (DeliveryCreate schema doesn't have request_channels or authorized_by)
    create_payload = {
        "condo_id": condo_id,
        "unit": f"Apto {random.randint(10, 99)}",
        "status": "created",
        "platform": random.choice(["ifood", "mercadolivre", "uber", "amazon"]),
        "driver_name": driver_name,
        "driver_plate": f"ABC-{random.randint(1000, 9999)}",
        "driver_lat": -23.5505 + lat_offset,
        "driver_lng": -46.6333 + lng_offset
    }
    
    response = requests.post(f"{BASE_URL}/deliveries/", json=create_payload)
    if response.status_code == 200:
        data = response.json()
        del_id = data['id']
        print(f"✅ Created base delivery for {driver_name}")
        
        # Now update to target status with extra auth fields
        update_payload = {
            "status": status,
            "request_channels": request_channels
        }
        if authorized_by:
            update_payload["actor_id"] = authorized_by
            update_payload["authorization_method"] = "phone_call"
            
        res2 = requests.put(f"{BASE_URL}/deliveries/{del_id}/status", json=update_payload)
        if res2.status_code == 200:
            print(f"   -> Updated to {status}")
        else:
            print(f"   ❌ Failed to update {driver_name}: {res2.text}")
             
        return del_id
    else:
        print(f"❌ Failed to create delivery: {response.text}")
        return None

if __name__ == "__main__":
    condo_id = get_first_condo()
    if not condo_id:
        print("No condo found. Please ensure backend is running and db has at least 1 condo.")
        exit()
        
    print(f"Generating mock deliveries for Condo: {condo_id}...\n")
    
    # 1. Pending (Aguardando Liberação)
    create_delivery(condo_id, "João Silva", "at_gate", 0.001, 0.001, ["whatsapp"])
    time.sleep(1)
    
    # 2. Authorized (Autorizado)
    create_delivery(condo_id, "Maria Oliveira", "pre_authorized", -0.001, 0.002, ["push"], "Carlos (Morador)")
    time.sleep(1)
    
    # 3. Denied (Negado)
    create_delivery(condo_id, "Pedro Santos", "rejected", 0.002, -0.001, ["whatsapp"], "Ana (Moradora)")
    time.sleep(1)
    
    # 4. Conflicting (Conflito)
    create_delivery(condo_id, "Lucas Costa", "conflicting", -0.002, -0.002, ["whatsapp", "push"])
    time.sleep(1)
    
    # 5. Inside (No Condomínio)
    create_delivery(condo_id, "Fernanda Lima", "inside", 0.0001, 0.0001, ["phone_call"], "Porteiro Marcos")
    
    print("\nDone! Reload your Gatekeeper Dashboard to see the new UI states.")
