from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

class CondoBase(BaseModel):
    name: str
    address: Optional[str] = None
    number: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    # Perimeter will be accepted as a list of points (lat, lng) from frontend 
    # and converted to WKT in the backend logic, or passed as raw depending on strategy.
    # Let's align with current frontend which sends { perimeter: { lat: number, lng: number }[] }
    perimeter_points: Optional[List[Any]] = None 

class CondoCreate(CondoBase):
    pass

class Condo(CondoBase):
    id: str
    created_at: datetime
    # Return GeoJSON object (dict)
    perimeter: Optional[Any] = None

    class Config:
        from_attributes = True

# --- Delivery Schemas ---

class DeliveryBase(BaseModel):
    condo_id: str
    unit: Optional[str] = None
    status: Optional[str] = 'created' # created, driver_assigned, approaching, at_gate, inside, completed, rejected, pre_authorized
    platform: Optional[str] = 'mock' # ifood, ubereats, mercadolivre, rappi, other, mock
    driver_name: Optional[str] = None
    driver_photo: Optional[str] = None
    driver_plate: Optional[str] = None
    driver_lat: Optional[float] = None
    driver_lng: Optional[float] = None
    eta: Optional[datetime] = None

class DeliveryCreate(DeliveryBase):
    pass

class DeliveryUpdate(BaseModel):
    status: Optional[str] = None
    driver_lat: Optional[float] = None
    driver_lng: Optional[float] = None
    eta: Optional[datetime] = None
    # Authorization fields
    authorization_method: Optional[str] = None  # app_zeeo, whatsapp, push, phone_call, intercom, pre_authorized, manual
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None  # concierge, resident, admin, system
    authorized_by_resident_id: Optional[str] = None
    authorized_by_resident_name: Optional[str] = None
    gate_id: Optional[str] = None
    gate_name: Optional[str] = None
    notes: Optional[str] = None
    request_channels: Optional[List[str]] = None # Tracks channels used to request auth (e.g. ['whatsapp', 'push'])

class GateInfo(BaseModel):
    id: str
    name: str

class Delivery(DeliveryBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    current_gate_id: Optional[str] = None
    current_gate: Optional[GateInfo] = None
    authorized_by: Optional[str] = None
    authorized_method: Optional[str] = None
    authorized_at: Optional[datetime] = None
    entered_at: Optional[datetime] = None
    exited_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Delivery Event Schemas ---

class DeliveryEventCreate(BaseModel):
    delivery_id: str
    condo_id: str
    event_type: str
    actor_id: Optional[str] = None
    actor_role: Optional[str] = 'system'
    actor_name: Optional[str] = None
    authorization_method: Optional[str] = None
    authorized_by_resident_id: Optional[str] = None
    authorized_by_resident_name: Optional[str] = None
    target_unit: Optional[str] = None
    gate_id: Optional[str] = None
    gate_name: Optional[str] = None
    notes: Optional[str] = None
    metadata: Optional[dict] = None # Capture things like request_channels, conflicting_responses, etc

class DeliveryEvent(DeliveryEventCreate):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Webhook Schemas ---
class WebhookPayload(BaseModel):
    delivery_id: str
    channel: str # 'whatsapp', 'push', etc.
    decision: str # 'authorized', 'rejected'
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = 'resident'
    notes: Optional[str] = None

# --- Gate Schemas ---

class GateBase(BaseModel):
    name: str
    is_main: Optional[bool] = False
    lat: float
    lng: float

class GateCreate(GateBase):
    pass

class GateUpdate(BaseModel):
    name: Optional[str] = None
    is_main: Optional[bool] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class Gate(GateBase):
    id: str
    condo_id: str
    created_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True
