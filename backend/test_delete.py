"""
DELETE endpoint to remove a condominium
"""
from fastapi import APIRouter, HTTPException
from database import supabase
import logging

router = APIRouter()

@router.delete('/condos/{condo_id}')
async def delete_condo(condo_id: str):
    """Delete a condominium by ID"""
    try:
        print(f"🗑️ Attempting to delete condo with ID: {condo_id}", flush=True)
        
        # Delete from Supabase
        response = supabase.table('condominiums').delete().eq('id', condo_id).execute()
        
        print(f"📊 Delete response: {response}", flush=True)
        
        # Check if anything was deleted
        if not response.data or len(response.data) == 0:
            print(f"❌ Condo not found: {condo_id}", flush=True)
            raise HTTPException(status_code=404, detail="Condo not found")
        
        print(f"✅ Successfully deleted condo: {condo_id}", flush=True)
        return {"message": "Condo deleted successfully", "id": condo_id}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting condo: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail=f"Error deleting condo: {str(e)}")
