from fastapi import APIRouter, HTTPException
from database import supabase
from pydantic import BaseModel
from typing import Optional, List
import traceback

router = APIRouter(prefix="/condos/{condo_id}/units/{unit_id}", tags=["residents"])

# --- Models for Residents ---
class ResidentBase(BaseModel):
    name: str
    phone: Optional[str] = None
    document: Optional[str] = None
    can_authorize_deliveries: Optional[bool] = False
    is_active: Optional[bool] = True

class ResidentCreate(ResidentBase):
    pass

class ResidentUpdate(ResidentBase):
    name: Optional[str] = None

class ResidentResponse(ResidentBase):
    id: str
    unit_id: str
    created_at: str

# --- Models for Resident Employees ---
class ResidentEmployeeBase(BaseModel):
    name: str
    document: Optional[str] = None
    role: Optional[str] = None
    can_authorize_deliveries: Optional[bool] = False
    is_active: Optional[bool] = True

class ResidentEmployeeCreate(ResidentEmployeeBase):
    pass

class ResidentEmployeeUpdate(ResidentEmployeeBase):
    name: Optional[str] = None

class ResidentEmployeeResponse(ResidentEmployeeBase):
    id: str
    unit_id: str
    created_at: str

# --- Resident Endpoints ---

@router.get("/residents", response_model=List[ResidentResponse])
def get_residents(condo_id: str, unit_id: str):
    print(f"📋 GET /condos/{condo_id}/units/{unit_id}/residents", flush=True)
    try:
        response = supabase.table('residents').select('*').eq('unit_id', unit_id).execute()
        return response.data
    except Exception as e:
        print(f"❌ Error listing residents: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/residents", response_model=ResidentResponse)
def create_resident(condo_id: str, unit_id: str, resident: ResidentCreate):
    print(f"➕ POST /condos/{condo_id}/units/{unit_id}/residents", flush=True)
    try:
        data = resident.model_dump()
        data["unit_id"] = unit_id
        response = supabase.table('residents').insert(data).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create resident")
        return response.data[0]
    except Exception as e:
        print(f"❌ Error creating resident: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/residents/{resident_id}", response_model=ResidentResponse)
def update_resident(condo_id: str, unit_id: str, resident_id: str, resident: ResidentUpdate):
    print(f"🔄 PUT /condos/{condo_id}/units/{unit_id}/residents/{resident_id}", flush=True)
    try:
        data = {k: v for k, v in resident.model_dump().items() if v is not None}
        if not data:
            raise HTTPException(status_code=400, detail="No fields to update")
            
        response = supabase.table('residents').update(data).eq('id', resident_id).eq('unit_id', unit_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Resident not found")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating resident: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/residents/{resident_id}")
def delete_resident(condo_id: str, unit_id: str, resident_id: str):
    print(f"🗑️ DELETE /condos/{condo_id}/units/{unit_id}/residents/{resident_id}", flush=True)
    try:
        response = supabase.table('residents').delete().eq('id', resident_id).eq('unit_id', unit_id).execute()
        return {"message": "Resident deleted"}
    except Exception as e:
        print(f"❌ Error deleting resident: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# --- Resident Employees Endpoints ---

@router.get("/employees", response_model=List[ResidentEmployeeResponse])
def get_resident_employees(condo_id: str, unit_id: str):
    print(f"📋 GET /condos/{condo_id}/units/{unit_id}/employees", flush=True)
    try:
        response = supabase.table('resident_employees').select('*').eq('unit_id', unit_id).execute()
        return response.data
    except Exception as e:
        print(f"❌ Error listing resident employees: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/employees", response_model=ResidentEmployeeResponse)
def create_resident_employee(condo_id: str, unit_id: str, employee: ResidentEmployeeCreate):
    print(f"➕ POST /condos/{condo_id}/units/{unit_id}/employees", flush=True)
    try:
        data = employee.model_dump()
        data["unit_id"] = unit_id
        response = supabase.table('resident_employees').insert(data).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create employee")
        return response.data[0]
    except Exception as e:
        print(f"❌ Error creating resident employee: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/employees/{employee_id}", response_model=ResidentEmployeeResponse)
def update_resident_employee(condo_id: str, unit_id: str, employee_id: str, employee: ResidentEmployeeUpdate):
    print(f"🔄 PUT /condos/{condo_id}/units/{unit_id}/employees/{employee_id}", flush=True)
    try:
        data = {k: v for k, v in employee.model_dump().items() if v is not None}
        if not data:
            raise HTTPException(status_code=400, detail="No fields to update")
            
        response = supabase.table('resident_employees').update(data).eq('id', employee_id).eq('unit_id', unit_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Employee not found")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating resident employee: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/employees/{employee_id}")
def delete_resident_employee(condo_id: str, unit_id: str, employee_id: str):
    print(f"🗑️ DELETE /condos/{condo_id}/units/{unit_id}/employees/{employee_id}", flush=True)
    try:
        response = supabase.table('resident_employees').delete().eq('id', employee_id).eq('unit_id', unit_id).execute()
        return {"message": "Employee deleted"}
    except Exception as e:
        print(f"❌ Error deleting resident employee: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
