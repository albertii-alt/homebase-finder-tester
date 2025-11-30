import React from "react";
import { Trash, Plus, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import "../styles/boardinghouse.css";
import { useIsMobile } from "../hooks/use-mobile";
import { useToast } from "../hooks/use-toast";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import { deleteBoardinghouse, listBoardinghouses, getUserDoc } from "@/lib/firestore";
import type { BoardinghouseWithRooms, UserDoc } from "@/types/firestore";

export default function MyBoardinghouse() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ownerUid, setOwnerUid] = React.useState<string>("");
  const [ownerProfile, setOwnerProfile] = React.useState<UserDoc | null>(null);
  const [authChecking, setAuthChecking] = React.useState(true);
  const [boardinghouses, setBoardinghouses] = React.useState<BoardinghouseWithRooms[]>([]);
  const [dataLoading, setDataLoading] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return;

      if (!firebaseUser) {
        setOwnerUid("");
        setOwnerProfile(null);
        setAuthChecking(false);
        toast({ title: "Access denied", description: "Please sign in as an owner." });
        navigate("/auth");
        return;
      }

      try {
        const profile = await getUserDoc(firebaseUser.uid);
        if (!active) return;

        if (!profile || profile.role !== "owner") {
          setOwnerUid("");
          setOwnerProfile(null);
          setAuthChecking(false);
          toast({ title: "Access denied", description: "Owners only page." });
          navigate("/interface");
          return;
        }

        setOwnerUid(firebaseUser.uid);
        setOwnerProfile(profile);
        setAuthChecking(false);
      } catch (error) {
        console.error("Failed to load owner profile", error);
        setOwnerUid("");
        setOwnerProfile(null);
        setAuthChecking(false);
        toast({ title: "Authentication error", description: "Unable to load your profile." });
        navigate("/auth");
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [navigate, toast]);

  const fetchBoardinghouses = React.useCallback(async () => {
    if (!ownerUid) {
      setBoardinghouses([]);
      return;
    }

    setDataLoading(true);
    try {
      const result = await listBoardinghouses({ filters: { ownerId: ownerUid }, limit: 50 });
      setBoardinghouses(result.boardinghouses);
    } catch (error) {
      console.error("Failed to load boardinghouses", error);
      setBoardinghouses([]);
      toast({ title: "Error", description: "Failed to load boardinghouses." });
    } finally {
      setDataLoading(false);
    }
  }, [ownerUid, toast]);

  React.useEffect(() => {
    if (!ownerUid) return;
    void fetchBoardinghouses();
  }, [ownerUid, fetchBoardinghouses]);

  const formatAddress = (bh: BoardinghouseWithRooms): string =>
    [bh.street, bh.barangay, bh.city, bh.province, bh.zipcode].filter(Boolean).join(", ");

  const handleDelete = async (id: string) => {
    const okConfirm = window.confirm("Are you sure you want to delete this boardinghouse?");
    if (!okConfirm) return;

    try {
      await deleteBoardinghouse(id);
      toast({ title: "Deleted", description: "Boardinghouse deleted successfully." });
      await fetchBoardinghouses();
    } catch (error) {
      console.error("Failed to delete boardinghouse", error);
      toast({ title: "Delete failed", description: "Failed to delete boardinghouse." });
    }
  };

  const handleEdit = (id: string) => {
    try {
      localStorage.setItem("selectedBoardinghouseId", id);
    } catch {
      console.warn("Failed to save selectedBoardinghouseId");
    }
    navigate(`/edit-boardinghouse/${id}`);
  };

  const handleDeleteAll = async () => {
    const okConfirm = window.confirm("Are you sure you want to delete ALL your boardinghouses? This cannot be undone.");
    if (!okConfirm) return;

    try {
      setDataLoading(true);
      for (const bh of boardinghouses) {
        await deleteBoardinghouse(bh.id);
      }
      toast({ title: "Deleted", description: "All boardinghouses deleted." });
      await fetchBoardinghouses();
    } catch (error) {
      console.error("Failed to delete all boardinghouses", error);
      toast({ title: "Error", description: "Failed to delete all boardinghouses." });
    } finally {
      setDataLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div
        className="main-content"
        style={{
          marginLeft: isMobile ? undefined : "260px",
          minHeight: "100vh",
        }}
      >
        <div className="page-header" style={{ display: "flex", alignItems: "center" }}>
          <Link to="/dashboard" className="back-button">
            <ArrowLeft />
          </Link>
          <h1>My Boardinghouse</h1>

          {/* show compact Add + Delete All only when there are boardinghouses;
              buttons aligned to the right using marginLeft: 'auto' */}
          {boardinghouses.length > 0 && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              {/* "Add" here now navigates to Added Rooms overview for the selected boardinghouse */}
              <Link
                to="/add-boardinghouse"
                className="btn-add-small"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 20,
                  textDecoration: "none",
                  color: "white",
                  background: "linear-gradient(90deg,#0ea5e9,#06b6d4)", // cyan/blue for Add
                  boxShadow: "0 8px 20px rgba(6,182,212,0.12)",
                }}
              >
                <Plus /> <span>Add</span>
              </Link>

              <button
                className="btn-delete-all"
                onClick={handleDeleteAll}
                title="Delete all boardinghouses (testing)"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 20,
                  border: "none",
                  cursor: "pointer",
                  color: "white",
                  background: "linear-gradient(90deg,#ef4444,#dc2626)", // red gradient
                  boxShadow: "0 8px 24px rgba(220,38,38,0.18)",
                }}
              >
                <Trash /> <span>Delete All</span>
              </button>
            </div>
          )}
        </div>

        <div className="boardinghouse-list">
          {authChecking || dataLoading ? (
            <div
              className="empty-state"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                padding: 40,
                textAlign: "center",
              }}
            >
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Home className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Loading boarding houses...</h3>
                  <p className="text-muted-foreground mb-4">Please wait while we fetch your listings.</p>
                </CardContent>
              </Card>
            </div>
          ) : boardinghouses.length === 0 ? (
            <div
              className="empty-state"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                padding: 40,
                textAlign: "center",
              }}
            >
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Home className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No boarding houses yet</h3>
                  <p className="text-muted-foreground mb-4">Start by adding your first boarding house</p>
                <Button onClick={() => navigate("/add-boardinghouse")}>
                <Plus className="w-4 h-4 mr-2" />
                Add Boarding House
                </Button>
              </CardContent>
            </Card>
            </div>
          ) : (
            boardinghouses.map((bh) => (
              <div key={bh.id} className="boardinghouse-card">
                <img
                  src={bh.photos && bh.photos.length ? bh.photos[0] : "/placeholder.svg"}
                  alt={bh.name}
                  className="bh-image"
                />
                <div className="bh-info">
                  <h2>{bh.name}</h2>
                  <p>{formatAddress(bh)}</p>
                  <p>Contact: {bh.contact || "Not provided"}</p>
                  <p>Rooms: {bh.totalRooms ?? bh.rooms?.length ?? 0}</p>
                  {/* Room list intentionally hidden in overview */}
                </div>
                <div className="bh-actions">
                  <button className="btn-edit" onClick={() => handleEdit(bh.id)}>
                    Edit
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(bh.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
