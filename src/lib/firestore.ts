import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit as limitDocuments,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "@/firebase/config";
import type {
  BoardinghouseDoc,
  BoardinghouseWithRooms,
  ListBoardinghousesParams,
  ListBoardinghousesResult,
  RoomDoc,
  UserDoc,
  UserRole,
} from "@/types/firestore";

/**
 * Firestore data-access helpers for Homebase Finder.
 *
 * Security rules (example – configure in Firebase console):
 *
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /boardinghouses/{bhId} {
 *       allow read: if true;
 *       allow create: if request.auth != null && request.auth.uid == request.resource.data.ownerId;
 *       allow update, delete: if request.auth != null && resource.data.ownerId == request.auth.uid;
 *     }
 *     match /boardinghouses/{bhId}/rooms/{roomId} {
 *       allow read: if true;
 *       allow create, update, delete: if request.auth != null && get(/databases/$(database)/documents/boardinghouses/$(bhId)).data.ownerId == request.auth.uid;
 *     }
 *     match /users/{uid} {
 *       allow read: if request.auth != null && request.auth.uid == uid;
 *       allow create: if request.auth != null && request.auth.uid == uid;
 *       allow update: if request.auth != null && request.auth.uid == uid;
 *     }
 *   }
 * }
 *
 * See https://firebase.google.com/docs/emulator-suite for local testing with emulators.
 */

const COLLECTION_USERS = "users";
const COLLECTION_BOARDINGHOUSES = "boardinghouses";
const SUBCOLLECTION_ROOMS = "rooms";

export interface CreateUserPayload {
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface CreateBoardinghousePayload {
  id?: string;
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
  totalRooms?: number;
  ownerName?: string;
  contact?: string;
  facebook?: string;
}

export type UpdateBoardinghousePayload = Partial<
  Omit<CreateBoardinghousePayload, "id" | "photos"> & { photos: string[] }
>;

export interface CreateRoomPayload {
  id?: string;
  number: string;
  beds: number;
  bedsAvailable: number;
  gender: RoomDoc["gender"];
  withCR: boolean;
  cooking: boolean;
  price: number;
  status: RoomDoc["status"];
  inclusions: string[];
}

export type UpdateRoomPayload = Partial<Omit<CreateRoomPayload, "id">>;

const normalizeUuid = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const buildStoragePath = (basePath: string, fileName: string): string => {
  const sanitizedBase = basePath.replace(/\/+$/g, "");
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "jpg";
  const uniqueSuffix = `${Date.now()}-${normalizeUuid()}`;
  return `${sanitizedBase}/${uniqueSuffix}.${extension}`;
};

const isStorageNotFound = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return code === "storage/object-not-found";
};

const deleteStorageTree = async (fullPath: string): Promise<void> => {
  try {
    const rootRef = ref(storage, fullPath);
    const stack = [rootRef];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      const listing = await listAll(current);
      if (listing.prefixes.length) {
        stack.push(...listing.prefixes);
      }
      if (listing.items.length) {
        await Promise.all(
          listing.items.map((itemRef) =>
            deleteObject(itemRef).catch((error) => {
              if (!isStorageNotFound(error)) {
                console.warn(`Failed to delete storage object ${itemRef.fullPath}`, error);
              }
            })
          )
        );
      }
    }
  } catch (error) {
    if (!isStorageNotFound(error)) {
      console.warn(`Failed to delete storage tree at ${fullPath}`, error);
    }
  }
};

const mapBoardinghouseSnapshot = (
  snapshot: QueryDocumentSnapshot<DocumentData>
): BoardinghouseDoc => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ownerId: String(data.ownerId),
    name: String(data.name ?? ""),
    region: String(data.region ?? ""),
    regionCode: data.regionCode ? String(data.regionCode) : undefined,
    province: String(data.province ?? ""),
    provinceCode: data.provinceCode ? String(data.provinceCode) : undefined,
    city: String(data.city ?? ""),
    cityCode: data.cityCode ? String(data.cityCode) : undefined,
    barangay: String(data.barangay ?? ""),
    barangayCode: data.barangayCode ? String(data.barangayCode) : undefined,
    street: String(data.street ?? ""),
    zipcode: String(data.zipcode ?? ""),
    description: String(data.description ?? ""),
    photos: Array.isArray(data.photos) ? (data.photos as string[]) : [],
    ownerName: data.ownerName ? String(data.ownerName) : undefined,
    contact: data.contact ? String(data.contact) : undefined,
    facebook: data.facebook ? String(data.facebook) : undefined,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    totalRooms: typeof data.totalRooms === "number" ? data.totalRooms : undefined,
  };
};

const mapRoomSnapshot = (
  snapshot: QueryDocumentSnapshot<DocumentData>,
  boardinghouseId: string
): RoomDoc => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    boardinghouseId,
    number: String(data.number ?? data.roomName ?? ""),
    beds: Number(data.beds ?? data.totalBeds ?? 0),
    bedsAvailable: Number(data.bedsAvailable ?? data.availableBeds ?? 0),
    gender: (data.gender as RoomDoc["gender"]) ?? "Any",
    withCR: Boolean(data.withCR ?? data.cr ?? data.withComfortRoom ?? false),
    cooking: Boolean(data.cooking ?? data.cookingAllowed ?? false),
    price: Number(data.price ?? data.rentPrice ?? 0),
    status: (data.status as RoomDoc["status"] | undefined) ?? "Available",
    inclusions: Array.isArray(data.inclusions) ? (data.inclusions as string[]) : [],
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

export const createUserDoc = async (uid: string, payload: CreateUserPayload): Promise<UserDoc> => {
  try {
    if (!uid) throw new Error("Missing uid");
    const userRef = doc(db, COLLECTION_USERS, uid);
    await setDoc(userRef, {
      uid,
      fullName: payload.fullName,
      email: payload.email.toLowerCase(),
      role: payload.role,
      avatarUrl: payload.avatarUrl ?? null,
      createdAt: serverTimestamp(),
    });
    const snapshot = await getDoc(userRef);
    const data = snapshot.data() ?? {};
    return {
      uid,
      fullName: String(data.fullName ?? payload.fullName),
      email: String(data.email ?? payload.email).toLowerCase(),
      role: (data.role as UserRole | undefined) ?? payload.role,
      avatarUrl: data.avatarUrl ? String(data.avatarUrl) : undefined,
      createdAt: data.createdAt ?? null,
    };
  } catch (error) {
    throw new Error(`createUserDoc failed: ${(error as Error).message}`);
  }
};

export const getUserDoc = async (uid: string): Promise<UserDoc | null> => {
  try {
    if (!uid) return null;
    const snapshot = await getDoc(doc(db, COLLECTION_USERS, uid));
    if (!snapshot.exists()) return null;
    const data = snapshot.data() ?? {};
    return {
      uid: snapshot.id,
      fullName: String(data.fullName ?? ""),
      email: String(data.email ?? ""),
      role: (data.role as UserRole | undefined) ?? "tenant",
      avatarUrl: data.avatarUrl ? String(data.avatarUrl) : undefined,
      createdAt: data.createdAt ?? null,
    };
  } catch (error) {
    throw new Error(`getUserDoc failed: ${(error as Error).message}`);
  }
};

export const createBoardinghouse = async (
  ownerId: string,
  payload: CreateBoardinghousePayload
): Promise<BoardinghouseDoc> => {
  try {
    if (!ownerId) throw new Error("Missing ownerId");
    const baseRef = collection(db, COLLECTION_BOARDINGHOUSES);
    const bhRef = payload.id ? doc(db, COLLECTION_BOARDINGHOUSES, payload.id) : doc(baseRef);
    await setDoc(bhRef, {
      ownerId,
      name: payload.name,
      region: payload.region,
      regionCode: payload.regionCode ?? null,
      province: payload.province,
      provinceCode: payload.provinceCode ?? null,
      city: payload.city,
      cityCode: payload.cityCode ?? null,
      barangay: payload.barangay,
      barangayCode: payload.barangayCode ?? null,
      street: payload.street,
      zipcode: payload.zipcode,
      description: payload.description,
      photos: payload.photos,
      ownerName: payload.ownerName ?? null,
      contact: payload.contact ?? null,
      facebook: payload.facebook ?? null,
      totalRooms: payload.totalRooms ?? 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const snapshot = await getDoc(bhRef);
    if (!snapshot.exists()) {
      throw new Error("Failed to read freshly created boardinghouse");
    }
    return mapBoardinghouseSnapshot(snapshot as QueryDocumentSnapshot<DocumentData>);
  } catch (error) {
    throw new Error(`createBoardinghouse failed: ${(error as Error).message}`);
  }
};

export const updateBoardinghouse = async (
  id: string,
  payload: UpdateBoardinghousePayload
): Promise<void> => {
  try {
    if (!id) throw new Error("Missing boardinghouse id");
    const bhRef = doc(db, COLLECTION_BOARDINGHOUSES, id);
    await updateDoc(bhRef, {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw new Error(`updateBoardinghouse failed: ${(error as Error).message}`);
  }
};

export const deleteBoardinghouse = async (id: string): Promise<void> => {
  try {
    if (!id) throw new Error("Missing boardinghouse id");
    const bhRef = doc(db, COLLECTION_BOARDINGHOUSES, id);
    const snapshotBeforeDelete = await getDoc(bhRef);
    let storagePath: string | null = null;
    if (snapshotBeforeDelete.exists()) {
      const data = snapshotBeforeDelete.data() ?? {};
      const ownerId = data.ownerId ? String(data.ownerId) : "";
      if (ownerId) {
        storagePath = `owners/${ownerId}/boardinghouses/${snapshotBeforeDelete.id}`;
      }
    }
    const roomsRef = collection(bhRef, SUBCOLLECTION_ROOMS);

    let snapshot = await getDocs(query(roomsRef, limitDocuments(500)));
    while (!snapshot.empty) {
      const batch = writeBatch(db);
      snapshot.docs.forEach((roomDoc) => batch.delete(roomDoc.ref));
      await batch.commit();
      const last = snapshot.docs[snapshot.docs.length - 1];
      snapshot = await getDocs(query(roomsRef, startAfter(last), limitDocuments(500)));
    }

    await deleteDoc(bhRef);
    if (storagePath) {
      await deleteStorageTree(storagePath);
    }
  } catch (error) {
    throw new Error(`deleteBoardinghouse failed: ${(error as Error).message}`);
  }
};

const applyRoomFilters = (
  rooms: RoomDoc[],
  filters?: ListBoardinghousesParams["filters"]
): RoomDoc[] => {
  if (!filters) return rooms;
  return rooms.filter((room) => {
    if (filters.gender && room.gender !== filters.gender) {
      if (!(filters.gender === "Any" && room.gender === "Any")) {
        return false;
      }
    }
    if (filters.priceRange) {
      const minOk = filters.priceRange.min == null || room.price >= filters.priceRange.min;
      const maxOk = filters.priceRange.max == null || room.price <= filters.priceRange.max;
      if (!minOk || !maxOk) return false;
    }
    return true;
  });
};

export const listBoardinghouses = async (
  params: ListBoardinghousesParams = {}
): Promise<ListBoardinghousesResult> => {
  try {
    const { limit: pageSize = 12, cursor = null, filters } = params;
    const constraints: QueryConstraint[] = [
      orderBy("createdAt", "desc"),
      limitDocuments(pageSize + 5),
    ];

    if (filters?.ownerId) {
      constraints.push(where("ownerId", "==", filters.ownerId));
    }
    if (filters?.regionCode) {
      constraints.push(where("regionCode", "==", filters.regionCode));
    } else if (filters?.region) {
      constraints.push(where("region", "==", filters.region));
    }
    if (filters?.provinceCode) {
      constraints.push(where("provinceCode", "==", filters.provinceCode));
    } else if (filters?.province) {
      constraints.push(where("province", "==", filters.province));
    }
    if (filters?.cityCode) {
      constraints.push(where("cityCode", "==", filters.cityCode));
    } else if (filters?.city) {
      constraints.push(where("city", "==", filters.city));
    }

    if (cursor) constraints.push(startAfter(cursor));

    const q = query(collection(db, COLLECTION_BOARDINGHOUSES), ...constraints);
    const snapshot = await getDocs(q);

    const boardinghouses: BoardinghouseWithRooms[] = [];
    for (const docSnap of snapshot.docs) {
      const bh = mapBoardinghouseSnapshot(docSnap as QueryDocumentSnapshot<DocumentData>);
      const roomsSnapshot = await getDocs(collection(docSnap.ref, SUBCOLLECTION_ROOMS));
      const rooms = roomsSnapshot.docs.map((roomSnap) => mapRoomSnapshot(roomSnap, bh.id));
      const filteredRooms = applyRoomFilters(rooms, filters);
      if (filters?.priceRange || filters?.gender) {
        if (filteredRooms.length === 0) {
          continue;
        }
      }
      boardinghouses.push({ ...bh, rooms: filteredRooms.length ? filteredRooms : rooms });
    }

    const nextCursor = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

    if (filters?.priceRange || filters?.gender) {
      // Developers might require composite indexes when adding more filters.
      // Create necessary indexes in Firebase console if Firestore throws an error.
    }

    return { boardinghouses, cursor: nextCursor };
  } catch (error) {
    throw new Error(`listBoardinghouses failed: ${(error as Error).message}`);
  }
};

export const getBoardinghouseById = async (id: string): Promise<BoardinghouseWithRooms | null> => {
  try {
    if (!id) return null;
    const bhRef = doc(db, COLLECTION_BOARDINGHOUSES, id);
    const snapshot = await getDoc(bhRef);
    if (!snapshot.exists()) return null;
    const bh = mapBoardinghouseSnapshot(snapshot as QueryDocumentSnapshot<DocumentData>);
    const roomsSnapshot = await getDocs(collection(bhRef, SUBCOLLECTION_ROOMS));
    const rooms = roomsSnapshot.docs.map((roomSnap) => mapRoomSnapshot(roomSnap, bh.id));
    return { ...bh, rooms };
  } catch (error) {
    throw new Error(`getBoardinghouseById failed: ${(error as Error).message}`);
  }
};

export const createRoom = async (
  boardinghouseId: string,
  payload: CreateRoomPayload
): Promise<RoomDoc> => {
  try {
    if (!boardinghouseId) throw new Error("Missing boardinghouseId");
    const roomsRef = collection(db, COLLECTION_BOARDINGHOUSES, boardinghouseId, SUBCOLLECTION_ROOMS);
    const roomRef = payload.id ? doc(roomsRef, payload.id) : doc(roomsRef);
    await setDoc(roomRef, {
      boardinghouseId,
      number: payload.number,
      beds: payload.beds,
      bedsAvailable: payload.bedsAvailable,
      gender: payload.gender,
      withCR: payload.withCR,
      cooking: payload.cooking,
      price: payload.price,
      status: payload.status,
      inclusions: payload.inclusions,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, COLLECTION_BOARDINGHOUSES, boardinghouseId), {
      totalRooms: increment(1),
      updatedAt: serverTimestamp(),
    });

    const snapshot = await getDoc(roomRef);
    if (!snapshot.exists()) throw new Error("Room not found after creation");
    return mapRoomSnapshot(snapshot as QueryDocumentSnapshot<DocumentData>, boardinghouseId);
  } catch (error) {
    throw new Error(`createRoom failed: ${(error as Error).message}`);
  }
};

export const updateRoom = async (
  boardinghouseId: string,
  roomId: string,
  payload: UpdateRoomPayload
): Promise<void> => {
  try {
    if (!boardinghouseId || !roomId) throw new Error("Missing identifiers");
    const roomRef = doc(db, COLLECTION_BOARDINGHOUSES, boardinghouseId, SUBCOLLECTION_ROOMS, roomId);
    await updateDoc(roomRef, {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw new Error(`updateRoom failed: ${(error as Error).message}`);
  }
};

export const deleteRoom = async (boardinghouseId: string, roomId: string): Promise<void> => {
  try {
    if (!boardinghouseId || !roomId) throw new Error("Missing identifiers");
    const roomRef = doc(db, COLLECTION_BOARDINGHOUSES, boardinghouseId, SUBCOLLECTION_ROOMS, roomId);
    await deleteDoc(roomRef);
    await updateDoc(doc(db, COLLECTION_BOARDINGHOUSES, boardinghouseId), {
      totalRooms: increment(-1),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw new Error(`deleteRoom failed: ${(error as Error).message}`);
  }
};

export const uploadPhoto = async (file: File, basePath: string): Promise<string> => {
  try {
    const storagePath = buildStoragePath(basePath, file.name ?? "photo.jpg");
    const storageRef = ref(storage, storagePath);
    const metadata = { contentType: file.type || "image/jpeg" };
    await uploadBytes(storageRef, file, metadata);
    return await getDownloadURL(storageRef);
  } catch (error) {
    throw new Error(`uploadPhoto failed: ${(error as Error).message}`);
  }
};

export const getCurrentUserWithProfile = async (): Promise<UserDoc | null> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  return await getUserDoc(currentUser.uid);
};
