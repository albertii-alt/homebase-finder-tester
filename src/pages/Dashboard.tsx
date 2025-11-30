import { Building2, Bed, Bath, ChefHat, DoorOpen, Plus, Edit, Image, AlertCircle, TrendingUp, RefreshCw } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import "../styles/dashboard.css";
import "../styles/boardinghouse.css";
import { useIsMobile } from "../hooks/use-mobile";
import React from "react";
import { useToast } from "../hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import type { BoardinghouseWithRooms, RoomDoc } from "@/types/firestore";
import { getUserDoc } from "@/lib/firestore";

// Recharts for Data Overview
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

const Dashboard = () => {
  // Use local isMobile state to match Sidebar breakpoint (1024px)
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { toast } = useToast();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = React.useState<{ uid: string; email: string; role: string } | null>(null);
  const [loadingAuth, setLoadingAuth] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [boardinghouses, setBoardinghouses] = React.useState<BoardinghouseWithRooms[]>([]);
  const [rooms, setRooms] = React.useState<RoomDoc[]>([]);

  // activity log and reminders
  const [activityLog, setActivityLog] = React.useState<
    Array<{ ts: number; message: string; type?: string; meta?: any }>
  >([]);
  const [alerts, setAlerts] = React.useState<Array<{ id: string; message: string }>>([]);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await getUserDoc(user.uid);
          if (profile && profile.role === "owner") {
            setCurrentUser({ uid: user.uid, email: user.email || "", role: "owner" });
          } else {
            toast({ title: "Access denied", description: "Dashboard is for owners only." });
            navigate("/interface");
          }
        } catch (e) {
          console.error("Error fetching user profile", e);
        }
      } else {
        navigate("/auth");
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [navigate, toast]);

  const fetchData = React.useCallback(async () => {
    if (!currentUser) return;

    try {
      // Fetch boardinghouses for this owner
      const q = query(
        collection(db, "boardinghouses"),
        where("ownerId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      
      const bhList: BoardinghouseWithRooms[] = [];
      const allRooms: RoomDoc[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const bhId = docSnap.id;
        
        // Fetch rooms for each boardinghouse
        const roomsRef = collection(db, "boardinghouses", bhId, "rooms");
        const roomsSnap = await getDocs(roomsRef);
        
        const bhRooms: RoomDoc[] = roomsSnap.docs.map(r => {
          const rData = r.data();
          return {
            id: r.id,
            boardinghouseId: bhId,
            number: rData.number || rData.roomName || "",
            beds: Number(rData.beds || rData.totalBeds || 0),
            bedsAvailable: Number(rData.bedsAvailable || rData.availableBeds || 0),
            gender: rData.gender || "Any",
            withCR: Boolean(rData.withCR || rData.cr),
            cooking: Boolean(rData.cooking || rData.cookingAllowed),
            price: Number(rData.price || rData.rentPrice || 0),
            status: rData.status || "Available",
            inclusions: rData.inclusions || [],
            createdAt: rData.createdAt,
            updatedAt: rData.updatedAt
          } as RoomDoc;
        });

        allRooms.push(...bhRooms);

        bhList.push({
          id: bhId,
          ownerId: data.ownerId,
          name: data.name,
          region: data.region,
          province: data.province,
          city: data.city,
          barangay: data.barangay,
          street: data.street,
          zipcode: data.zipcode,
          description: data.description,
          photos: data.photos || [],
          ownerName: data.ownerName,
          contact: data.contact,
          facebook: data.facebook,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          totalRooms: data.totalRooms,
          rooms: bhRooms
        } as BoardinghouseWithRooms);
      }

      setBoardinghouses(bhList);
      setRooms(allRooms);

      // Synthesize activity log from timestamps
      const synthetic: Array<{ ts: number; message: string; type?: string; meta?: any }> = [];
      
      const getTs = (val: any) => {
        if (!val) return Date.now();
        if (typeof val.toMillis === "function") return val.toMillis();
        if (val instanceof Date) return val.getTime();
        if (typeof val === "string") {
          const t = new Date(val).getTime();
          return Number.isNaN(t) ? Date.now() : t;
        }
        if (typeof val === "number") return val;
        return Date.now();
      };

      bhList.forEach(bh => {
        if (bh.updatedAt) {
          synthetic.push({ ts: getTs(bh.updatedAt), message: `Boardinghouse updated: ${bh.name}`, type: "boardinghouse", meta: { id: bh.id } });
        } else if (bh.createdAt) {
          synthetic.push({ ts: getTs(bh.createdAt), message: `Boardinghouse created: ${bh.name}`, type: "boardinghouse", meta: { id: bh.id } });
        }
      });
      // Sort by newest
      synthetic.sort((a, b) => b.ts - a.ts);
      setActivityLog(synthetic.slice(0, 50));

      // Build alerts
      const newAlerts: Array<{ id: string; message: string }> = [];
      let dismissed: string[] = [];
      try {
        dismissed = (JSON.parse(localStorage.getItem("dismissedAlerts") ?? "[]") as string[]) || [];
      } catch {
        dismissed = [];
      }

      bhList.forEach((bh) => {
        const bhRooms = bh.rooms || [];
        if (bhRooms.length === 0) {
          newAlerts.push({ id: `bh-${bh.id}-norooms`, message: `Boardinghouse "${bh.name}" has no rooms.` });
        }
        
        // per-room missing fields
        bhRooms.forEach((r: any) => {
          if (!r.number || !String(r.number).trim()) {
            newAlerts.push({ id: `bh-${bh.id}-room-${r.id}-name`, message: `Boardinghouse "${bh.name || bh.id}" — Room (${r.id}) is missing a number/name.` });
          }
          if (r.beds == null || r.beds === "") {
            newAlerts.push({ id: `bh-${bh.id}-room-${r.id}-beds`, message: `Boardinghouse "${bh.name || bh.id}" — Room "${r.number || r.id}" is missing total beds.` });
          }
          if (r.price == null || r.price === "") {
            newAlerts.push({ id: `bh-${bh.id}-room-${r.id}-price`, message: `Boardinghouse "${bh.name || bh.id}" — Room "${r.number || r.id}" is missing rent price.` });
          }
        });

        // Check for missing photos
        if (!bh.photos || bh.photos.length === 0) {
          newAlerts.push({ id: `bh-${bh.id}-nophotos`, message: `Boardinghouse "${bh.name}" has no photos.` });
        }
      });
      setAlerts(newAlerts.filter((a) => !dismissed.includes(a.id)));

    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
      setError("Failed to load dashboard data. Please try refreshing.");
      toast({ title: "Error", description: "Failed to load dashboard data." });
    }
  }, [currentUser, toast]);

  React.useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, fetchData]);

  const handleRefresh = () => {
    fetchData();
    toast({ title: "Dashboard refreshed", description: "Dashboard data refreshed successfully" });
  };

  // Clear recent updates (activity log)
  const clearActivity = () => {
    try {
      // Persist an explicit empty array so fetchData treats it as intentionally cleared
      localStorage.setItem("activityLog", JSON.stringify([]));
    } catch {}
    setActivityLog([]);
    toast({ title: "Recent updates cleared" });
  };

  // Clear reminders/alerts
  const clearAlerts = () => {
    try {
      // persist a flag so other tabs/windows can respond (if needed)
      // mark all current alerts as dismissed so they won't be rebuilt on fetch
      const existing = alerts.map((a) => a.id);
      const prev = JSON.parse(localStorage.getItem("dismissedAlerts") ?? "[]") as string[];
      const merged = Array.from(new Set([...(prev || []), ...existing]));
      localStorage.setItem("dismissedAlerts", JSON.stringify(merged));
    } catch {}
    setAlerts([]);
    toast({ title: "Reminders & Alerts cleared" });
  };
  
  // delete a single activity item (persisted to activityLog)
  const deleteActivityItem = (tsKey: number, metaId?: string | number) => {
    const idKey = `${tsKey}-${metaId ?? ""}`;
    const next = activityLog.filter((a) => `${a.ts}-${a.meta?.id ?? ""}` !== idKey);
    try {
      // persist remaining activities
      localStorage.setItem("activityLog", JSON.stringify(next));
    } catch {}
    setActivityLog(next);
    toast({ title: "Activity removed" });
  };

  // dismiss a single alert (persisted to dismissedAlerts so it won't be rebuilt)
  const dismissAlertItem = (alertId: string) => {
    const next = alerts.filter((a) => a.id !== alertId);
    try {
      const prev = JSON.parse(localStorage.getItem("dismissedAlerts") ?? "[]") as string[];
      const merged = Array.from(new Set([...(prev || []), alertId]));
      localStorage.setItem("dismissedAlerts", JSON.stringify(merged));
    } catch {}
    setAlerts(next);
    toast({ title: "Reminder dismissed" });
  };

  // single expand/collapse state controlling both sections
  const [expandedAll, setExpandedAll] = React.useState(false);
  const LIST_COLLAPSE_COUNT = 5; // show up to 5 items when collapsed

  // measure real DOM heights for robust collapsed/expanded sizing (avoids clipping)
  const activityListRef = React.useRef<HTMLDivElement | null>(null);
  const alertsListRef = React.useRef<HTMLDivElement | null>(null);
  const bottomGridRef = React.useRef<HTMLDivElement | null>(null);

  const [activityCollapsedH, setActivityCollapsedH] = React.useState<number>(0);
  const [activityExpandedH, setActivityExpandedH] = React.useState<number>(0);
  const [alertsCollapsedH, setAlertsCollapsedH] = React.useState<number>(0);
  const [alertsExpandedH, setAlertsExpandedH] = React.useState<number>(0);

  const measureListHeights = (listEl: HTMLDivElement | null, count: number) => {
    if (!listEl) return { collapsed: 0, expanded: 0 };
    const children = Array.from(listEl.children) as HTMLElement[];
    // expanded is the scrollHeight (includes padding)
    const expanded = listEl.scrollHeight || children.reduce((s, c) => s + c.getBoundingClientRect().height, 0);
    const cs = window.getComputedStyle(listEl);
    const gap = parseFloat(cs.rowGap || cs.gap || "0") || 0;
    const padTop = parseFloat(cs.paddingTop || "0") || 0;
    const padBottom = parseFloat(cs.paddingBottom || "0") || 0;

    const visibleChildren = children.slice(0, Math.max(0, Math.min(count, children.length)));
    const collapsed = visibleChildren.reduce((s, c, idx) => s + c.getBoundingClientRect().height + (idx > 0 ? gap : 0), 0) + padTop + padBottom;
    const SAFETY = 4;
    return { collapsed: Math.ceil(collapsed + SAFETY), expanded: Math.ceil(expanded + SAFETY) };
  };

  // measure whenever lists change or window resizes
  React.useLayoutEffect(() => {
    const measureAll = () => {
      const a = measureListHeights(activityListRef.current, LIST_COLLAPSE_COUNT);
      setActivityCollapsedH(a.collapsed || 48);
      setActivityExpandedH(a.expanded || Math.max(a.collapsed, 200));
      const b = measureListHeights(alertsListRef.current, LIST_COLLAPSE_COUNT);
      setAlertsCollapsedH(b.collapsed || 48);
      setAlertsExpandedH(b.expanded || Math.max(b.collapsed, 200));
    };
    measureAll();
    const onResize = () => measureAll();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activityLog, alerts, LIST_COLLAPSE_COUNT]);

  // helpers used by the toggle buttons
  const activityHasMore = activityLog.length > LIST_COLLAPSE_COUNT;
  const alertsHasMore = alerts.length > LIST_COLLAPSE_COUNT;
 
  const toggleExpandAll = () => {
     setExpandedAll((prev) => {
       const next = !prev;
       // if we're expanding, scroll the bottom grid into view after the height transition starts/finishes
       if (!prev) {
         // match transition duration (360ms) and allow slight extra time
         window.setTimeout(() => {
           bottomGridRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
         }, 420);
       } else {
         // when collapsing, gently ensure the top of the bottom-grid is visible
         window.setTimeout(() => {
           bottomGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
         }, 200);
       }
       return next;
     });
   };

  // Quick action helpers
  const goAddBoardinghouse = () => navigate("/add-boardinghouse");
  const goAddRoom = () => {
    // preselect first boardinghouse if present
    if (boardinghouses.length > 0) {
      try {
        localStorage.setItem("selectedBoardinghouseId", boardinghouses[0].id);
      } catch {}
    }
    navigate("/add-room");
  };
  const goEditRoom = () => {
    if (boardinghouses.length > 0) {
      try {
        localStorage.setItem("selectedBoardinghouseId", boardinghouses[0].id);
      } catch {}
    }
    navigate("/edit-room");
  };
  const goUploadPhotos = () => {
    if (boardinghouses.length > 0) {
      try {
        localStorage.setItem("selectedBoardinghouseId", boardinghouses[0].id);
      } catch {}
    }
    navigate("/my-boardinghouse");
  };

  // Data for charts (insert near other calculations)
  const roomsByGenderCounts = React.useMemo(() => {
    const male = rooms.filter((r) => String(r.gender ?? "").toLowerCase() === "male").length;
    const female = rooms.filter((r) => String(r.gender ?? "").toLowerCase() === "female").length;
    const anyCount = rooms.filter((r) => {
      const g = String(r.gender ?? "").toLowerCase();
      return g !== "male" && g !== "female";
    }).length;
    return { male, female, any: anyCount };
  }, [rooms]);

  // ----- Data Overview helpers -----
  const { totalBeds, occupiedBeds, occupancyPercent } = React.useMemo(() => {
    const totals = rooms.reduce(
      (acc, room) => {
        const total = Number(room.beds) || 0;
        const available = Number(room.bedsAvailable) || 0;
        acc.total += total;
        acc.occupied += Math.max(0, total - available);
        return acc;
      },
      { total: 0, occupied: 0 }
    );
    return {
      totalBeds: totals.total,
      occupiedBeds: totals.occupied,
      occupancyPercent: totals.total > 0 ? Math.round((totals.occupied / totals.total) * 100) : 0,
    };
  }, [rooms]);

  const amenityData = React.useMemo(() => {
    const counts = {
      wifi: 0,
      aircon: 0,
      fan: 0,
      cooking: 0,
      privateCR: 0,
    };
    rooms.forEach((room) => {
      const inclusions = (room.inclusions || []).map((item) => String(item).toLowerCase());
      if (inclusions.some((item) => item.includes("wifi"))) counts.wifi += 1;
      if (inclusions.some((item) => item.includes("aircon") || item.includes("air-con") || item.includes("ac")))
        counts.aircon += 1;
      if (inclusions.some((item) => item.includes("fan"))) counts.fan += 1;
      if (room.cooking) counts.cooking += 1;
      if (room.withCR) counts.privateCR += 1;
    });
    return [
      { name: "WiFi", count: counts.wifi },
      { name: "Aircon", count: counts.aircon },
      { name: "Fan", count: counts.fan },
      { name: "Cooking Allowed", count: counts.cooking },
      { name: "Private CR", count: counts.privateCR },
    ];
  }, [rooms]);

  const priceRangeData = React.useMemo(() => {
    const buckets = [
      { label: "0–999", min: 0, max: 999, count: 0 },
      { label: "1000–1499", min: 1000, max: 1499, count: 0 },
      { label: "1500–1999", min: 1500, max: 1999, count: 0 },
      { label: "2000+", min: 2000, max: Infinity, count: 0 },
    ];
    rooms.forEach((room) => {
      const price = Number(room.price);
      if (!Number.isFinite(price)) return;
      const bucket = buckets.find((b) => price >= b.min && price <= b.max);
      if (bucket) bucket.count += 1;
    });
    return buckets.map((bucket) => ({ name: bucket.label, count: bucket.count }));
  }, [rooms]);

  const performanceData = React.useMemo(() => {
    return boardinghouses.map((bh) => {
      const bhRooms = bh.rooms || [];
      const total = bhRooms.length;
      const available = bhRooms.filter((room) => Number(room.bedsAvailable) > 0).length;
      return {
        name: bh.name || "Untitled",
        total,
        available,
        occupied: Math.max(0, total - available),
      };
    });
  }, [boardinghouses]);
  // ----- end helpers -----

  const totalBoardinghouses = boardinghouses.length;
  const totalRooms = rooms.length;
  const roomsWithCR = rooms.filter((r) => Boolean(r.withCR)).length;
  const roomsWithCooking = rooms.filter((r) => Boolean(r.cooking)).length;
  const availableRooms = rooms.filter((r) => Number(r.bedsAvailable) > 0).length;

  const summaryStats = [
    { icon: Building2, title: "Total Boardinghouses", value: totalBoardinghouses, color: "#06b6d4" },
    { icon: Bed, title: "Total Rooms", value: totalRooms, color: "#3b82f6" },
    { icon: Bath, title: "Rooms with CR", value: roomsWithCR, color: "#8b5cf6" },
    { icon: ChefHat, title: "Rooms with Cooking Allowed", value: roomsWithCooking, color: "#10b981" },
    { icon: DoorOpen, title: "Available Rooms", value: availableRooms, color: "#f59e0b" },
  ];

  const roomsWithCRPercent = totalRooms > 0 ? Math.round((roomsWithCR / totalRooms) * 100) : 0;
  const maxGenderCount = Math.max(1, roomsByGenderCounts.male, roomsByGenderCounts.female, roomsByGenderCounts.any);

  const roomsDetailed = React.useMemo(() => {
    return rooms.map((r) => ({
      ...r,
      roomName: r.number, // Map number to roomName for display compatibility
      boardinghouseName: boardinghouses.find((b) => (b.rooms || []).some((rr) => rr.id === r.id))?.name ?? "Unknown",
    })) as Array<typeof rooms[number] & { roomName: string; boardinghouseName: string }>;
  }, [boardinghouses, rooms]);

  if (loadingAuth) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", color: "red" }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
          Reload Page
        </button>
      </div>
    );
  }

   return (
     <div className="app-layout">
      <Sidebar />
      <div
        className="main-content dashboard-content"
        style={{
          marginLeft: isMobile ? undefined : "260px",
          minHeight: "100vh",
        }}
      >
        {/* Header */}
        <div className="dashboard-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 className="dashboard-title">Dashboard</h1>
            <button
              className="btn-refresh"
              onClick={handleRefresh}
              style={{ marginLeft: 8 }}
              aria-label="Refresh dashboard"
            >
              <RefreshCw size={18} />
            </button>
          </div>
          <p className="dashboard-subtitle">Welcome back</p>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards-grid">
          {summaryStats.map((stat, index) => (
            <div key={index} className="summary-card">
              <div className="summary-card-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                <stat.icon size={28} />
              </div>
              <div className="summary-card-content">
                <p className="summary-card-title">{stat.title}</p>
                <p className="summary-card-value">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Boardinghouse Summary Table */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Boardinghouse Summary</h2>
          </div>

          {boardinghouses.length === 0 ? (
            <div className="empty-state">
              <p>No boardinghouses added yet.</p>
              <p>Add a boardinghouse to see this summary.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Boardinghouse Name</th>
                    <th>Location</th>
                    <th>Total Rooms</th>
                    <th>Available Rooms</th>
                    <th>With CR</th>
                    <th>Cooking Allowed</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {boardinghouses.map((bh) => {
                    const total = bh.rooms?.length ?? 0;
                    const available = (bh.rooms ?? []).filter((r) => Number(r.bedsAvailable) > 0).length;
                    const anyCR = (bh.rooms ?? []).some((r) => r.withCR) ? "Yes" : "No";
                    const anyCooking = (bh.rooms ?? []).some((r) => r.cooking) ? "Yes" : "No";
                    return (
                      <tr key={bh.id}>
                        <td className="font-semibold text-blue-600">{bh.name}</td>
                        <td>{bh.address}</td>
                        <td>{total}</td>
                        <td>{available}</td>
                        <td>{anyCR}</td>
                        <td>{anyCooking}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-view"
                              onClick={() => {
                                try {
                                  localStorage.setItem("selectedBoardinghouseId", bh.id);
                                } catch {}
                                navigate("/my-boardinghouse");
                              }}
                            >
                              View
                            </button>
                            <button
                              className="btn-edit"
                              onClick={() => {
                                try {
                                  localStorage.setItem("selectedBoardinghouseId", bh.id);
                                } catch {}
                                navigate(`/edit-boardinghouse/${bh.id}`);
                              }}
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Room Overview Section */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Room Overview</h2>
          </div>

          {roomsDetailed.length === 0 ? (
            <div className="empty-state">
              <p>No rooms added yet.</p>
              <p>Add rooms to boardinghouses to see room overview here.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Room Name</th>
                    <th>Boardinghouse</th>
                    <th>Beds Available</th>
                    <th>Gender Allowed</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {roomsDetailed.map((room) => (
                    <tr key={room.id}>
                      <td className="font-semibold">{room.roomName}</td>
                      <td>{room.boardinghouseName}</td>
                      <td>{room.bedsAvailable}</td>
                      <td>{room.gender}</td>
                      <td>
                        <span className={`status-badge status-${room.bedsAvailable > 0 ? "active" : "full"}`}>
                          {room.bedsAvailable > 0 ? "🟢 Active" : "⚪ Full"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Data Overview Section (Recharts) */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Data Overview</h2>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
            {/* Rooms by Gender (existing) */}
            <div
              style={{
                flex: "1 1 320px",
                padding: 12,
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 1px 2px rgba(0,0,0,.05)",
              }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>Rooms by Gender</p>
              <div style={{ width: "100%", height: 180, marginTop: 8 }}>
                {totalRooms > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: "Male", value: roomsByGenderCounts.male },
                        { name: "Female", value: roomsByGenderCounts.female },
                        { name: "Any/Other", value: roomsByGenderCounts.any },
                      ]}
                      margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                    >
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={24} />
                      <Tooltip formatter={(val: any) => [val, "Rooms"]} />
                      <Bar dataKey="value" barSize={36} radius={[8, 8, 0, 0]}>
                        <Cell fill="#3b82f6" />
                        <Cell fill="#ec4899" />
                        <Cell fill="#6b7280" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", fontSize: "0.875rem" }}>
                    No room data
                  </div>
                )}
              </div>
            </div>

            {/* Occupancy Rate Gauge (new) */}
            <div
              style={{
                flex: "0 1 260px",
                padding: 12,
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 1px 2px rgba(0,0,0,.05)",
                position: "relative",
                minHeight: 190,
              }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>Occupancy Rate</p>
              <div style={{ width: "100%", height: 150, marginTop: 8, position: "relative" }}>
                {totalBeds > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Occupied", value: occupiedBeds },
                          { name: "Available", value: Math.max(0, totalBeds - occupiedBeds) },
                        ]}
                        dataKey="value"
                        startAngle={180}
                        endAngle={0}
                        innerRadius="65%"
                        outerRadius="95%"
                        stroke="none"
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#e5e7eb" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", fontSize: "0.875rem" }}>
                    No bed data
                  </div>
                )}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                    transform: "translateY(10px)",
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 700 }}>
                    {totalBeds > 0 ? `${occupancyPercent}%` : "—"}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {totalBeds > 0 ? `${occupiedBeds} of ${totalBeds} beds occupied` : ""}
                  </div>
                </div>
              </div>
            </div>

            {/* Rooms with CR (existing) */}
            <div
              style={{
                flex: "0 1 240px",
                padding: 12,
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 1px 2px rgba(0,0,0,.05)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>Rooms with CR</p>
              <div
                style={{
                  width: "100%",
                  height: 140,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 8,
                }}
              >
                {totalRooms > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "With CR", value: roomsWithCR },
                          { name: "Without CR", value: Math.max(0, totalRooms - roomsWithCR) },
                        ]}
                        innerRadius={34}
                        outerRadius={56}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        labelLine={false}
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#e5e7eb" />
                      </Pie>
                      <Legend verticalAlign="bottom" height={24} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>No room data</div>
                )}
              </div>
              <div style={{ marginTop: 6, textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{roomsWithCRPercent}%</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {roomsWithCR} of {totalRooms} rooms
                </div>
              </div>
            </div>

            {/* Amenities Distribution (new) */}
            <div
              style={{
                flex: "1 1 420px",
                padding: 12,
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 1px 2px rgba(0,0,0,.05)",
              }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>Amenities Distribution</p>
              <div style={{ width: "100%", height: 220, marginTop: 8 }}>
                {totalRooms > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={amenityData} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(val: any) => [val, "Rooms"]} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", fontSize: "0.875rem" }}>
                    No room data
                  </div>
                )}
              </div>
            </div>

            {/* Price Range Distribution (new) */}
            <div
              style={{
                flex: "1 1 320px",
                padding: 12,
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 1px 2px rgba(0,0,0,.05)",
              }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>Price Range Distribution</p>
              <div style={{ width: "100%", height: 220, marginTop: 8 }}>
                {totalRooms > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priceRangeData} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(val: any) => [val, "Rooms"]} />
                      <Bar dataKey="count" fill="#ec4899" radius={[6, 6, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", fontSize: "0.875rem" }}>
                    No room data
                  </div>
                )}
              </div>
            </div>

            {/* Boardinghouse Performance Comparison (new) */}
            <div
              style={{
                flex: "1 1 100%",
                padding: 12,
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 1px 2px rgba(0,0,0,.05)",
              }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>Boardinghouse Performance Comparison</p>
              <div style={{ width: "100%", height: 260, marginTop: 8 }}>
                {totalBoardinghouses > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={performanceData}
                      margin={{ top: 8, right: 12, left: 8, bottom: 48 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        angle={-20}
                        textAnchor="end"
                        interval={0}
                        height={60}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" fill="#06b6d4" name="Total Rooms" barSize={16} />
                      <Bar dataKey="available" fill="#10b981" name="Available Rooms" barSize={16} />
                      <Bar dataKey="occupied" fill="#3b82f6" name="Occupied Rooms" barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", fontSize: "0.875rem" }}>
                    No boardinghouse data
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="quick-actions-grid">
            <button className="quick-action-btn" onClick={goAddBoardinghouse}>
              <Plus size={20} />
              Add New Boardinghouse
            </button>
            <button className="quick-action-btn" onClick={goAddRoom}>
              <Plus size={20} />
              Add Room
            </button>
            <button className="quick-action-btn" onClick={goEditRoom}>
              <Edit size={20} />
              Edit Room
            </button>
            <button className="quick-action-btn" onClick={goUploadPhotos}>
              <Image size={20} />
              Upload Boardinghouse Photos
            </button>
          </div>
              </div>

        {/* Bottom Grid: Recent Activities & Alerts */}
        <div className="bottom-grid" ref={bottomGridRef}>
          {/* Recent Updates */}
          <div className="dashboard-section">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 className="section-title" style={{ margin: 0 }}>Recent Updates</h2>
              <button
                onClick={clearActivity}
                className="btn-clear"
                style={{ background: "transparent", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14 }}
                aria-label="Clear recent updates"
              >
                Clear All
              </button>
            </div>

            {/* animated container - uses containerStyle(count) which reads expandedAll */}
            <div
              style={{
                overflow: "hidden",
                maxHeight: expandedAll ? activityExpandedH : activityCollapsedH,
                transition: "max-height 360ms cubic-bezier(.2,.9,.2,1), opacity 220ms ease",
                willChange: "max-height",
              }}
              aria-live="polite"
            >
              <div className="activity-feed" ref={activityListRef}>
                {activityLog.length === 0 ? (
                  <div className="activity-item">
                    <div className="activity-content">
                      <p className="activity-text">No recent activity available.</p>
                    </div>
                  </div>
                ) : (
                  activityLog.map((a, i) => {
                    const itemKey = `${a.ts}-${a.meta?.id ?? i}`;
                    return (
                      <div key={itemKey} className="activity-item" style={{ position: "relative" }}>
                        <button
                          onClick={() => deleteActivityItem(a.ts, a.meta?.id)}
                          aria-label="Delete activity"
                          title="Delete"
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            fontSize: 14,
                            color: "#9ca3af",
                          }}
                        >
                          ×
                        </button>
                        <div className="activity-icon">
                          <TrendingUp size={16} />
                        </div>
                        <div className="activity-content">
                          <p className="activity-text">{a.message}</p>
                          <p className="activity-time">{!Number.isNaN(Number(a.ts)) ? new Date(a.ts).toLocaleString() : "Unknown date"}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* bottom-right Show All / Show less button - toggles both panels */}
            {activityLog.length > LIST_COLLAPSE_COUNT && (
               <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                 <button
                   onClick={toggleExpandAll}
                   className="btn-toggle"
                   style={{ background: "transparent", border: "none", color: "#374151", cursor: "pointer", fontSize: 13 }}
                   aria-expanded={expandedAll}
                 >
                   {expandedAll ? "Show less" : `Show all (${activityLog.length})`}
                 </button>
               </div>
             )}
           </div>
 
           {/* Reminders/Alerts */}
           <div className="dashboard-section">
             <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
               <h2 className="section-title" style={{ margin: 0 }}>Reminders & Alerts</h2>
               <button
                 onClick={clearAlerts}
                 className="btn-clear"
                 style={{ background: "transparent", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14 }}
                 aria-label="Clear reminders and alerts"
               >
                 Clear All
               </button>
             </div>

             {/* animated container - shares expandedAll state so toggling one toggles both */}
             <div
              style={{
                overflow: "hidden",
                maxHeight: expandedAll ? alertsExpandedH : alertsCollapsedH,
                transition: "max-height 360ms cubic-bezier(.2,.9,.2,1), opacity 220ms ease",
                willChange: "max-height",
              }}
              aria-live="polite"
            >
              <div className="alerts-container" ref={alertsListRef}>
                {alerts.length === 0 ? (
                  <div className="alert-item alert-ok">
                    <AlertCircle size={20} />
                    <span>All required fields appear filled.</span>
                  </div>
                ) : (
                  alerts.map((al) => (
                    <div key={al.id} className="alert-item alert-warning" title={al.message} style={{ display: "flex", gap: 8, alignItems: "center", position: "relative" }}>
                      <button
                        onClick={() => dismissAlertItem(al.id)}
                        aria-label="Dismiss alert"
                        title="Dismiss"
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 14,
                          color: "#92400e",
                        }}
                      >
                        ×
                      </button>
                      <AlertCircle size={18} />
                      <span>{al.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* bottom-right Show All / Show less button - toggles both panels */}
            {alerts.length > LIST_COLLAPSE_COUNT && (
             <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
               <button
                 onClick={toggleExpandAll}
                 className="btn-toggle"
                 style={{ background: "transparent", border: "none", color: "#374151", cursor: "pointer", fontSize: 13 }}
                 aria-expanded={expandedAll}
               >
                 {expandedAll ? "Show less" : `Show all (${alerts.length})`}
               </button>
             </div>
           )}
          </div>
        </div>
      </div>
    </div>
   );
}
export default Dashboard;