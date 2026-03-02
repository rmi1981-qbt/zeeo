print("🚀 Backend V2.0 - Supabase REST API Mode", flush=True)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.cors import CORSMiddleware
from routes import condos, deliveries, hub
import database  # This initializes Supabase client

app = FastAPI(title="SaFE Backend", version="2.0.0-supabase-rest")

# Configure CORS - allow all origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Register routers
app.include_router(condos.router)
app.include_router(deliveries.router)
app.include_router(hub.router, prefix="/api/hub", tags=["Integrations Hub"])
print("✅ Routers registered!", flush=True)

@app.get("/")
def read_root():
    return {
        "message": "Backend is running", 
        "version": "2.0.0-supabase-rest",
        "mode": "Supabase REST API (HTTPS)"
    }

@app.get("/health")
def health():
    return {
        "status": "ok", 
        "mode": "supabase-rest-api",
        "connection": "https"
    }

print("🎯 Backend ready! Using Supabase REST API via HTTPS", flush=True)
