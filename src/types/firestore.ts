import type { Timestamp, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

export type UserRole = "owner" | "tenant";

export interface UserDoc {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt?: Timestamp | null;
}

export interface BoardinghouseDoc {
  id: string;
  ownerId: string;
  name: string;
  region: string;
  regionCode?: string;
  province: string;
  provinceCode?: string;
  city: string;
  cityCode?: string;
  barangay: string;
  barangayCode?: string;
  street: string;
  zipcode: string;
  description: string;
  photos: string[];
  ownerName?: string;
  contact?: string;
  facebook?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  totalRooms?: number;
}

export interface RoomDoc {
  id: string;
  boardinghouseId: string;
  number: string;
  beds: number;
  bedsAvailable: number;
  gender: "Male" | "Female" | "Any";
  withCR: boolean;
  cooking: boolean;
  price: number;
  status: "Available" | "Occupied" | "Inactive";
  inclusions: string[];
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface BoardinghouseWithRooms extends BoardinghouseDoc {
  rooms: RoomDoc[];
}

export interface ListBoardinghousesParams {
  limit?: number;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
  filters?: {
    ownerId?: string;
    region?: string;
    regionCode?: string;
    province?: string;
    provinceCode?: string;
    city?: string;
    cityCode?: string;
    priceRange?: { min?: number; max?: number };
    gender?: RoomDoc["gender"];
  };
}

export interface ListBoardinghousesResult {
  boardinghouses: BoardinghouseWithRooms[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
}
