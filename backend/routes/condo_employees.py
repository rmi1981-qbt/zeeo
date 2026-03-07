from fastapi import APIRouter, HTTPException
from database import supabase
from pydantic import BaseModel
from typing import Optional, List
import traceback

router = APIRouter(prefix="/condos/{condo_id}/employees", tags=["condo_employees"])

class CondoEmployeeBase(BaseModel):
    name: str
    document: Optional[str] = None
    role: Optional[str] = None
    access_level: Optional[str] = None
    is_active: Optional[bool] = True

class CondoEmployeeCreate(CondoEmployeeBase):
    pass

class CondoEmployeeUpdate(CondoEmployeeBase):
    name: Optional[str] = None

class CondoEmployeeResponse(CondoEmployeeBase):
    id: str
    condo_id: str
    created_at: str

@router.get("", response_model=List[CondoEmployeeResponse])
def get_condo_employees(condo_id: str):
    print(f"📋 GET /condos/{condo_id}/employees", flush=True)
    try:
        response = supabase.table('condo_employees').select('*').eq('condo_id', condo_id).execute()
        return response.data
    except Exception as e:
        print(f"❌ Error listing condo employees: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=CondoEmployeeResponse)
def create_condo_employee(condo_id: str, employee: CondoEmployeeCreate):
    print(f"➕ POST /condos/{condo_id}/employees", flush=True)
    try:
        data = employee.model_dump()
        data["condo_id"] = condo_id
        response = supabase.table('condo_employees').insert(data).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create condo employee")
        return response.data[0]
    except Exception as e:
        print(f"❌ Error creating condo employee: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{employee_id}", response_model=CondoEmployeeResponse)
def update_condo_employee(condo_id: str, employee_id: str, employee: CondoEmployeeUpdate):
    print(f"🔄 PUT /condos/{condo_id}/employees/{employee_id}", flush=True)
    try:
        data = {k: v for k, v in employee.model_dump().items() if v is not None}
        if not data:
            raise HTTPException(status_code=400, detail="No fields to update")
            
        response = supabase.table('condo_employees').update(data).eq('id', employee_id).eq('condo_id', condo_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Condo employee not found")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating condo employee: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{employee_id}")
def delete_condo_employee(condo_id: str, employee_id: str):
    print(f"🗑️ DELETE /condos/{condo_id}/employees/{employee_id}", flush=True)
    try:
        response = supabase.table('condo_employees').delete().eq('id', employee_id).eq('condo_id', condo_id).execute()
        return {"message": "Condo employee deleted"}
    except Exception as e:
        print(f"❌ Error deleting condo employee: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
