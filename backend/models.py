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

    # Alerts Configuration
    from sqlalchemy.dialects.postgresql import JSONB
    alert_config = Column(JSONB, nullable=True, server_default='{}')

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # We might need to handle UUID generation if the DB doesn't auto-generate or if we want to do it in python.
    # Standard Supabase tables often use `uuid_generate_v4()` default.

class Unit(Base):
    __tablename__ = "units"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    condo_id = Column(String, nullable=False)
    block = Column(String, nullable=True)
    number = Column(String, nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Resident(Base):
    __tablename__ = "residents"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    unit_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    document = Column(String, nullable=True)
    can_authorize_deliveries = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ResidentEmployee(Base):
    __tablename__ = "resident_employees"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    unit_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    document = Column(String, nullable=True)
    role = Column(String, nullable=True)
    can_authorize_deliveries = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CondoEmployee(Base):
    __tablename__ = "condo_employees"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    condo_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    document = Column(String, nullable=True)
    role = Column(String, nullable=True)
    access_level = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
