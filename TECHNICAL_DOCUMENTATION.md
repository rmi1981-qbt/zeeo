# SaFE - Technical Documentation

## 1. System Overview

**SaFE** (Security and Facility Environment) is a comprehensive web and mobile application designed to manage condominiums internally (residents, units, employees, and operations) and handle integrations with external delivery applications and services. The system relies heavily on a serverless architecture powered by Supabase, combined with a modern React frontend and a FastAPI backend for complex operations and third-party integrations.

### 1.1 Technology Stack

*   **Frontend**: React, TypeScript, Vite, Tailwind CSS.
*   **Backend API**: Python, FastAPI.
*   **Database & Core Services**: Supabase (PostgreSQL managed service, Authentication, Storage).
*   **Maps & Geography**: React Leaflet / Google Maps Platform (Frontend), PostGIS / GeoAlchemy2 (Backend).

---

## 2. Architecture & Separation of Concerns

The architecture follows a hybrid approach where traditional CRUD operations are heavily simplified via direct database access backed by Row-Level Security, while complex business logic and integrations are handled by a dedicated backend.

### 2.1 Database (PostgreSQL / Supabase)
Serves as the single source of truth.
*   **Security (RLS)**: Row-Level Security acts as the primary API Gateway for standard data fetching on the frontend. Users authenticate via Supabase Auth (JWT), and the JWT determines precisely which rows the user can read/write based on their roles.
*   **Data Integrity**: Managed via table constraints, PostgreSQL triggers, and stored procedures.

### 2.2 FastAPI Backend (`/backend`)
Handles complex orchestration, third-party webhook ingestions, and operations requiring secrets that should not be exposed to the client.

*   **REST API**: Exposes JSON payloads via endpoints documented automatically with OpenAPI (Swagger UI).
*   **Integrations Hub**: Centralized system for receiving location updates and delivery drops from external providers (e.g., iFood, Rappi).
*   **AI/OCR Integration**: Implements a multimodal AI pipeline (using Google Gemini) to process delivery information directly from WhatsApp screenshots.

### 2.3 Web Portal (Frontend) (`/web-portal`)
The administrative interface for Concierges, Managers, and Platform Administrators.

*   **State Management**: Context API for global state (e.g., Authentication state, currently selected condominium).
*   **Routing**: React Router for navigating between Dashboard, Integrations, and Condo Settings.
*   **Real-time Updates**: Relies on Supabase Realtime subscriptions to react immediately to changes (e.g., when a driver scans a QR code or biometric validation occurs).

---

## 3. Data Models

The core business entities are defined in `backend/models.py` (SQLAlchemy / GeoAlchemy2) and correspond directly to the PostgreSQL schema.

### 3.1 Facility Structure
*   **Condominium (`condominiums`)**: The root entity representing a physical property. Includes geospatial boundaries (`perimeter` as a PostGIS Polygon), location data (address, city, state), and operational configurations (`condo_type`, `delivery_policy`).
*   **Unit (`units`)**: Represents a specific location inside a condo (block, number) along with exact geographic coordinates (`lat`, `lng`).
*   **Gate (`gates`)**: Managed via `condos.py` routes, defines access points to the condominium.

### 3.2 People & Roles
*   **Resident (`residents`)**: Belongs to a specific unit. Has attributes for contact info, identification document, and permissions (`can_authorize_deliveries`).
*   **Resident Employee (`resident_employees`)**: Belongs to a specific unit (e.g., cleaners, nannies), with roles and access permissions.
*   **Condo Employee (`condo_employees`)**: Belongs to the condominium itself (e.g., concierges, security guards, maintenance staff). Has varying access levels.

### 3.3 Operations
*   **Delivery (`deliveries`)**: Tracks the lifecycle of a delivery from inbound integration, through authorization (pending, approved, trash), to check-in (inside, left).
*   **Delivery Event (`delivery_events`)**: An append-only log of every state change for a given delivery.

---

## 4. API Endpoints Reference

The FastAPI backend exposes the following key routing modules:

### 4.1 Condominiums API (`/condos`)
Handles standard management of condos and their physical gates.
*   `POST /` - Create a new condominium
*   `GET /` - List condominiums
*   `GET /{condo_id}` - Get condominium details
*   `PUT /{condo_id}` - Update a condominium
*   `DELETE /{condo_id}` - Delete a condominium
*   `POST /{condo_id}/gates` - Create a gate access point
*   `GET /{condo_id}/gates` - List all gates for a condo
*   `PUT /{condo_id}/gates/{gate_id}` - Update gate details
*   `DELETE /{condo_id}/gates/{gate_id}` - Delete a gate

### 4.2 Deliveries API (`/deliveries`)
Manages the lifecycle and state of individual deliveries.
*   `POST /` - Create a delivery
*   `GET /` - List deliveries
*   `GET /{delivery_id}` - Get delivery metadata
*   `PUT /{delivery_id}/status` - Update delivery status (e.g., to "approved", "rejected", "trash")
*   `DELETE /{delivery_id}` - Logically delete or cancel a delivery
*   `GET /active` - Get currently active (in-progress) deliveries
*   `GET /events` - Global timeline of delivery events
*   `GET /{delivery_id}/events` - History of a specific delivery
*   `POST /webhook` - Standalone webhook handler for delivery status changes

### 4.3 Integrations Hub (`/api/hub`)
Handles external communication and third-party interactions.
*   `GET /geo-index` - Sync properties and parameters based on geographic indices and policies.
*   `POST /inbound/{provider}/delivery` - Normalizes inbound delivery data from various apps.
*   `POST /inbound/{provider}/location/{delivery_id}` - Receives real-time driver coordinates.
*   `POST /webhook/approval` - WhatsApp / external system approval mechanism.
*   `POST /check-in/qr` - Driver check-in process using QR scanning.
*   `POST /check-in/biometrics` - Driver check-in process using Biometric validation.

---

## 5. Key Features & Workflows

### 5.1 Integrations Hub & Geo-Index Sync
A unified configuration interface allowing administrators to enable/disable specific capabilities on a per-integration basis. The **Geo-Index Sync** ensures that condominium setup rules (such as building type and specific delivery policies like `driver_waits` vs `driver_enters`) are managed correctly at the property level and exposed seamlessly to delivery networks.

### 5.2 Next-Gen Authorizations (WhatsApp + AI OCR)
To reduce friction with missing APIs or rigid delivery platforms, SaFE features a multimodal AI implementation. Residents and drivers can submit screenshots or images of delivery information via WhatsApp. The backend uses AI (Google Gemini) to read, parse, and structure this data into actionable authorization requests for the concierge.

### 5.3 Concierge Active Processes Dashboard
The core interface for front-desk operators. It categorizes operations into a tabbed interface (**Pending**, **Approved**, **Trash**). 
*   **Smart Filtering**: Real-time filtering by unit number, license plate, or gate name.
*   **Recovery Workflow**: Denied or rejected items are temporarily moved to a "Trash" state for 5 minutes, allowing operators to rapidly recover them if mistakenly rejected.

### 5.4 Multimodal Check-in System
Supports both **QR Code** validation and modern **Biometric Validation** at the gate. The UI instantly responds via real-time subscriptions when a check-in passes backend validation, seamlessly turning a "pending" inbound driver into an "inside" state locally on the operator's display.
