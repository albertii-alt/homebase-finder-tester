import React from "react";
import { Sidebar } from "@/components/Sidebar";
import { useIsMobile } from "../hooks/use-mobile";
import { useToast } from "../hooks/use-toast";
import { User, Trash2, Camera, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, deleteUser, signOut } from "firebase/auth";
import { auth, db, storage } from "@/firebase/config";
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { getUserDoc, deleteBoardinghouse } from "@/lib/firestore";
import type { UserDoc } from "@/types/firestore";

const DeleteAccountModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}> = ({ open, onClose, onConfirm, deleting }) => {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(2,6,23,0.6)",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 620,
          background: "#fff",
          borderRadius: 12,
          padding: 22,
          boxShadow: "0 12px 40px rgba(2,6,23,0.2)",
          position: "relative",
        }}
      >
        <button
          aria-label="Close"
          onClick={onClose}
          disabled={deleting}
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#6b7280",
          }}
        >
          <X />
        </button>

        <h2 style={{ margin: "4px 0 10px", fontSize: 20, color: "#0f172a", fontWeight: 700 }}>
          Delete Account
        </h2>
        <p style={{ margin: 0, color: "#475569", lineHeight: 1.5 }}>
          Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone.
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
          <button
            onClick={onClose}
            disabled={deleting}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "none",
              background: "#eef2f7",
              color: "#0f172a",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "none",
              background: "#dc2626",
              color: "white",
              cursor: "pointer",
              boxShadow: "0 6px 18px rgba(220,38,38,0.24)",
              opacity: deleting ? 0.7 : 1,
            }}
          >
            {deleting ? "Deleting..." : "Yes, Delete It"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AccountSettings(): JSX.Element {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = React.useState<"profile" | "delete">("profile");
  const [user, setUser] = React.useState<UserDoc | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");

  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getUserDoc(firebaseUser.uid);
          if (profile) {
            setUser(profile);
            setName(profile.fullName);
            setEmail(profile.email);
            // Use a placeholder if no avatar (Firestore user doc doesn't have avatar field in types yet, but we can add it or use a separate storage path)
            // For now, we'll use the dicebear one based on name
            setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.fullName)}`);
          }
        } catch (err) {
          console.error("Failed to load user profile", err);
        }
      } else {
        navigate("/auth");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  // Save handler: persist to Firestore
  const handleSave = async () => {
    if (!user) return;
    
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        fullName: name.trim(),
      });

      // Update local state
      setUser({ ...user, fullName: name.trim() });
      setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`);

      toast({ title: "Saved", description: "Account details updated." });
    } catch (err) {
      console.error("Failed to save account settings", err);
      toast({ title: "Error", description: "Failed to save account details." });
    }
  };

  const handleUploadAvatar = async (file?: File) => {
    if (!file || !user) return;
    // For now, we just update the local preview as we don't have an avatar field in UserDoc yet
    // In a real app, we would upload to Storage and update the user doc
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setAvatarUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    toast({ title: "Note", description: "Avatar upload is not fully implemented in backend yet." });
  };

  const handleDeleteAccount = async () => {
    if (!user || !auth.currentUser) return;
    setDeleting(true);

    try {
      // 1. Delete all boardinghouses owned by this user
      const q = query(collection(db, "boardinghouses"), where("ownerId", "==", user.uid));
      const snapshot = await getDocs(q);
      
      const deletePromises = snapshot.docs.map(doc => deleteBoardinghouse(doc.id));
      await Promise.all(deletePromises);

      // 2. Delete user document
      await deleteDoc(doc(db, "users", user.uid));

      // 3. Delete Firebase Auth user
      await deleteUser(auth.currentUser);

      // 4. Clear local storage just in case
      localStorage.clear();

      toast({ title: "Account deleted", description: "Your account and listings have been removed." });
      navigate("/auth");
    } catch (err) {
      console.error("Failed to delete account", err);
      toast({ title: "Error", description: "Failed to delete account. You may need to re-login." });
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="app-layout">
      <Sidebar />
      <div
        className="main-content"
        style={{
          marginLeft: isMobile ? undefined : 260,
          minHeight: "100vh",
          padding: 28,
          background: "linear-gradient(#f0fdfb, #f8feff)",
        }}
      >
        <h1 style={{ fontSize: 36, marginBottom: 18 }}>Account Settings</h1>

        <div style={{ width: "100%", maxWidth: 980 }}>
          <div style={{ background: "white", borderRadius: 12, padding: 18, boxShadow: "0 8px 30px rgba(2,6,23,0.06)" }}>
            {/* Tabs - rearranged so indicator sits below the tab text */}
            <div style={{ display: "flex", gap: 24, alignItems: "flex-end", borderBottom: "1px solid #e6eef2", paddingBottom: 12 }}>
              <button
                onClick={() => setActiveTab("profile")}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "6px 4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <User style={{ color: activeTab === "profile" ? "#1e40af" : "#6b7280" }} />
                  <span style={{ color: activeTab === "profile" ? "#1e40af" : "#374151", fontWeight: 600 }}>Profile</span>
                </div>
                <div
                  aria-hidden
                  style={{
                    height: 3,
                    background: activeTab === "profile" ? "#1e40af" : "transparent",
                    width: 120,
                    borderRadius: 6,
                    marginTop: 6,
                    transition: "background 200ms ease, width 200ms ease",
                  }}
                />
              </button>

              <button
                onClick={() => setActiveTab("delete")}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "6px 4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Trash2 style={{ color: activeTab === "delete" ? "#b91c1c" : "#6b7280" }} />
                  <span style={{ color: activeTab === "delete" ? "#b91c1c" : "#374151", fontWeight: 600 }}>Delete Account</span>
                </div>
                <div
                  aria-hidden
                  style={{
                    height: 3,
                    background: activeTab === "delete" ? "#ef4444" : "transparent",
                    width: 140,
                    borderRadius: 6,
                    marginTop: 6,
                    transition: "background 200ms ease, width 200ms ease",
                  }}
                />
              </button>
            </div>

            <div style={{ padding: "22px 6px" }}>
              {activeTab === "profile" ? (
                <div>
                  {/* Profile top */}
                  <div style={{ display: "flex", gap: 20, alignItems: "center", paddingBottom: 18 }}>
                    <div
                      style={{
                        position: "relative",
                        width: 96,
                        height: 96,
                        borderRadius: "50%",
                        overflow: "hidden",
                        boxShadow: "0 6px 20px rgba(2,6,23,0.08)",
                      }}
                    >
                      <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <label style={{ position: "absolute", right: 6, bottom: 6 }}>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadAvatar(f);
                          }}
                        />
                        <div
                          style={{
                            background: "#2563eb",
                            color: "white",
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            boxShadow: "0 6px 14px rgba(37,99,235,0.18)",
                          }}
                        >
                          <Camera size={16} />
                        </div>
                      </label>
                    </div>

                    <div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{user?.fullName ?? "User"}</div>
                      <div style={{ color: "#6b7280", marginTop: 4 }}>
                        {user?.role ? `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} Account` : "Owner Account"}
                      </div>
                    </div>
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid #eef2f7", margin: "12px 0 18px" }} />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", marginBottom: 6, color: "#374151", fontSize: 13 }}>Full Name</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        type="text"
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e6eef2", background: "white" }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: 6, color: "#374151", fontSize: 13 }}>Email Address</label>
                      <input
                        value={email}
                        disabled
                        type="text"
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e6eef2", background: "#f8fafc", color: "#6b7280" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                    <button
                      onClick={handleSave}
                      style={{
                        background: "linear-gradient(90deg,#0f172a,#0b1222)",
                        color: "white",
                        padding: "10px 20px",
                        borderRadius: 999,
                        border: "none",
                        cursor: "pointer",
                        boxShadow: "0 8px 30px rgba(2,6,23,0.18)",
                      }}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ background: "#fff7f7", border: "1px solid #f1c0c0", borderRadius: 8, padding: 18 }}>
                    <h3 style={{ margin: "0 0 8px", color: "#b91c1c", fontWeight: 700 }}>Danger Zone</h3>
                    <p style={{ margin: 0, color: "#9a1a1a", lineHeight: 1.5 }}>
                      Deleting your account is permanent and cannot be undone. All your data, including listings and favorites, will be permanently removed.
                    </p>

                    <div style={{ marginTop: 16 }}>
                      <button
                        onClick={() => setDeleteModalOpen(true)}
                        style={{
                          background: "#ef4444",
                          color: "white",
                          padding: "10px 18px",
                          borderRadius: 999,
                          border: "none",
                          cursor: "pointer",
                          boxShadow: "0 8px 24px rgba(239,68,68,0.18)",
                        }}
                      >
                        I understand, delete my account
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DeleteAccountModal 
          open={deleteModalOpen} 
          onClose={() => setDeleteModalOpen(false)} 
          onConfirm={handleDeleteAccount} 
          deleting={deleting}
        />
      </div>
    </div>
  );
}