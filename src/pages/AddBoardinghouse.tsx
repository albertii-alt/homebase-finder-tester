import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import "../styles/boardinghouse.css";
import { useIsMobile } from "../hooks/use-mobile";
import React, { useRef } from "react";
import { useToast } from "../hooks/use-toast";
import regionData from "../ph-json/region.json";
import provinceData from "../ph-json/province.json";
import cityData from "../ph-json/city.json";
import barangayData from "../ph-json/barangay.json";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import { createBoardinghouse, getUserDoc, uploadPhoto } from "@/lib/firestore";
import type { UserDoc } from "@/types/firestore";

export default function AddBoardinghouse() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();

  // form state (controlled)
  const [ownerName, setOwnerName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [facebook, setFacebook] = React.useState("");
  const [photos, setPhotos] = React.useState<SelectedPhoto[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [ownerUid, setOwnerUid] = React.useState<string>("");
  const [ownerProfile, setOwnerProfile] = React.useState<UserDoc | null>(null);
  const [authChecking, setAuthChecking] = React.useState(true);

  // address structure + dropdown options
  type RegionItem = { region_code: string; region_name: string };
  type ProvinceItem = { province_code: string; province_name: string; region_code: string };
  type CityItem = { city_code: string; city_name: string; province_code: string };
  // barangay entries vary; include common keys used in your dataset
  type BarangayItem = {
    brgy_code?: string;
    brgy_name?: string;
    barangay_code?: string;
    barangay_name?: string;
    city_code?: string;
    mun_code?: string;
    citymunCode?: string;
    [k: string]: any;
  };

  type SelectedPhoto = {
    preview: string;
    file: File;
  };

  const regions = React.useMemo<RegionItem[]>(
    () => (Array.isArray(regionData) ? (regionData as RegionItem[]) : []),
    []
  );
  const provincesAll = React.useMemo<ProvinceItem[]>(
    () => (Array.isArray(provinceData) ? (provinceData as ProvinceItem[]) : []),
    []
  );
  const citiesAll = React.useMemo<CityItem[]>(
    () => (Array.isArray(cityData) ? (cityData as CityItem[]) : []),
    []
  );
  const barangaysAll = React.useMemo<BarangayItem[]>(
    () => (Array.isArray(barangayData) ? (barangayData as BarangayItem[]) : []),
    []
  );

  const [selectedRegion, setSelectedRegion] = React.useState<string>("");
  const [selectedProvince, setSelectedProvince] = React.useState<string>("");
  const [selectedCity, setSelectedCity] = React.useState<string>("");
  const [selectedBarangay, setSelectedBarangay] = React.useState<string>("");

  const [provinces, setProvinces] = React.useState<ProvinceItem[]>([]);
  const [cities, setCities] = React.useState<CityItem[]>([]);
  const [barangays, setBarangays] = React.useState<BarangayItem[]>([]);

  const [zipCode, setZipCode] = React.useState("");
  const [street, setStreet] = React.useState("");

  const getBarangayCode = React.useCallback((item: BarangayItem): string => {
    const raw =
      item.brgy_code ??
      item.barangay_code ??
      (item as Record<string, unknown>).brgyCode ??
      (item as Record<string, unknown>).barangayCode ??
      "";
    return raw ? String(raw) : "";
  }, []);

  const getBarangayName = React.useCallback((item: BarangayItem): string => {
    const raw =
      item.brgy_name ??
      item.barangay_name ??
      (item as Record<string, unknown>).brgyName ??
      (item as Record<string, unknown>).barangayName ??
      (item as Record<string, unknown>).name ??
      "";
    return raw ? String(raw) : "";
  }, []);

  React.useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return;

      if (!firebaseUser) {
        setOwnerUid("");
        setOwnerProfile(null);
        toast({ title: "Access denied", description: "Please sign in as an owner." });
        setAuthChecking(false);
        navigate("/auth");
        return;
      }

      try {
        const profile = await getUserDoc(firebaseUser.uid);
        if (!active) return;

        if (!profile || profile.role !== "owner") {
          setOwnerUid("");
          setOwnerProfile(null);
          toast({ title: "Access denied", description: "Owners only page." });
          setAuthChecking(false);
          navigate("/interface");
          return;
        }

        setOwnerUid(firebaseUser.uid);
        setOwnerProfile(profile);
        setOwnerName((prev) => (prev ? prev : profile.fullName ?? firebaseUser.displayName ?? ""));
      } catch (error) {
        console.error("Failed to verify owner profile", error);
        setOwnerUid("");
        setOwnerProfile(null);
        toast({ title: "Authentication error", description: "Unable to load your profile." });
        navigate("/auth");
      } finally {
        if (active) {
          setAuthChecking(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [navigate, toast]);

  React.useEffect(() => {
    if (!selectedRegion) {
      setProvinces([]);
      setSelectedProvince("");
      setCities([]);
      setSelectedCity("");
      setBarangays([]);
      setSelectedBarangay("");
      return;
    }

    const filtered = provincesAll.filter(
      (province) => String(province.region_code) === String(selectedRegion)
    );
    setProvinces(filtered);
    setSelectedProvince("");
    setCities([]);
    setSelectedCity("");
    setBarangays([]);
    setSelectedBarangay("");
  }, [selectedRegion, provincesAll]);

  React.useEffect(() => {
    if (!selectedProvince) {
      setCities([]);
      setSelectedCity("");
      setBarangays([]);
      setSelectedBarangay("");
      return;
    }

    const filtered = citiesAll.filter(
      (city) => String(city.province_code) === String(selectedProvince)
    );
    setCities(filtered);
    setSelectedCity("");
    setBarangays([]);
    setSelectedBarangay("");
  }, [selectedProvince, citiesAll]);

  React.useEffect(() => {
    if (!selectedCity) {
      setBarangays([]);
      setSelectedBarangay("");
      return;
    }

    const filtered = barangaysAll.filter((barangay) => {
      const codes = [
        barangay.city_code,
        barangay.mun_code,
        (barangay as Record<string, unknown>).citymunCode,
        (barangay as Record<string, unknown>).citymun_code,
      ]
        .filter((value) => value != null)
        .map((value) => String(value));

      if (codes.length === 0) {
        return Object.values(barangay).some(
          (value) => value != null && String(value) === String(selectedCity)
        );
      }

      return codes.some((value) => value === String(selectedCity));
    });

    setBarangays(filtered);
    setSelectedBarangay("");
  }, [selectedCity, barangaysAll]);

  const validate = (): boolean => {
    if (!name.trim()) {
      toast({ title: "Validation", description: "Name is required." });
      return false;
    }
    return true;
  };

  const makeBoardinghouseId = () =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  const handleSave = async () => {
    if (!validate()) return;
    if (!ownerUid) {
      toast({ title: "Authentication", description: "Please sign in as an owner." });
      return;
    }

    setSaving(true);
    try {
      const regionName = regions.find((r) => String(r.region_code) === String(selectedRegion))?.region_name ?? "";
      const provinceName = provinces.find((p) => String(p.province_code) === String(selectedProvince))?.province_name ?? "";
      const cityName = cities.find((c) => String(c.city_code) === String(selectedCity))?.city_name ?? "";
      const barangayObj = barangays.find((barangay) => {
        const code = getBarangayCode(barangay);
        return code && code === String(selectedBarangay);
      });
      const barangayName = barangayObj ? getBarangayName(barangayObj) : "";

      const boardinghouseId = makeBoardinghouseId();
      const uploadBasePath = `owners/${ownerUid}/boardinghouses/${boardinghouseId}`;
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const url = await uploadPhoto(photo.file, uploadBasePath);
        photoUrls.push(url);
      }

      await createBoardinghouse(ownerUid, {
        id: boardinghouseId,
        name: name.trim(),
        region: regionName,
        regionCode: selectedRegion || undefined,
        province: provinceName,
        provinceCode: selectedProvince || undefined,
        city: cityName,
        cityCode: selectedCity || undefined,
        barangay: barangayName,
        barangayCode: selectedBarangay || undefined,
        street: street?.trim() ?? "",
        zipcode: zipCode?.trim() ?? "",
        description: description.trim(),
        photos: photoUrls,
        ownerName: ownerName.trim() || ownerProfile?.fullName || "",
        contact: contact.trim(),
        facebook: facebook.trim(),
        totalRooms: 0,
      });

      photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
      setPhotos([]);

      try {
        localStorage.setItem("selectedBoardinghouseId", boardinghouseId);
      } catch {
        // ignore storage failures
      }

      toast({ title: "Saved", description: "Boardinghouse added successfully." });
      navigate("/my-boardinghouse");
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save boardinghouse." });
    } finally {
      setSaving(false);
    }
  };

  const UploadPhotosSection: React.FC<{
    photos: SelectedPhoto[];
    setPhotos: React.Dispatch<React.SetStateAction<SelectedPhoto[]>>;
  }> = ({ photos, setPhotos }) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      const next = files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setPhotos((prev) => [...prev, ...next]);
      e.currentTarget.value = "";
    };

    const removePhoto = (index: number) => {
      setPhotos((prev) => {
        const copy = [...prev];
        const [removed] = copy.splice(index, 1);
        if (removed) {
          URL.revokeObjectURL(removed.preview);
        }
        return copy;
      });
    };

    const triggerFileInput = () => fileInputRef.current?.click();

    return (
      <div className="mt-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onFilesSelected}
          className="hidden"
        />

        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
        >
          {photos.map((photo, i) => (
            <div
              key={i}
              className="relative rounded-lg shadow-sm overflow-hidden bg-gray-100"
              style={{ minHeight: 120 }}
            >
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => removePhoto(i)}
                className="absolute"
                style={{
                  top: 6,
                  right: 6,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.7)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.5)")
                }
              >
                ✖
              </button>

              <img
                src={photo.preview}
                alt={`photo-${i}`}
                className="w-full h-36 object-cover"
                style={{ maxWidth: "100%" }}
              />
            </div>
          ))}

          <div
            role="button"
            tabIndex={0}
            onClick={triggerFileInput}
            onKeyDown={(e) => e.key === "Enter" && triggerFileInput()}
            className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 cursor-pointer"
            style={{ minHeight: 120 }}
          >
            <div className="text-center pointer-events-none">
              <div className="text-2xl font-medium">+ </div>
              <div className="text-sm">Add Photo</div>
            </div>
          </div>
        </div>
      </div>
    );
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
        <div className="page-header">
          <Link to="/my-boardinghouse" className="back-button">
            <ArrowLeft />
          </Link>
          <h1>Add Boardinghouse</h1>
        </div>

        <div className="form-container">
          <div className="form-row">
            <div className="form-group">
              <label>Owner Name</label>
            <input
              type="text"
              placeholder="Owner Name"
              className="form-input-room"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
            </div>
            <div className="form-group">
              <label>Contact No.</label>
            <input
              type="text"
              placeholder="Contact No."
              className="form-input-room-half"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
            </div>
            <Link
              to="/add-room"
              state={{ from: "/add-boardinghouse" }}
              className="btn-add-room-side"
            >
              Add Room
            </Link>
          </div>

          <div className="form-group">
            <label>Boardinghouse Name </label>
            <input
              type="text"
              placeholder="Boardinghouse Name"
              className="form-input-room"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description input (kept / restored) */}
            <div className="form-group">
              <label>Description</label>
            <textarea
              placeholder="Description"
              className="form-input-room"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            </div>
          <div className="form-group">
            <label>Facebook Page URL</label>
              <input
                type="text"
                placeholder="Facebook Page URL"
                className="form-input-room"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
              />
          </div>
          
          <div className="form-group">
            <label>Full Address/Location</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="form-select"
              >
                <option value="">Select Region</option>
                {regions.map((r) => (
                  <option key={r.region_code} value={r.region_code}>
                    {r.region_name}
                  </option>
                ))}
              </select>

              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="form-select"
                disabled={!provinces.length}
              >
                <option value="">Select Province</option>
                {provinces.map((p) => (
                  <option key={p.province_code} value={p.province_code}>
                    {p.province_name}
                  </option>
                ))}
              </select>

              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="form-select"
                disabled={!cities.length}
              >
                <option value="">Select City / Municipality</option>
                {cities.map((c) => (
                  <option key={c.city_code} value={c.city_code}>
                    {c.city_name}
                  </option>
                ))}
              </select>

              <select
                value={selectedBarangay}
                onChange={(e) => setSelectedBarangay(e.target.value)}
                className="form-select"
                disabled={!barangays.length}
              >
                <option value="">Select Barangay</option>
                {barangays.map((b) => {
                  const val = getBarangayCode(b);
                  const label = getBarangayName(b);
                  return (
                    <option key={val || label} value={val}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <input
                type="text"
                placeholder="Zip Code"
                className="form-input"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
              />
              <input
              type="text"
              placeholder="House No. / Street Name"
              className="form-input"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              />
            </div>
          </div>

          <div className="upload-section">
            <label>Upload Photos</label>
            <UploadPhotosSection photos={photos} setPhotos={setPhotos} />
            <p style={{ marginTop: 8, color: "#666" }}>Up to 5 images. Max 2MB each.</p>
          </div>

          <div className="form-actions">
            <button
              onClick={handleSave}
              className="btn-save-listing"
              disabled={saving || authChecking}
            >
              {saving ? "Saving..." : "Save Boardinghouse"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}