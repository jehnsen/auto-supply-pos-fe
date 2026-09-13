import { apiRequest } from "./client";

export interface Unit {
  id: number;
  name: string;
  abbreviation: string;
  created_at: string;
  updated_at: string;
}

export function listUnits(): Promise<Unit[]> {
  return apiRequest<Unit[]>("/units");
}

export function getUnit(id: number): Promise<Unit> {
  return apiRequest<Unit>(`/units/${id}`);
}

export interface UnitWritePayload {
  name: string;
  abbreviation: string;
}

export function createUnit(payload: UnitWritePayload): Promise<Unit> {
  return apiRequest<Unit>("/units", { method: "POST", body: payload });
}

export function updateUnit(id: number, payload: Partial<UnitWritePayload>): Promise<Unit> {
  return apiRequest<Unit>(`/units/${id}`, { method: "PUT", body: payload });
}

export function deleteUnit(id: number): Promise<null> {
  return apiRequest<null>(`/units/${id}`, { method: "DELETE" });
}
