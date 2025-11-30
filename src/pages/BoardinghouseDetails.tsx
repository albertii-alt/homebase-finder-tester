import { ArrowLeft, MapPin, User, BedDouble, Utensils, Wifi, Zap, Droplets, Fan, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import "../styles/boardinghouse.css";
import React from "react";
import { getBoardinghouseById } from "@/lib/firestore";
import type { BoardinghouseWithRooms } from "@/types/firestore";

export default function BoardinghouseDetails() {
  const { id } = useParams<{ id: string }>();

  const [boardinghouse, setBoardinghouse] = React.useState<BoardinghouseWithRooms | null | undefined>(undefined);

  // Lightbox / carousel state
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState<number>(0);

  React.useEffect(() => {
    if (!id) {
      setBoardinghouse(null);
      return;
    }
    const fetchBh = async () => {
      try {
        const found = await getBoardinghouseById(id);
        setBoardinghouse(found);
      } catch (err) {
        console.warn("Failed to load boardinghouse from Firestore", err);
        setBoardinghouse(null);
      }
    };
    fetchBh();
  }, [id]);

  // keyboard navigation for lightbox
  React.useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") setLightboxIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setLightboxIndex((i, ) => {
        if (!boardinghouse?.photos) return i;
        return Math.min((boardinghouse.photos!.length - 1), i + 1);
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, boardinghouse]);

  // When boardinghouse is undefined => loading; null => not found; object => render
  if (boardinghouse === undefined) {
    return (
      <div className="min-h-screen" style={{ background: "#e6f7fa" }}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Link to="/interface" className="back-button">
              <ArrowLeft />
            </Link>
            <h1 className="text-4xl font-bold" style={{ color: "#1a1a1a" }}>
              Boardinghouse Details
            </h1>
          </div>
          <div className="form-container">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (boardinghouse === null) {
    return (
      <div className="min-h-screen" style={{ background: "#e6f7fa" }}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Link to="/interface" className="back-button">
              <ArrowLeft />
            </Link>
            <h1 className="text-4xl font-bold" style={{ color: "#1a1a1a" }}>
              Boardinghouse Details
            </h1>
          </div>
          <div className="form-container">
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold mb-2">Boardinghouse not found</h2>
              <p className="text-sm text-muted-foreground">The listing you are looking for does not exist or was removed.</p>
              <div className="mt-6">
                <Link to="/interface" className="btn-save-listing">
                  Back to All Boardinghouses
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // boardinghouse is guaranteed to be non-null here
  
  // upper address: street, barangay, city/municipality, province
  const upperAddressParts: string[] = [];
  if (boardinghouse.street) upperAddressParts.push(boardinghouse.street);
  if (boardinghouse.barangay) upperAddressParts.push(boardinghouse.barangay);
  if (boardinghouse.city) upperAddressParts.push(boardinghouse.city);
  if (boardinghouse.province) upperAddressParts.push(boardinghouse.province);
  
  const upperAddress = upperAddressParts.filter(Boolean).join(", ");

  // sub address: region only
  const regionOnly = boardinghouse.region ?? "";

  // owner info
  const ownerName = boardinghouse.ownerName ?? "—";
  const ownerContact = boardinghouse.contact ?? "—";
  const ownerEmailOrFacebook = boardinghouse.facebook ?? "—";

  const photos = boardinghouse.photos ?? [];

  const openLightboxAt = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  const gotoPrev = () => setLightboxIndex((i) => Math.max(0, i - 1));
  const gotoNext = () => setLightboxIndex((i) => Math.min(photos.length - 1, i + 1));

  return (
    <div className="min-h-screen" style={{ background: "#e6f7fa" }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back Button and Title */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/interface" className="back-button">
            <ArrowLeft />
          </Link>
          <h1 className="text-4xl font-bold" style={{ color: "#1a1a1a" }}>
            Boardinghouse Details
          </h1>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Basic Information Card */}
          <div className="form-container">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold mb-2" style={{ color: "#00a8cc" }}>
                  {boardinghouse.name}
                </h2>
                <div className="flex items-center gap-2 text-lg" style={{ color: "#666" }}>
                  <MapPin size={20} />
                  <span>{upperAddress || "Location not specified"}</span>
                </div>
                <p className="text-sm mt-1" style={{ color: "#666" }}>
                  {regionOnly}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm" style={{ color: "#666" }}>Total Rooms</div>
                <div className="text-3xl font-bold" style={{ color: "#00a8cc" }}>
                  {boardinghouse.totalRooms ?? (boardinghouse.rooms?.length ?? 0)}
                </div>
                <div className="text-sm mt-1" style={{ color: "#666" }}>
                  {boardinghouse.availableRooms ?? boardinghouse.rooms?.filter(r => Number((r.bedsAvailable ?? 0)) > 0).length ?? 0} Available
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#1a1a1a" }}>
                Description
              </h3>
              <p className="text-base leading-relaxed" style={{ color: "#666" }}>
                {boardinghouse.description}
              </p>
            </div>

            {/* Owner Information */}
            <div className="p-6 rounded-xl mb-6" style={{ background: "#f0f9fb", border: "2px solid #00d4ff" }}>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: "#1a1a1a" }}>
                <User size={20} />
                Owner Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm" style={{ color: "#666" }}>Name</div>
                  <div className="font-semibold" style={{ color: "#1a1a1a" }}>
                    {ownerName}
                  </div>
                </div>
                <div>
                  <div className="text-sm" style={{ color: "#666" }}>Contact</div>
                  <div className="font-semibold" style={{ color: "#1a1a1a" }}>
                    {ownerContact}
                  </div>
                </div>
                <div>
                  <div className="text-sm" style={{ color: "#666" }}>Email / Facebook</div>
                  <div className="font-semibold">
                    {typeof ownerEmailOrFacebook === "string" && ownerEmailOrFacebook.startsWith("http") ? (
                      <a href={ownerEmailOrFacebook} target="_blank" rel="noreferrer" style={{ color: "#1a1a1a" }}>
                        {ownerEmailOrFacebook}
                      </a>
                    ) : (
                      <span style={{ color: "#1a1a1a" }}>{ownerEmailOrFacebook}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Photos Section */}
          <div className="form-container">
            <h3 className="text-xl font-bold mb-4" style={{ color: "#1a1a1a" }}>
              Photos
            </h3>
            <div
              className="photo-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
                alignItems: "start",
              }}
            >
              {photos && photos.length > 0 ? (
                photos.map((photo, index) => (
                  <div
                    key={index}
                    role="button"
                    tabIndex={0}
                    onClick={() => openLightboxAt(index)}
                    onKeyDown={(e) => { if (e.key === "Enter") openLightboxAt(index); }}
                    style={{
                      cursor: "pointer",
                      borderRadius: 8,
                      overflow: "hidden",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                      transform: "translateZ(0)",
                      transition: "transform 180ms ease, box-shadow 180ms ease",
                      background: "#eee",
                      minHeight: 180,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    className="bh-photo-item"
                    aria-label={`Open photo ${index + 1}`}
                    title="Click to view"
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "scale(1.03)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 30px rgba(0,0,0,0.18)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 18px rgba(0,0,0,0.12)";
                    }}
                  >
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No photos available.</div>
              )}
            </div>
          </div>

          {/* Rooms Section */}
          <div className="form-container">
            <h3 className="text-xl font-bold mb-6" style={{ color: "#1a1a1a" }}>
              Available Rooms
            </h3>
            <div className="space-y-4">
              {(boardinghouse.rooms && boardinghouse.rooms.length > 0) ? (
                boardinghouse.rooms.map((room, index) => {
                  const roomName = room.number || `Room ${index + 1}`;
                  const totalBeds = room.beds ?? 0;
                  const availableBeds = room.bedsAvailable ?? 0;
                  const price = room.price ?? 0;
                  const withCR = room.withCR ?? false;
                  const cooking = room.cooking ?? false;
                  const gender = room.gender ?? "Any";
                  const inclusions = room.inclusions ?? [];

                  return (
                    <div
                      key={room.id ?? index}
                      className="p-6 rounded-xl"
                      style={{
                        border: "2px solid #00d4ff",
                        background: (room.status === "Available" || Number(availableBeds) > 0) ? "#f0f9fb" : "#f5f5f5"
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-2xl font-bold" style={{ color: "#00a8cc" }}>
                              {roomName}
                            </h4>
                            <span
                              className="px-3 py-1 rounded-full text-xs font-semibold"
                              style={{
                                background: (room.status === "Available" || Number(availableBeds) > 0) ? "#00d4ff" : "#999",
                                color: "white"
                              }}
                            >
                              {room.status ?? ((Number(availableBeds) > 0) ? "Available" : "Occupied")}
                            </span>
                          </div>
                          <div className="text-2xl font-bold mb-3" style={{ color: "#4a148c" }}>
                            {price ? `₱${price}` : ""}
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2" style={{ color: "#666" }}>
                              <BedDouble size={16} />
                              <span>{totalBeds} Bed(s) • {availableBeds} available</span>
                            </div>
                            <div className="flex items-center gap-2" style={{ color: "#666" }}>
                              <User size={16} />
                              <span>{gender}</span>
                            </div>
                            <div className="flex items-center gap-2" style={{ color: "#666" }}>
                              <span className="font-semibold">CR:</span>
                              <span>{withCR ? "Yes" : "No"}</span>
                            </div>
                            <div className="flex items-center gap-2" style={{ color: "#666" }}>
                              <Utensils size={16} />
                              <span>{cooking ? "Cooking Allowed" : "No Cooking"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 min-w-[200px]">
                          <div className="text-sm font-semibold mb-2" style={{ color: "#1a1a1a" }}>
                            Inclusions:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(inclusions && inclusions.length > 0) ? (
                              inclusions.map((inclusion, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 px-3 py-1 rounded-full text-xs"
                                  style={{ background: "#00d4ff", color: "white" }}
                                >
                                  {inclusion === "WiFi" && <Wifi size={12} />}
                                  {inclusion === "Electricity" && <Zap size={12} />}
                                  {inclusion === "Water" && <Droplets size={12} />}
                                  {inclusion === "Fan" && <Fan size={12} />}
                                  {inclusion === "Air Conditioning" && <Fan size={12} />}
                                  <span>{inclusion}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground">No inclusions listed.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground">No rooms listed.</div>
              )}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="form-container text-center">
              <div className="text-4xl mb-2">🛏️</div>
              <div className="text-2xl font-bold" style={{ color: "#00a8cc" }}>
                {(boardinghouse.rooms ?? []).filter(r => r.withCR).length}
              </div>
              <div className="text-sm" style={{ color: "#666" }}>Rooms with CR</div>
            </div>
            <div className="form-container text-center">
              <div className="text-4xl mb-2">🍳</div>
              <div className="text-2xl font-bold" style={{ color: "#00a8cc" }}>
                {(boardinghouse.rooms ?? []).filter(r => r.cooking).length}
              </div>
              <div className="text-sm" style={{ color: "#666" }}>Cooking Allowed</div>
            </div>
            <div className="form-container text-center">
              <div className="text-4xl mb-2">🚪</div>
              <div className="text-2xl font-bold" style={{ color: "#00a8cc" }}>
                {boardinghouse.rooms?.filter(r => Number(r.bedsAvailable) > 0).length ?? 0}
              </div>
              <div className="text-sm" style={{ color: "#666" }}>Available Now</div>
            </div>
          </div>

          {/* Back Button */}
          <div className="flex justify-center pb-8">
            <Link to="/interface" className="btn-save-listing">
              Back to All Boardinghouses
            </Link>
          </div>
        </div>
      </div>

      {/* Lightbox / Carousel Overlay */}
      {lightboxOpen && photos.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          className="lightbox-overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(2,6,23,0.78)",
            padding: 24,
          }}
          onClick={(e) => {
            // close when clicking backdrop (but not if clicking image or controls)
            if (e.target === e.currentTarget) closeLightbox();
          }}
        >
          <div style={{ position: "relative", width: "100%", maxWidth: 980, maxHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Close */}
            <button
              aria-label="Close"
              onClick={closeLightbox}
              style={{
                position: "absolute",
                top: -12,
                right: -12,
                background: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
                zIndex: 10,
                padding: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={28} />
            </button>

            {/* Prev */}
            <button
              aria-label="Previous"
              onClick={(e) => { e.stopPropagation(); gotoPrev(); }}
              style={{
                position: "absolute",
                left: -18,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.4)",
                border: "none",
                color: "white",
                padding: 12,
                borderRadius: 999,
                cursor: "pointer",
                zIndex: 10,
                display: "flex",
              }}
            >
              <ChevronLeft size={28} />
            </button>

            {/* Next */}
            <button
              aria-label="Next"
              onClick={(e) => { e.stopPropagation(); gotoNext(); }}
              style={{
                position: "absolute",
                right: -18,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.4)",
                border: "none",
                color: "white",
                padding: 12,
                borderRadius: 999,
                cursor: "pointer",
                zIndex: 10,
                display: "flex",
              }}
            >
              <ChevronRight size={28} />
            </button>

            {/* Main image */}
            <div
              style={{
                width: "100%",
                maxHeight: "80vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                borderRadius: 8,
                boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
                background: "#111",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={photos[lightboxIndex]}
                alt={`Photo ${lightboxIndex + 1}`}
                style={{
                  width: "auto",
                  height: "80vh",
                  maxWidth: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>

            {/* Thumbnails */}
            <div style={{ marginTop: 12, display: "flex", gap: 8, overflowX: "auto", padding: "8px 2px", width: "100%", justifyContent: "center" }}>
              {photos.map((p, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
                  style={{
                    border: idx === lightboxIndex ? "2px solid #00d4ff" : "2px solid transparent",
                    padding: 3,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.03)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 72,
                    minHeight: 56,
                  }}
                >
                  <img
                    src={p}
                    alt={`Thumb ${idx + 1}`}
                    style={{
                      width: 72,
                      height: 56,
                      objectFit: "cover",
                      borderRadius: 6,
                      display: "block",
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
