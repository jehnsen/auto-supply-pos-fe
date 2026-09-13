"use client";

/**
 * Customer vehicles — the units the shop services.
 *
 * Backed by `/api/v1/vehicles`. Listing is unpaginated by design: a customer has a handful
 * of vehicles and the intake desk filters locally, so the endpoint returns them all.
 */

import { apiRequest } from "./client";

export type VehicleKind = "car" | "motorcycle" | "ebike" | "truck" | "van" | "suv" | "other";

export interface Vehicle {
  uuid: string;
  /** Owning customer's uuid. */
  customer_uuid: string | null;
  kind: VehicleKind;
  /** Plate or conduction sticker. Uppercased server-side; unique per store. */
  plate: string;
  make: string;
  model: string;
  /** Model year. Null when the customer doesn't know it. */
  year: number | null;
  color: string | null;
  vin: string | null;
  engine_no: string | null;
  /** Last odometer reading recorded at intake, in kilometres. */
  odometer_km: number | null;
  notes: string | null;
  /** Server-rendered one-liner, e.g. "ABC-1234 · 2022 Honda Rebel 500". */
  label: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleWritePayload {
  customer_uuid: string;
  kind: VehicleKind;
  plate: string;
  make: string;
  model: string;
  year?: number | null;
  color?: string | null;
  vin?: string | null;
  engine_no?: string | null;
  odometer_km?: number | null;
  notes?: string | null;
}

export const VEHICLE_KIND_LABELS: Record<VehicleKind, string> = {
  car: "Car",
  motorcycle: "Motorcycle",
  ebike: "E-bike",
  truck: "Truck",
  van: "Van",
  suv: "SUV",
  other: "Other",
};

export function listVehicles(customerUuid?: string, q?: string): Promise<Vehicle[]> {
  return apiRequest<Vehicle[]>("/vehicles", { params: { customer_uuid: customerUuid, q } });
}

export function getVehicle(uuid: string): Promise<Vehicle> {
  return apiRequest<Vehicle>(`/vehicles/${uuid}`);
}

/** Looks a vehicle up by plate — the intake desk's fastest path. Null when unknown. */
export async function findVehicleByPlate(plate: string): Promise<Vehicle | null> {
  try {
    return await apiRequest<Vehicle>(`/vehicles/plate/${encodeURIComponent(plate.trim().toUpperCase())}`);
  } catch {
    // A 404 here is an ordinary "new unit", not an exceptional condition.
    return null;
  }
}

export function createVehicle(payload: VehicleWritePayload): Promise<Vehicle> {
  return apiRequest<Vehicle>("/vehicles", { method: "POST", body: payload });
}

export function updateVehicle(uuid: string, payload: Partial<VehicleWritePayload>): Promise<Vehicle> {
  return apiRequest<Vehicle>(`/vehicles/${uuid}`, { method: "PUT", body: payload });
}

export function deleteVehicle(uuid: string): Promise<void> {
  return apiRequest<void>(`/vehicles/${uuid}`, { method: "DELETE" });
}

/**
 * "ABC-1234 · 2022 Honda Rebel 500" — the one-line form used in pickers and ticket headers.
 * Prefers the server's own `label`, falling back to composing it locally.
 */
export function describeVehicle(v: Vehicle): string {
  if (v.label) return v.label;
  const spec = [v.year ? String(v.year) : null, v.make, v.model].filter(Boolean).join(" ");
  return spec ? `${v.plate} · ${spec}` : v.plate;
}
