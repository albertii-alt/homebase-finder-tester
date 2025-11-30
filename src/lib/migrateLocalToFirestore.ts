import { createBoardinghouse, createRoom, createUserDoc } from "@/lib/firestore";
import type { CreateBoardinghousePayload, CreateRoomPayload } from "@/lib/firestore";
import type { UserRole } from "@/types/firestore";

interface LegacyUserRecord {
  uid?: string;
  id?: string;
  email?: string;
  fullName?: string;
  name?: string;
  role?: string;
}

interface LegacyRoomRecord {
  id?: string;
  number?: string;
  roomName?: string;
  beds?: number;
  totalBeds?: number;
  bedsAvailable?: number;
  availableBeds?: number;
  gender?: string;
  withCR?: boolean;
  cooking?: boolean;
  cookingAllowed?: boolean;
  price?: number;
  rentPrice?: number;
  status?: string;
  inclusions?: string[];
}

interface LegacyBoardinghouseRecord {
  id?: string;
  ownerId?: string;
  ownerEmail?: string;
  owner?: { uid?: string; email?: string };
  name?: string;
  region?: string;
  province?: string;
  city?: string;
  barangay?: string;
  street?: string;
  zipcode?: string;
  description?: string;
  photos?: string[];
  rooms?: LegacyRoomRecord[];
}

export interface MigrationReport {
  usersProcessed: number;
  usersCreated: number;
  boardinghousesProcessed: number;
  boardinghousesCreated: number;
  roomsCreated: number;
  skippedUsers: Array<{ email: string; reason: string }>;
  skippedBoardinghouses: Array<{ id?: string; reason: string }>;
  dryRun: boolean;
}

export interface MigrationOptions {
  emailToUid?: Record<string, string>;
  dryRun?: boolean;
  logger?: (message: string, payload?: unknown) => void;
}

const defaultLogger = (message: string, payload?: unknown) => {
  console.info(`[migration] ${message}`, payload ?? "");
};

const normalizeRole = (value: unknown): UserRole => {
  if (value === "owner" || value === "tenant") return value;
  const lowered = typeof value === "string" ? value.toLowerCase() : "tenant";
  return lowered === "owner" ? "owner" : "tenant";
};

const parseJson = <T>(raw: string | null): T[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const ensureWindow = () => {
  if (typeof window === "undefined") {
    throw new Error("migrateLocalToFirestore must be run in a browser context where localStorage is available.");
  }
};

export const migrateLocalToFirestore = async (
  options: MigrationOptions = {}
): Promise<MigrationReport> => {
  ensureWindow();

  const { emailToUid = {}, dryRun = false, logger = defaultLogger } = options;
  const report: MigrationReport = {
    usersProcessed: 0,
    usersCreated: 0,
    boardinghousesProcessed: 0,
    boardinghousesCreated: 0,
    roomsCreated: 0,
    skippedUsers: [],
    skippedBoardinghouses: [],
    dryRun,
  };

  const registeredUsers = parseJson<LegacyUserRecord>(window.localStorage.getItem("registeredUsers"));
  const boardinghouses = parseJson<LegacyBoardinghouseRecord>(
    window.localStorage.getItem("boardinghouses") ?? window.localStorage.getItem("boardings")
  );

  const emailLookup = new Map<string, string>();
  Object.entries(emailToUid).forEach(([email, uid]) => emailLookup.set(email.toLowerCase(), uid));

  for (const legacyUser of registeredUsers) {
    report.usersProcessed += 1;
    const email = String(legacyUser.email ?? "").trim().toLowerCase();
    if (!email) {
      report.skippedUsers.push({ email: "(missing email)", reason: "Email missing in legacy data" });
      continue;
    }

    const uid =
      legacyUser.uid ??
      legacyUser.id ??
      emailLookup.get(email) ??
      (legacyUser.role === "owner" ? `placeholder-owner-${email}` : `placeholder-tenant-${email}`);

    emailLookup.set(email, uid);

    if (dryRun) {
      logger("dryRun: would create user doc", { uid, email, role: legacyUser.role });
      continue;
    }

    try {
      await createUserDoc(uid, {
        fullName: legacyUser.fullName ?? legacyUser.name ?? email,
        email,
        role: normalizeRole(legacyUser.role),
      });
      report.usersCreated += 1;
    } catch (error) {
      report.skippedUsers.push({ email, reason: (error as Error).message });
      logger("Failed to create user doc", { email, error });
    }
  }

  for (const legacyBh of boardinghouses) {
    report.boardinghousesProcessed += 1;
    const ownerEmail = String(legacyBh.ownerEmail ?? legacyBh.owner?.email ?? "").toLowerCase();
    const ownerUid = legacyBh.ownerId ?? legacyBh.owner?.uid ?? (ownerEmail ? emailLookup.get(ownerEmail) : undefined);
    if (!ownerUid) {
      report.skippedBoardinghouses.push({ id: legacyBh.id, reason: "Owner uid not found" });
      logger("Skipping boardinghouse without owner uid", legacyBh);
      continue;
    }

    const rooms = Array.isArray(legacyBh.rooms) ? legacyBh.rooms : [];

    const payload: CreateBoardinghousePayload = {
      id: legacyBh.id,
      name: legacyBh.name ?? "Untitled Boardinghouse",
      region: legacyBh.region ?? "",
      province: legacyBh.province ?? "",
      city: legacyBh.city ?? "",
      barangay: legacyBh.barangay ?? "",
      street: legacyBh.street ?? "",
      zipcode: legacyBh.zipcode ?? "",
      description: legacyBh.description ?? "",
      photos: Array.isArray(legacyBh.photos) ? legacyBh.photos : [],
      totalRooms: 0,
    };

    if (dryRun) {
      logger("dryRun: would create boardinghouse", { ownerUid, payload });
    } else {
      try {
        await createBoardinghouse(ownerUid, payload);
        report.boardinghousesCreated += 1;
      } catch (error) {
        report.skippedBoardinghouses.push({ id: legacyBh.id, reason: (error as Error).message });
        logger("Failed to create boardinghouse", { id: legacyBh.id, error });
        continue;
      }
    }

    for (const legacyRoom of rooms) {
      const roomPayload: CreateRoomPayload = {
        id: legacyRoom.id,
        number: legacyRoom.number ?? legacyRoom.roomName ?? "Room",
        beds: Number(legacyRoom.beds ?? legacyRoom.totalBeds ?? 0),
        bedsAvailable: Number(legacyRoom.bedsAvailable ?? legacyRoom.availableBeds ?? 0),
        gender: ((): "Male" | "Female" | "Any" => {
          const normalized = String(legacyRoom.gender ?? "Any").toLowerCase();
          if (normalized === "male") return "Male";
          if (normalized === "female") return "Female";
          return "Any";
        })(),
        withCR: Boolean(legacyRoom.withCR),
        cooking: Boolean(legacyRoom.cooking ?? legacyRoom.cookingAllowed),
        price: Number(legacyRoom.price ?? legacyRoom.rentPrice ?? 0),
        status: ((): "Available" | "Occupied" | "Inactive" => {
          const normalized = String(legacyRoom.status ?? "Available").toLowerCase();
          if (normalized === "occupied") return "Occupied";
          if (normalized === "inactive") return "Inactive";
          return "Available";
        })(),
        inclusions: Array.isArray(legacyRoom.inclusions) ? legacyRoom.inclusions : [],
      };

      if (dryRun) {
        logger("dryRun: would create room", { boardinghouseId: legacyBh.id, roomPayload });
        continue;
      }

      try {
        await createRoom(legacyBh.id ?? "", roomPayload);
        report.roomsCreated += 1;
      } catch (error) {
        logger("Failed to create room", { boardinghouseId: legacyBh.id, roomId: legacyRoom.id, error });
      }
    }
  }

  logger("Migration finished", report);
  return report;
};
