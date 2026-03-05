from sqlalchemy import Column, String, DateTime, Text, func
from database import Base
import datetime
import uuid
# Import GeoAlchemy2 types
from geoalchemy2 import Geography

class Condo(Base):
    __tablename__ = "condominiums"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    # Using Geography type for PostGIS geography column
    perimeter = Column(Geography(geometry_type='POLYGON', srid=4326), nullable=True)
    address = Column(String, nullable=True)
    number = Column(String, nullable=True)
    neighborhood = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip_code = Column(String, nullable=True)
    
    # Condo Operations Policies
    condo_type = Column(String, nullable=True, default="horizontal") # vertical, horizontal, mixed
    delivery_policy = Column(String, nullable=True, default="driver_waits") # driver_enters, driver_waits, lockers

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # We might need to handle UUID generation if the DB doesn't auto-generate or if we want to do it in python.
    # Standard Supabase tables often use `uuid_generate_v4()` default.
