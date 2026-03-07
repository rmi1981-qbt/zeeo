from fastapi import APIRouter, HTTPException
from database import supabase
from pydantic import BaseModel
from typing import Optional, List
import uuid
import traceback

router = APIRouter(prefix="/condos/{condo_id}/units", tags=["units"])

class UnitBase(BaseModel):
    block: Optional[str] = None
    number: Optional[str] = None
    label: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class UnitCreate(UnitBase):
    pass

class UnitUpdate(UnitBase):
    pass

class UnitResponse(UnitBase):
    id: str
    condo_id: str
    created_at: str

@router.get("/", response_model=List[UnitResponse])
def get_units(condo_id: str):
    print(f"📋 GET /condos/{condo_id}/units", flush=True)
    try:
        response = supabase.table('units').select('*').eq('condo_id', condo_id).execute()
        return response.data
    except Exception as e:
        print(f"❌ Error listing units: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=UnitResponse)
def create_unit(condo_id: str, unit: UnitCreate):
    print(f"➕ POST /condos/{condo_id}/units", flush=True)
    try:
        data = {
            "condo_id": condo_id,
            "block": unit.block,
            "number": unit.number,
            "label": unit.label or f"{unit.block + ' ' if unit.block else ''}{unit.number}",
            "lat": unit.lat,
            "lng": unit.lng
        }
        response = supabase.table('units').insert(data).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create unit")
        return response.data[0]
    except Exception as e:
        print(f"❌ Error creating unit: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{unit_id}", response_model=UnitResponse)
def update_unit(condo_id: str, unit_id: str, unit: UnitUpdate):
    print(f"🔄 PUT /condos/{condo_id}/units/{unit_id}", flush=True)
    try:
        data = {k: v for k, v in unit.model_dump().items() if v is not None}
        if not data:
            raise HTTPException(status_code=400, detail="No fields to update")
            
        response = supabase.table('units').update(data).eq('id', unit_id).eq('condo_id', condo_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Unit not found or access denied")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating unit: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{unit_id}")
def delete_unit(condo_id: str, unit_id: str):
    print(f"🗑️ DELETE /condos/{condo_id}/units/{unit_id}", flush=True)
    try:
        response = supabase.table('units').delete().eq('id', unit_id).eq('condo_id', condo_id).execute()
        if not response.data:
            # We don't throw 404 here just in case because delete might return empty list. Actually python client returns deleted row.
            pass
        return {"message": "Unit deleted"}
    except Exception as e:
        print(f"❌ Error deleting unit: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
