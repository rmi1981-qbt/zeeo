// Shared Types for Zeeo

// --- Geometry & Location ---

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Geofence {
  type: "Polygon";
  coordinates: [number, number][][]; // GeoJSON format: array of linear rings
}

// --- Entities ---

export interface Condo {
  id: string;
  name: string;
  slug: string;             // URL friendly (ex: "solar-dos-bosques")
  zipCode: string;          // Para "Filtro Grosso"
  address_normalized: string; // Para Fallback
  geofence: Geofence;
}

export interface Unit {
  id: string;
  condoId: string;
  label: string;            // Identificador visual (ex: "101-B", "Apto 101")
  residentIds: string[];    // Array de IDs da coleção users
}

export type UserRole = "admin" | "resident" | "concierge";

export interface User {
  id: string;
  name: string;
  photoUrl?: string;
  phone?: string;
  role: UserRole;
  pushTokens?: string[];     // Tokens FCM
  condoIds?: string[];       // Quais condomínios esse usuário pertence?
}

// --- Deliveries & Access ---

export type DeliveryStatus = 'pre_authorized' | 'arriving' | 'at_gate' | 'inside' | 'completed' | 'rejected';
export type DeliverySource = 'app_zeeo' | 'webhook_provider';
export type ProviderName = 'ifood' | 'rappi' | 'uber' | 'mercadolivre' | 'other';

export interface DriverSnapshot {
  name: string;
  plate?: string;
  photoUrl?: string;
  documentHash?: string;
}

export interface Delivery {
  id: string;
  status: DeliveryStatus;
  source: DeliverySource;
  provider: ProviderName;
  externalId?: string; // ID do pedido na plataforma original

  // Snapshot Imutável do Motorista (Dados da fonte)
  driver_snapshot: DriverSnapshot;

  // Contexto de Destino Resolvido
  condoId: string;
  target_unit_label: string; // Texto original (ex: "Ap 101")
  target_user_ids: string[]; // Residents resolvidos pelo Reverse Lookup

  // Geolocation
  location?: GeoPoint;

  // Timestamps
  createdAt: string; // ISO Date
  updatedAt: string; // ISO Date
  arrivedAt?: string; // ISO Date
}
