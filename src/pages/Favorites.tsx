import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import "../styles/interface.css";
import { getBoardinghouseById } from "@/lib/firestore";
import { buildFavoritesStorageKey, CURRENT_USER_CHANGED_EVENT } from "@/lib/utils";
import type { BoardinghouseWithRooms } from "@/types/firestore";

const resolveFavoritesKey = (): string => {
  if (typeof window === "undefined") {
    return buildFavoritesStorageKey(null, false);
  }
  try {
    const raw = window.localStorage.getItem("currentUser");
    if (!raw) {
      return buildFavoritesStorageKey(null, false);
    }
    const parsed = JSON.parse(raw) as { uid?: string; loggedIn?: boolean } | null;
    const uid = parsed && typeof parsed.uid === "string" ? parsed.uid : null;
    const loggedIn = Boolean(parsed?.loggedIn);
    return buildFavoritesStorageKey(uid, loggedIn);
  } catch {
    return buildFavoritesStorageKey(null, false);
  }
};

const Favorites = () => {
  const navigate = useNavigate();
  const [favoritesKey, setFavoritesKey] = useState(() => resolveFavoritesKey());
  const [favorites, setFavorites] = useState<string[]>([]);
  const [boardinghouses, setBoardinghouses] = useState<BoardinghouseWithRooms[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadFavorites = () => {
      const candidateKeys = [favoritesKey, "favoriteBoardinghouses"];
      for (const key of candidateKeys) {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setFavorites(parsed);
            if (key !== favoritesKey) {
              window.localStorage.setItem(favoritesKey, JSON.stringify(parsed));
              window.localStorage.removeItem("favoriteBoardinghouses");
            }
            return;
          }
        } catch {
          // ignore malformed persisted data
        }
      }
      setFavorites([]);
    };

    loadFavorites();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "currentUser") {
        const nextKey = resolveFavoritesKey();
        setFavoritesKey(nextKey);
        return;
      }
      if (event.key === favoritesKey || event.key === "favoriteBoardinghouses") {
        loadFavorites();
      }
    };

    const handleUserChange: EventListener = () => {
      const nextKey = resolveFavoritesKey();
      setFavoritesKey(nextKey);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(CURRENT_USER_CHANGED_EVENT, handleUserChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(CURRENT_USER_CHANGED_EVENT, handleUserChange);
    };
  }, [favoritesKey]);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (favorites.length === 0) {
        setBoardinghouses([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const promises = favorites.map(id => getBoardinghouseById(id));
        const results = await Promise.all(promises);
        const found = results.filter((b): b is BoardinghouseWithRooms => b !== null);
        setBoardinghouses(found);
      } catch (err) {
        console.error("Failed to load favorites", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, [favorites]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id];
      try {
        window.localStorage.setItem(favoritesKey, JSON.stringify(next));
      } catch {
        // ignore persistence failures
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/interface" className="back-button">
            <ArrowLeft />
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Favorite Boardinghouses</h1>
        </div>

        {loading ? (
           <div className="text-center py-10">Loading favorites...</div>
        ) : boardinghouses.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-inner border border-dashed border-slate-300 p-10 text-center text-slate-600">
            No favorites yet. Go back to add some!
          </div>
        ) : (
          <div className="space-y-6">
            {boardinghouses.map((property) => {
              const firstPricedRoom = property.rooms?.find(
                (room) => typeof room?.price === "number"
              );
              const formattedPrice =
                firstPricedRoom && Number.isFinite(firstPricedRoom.price)
                  ? `₱${Number(firstPricedRoom.price).toLocaleString()} / month`
                  : "Price not available";

              // Construct address from flat fields
              const addressParts = [property.street, property.barangay, property.city, property.province].filter(Boolean);
              const address = addressParts.join(", ");

              return (
                <div
                  key={property.id}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow property-card"
                >
                  <button
                    type="button"
                    className="favorite-toggle"
                    aria-label="Remove from favorites"
                    onClick={() => toggleFavorite(property.id)}
                  >
                    <Heart size={18} color="#f87171" fill="#f87171" />
                  </button>

                  <div className="grid md:grid-cols-2 gap-0">
                    <div className="aspect-video md:aspect-auto">
                      <img
                        src={property.photos?.[0] ?? "/placeholder.svg"}
                        alt={property.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="bg-gradient-to-br from-cyan-400 to-blue-500 p-8 text-white flex flex-col justify-center">
                      <h3 className="text-3xl font-bold mb-4">{property.name}</h3>
                      <p className="text-white/90 mb-4 line-clamp-4">{property.description}</p>

                      <div className="text-sm mb-2 text-white/80">{address}</div>

                      <div className="text-2xl font-bold mb-4">{formattedPrice}</div>

                      <Button
                        variant="outline"
                        className="bg-white/10 border-white/50 text-white hover:bg-white/20 hover:text-white"
                        onClick={() => navigate(`/boardinghouse/${property.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;