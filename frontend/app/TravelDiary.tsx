"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";

const PlacesMap = dynamic(() => import("./PlacesMap"), { ssr: false });

interface Entry {
  id: string;
  title: string;
  description: string;
  category: string;
  rating: number;
  visitDate: string;
  address: string;
  tags?: string[];
  imageUrls: string[];
  /** @deprecated kept for backward compat */
  imageUrl?: string | null;
  createdAt: string;
}

interface Place {
  id: string;
  city: string;
  country: string;
  entries: Entry[];
  createdAt: string;
}

interface TripItem {
  id: string;
  place: string;
  country: string;
  note: string;
  category: string;
  status: "pending" | "done";
  createdAt: string;
}

interface Trip {
  id: string;
  name: string;
  entryRefs: { placeId: string; entryId: string }[];
  items?: TripItem[];
  createdAt: string;
}

interface WishlistItem {
  id: string;
  place: string;
  country: string;
  status: "not-visited" | "upcoming" | "done";
  note: string;
  createdAt: string;
}

const API_BASE = "http://localhost:3000";

function badgeClass(category: string) {
  const map: Record<string, string> = {
    Restaurant: "cat-restaurant",
    Museum: "cat-museum",
    Park: "cat-park",
    Landmark: "cat-landmark",
    Hotel: "cat-hotel",
    Event: "cat-event",
    Other: "cat-other",
  };
  return `badge ${map[category] ?? ""}`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="star-rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? "star filled" : "star"}>
          ★
        </span>
      ))}
    </span>
  );
}

/** Normalize legacy imageUrl field into imageUrls array */
function getImageUrls(entry: Entry): string[] {
  if (entry.imageUrls && entry.imageUrls.length > 0) return entry.imageUrls;
  if (entry.imageUrl) return [entry.imageUrl];
  return [];
}

/** Build a shareable text for an entry */
function buildEntryShareText(entry: Entry, placeName: string): string {
  const stars = "★".repeat(entry.rating) + "☆".repeat(5 - entry.rating);
  const date = new Date(entry.visitDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  let text = `📍 ${entry.title} — ${placeName}\n${stars}  •  ${date}`;
  if (entry.category) text += `  •  ${entry.category}`;
  if (entry.description) text += `\n\n${entry.description.slice(0, 200)}${entry.description.length > 200 ? "…" : ""}`;
  if (entry.tags && entry.tags.length) text += `\n\n${entry.tags.map((t) => `#${t}`).join(" ")}`;
  return text;
}

/** Build a shareable text for a trip */
function buildTripShareText(tripName: string, entries: { entry: Entry; placeName: string }[]): string {
  let text = `✈️ My Trip: ${tripName}\n${entries.length} entries\n`;
  entries.slice(0, 5).forEach((e) => {
    const stars = "★".repeat(e.entry.rating) + "☆".repeat(5 - e.entry.rating);
    text += `\n📍 ${e.entry.title} — ${e.placeName}  ${stars}`;
  });
  if (entries.length > 5) text += `\n…and ${entries.length - 5} more`;
  return text;
}

/** Share to a specific platform or use native share */
function shareTo(platform: "x" | "whatsapp" | "facebook" | "copy", text: string) {
  const encoded = encodeURIComponent(text);
  switch (platform) {
    case "x":
      window.open(`https://twitter.com/intent/tweet?text=${encoded}`, "_blank", "noopener");
      break;
    case "whatsapp":
      window.open(`https://wa.me/?text=${encoded}`, "_blank", "noopener");
      break;
    case "facebook":
      window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encoded}`, "_blank", "noopener");
      break;
    case "copy":
      navigator.clipboard.writeText(text);
      break;
  }
}

function ShareMenu({ text, onClose }: { text: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  const [copied, setCopied] = useState(false);
  return (
    <div className="share-menu" ref={ref}>
      <button className="share-option" onClick={() => { shareTo("x", text); onClose(); }} title="Share on X">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      </button>
      <button className="share-option" onClick={() => { shareTo("whatsapp", text); onClose(); }} title="Share on WhatsApp">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </button>
      <button className="share-option" onClick={() => { shareTo("facebook", text); onClose(); }} title="Share on Facebook">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      </button>
      <button className="share-option" onClick={() => { shareTo("copy", text); setCopied(true); setTimeout(() => { setCopied(false); onClose(); }, 1200); }} title="Copy to clipboard">
        {copied ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        )}
      </button>
    </div>
  );
}

function ImageCarousel({ urls, alt }: { urls: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  if (urls.length === 0) return null;
  const prev = () => setIdx((i) => (i - 1 + urls.length) % urls.length);
  const next = () => setIdx((i) => (i + 1) % urls.length);
  const multi = urls.length > 1;
  return (
    <div className="carousel">
      <div className="carousel-body">
        {multi && (
          <button className="carousel-arrow carousel-left" onClick={prev} aria-label="Previous image">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}
        <div className="carousel-frame">
          <img src={`${API_BASE}${urls[idx]}`} alt={alt} className="carousel-img" />
        </div>
        {multi && (
          <button className="carousel-arrow carousel-right" onClick={next} aria-label="Next image">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        )}
      </div>
      {multi && (
        <div className="carousel-dots">
          {urls.map((_, i) => (
            <span key={i} className={`carousel-dot${i === idx ? " active" : ""}`} onClick={() => setIdx(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

function EntryForm({
  placeId,
  onDone,
  editEntry,
  trips,
  onAddToTrip,
}: {
  placeId: string;
  onDone: () => void;
  editEntry?: Entry | null;
  trips?: Trip[];
  onAddToTrip?: (tripId: string, placeId: string, entryId: string) => void;
}) {
  const [title, setTitle] = useState(editEntry?.title ?? "");
  const [description, setDescription] = useState(editEntry?.description ?? "");
  const [category, setCategory] = useState(editEntry?.category ?? "General");
  const [rating, setRating] = useState(String(editEntry?.rating ?? 5));
  const [visitDate, setVisitDate] = useState(
    editEntry
      ? new Date(editEntry.visitDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [address, setAddress] = useState(editEntry?.address ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(editEntry?.tags ?? []);
  const [selectedTripIdForm, setSelectedTripIdForm] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(
    editEntry ? getImageUrls(editEntry) : []
  );
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    "General",
    "Restaurant",
    "Museum",
    "Park",
    "Landmark",
    "Hotel",
    "Event",
    "Other",
  ];

  const removeExistingImage = (url: string) => {
    setExistingImages((prev) => prev.filter((u) => u !== url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setSubmitting(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("rating", rating);
    formData.append("visitDate", new Date(visitDate).toISOString());
    formData.append("address", address);
    formData.append("tags", JSON.stringify(tags));

    if (editEntry) {
      formData.append("existingImages", JSON.stringify(existingImages));
    }

    for (const file of imageFiles) {
      formData.append("images", file);
    }

    const url = editEntry
      ? `${API_BASE}/api/places/${encodeURIComponent(placeId)}/entries/${encodeURIComponent(editEntry.id)}`
      : `${API_BASE}/api/places/${encodeURIComponent(placeId)}/entries`;

    const res = await fetch(url, {
      method: editEntry ? "PUT" : "POST",
      body: formData,
    });

    if (res.ok && selectedTripIdForm && onAddToTrip) {
      const savedEntry = await res.json();
      const entryId = editEntry ? editEntry.id : savedEntry.id;
      onAddToTrip(selectedTripIdForm, placeId, entryId);
    }

    setSubmitting(false);
    onDone();
  };

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <h3>{editEntry ? "Edit Entry" : "New Entry"}</h3>
      <div className="form-row">
        <div className="form-group flex-2">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Delicious dinner"
          />
        </div>
        <div className="form-group flex-1">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label>Rating</label>
          <select value={rating} onChange={(e) => setRating(e.target.value)}>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group flex-1">
          <label>Date</label>
          <input
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="form-group">
        <label>Address (optional)</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. 123 Main Street, Tokyo"
        />
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was it like?"
          rows={3}
        />
      </div>
      <div className="form-group">
        <label>Tags</label>
        <div className="tag-input-wrap">
          {tags.map((tag) => (
            <span key={tag} className="tag-chip">
              #{tag}
              <button type="button" onClick={() => setTags((t) => t.filter((x) => x !== tag))} className="tag-remove">×</button>
            </span>
          ))}
          <input
            type="text"
            className="tag-input"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                const raw = tagInput.replace(/^#+/, "").trim();
                if (raw && !tags.includes(raw)) setTags((t) => [...t, raw]);
                setTagInput("");
              }
              if (e.key === "Backspace" && !tagInput && tags.length > 0) {
                setTags((t) => t.slice(0, -1));
              }
            }}
            placeholder={tags.length === 0 ? "#sightseeing, #food, #nightlife…" : "Add tag…"}
          />
        </div>
      </div>
      {trips && trips.length > 0 && (
        <div className="form-group">
          <label>Add to Trip (optional)</label>
          <select value={selectedTripIdForm} onChange={(e) => setSelectedTripIdForm(e.target.value)}>
            <option value="">— None —</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}
      {existingImages.length > 0 && (
        <div className="form-group">
          <label>Current Photos</label>
          <div className="existing-images-preview">
            {existingImages.map((url) => (
              <div key={url} className="existing-img-thumb">
                <img src={`${API_BASE}${url}`} alt="existing" />
                <button type="button" className="remove-img-btn" onClick={() => removeExistingImage(url)} aria-label="Remove image">×</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="form-group">
        <label>Photos (optional, multiple allowed)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))}
        />
      </div>
      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? "Saving…" : editEntry ? "Update Entry" : "Save Entry"}
      </button>
    </form>
  );
}

export default function TravelDiary({
  initialPlaces,
}: {
  initialPlaces: Place[];
}) {
  const [places, setPlaces] = useState<Place[]>(initialPlaces);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [showFavorites, setShowFavorites] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterRating, setFilterRating] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPlace, setFilterPlace] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [viewingEntry, setViewingEntry] = useState<{ entry: Entry; placeName: string } | null>(null);

  // Trips state
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [showTrips, setShowTrips] = useState(false);
  const [newTripName, setNewTripName] = useState("");
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [addToTripEntryId, setAddToTripEntryId] = useState<string | null>(null);
  const [addToTripPlaceId, setAddToTripPlaceId] = useState<string | null>(null);
  const tripDropdownRef = useRef<HTMLDivElement>(null);
  const [shareMenuId, setShareMenuId] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/trips`);
      const data: Trip[] = await res.json();
      setTrips(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  // Close trip dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tripDropdownRef.current && !tripDropdownRef.current.contains(e.target as Node)) {
        setAddToTripEntryId(null);
        setAddToTripPlaceId(null);
      }
    };
    if (addToTripEntryId) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [addToTripEntryId]);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripName.trim()) return;
    const res = await fetch(`${API_BASE}/api/trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTripName.trim() }),
    });
    if (res.ok) {
      await fetchTrips();
      setNewTripName("");
      setIsCreatingTrip(false);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    const res = await fetch(`${API_BASE}/api/trips/${encodeURIComponent(tripId)}`, { method: "DELETE" });
    if (res.ok) {
      if (selectedTripId === tripId) { setSelectedTripId(null); setShowTrips(false); }
      await fetchTrips();
    }
  };

  const handleAddEntryToTrip = async (tripId: string, placeId: string, entryId: string) => {
    const res = await fetch(`${API_BASE}/api/trips/${encodeURIComponent(tripId)}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId, entryId }),
    });
    if (res.ok) {
      await fetchTrips();
      setAddToTripEntryId(null);
      setAddToTripPlaceId(null);
    }
  };

  const handleRemoveEntryFromTrip = async (tripId: string, entryId: string) => {
    const res = await fetch(`${API_BASE}/api/trips/${encodeURIComponent(tripId)}/entries/${encodeURIComponent(entryId)}`, { method: "DELETE" });
    if (res.ok) await fetchTrips();
  };

  const selectedTrip = trips.find((t) => t.id === selectedTripId) ?? null;

  const tripEntries = useMemo(() => {
    if (!selectedTrip) return [];
    const entries: (Entry & { placeId: string; placeName: string })[] = [];
    for (const ref of selectedTrip.entryRefs) {
      const place = places.find((p) => p.id === ref.placeId);
      if (!place) continue;
      const entry = place.entries.find((e) => e.id === ref.entryId);
      if (!entry) continue;
      entries.push({ ...entry, placeId: place.id, placeName: `${place.city}, ${place.country}` });
    }
    return entries;
  }, [selectedTrip, places]);

  // Trip items state
  const TRIP_ITEM_CATEGORIES = ["General", "Restaurant", "Museum", "Park", "Landmark", "Hotel", "Event", "Other"];
  const [tripItemTab, setTripItemTab] = useState<"all" | "pending" | "done">("all");
  const [isAddingTripItem, setIsAddingTripItem] = useState(false);
  const [tripItemPlace, setTripItemPlace] = useState("");
  const [tripItemCountry, setTripItemCountry] = useState("");
  const [tripItemNote, setTripItemNote] = useState("");
  const [tripItemCategory, setTripItemCategory] = useState("General");
  const [editingTripItemId, setEditingTripItemId] = useState<string | null>(null);
  const [editTripItemPlace, setEditTripItemPlace] = useState("");
  const [editTripItemCountry, setEditTripItemCountry] = useState("");
  const [editTripItemNote, setEditTripItemNote] = useState("");
  const [editTripItemCategory, setEditTripItemCategory] = useState("General");

  const filteredTripItems = useMemo(() => {
    const items = selectedTrip?.items ?? [];
    if (tripItemTab === "all") return items;
    return items.filter((i) => i.status === tripItemTab);
  }, [selectedTrip, tripItemTab]);

  const handleAddTripItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip) return;
    const res = await fetch(`${API_BASE}/api/trips/${encodeURIComponent(selectedTrip.id)}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place: tripItemPlace.trim(), country: tripItemCountry.trim(), note: tripItemNote.trim(), category: tripItemCategory }),
    });
    if (res.ok) {
      await fetchTrips();
      setTripItemPlace("");
      setTripItemCountry("");
      setTripItemNote("");
      setTripItemCategory("General");
      setIsAddingTripItem(false);
    }
  };

  const handleUpdateTripItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip || !editingTripItemId) return;
    const res = await fetch(`${API_BASE}/api/trips/${encodeURIComponent(selectedTrip.id)}/items/${encodeURIComponent(editingTripItemId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place: editTripItemPlace.trim(), country: editTripItemCountry.trim(), note: editTripItemNote.trim(), category: editTripItemCategory }),
    });
    if (res.ok) {
      await fetchTrips();
      setEditingTripItemId(null);
    }
  };

  const handleUpdateTripItemStatus = async (itemId: string, status: "pending" | "done") => {
    if (!selectedTrip) return;
    const res = await fetch(`${API_BASE}/api/trips/${encodeURIComponent(selectedTrip.id)}/items/${encodeURIComponent(itemId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await fetchTrips();
  };

  const handleDeleteTripItem = async (itemId: string) => {
    if (!selectedTrip) return;
    const res = await fetch(`${API_BASE}/api/trips/${encodeURIComponent(selectedTrip.id)}/items/${encodeURIComponent(itemId)}`, { method: "DELETE" });
    if (res.ok) await fetchTrips();
  };

  const startEditTripItem = (item: TripItem) => {
    setEditingTripItemId(item.id);
    setEditTripItemPlace(item.place);
    setEditTripItemCountry(item.country);
    setEditTripItemNote(item.note);
    setEditTripItemCategory(item.category);
  };

  // Wishlist state
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [showWishlist, setShowWishlist] = useState(false);
  const [wishlistTab, setWishlistTab] = useState<"all" | "not-visited" | "upcoming" | "done">("all");
  const [isAddingWish, setIsAddingWish] = useState(false);
  const [wishPlace, setWishPlace] = useState("");
  const [wishCountry, setWishCountry] = useState("");
  const [wishNote, setWishNote] = useState("");
  const [editingWishId, setEditingWishId] = useState<string | null>(null);
  const [editWishPlace, setEditWishPlace] = useState("");
  const [editWishCountry, setEditWishCountry] = useState("");
  const [editWishNote, setEditWishNote] = useState("");

  const fetchWishlist = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/wishlist`);
      const data: WishlistItem[] = await res.json();
      setWishlist(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  const handleAddWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishPlace.trim() || !wishCountry.trim()) return;
    const res = await fetch(`${API_BASE}/api/wishlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place: wishPlace.trim(), country: wishCountry.trim(), note: wishNote.trim() }),
    });
    if (res.ok) {
      await fetchWishlist();
      setWishPlace(""); setWishCountry(""); setWishNote("");
      setIsAddingWish(false);
    }
  };

  const handleUpdateWishStatus = async (id: string, status: WishlistItem["status"]) => {
    const res = await fetch(`${API_BASE}/api/wishlist/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await fetchWishlist();
  };

  const startEditWish = (item: WishlistItem) => {
    setEditingWishId(item.id);
    setEditWishPlace(item.place);
    setEditWishCountry(item.country);
    setEditWishNote(item.note);
  };

  const handleUpdateWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWishId || !editWishPlace.trim() || !editWishCountry.trim()) return;
    const res = await fetch(`${API_BASE}/api/wishlist/${encodeURIComponent(editingWishId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place: editWishPlace.trim(), country: editWishCountry.trim(), note: editWishNote.trim() }),
    });
    if (res.ok) {
      await fetchWishlist();
      setEditingWishId(null);
    }
  };

  const handleDeleteWish = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/wishlist/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) await fetchWishlist();
  };

  const filteredWishlist = useMemo(() => {
    if (wishlistTab === "all") return wishlist;
    return wishlist.filter((w) => w.status === wishlistTab);
  }, [wishlist, wishlistTab]);

  const wishlistByCountry = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {};
    wishlist.forEach((w) => {
      if (!map[w.country]) map[w.country] = { total: 0, done: 0 };
      map[w.country].total++;
      if (w.status === "done") map[w.country].done++;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [wishlist]);

  const toggleFavorite = (entryId: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  };

  const handleDeleteEntry = async (placeId: string, entryId: string) => {
    const res = await fetch(
      `${API_BASE}/api/places/${encodeURIComponent(placeId)}/entries/${encodeURIComponent(entryId)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
      await fetchPlaces();
    }
  };

  const favoriteEntries = useMemo(() => {
    const entries: (Entry & { placeName: string })[] = [];
    places.forEach((p) =>
      p.entries.forEach((e) => {
        if (favoriteIds.has(e.id)) entries.push({ ...e, placeName: `${p.city}, ${p.country}` });
      })
    );
    return entries.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
  }, [places, favoriteIds]);

  const fetchPlaces = async () => {
    const res = await fetch(`${API_BASE}/api/places`);
    const data: Place[] = await res.json();
    setPlaces(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const goHome = useCallback(() => {
    setSelectedPlaceId(null);
    setShowFavorites(false);
    setShowTrips(false);
    setSelectedTripId(null);
    setShowWishlist(false);
    setShowEntryForm(false);
    setEditingEntry(null);
  }, []);

  const handleAddPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city || !country) return;
    const res = await fetch(`${API_BASE}/api/places`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city, country }),
    });
    if (res.ok) {
      const newPlace: Place = await res.json();
      await fetchPlaces();
      setSelectedPlaceId(newPlace.id);
      setCity("");
      setCountry("");
      setIsAddingPlace(false);
    }
  };

  // ---- Delete place / country ----
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "place" | "country";
    label: string;
    placeIds: string[];
    entryCount: number;
  } | null>(null);

  const deletePlaces = async (placeIds: string[]) => {
    for (const id of placeIds) {
      await fetch(`${API_BASE}/api/places/${encodeURIComponent(id)}`, { method: "DELETE" });
    }
    if (placeIds.includes(selectedPlaceId ?? "")) {
      setSelectedPlaceId(null);
      setShowEntryForm(false);
      setEditingEntry(null);
    }
    await fetchPlaces();
    await fetchTrips();
  };

  const handleDeletePlace = (place: Place) => {
    if (place.entries.length === 0) {
      deletePlaces([place.id]);
    } else {
      setConfirmDelete({
        type: "place",
        label: `${place.city}, ${place.country}`,
        placeIds: [place.id],
        entryCount: place.entries.length,
      });
    }
  };

  const handleDeleteCountry = (countryName: string, countryPlaces: Place[]) => {
    const totalEntries = countryPlaces.reduce((sum, p) => sum + p.entries.length, 0);
    const ids = countryPlaces.map((p) => p.id);
    if (totalEntries === 0) {
      deletePlaces(ids);
    } else {
      setConfirmDelete({
        type: "country",
        label: countryName,
        placeIds: ids,
        entryCount: totalEntries,
      });
    }
  };

  const selectedPlace = places.find((p) => p.id === selectedPlaceId) ?? null;

  const totalEntries = places.reduce((sum, p) => sum + p.entries.length, 0);

  const groupedPlaces = useMemo(() => {
    const groups: Record<string, Place[]> = {};
    places.forEach((p) => {
      if (!groups[p.country]) groups[p.country] = [];
      groups[p.country].push(p);
    });
    return groups;
  }, [places]);

  const sortedEntries = selectedPlace
    ? [...selectedPlace.entries].sort(
        (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
      )
    : [];

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    places.forEach((p) => p.entries.forEach((e) => set.add(e.category)));
    return Array.from(set).sort();
  }, [places]);

  const hasActiveFilters = filterRating !== "all" || filterCategory !== "all" || filterPlace !== "all" || filterDateFrom || filterDateTo;

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterRating("all");
    setFilterCategory("all");
    setFilterPlace("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const matchesSearch = (entry: Entry, placeName?: string) => {
    const q = searchQuery.trim().toLowerCase();
    // Text search
    if (q) {
      const terms = q.split(/\s+/);
      const textMatch = terms.every((term) => {
        if (term.startsWith("#")) {
          const tagTerm = term.slice(1);
          if (!tagTerm) return true;
          return (entry.tags ?? []).some((t) => t.toLowerCase().includes(tagTerm));
        }
        return (
          entry.title.toLowerCase().includes(term) ||
          entry.description.toLowerCase().includes(term) ||
          entry.category.toLowerCase().includes(term) ||
          (entry.tags ?? []).some((t) => t.toLowerCase().includes(term)) ||
          (placeName?.toLowerCase().includes(term) ?? false)
        );
      });
      if (!textMatch) return false;
    }
    // Rating filter
    if (filterRating !== "all" && entry.rating !== parseInt(filterRating)) return false;
    // Category filter
    if (filterCategory !== "all" && entry.category !== filterCategory) return false;
    // Date range filter
    if (filterDateFrom) {
      const from = new Date(filterDateFrom).getTime();
      if (new Date(entry.visitDate).getTime() < from) return false;
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo).getTime() + 86400000; // inclusive end of day
      if (new Date(entry.visitDate).getTime() >= to) return false;
    }
    // Place filter (for global search)
    if (filterPlace !== "all" && placeName) {
      const place = places.find((p) => p.id === filterPlace);
      if (place && placeName !== `${place.city}, ${place.country}`) return false;
    }
    return true;
  };

  const filteredSortedEntries = sortedEntries.filter((e) =>
    matchesSearch(e, selectedPlace ? `${selectedPlace.city}, ${selectedPlace.country}` : undefined)
  );
  const filteredFavoriteEntries = favoriteEntries.filter((e) =>
    matchesSearch(e, (e as Entry & { placeName: string }).placeName)
  );

  // Global search results (across all places) when searching without a specific view
  const isSearching = searchQuery.trim() !== "" || hasActiveFilters;
  const allSearchResults = useMemo(() => {
    if (!isSearching) return [];
    const results: (Entry & { placeId: string; placeName: string })[] = [];
    places.forEach((p) => {
      const pName = `${p.city}, ${p.country}`;
      p.entries.forEach((e) => {
        if (matchesSearch(e, pName)) {
          // For place filter, also check placeId directly
          if (filterPlace !== "all" && p.id !== filterPlace) return;
          results.push({ ...e, placeId: p.id, placeName: pName });
        }
      });
    });
    return results.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, searchQuery, filterRating, filterCategory, filterPlace, filterDateFrom, filterDateTo]);

  // Dashboard stats
  const dashboardStats = useMemo(() => {
    const allEntries = places.flatMap((p) => p.entries);
    const totalEntries = allEntries.length;
    const totalPlaces = places.length;
    const countries = new Set(places.map((p) => p.country));
    const cities = new Set(places.map((p) => p.city));

    return {
      totalEntries, totalPlaces, countries: countries.size, cities: cities.size,
      favCount: favoriteIds.size, tripCount: trips.length,
    };
  }, [places, favoriteIds, trips]);

  return (
    <div className="app-shell">
      {/* ======== Sidebar ======== */}
      <aside className="diary-sidebar">
        <div className="sidebar-brand">
          <h1>My Travels</h1>
          <div className="sidebar-stat">
            {places.length} {places.length === 1 ? "Place" : "Places"} · {totalEntries} {totalEntries === 1 ? "Entry" : "Entries"}
          </div>
        </div>

        <PlacesMap
          places={places}
          onSelectPlace={(id) => {
            setSelectedPlaceId(id);
            setShowFavorites(false);
            setShowTrips(false);
            setSelectedTripId(null);
            setShowWishlist(false);
            setShowEntryForm(false);
          }}
        />

        <div className="sidebar-section-label">Recent Places</div>

        <div className="sidebar-places">
          {Object.keys(groupedPlaces).length === 0 ? (
            <p className="sidebar-empty">No places yet.</p>
          ) : (
            Object.entries(groupedPlaces).map(([countryName, countryPlaces]) => (
              <div key={countryName} className="country-group">
                <div className="country-header-row">
                  <h3 className="country-header">{countryName}</h3>
                  <button
                    className="sidebar-delete-btn"
                    onClick={(e) => { e.stopPropagation(); handleDeleteCountry(countryName, countryPlaces); }}
                    aria-label={`Delete ${countryName}`}
                    title={`Delete ${countryName}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  </button>
                </div>
                <ul>
                  {countryPlaces.map((place) => (
                    <li
                      key={place.id}
                      className={`place-item${selectedPlaceId === place.id ? " active" : ""}`}
                      onClick={() => {
                        setSelectedPlaceId(place.id);
                        setShowFavorites(false);
                        setShowTrips(false);
                        setSelectedTripId(null);
                        setShowWishlist(false);
                        setShowEntryForm(false);
                      }}
                    >
                      <span className="place-dot" />
                      <span>{place.city}</span>
                      <span className="place-item-actions">
                        <span className="entry-count">{place.entries.length}</span>
                        <button
                          className="sidebar-delete-btn"
                          onClick={(e) => { e.stopPropagation(); handleDeletePlace(place); }}
                          aria-label={`Delete ${place.city}`}
                          title={`Delete ${place.city}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-section-label">Collections</div>
        <div className="sidebar-favorites">
          <button
            className={`favorites-btn${showFavorites ? " active" : ""}`}
            onClick={() => {
              setShowFavorites(true);
              setSelectedPlaceId(null);
              setShowTrips(false);
              setSelectedTripId(null);
              setShowWishlist(false);
              setShowEntryForm(false);
            }}
          >
            <span className="favorites-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>
            <span>Favorites</span>
            <span className="entry-count">{favoriteIds.size}</span>
          </button>
          {/* Wishlist */}
          <button
            className={`favorites-btn wishlist-btn${showWishlist ? " active" : ""}`}
            onClick={() => {
              setShowWishlist(true);
              setShowFavorites(false);
              setShowTrips(false);
              setSelectedTripId(null);
              setSelectedPlaceId(null);
              setShowEntryForm(false);
            }}
          >
            <span className="favorites-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>
            <span>Bucket List</span>
            <span className="entry-count">{wishlist.length}</span>
          </button>
          {/* Trips */}
          {trips.map((trip) => (
            <div
              key={trip.id}
              role="button"
              tabIndex={0}
              className={`favorites-btn trips-btn${selectedTripId === trip.id && showTrips ? " active" : ""}`}
              onClick={() => {
                setSelectedTripId(trip.id);
                setShowTrips(true);
                setShowFavorites(false);
                setShowWishlist(false);
                setSelectedPlaceId(null);
                setShowEntryForm(false);
              }}
            >
              <span className="favorites-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg></span>
              <span className="trip-name-label">{trip.name}</span>
              <span className="entry-count">{trip.entryRefs.length}</span>
              <button
                className="trip-delete-btn"
                onClick={(e) => { e.stopPropagation(); handleDeleteTrip(trip.id); }}
                aria-label="Delete trip"
                title="Delete trip"
              >×</button>
            </div>
          ))}
          {isCreatingTrip ? (
            <form className="trip-create-form" onSubmit={handleCreateTrip}>
              <input
                type="text"
                placeholder="Trip name, e.g. Japan 2025"
                value={newTripName}
                onChange={(e) => setNewTripName(e.target.value)}
                autoFocus
              />
              <div className="trip-create-actions">
                <button type="button" className="btn-secondary" onClick={() => { setIsCreatingTrip(false); setNewTripName(""); }}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          ) : (
            <button className="btn-create-trip" onClick={() => setIsCreatingTrip(true)}>
              + New Trip
            </button>
          )}
        </div>

        <div className="sidebar-bottom">
          {isAddingPlace ? (
            <form onSubmit={handleAddPlace} className="add-place-form">
              <input
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
              />
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsAddingPlace(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save
                </button>
              </div>
            </form>
          ) : (
            <button
              className="btn-add-place"
              onClick={() => setIsAddingPlace(true)}
            >
              + Add New Place
            </button>
          )}
        </div>
      </aside>

      {/* ======== Right Column ======== */}
      <div className="main-column">
        {/* ---- Top Bar ---- */}
        <header className="top-bar">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by title, description, place, #tag, or category…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery("")} aria-label="Clear search">×</button>
            )}
          </div>
          <button
            className={`btn-filter-toggle${showFilters ? " active" : ""}${hasActiveFilters ? " has-filters" : ""}`}
            onClick={() => setShowFilters((v) => !v)}
            title="Toggle filters"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            {hasActiveFilters && <span className="filter-dot" />}
          </button>
          {selectedPlace && (
            <button
              className={`btn-topbar${showEntryForm ? " cancel" : ""}`}
              onClick={() => {
                setShowEntryForm(!showEntryForm);
                setEditingEntry(null);
              }}
            >
              {showEntryForm ? "Cancel" : "Add Entry"}
            </button>
          )}
        </header>

        {showFilters && (
          <div className="filter-bar">
            <div className="filter-bar-row">
              <div className="filter-field">
                <label>Category</label>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="all">All</option>
                  {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="filter-field">
                <label>Rating</label>
                <select value={filterRating} onChange={(e) => setFilterRating(e.target.value)}>
                  <option value="all">All</option>
                  {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} ★</option>)}
                </select>
              </div>
              <div className="filter-field">
                <label>Place</label>
                <select value={filterPlace} onChange={(e) => setFilterPlace(e.target.value)}>
                  <option value="all">All Places</option>
                  {places.map((p) => <option key={p.id} value={p.id}>{p.city}, {p.country}</option>)}
                </select>
              </div>
              <div className="filter-field">
                <label>From</label>
                <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
              </div>
              <div className="filter-field">
                <label>To</label>
                <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
              </div>
              {hasActiveFilters && (
                <button className="btn-clear-filters" onClick={clearAllFilters}>Clear All</button>
              )}
            </div>
          </div>
        )}

        {/* ---- Main Content ---- */}
        <main className="diary-main">
          {showFavorites ? (
            <>
              <button className="go-back-btn" onClick={goHome}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                Back to Home
              </button>
              <h1 className="place-heading">♥ Favorites</h1>
              {filteredFavoriteEntries.length === 0 ? (
                <div className="empty-state">
                  <p>{isSearching ? "No favorites match your search." : "No favorites yet. Click the heart icon on any entry to add it here."}</p>
                </div>
              ) : (
                <div className="entries-grid">
                  {filteredFavoriteEntries.map((entry) => {
                    const urls = getImageUrls(entry);
                    return (
                    <article key={entry.id} className="entry-card">
                      {urls.length > 0 ? (
                        <div className="entry-card-image-wrap">
                          <ImageCarousel urls={urls} alt={entry.title} />
                          <span className={badgeClass(entry.category)}>{entry.category}</span>
                        </div>
                      ) : (
                        <div className="entry-card-no-image">
                          <span className={badgeClass(entry.category)}>{entry.category}</span>
                          <span className="no-image-icon">🗺️</span>
                        </div>
                      )}
                      <div className="entry-body">
                        <div className="entry-title-row">
                          <h2>{entry.title}</h2>
                          <div className="entry-actions">
                            <div className="share-wrap">
                              <button className="share-btn" onClick={() => setShareMenuId(shareMenuId === entry.id ? null : entry.id)} aria-label="Share entry" title="Share">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                              </button>
                              {shareMenuId === entry.id && <ShareMenu text={buildEntryShareText(entry, entry.placeName)} onClose={() => setShareMenuId(null)} />}
                            </div>
                            <button className="heart-btn active" onClick={() => toggleFavorite(entry.id)} aria-label="Remove from favorites"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
                          </div>
                        </div>
                        <p className="entry-place-label">{entry.placeName}</p>
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="entry-tags">
                            {entry.tags.map((tag) => <span key={tag} className="entry-tag">#{tag}</span>)}
                          </div>
                        )}
                        {entry.address && <p className="entry-address">📍 {entry.address}</p>}
                        {entry.description && <p className="entry-desc">{entry.description}</p>}
                        <div className="entry-footer">
                          <span className="entry-date">
                            {new Date(entry.visitDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                          </span>
                          <StarRating rating={entry.rating} />
                        </div>
                        <div className="entry-footer">
                          <span />
                          <span className="read-entry-link" onClick={() => setViewingEntry({ entry, placeName: entry.placeName })}>Read Entry →</span>
                        </div>
                      </div>
                    </article>
                    );
                  })}
                </div>
              )}
            </>
          ) : showWishlist ? (
            <div className="wishlist-view">
              <div className="wishlist-main-col">
                <button className="go-back-btn" onClick={goHome}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Back to Home
                </button>
                <h1 className="place-heading" style={{display: "flex", alignItems: "center", gap: "0.4rem"}}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink: 0}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>Bucket List</h1>
                <div className="wishlist-tabs">
                  {(["all", "not-visited", "upcoming", "done"] as const).map((tab) => (
                    <button
                      key={tab}
                      className={`wishlist-tab${wishlistTab === tab ? " active" : ""}`}
                      onClick={() => setWishlistTab(tab)}
                    >
                      <span className={`wishlist-tab-dot ${tab}`} />
                      {tab === "all" ? "All" : tab === "not-visited" ? "Not Visited" : tab === "upcoming" ? "Upcoming" : "Done"}
                      <span className="wishlist-tab-count">
                        {tab === "all" ? wishlist.length : wishlist.filter((w) => w.status === tab).length}
                      </span>
                    </button>
                  ))}
                </div>

                {isAddingWish ? (
                  <form className="wish-add-form" onSubmit={handleAddWish}>
                    <div className="wish-add-row">
                      <input type="text" placeholder="Place, e.g. Kyoto" value={wishPlace} onChange={(e) => setWishPlace(e.target.value)} required autoFocus />
                      <input type="text" placeholder="Country, e.g. Japan" value={wishCountry} onChange={(e) => setWishCountry(e.target.value)} required />
                    </div>
                    <input type="text" placeholder="Note (optional)" value={wishNote} onChange={(e) => setWishNote(e.target.value)} className="wish-note-input" />
                    <div className="wish-add-actions">
                      <button type="button" className="btn-secondary" onClick={() => { setIsAddingWish(false); setWishPlace(""); setWishCountry(""); setWishNote(""); }}>Cancel</button>
                      <button type="submit" className="btn-primary">Add</button>
                    </div>
                  </form>
                ) : (
                  <button className="btn-add-wish" onClick={() => setIsAddingWish(true)}>+ Add Place</button>
                )}

                {filteredWishlist.length === 0 ? (
                  <div className="empty-state">
                    <p>{wishlistTab === "all" ? "Your bucket list is empty. Add a place you dream of visiting!" : `No ${wishlistTab === "not-visited" ? "unvisited" : wishlistTab} places.`}</p>
                  </div>
                ) : (
                  <div className="wishlist-grid">
                    {filteredWishlist.map((item) => (
                      <div key={item.id} className="wish-card">
                        {editingWishId === item.id ? (
                          <form className="wish-edit-form" onSubmit={handleUpdateWish}>
                            <input type="text" value={editWishPlace} onChange={(e) => setEditWishPlace(e.target.value)} required placeholder="Place" autoFocus />
                            <input type="text" value={editWishCountry} onChange={(e) => setEditWishCountry(e.target.value)} required placeholder="Country" />
                            <input type="text" value={editWishNote} onChange={(e) => setEditWishNote(e.target.value)} placeholder="Note (optional)" />
                            <div className="wish-edit-actions">
                              <button type="button" className="btn-secondary" onClick={() => setEditingWishId(null)}>Cancel</button>
                              <button type="submit" className="btn-primary">Save</button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="wish-card-header">
                              <div className="wish-card-info">
                                <span className="wish-card-place">{item.place}</span>
                                <span className="wish-card-country">📍 {item.country}</span>
                              </div>
                              <div className="wish-card-actions">
                                <button className="wish-action-btn" onClick={() => startEditWish(item)} aria-label="Edit" title="Edit">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                <button className="wish-action-btn wish-action-delete" onClick={() => handleDeleteWish(item.id)} aria-label="Delete" title="Delete">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                </button>
                              </div>
                            </div>
                            {item.note && <p className="wish-card-note">{item.note}</p>}
                            <div className="wish-card-footer">
                              <select
                                className={`wish-status-select status-${item.status}`}
                                value={item.status}
                                onChange={(e) => handleUpdateWishStatus(item.id, e.target.value as WishlistItem["status"])}
                              >
                                <option value="not-visited">Not Visited</option>
                                <option value="upcoming">Upcoming Trip</option>
                                <option value="done">Done</option>
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {wishlistByCountry.length > 0 && (
                <aside className="wishlist-sidebar">
                  <h3 className="wishlist-sidebar-title">By Country</h3>
                  {wishlistByCountry.map(([country, { total, done }]) => {
                    const pct = Math.round((done / total) * 100);
                    return (
                      <div key={country} className="wish-country-card">
                        <span className="wish-country-name">📍 {country}</span>
                        <div className="wish-country-bar-wrap">
                          <span className="wish-country-pct">{pct}%</span>
                          <div className="wish-country-bar">
                            <div className="wish-country-bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="wish-country-detail">{done} of {total} visited</span>
                      </div>
                    );
                  })}
                </aside>
              )}
            </div>
          ) : showTrips && selectedTrip ? (
            <>
              <button className="go-back-btn" onClick={goHome}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                Back to Home
              </button>
              <div className="place-heading-row">
                <h1 className="place-heading" style={{display: "flex", alignItems: "center", gap: "0.4rem"}}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink: 0}}><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>
                  {selectedTrip.name}
                </h1>
                {tripEntries.length > 0 && (
                  <div className="share-wrap">
                    <button className="share-btn" onClick={() => setShareMenuId(shareMenuId === `trip-${selectedTrip.id}` ? null : `trip-${selectedTrip.id}`)} aria-label="Share trip" title="Share trip">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    </button>
                    {shareMenuId === `trip-${selectedTrip.id}` && <ShareMenu text={buildTripShareText(selectedTrip.name, tripEntries.map((e) => ({ entry: e, placeName: e.placeName })))} onClose={() => setShareMenuId(null)} />}
                  </div>
                )}
              </div>
              <div className="trip-items-tabs">
                  {(["all", "pending", "done"] as const).map((tab) => (
                    <button
                      key={tab}
                      className={`trip-items-tab${tripItemTab === tab ? " active" : ""}`}
                      onClick={() => setTripItemTab(tab)}
                    >
                      <span className={`trip-items-tab-dot ${tab}`} />
                      {tab === "all" ? "All" : tab === "pending" ? "Pending" : "Done"}
                      <span className="trip-items-tab-count">
                        {tab === "all" ? (selectedTrip?.items ?? []).length : (selectedTrip?.items ?? []).filter((i) => i.status === tab).length}
                      </span>
                    </button>
                  ))}
                </div>
              {tripEntries.length > 0 && (
                <div className="entries-grid">
                  {tripEntries.map((entry) => {
                    const urls = getImageUrls(entry);
                    return (
                    <article key={entry.id} className="entry-card">
                      {urls.length > 0 ? (
                        <div className="entry-card-image-wrap">
                          <ImageCarousel urls={urls} alt={entry.title} />
                          <span className={badgeClass(entry.category)}>{entry.category}</span>
                        </div>
                      ) : (
                        <div className="entry-card-no-image">
                          <span className={badgeClass(entry.category)}>{entry.category}</span>
                          <span className="no-image-icon">🗺️</span>
                        </div>
                      )}
                      <div className="entry-body">
                        <div className="entry-title-row">
                          <h2>{entry.title}</h2>
                          <div className="entry-actions">
                            <div className="share-wrap">
                              <button className="share-btn" onClick={() => setShareMenuId(shareMenuId === entry.id ? null : entry.id)} aria-label="Share entry" title="Share">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                              </button>
                              {shareMenuId === entry.id && <ShareMenu text={buildEntryShareText(entry, entry.placeName)} onClose={() => setShareMenuId(null)} />}
                            </div>
                            <button
                              className="delete-btn"
                              onClick={() => handleRemoveEntryFromTrip(selectedTrip.id, entry.id)}
                              aria-label="Remove from trip"
                              title="Remove from trip"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            </button>
                            <button
                              className={`heart-btn${favoriteIds.has(entry.id) ? " active" : ""}`}
                              onClick={() => toggleFavorite(entry.id)}
                              aria-label={favoriteIds.has(entry.id) ? "Remove from favorites" : "Add to favorites"}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={favoriteIds.has(entry.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                            </button>
                          </div>
                        </div>
                        <p className="entry-place-label">{entry.placeName}</p>
                        <StarRating rating={entry.rating} />
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="entry-tags">
                            {entry.tags.map((tag) => <span key={tag} className="entry-tag">#{tag}</span>)}
                          </div>
                        )}
                        {entry.address && <p className="entry-address">📍 {entry.address}</p>}
                        {entry.description && <p className="entry-desc">{entry.description}</p>}
                        <div className="entry-footer">
                          <span className="entry-date">
                            {new Date(entry.visitDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                          </span>
                          <span className="read-entry-link" onClick={() => setViewingEntry({ entry, placeName: entry.placeName })}>Read Entry →</span>
                        </div>
                      </div>
                    </article>
                    );
                  })}
                </div>
              )}

              {/* Trip planning items */}
                {isAddingTripItem ? (
                  <form className="trip-item-add-form" onSubmit={handleAddTripItem}>
                    <div className="trip-item-add-row">
                      <input type="text" placeholder="Place (optional)" value={tripItemPlace} onChange={(e) => setTripItemPlace(e.target.value)} autoFocus />
                      <input type="text" placeholder="Country (optional)" value={tripItemCountry} onChange={(e) => setTripItemCountry(e.target.value)} />
                    </div>
                    <input type="text" placeholder="Note" value={tripItemNote} onChange={(e) => setTripItemNote(e.target.value)} className="trip-item-note-input" />
                    <select value={tripItemCategory} onChange={(e) => setTripItemCategory(e.target.value)} className="trip-item-category-select">
                      {TRIP_ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="trip-item-add-actions">
                      <button type="button" className="btn-secondary" onClick={() => { setIsAddingTripItem(false); setTripItemPlace(""); setTripItemCountry(""); setTripItemNote(""); setTripItemCategory("General"); }}>Cancel</button>
                      <button type="submit" className="btn-primary">Add</button>
                    </div>
                  </form>
                ) : (
                  <button className="btn-add-wish" onClick={() => setIsAddingTripItem(true)}>+ Add Item</button>
                )}

                {filteredTripItems.length === 0 ? (
                  <div className="empty-state">
                    <p>{tripItemTab === "all" ? "No planning items yet. Add things you want to do on this trip!" : `No ${tripItemTab} items.`}</p>
                  </div>
                ) : (
                  <div className="wishlist-grid">
                    {filteredTripItems.map((item) => (
                      <div key={item.id} className="wish-card">
                        {editingTripItemId === item.id ? (
                          <form className="wish-edit-form" onSubmit={handleUpdateTripItem}>
                            <input type="text" value={editTripItemPlace} onChange={(e) => setEditTripItemPlace(e.target.value)} placeholder="Place (optional)" autoFocus />
                            <input type="text" value={editTripItemCountry} onChange={(e) => setEditTripItemCountry(e.target.value)} placeholder="Country (optional)" />
                            <input type="text" value={editTripItemNote} onChange={(e) => setEditTripItemNote(e.target.value)} placeholder="Note" />
                            <select value={editTripItemCategory} onChange={(e) => setEditTripItemCategory(e.target.value)} className="trip-item-category-select">
                              {TRIP_ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <div className="wish-edit-actions">
                              <button type="button" className="btn-secondary" onClick={() => setEditingTripItemId(null)}>Cancel</button>
                              <button type="submit" className="btn-primary">Save</button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="wish-card-header">
                              <div className="wish-card-info">
                                {item.place && <span className="wish-card-place">{item.place}</span>}
                                {item.country && <span className="wish-card-country">📍 {item.country}</span>}
                                <span className={badgeClass(item.category)}>{item.category}</span>
                              </div>
                              <div className="wish-card-actions">
                                <button className="wish-action-btn" onClick={() => startEditTripItem(item)} aria-label="Edit" title="Edit">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                <button className="wish-action-btn wish-action-delete" onClick={() => handleDeleteTripItem(item.id)} aria-label="Delete" title="Delete">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                </button>
                              </div>
                            </div>
                            {item.note && <p className="wish-card-note">{item.note}</p>}
                            <div className="wish-card-footer">
                              <select
                                className={`wish-status-select status-${item.status}`}
                                value={item.status}
                                onChange={(e) => handleUpdateTripItemStatus(item.id, e.target.value as "pending" | "done")}
                              >
                                <option value="pending">Pending</option>
                                <option value="done">Done</option>
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </>
          ) : selectedPlace ? (
            <>
              <button className="go-back-btn" onClick={goHome}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                Back to Home
              </button>
              <h1 className="place-heading">
                {selectedPlace.city}, {selectedPlace.country}
              </h1>

              {showEntryForm && (
                <EntryForm
                  key={editingEntry?.id ?? "new"}
                  placeId={selectedPlace.id}
                  editEntry={editingEntry}
                  trips={trips}
                  onAddToTrip={handleAddEntryToTrip}
                  onDone={async () => {
                    await fetchPlaces();
                    setShowEntryForm(false);
                    setEditingEntry(null);
                  }}
                />
              )}

              {filteredSortedEntries.length === 0 ? (
                <div className="empty-state">
                  <p>{isSearching ? "No entries match your search and filters." : `No entries for ${selectedPlace.city} yet. Add your first memory!`}</p>
                </div>
              ) : (
                <div className="entries-grid">
                  {filteredSortedEntries.map((entry) => {
                    const urls = getImageUrls(entry);
                    return (
                    <article key={entry.id} className="entry-card">
                      {trips.length > 0 && (
                        <div className="add-to-trip-wrap card-corner">
                          <button
                            className="add-to-trip-btn"
                            onClick={() => { setAddToTripEntryId(entry.id); setAddToTripPlaceId(selectedPlace.id); }}
                            aria-label="Add to trip"
                            title="Add to trip"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          </button>
                          {addToTripEntryId === entry.id && (
                            <div className="trip-dropdown" ref={tripDropdownRef}>
                              <div className="trip-dropdown-title">Add to trip</div>
                              {trips.map((trip) => {
                                const already = trip.entryRefs.some((r) => r.entryId === entry.id);
                                return (
                                  <button
                                    key={trip.id}
                                    className={`trip-dropdown-item${already ? " already" : ""}`}
                                    disabled={already}
                                    onClick={() => handleAddEntryToTrip(trip.id, selectedPlace.id, entry.id)}
                                  >
                                    {trip.name}{already ? " ✓" : ""}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      {urls.length > 0 ? (
                        <div className="entry-card-image-wrap">
                          <ImageCarousel urls={urls} alt={entry.title} />
                          <span className={badgeClass(entry.category)}>
                            {entry.category}
                          </span>
                        </div>
                      ) : (
                        <div className="entry-card-no-image">
                          <span className={badgeClass(entry.category)}>
                            {entry.category}
                          </span>
                          <span className="no-image-icon">🗺️</span>
                        </div>
                      )}
                      <div className="entry-body">
                        <div className="entry-title-row">
                          <h2>{entry.title}</h2>
                          <div className="entry-actions">
                            <div className="share-wrap">
                              <button className="share-btn" onClick={() => setShareMenuId(shareMenuId === entry.id ? null : entry.id)} aria-label="Share entry" title="Share">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                              </button>
                              {shareMenuId === entry.id && <ShareMenu text={buildEntryShareText(entry, `${selectedPlace.city}, ${selectedPlace.country}`)} onClose={() => setShareMenuId(null)} />}
                            </div>
                            <button
                              className="edit-btn"
                              onClick={() => {
                                setEditingEntry(entry);
                                setShowEntryForm(true);
                              }}
                              aria-label="Edit entry"
                              title="Edit entry"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => handleDeleteEntry(selectedPlace.id, entry.id)}
                              aria-label="Delete entry"
                              title="Delete entry"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            </button>
                            <button
                              className={`heart-btn${favoriteIds.has(entry.id) ? " active" : ""}`}
                              onClick={() => toggleFavorite(entry.id)}
                              aria-label={favoriteIds.has(entry.id) ? "Remove from favorites" : "Add to favorites"}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={favoriteIds.has(entry.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                            </button>
                          </div>
                        </div>
                        <StarRating rating={entry.rating} />
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="entry-tags">
                            {entry.tags.map((tag) => <span key={tag} className="entry-tag">#{tag}</span>)}
                          </div>
                        )}
                        {entry.address && <p className="entry-address">📍 {entry.address}</p>}
                        {entry.description && (
                          <p className="entry-desc">{entry.description}</p>
                        )}
                        <div className="entry-footer">
                          <span className="entry-date">
                            {new Date(entry.visitDate).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                          <span className="read-entry-link" onClick={() => setViewingEntry({ entry, placeName: `${selectedPlace.city}, ${selectedPlace.country}` })}>Read Entry →</span>
                        </div>
                      </div>
                    </article>
                    );
                  })}
                </div>
              )}
            </>
          ) : isSearching ? (
            <>
              <h1 className="place-heading">Search Results <span className="search-result-count">({allSearchResults.length})</span></h1>
              {allSearchResults.length === 0 ? (
                <div className="empty-state">
                  <p>No entries match your search and filters.</p>
                </div>
              ) : (
                <div className="entries-grid">
                  {allSearchResults.map((entry) => {
                    const urls = getImageUrls(entry);
                    return (
                    <article key={entry.id} className="entry-card">
                      {trips.length > 0 && (
                        <div className="add-to-trip-wrap card-corner">
                          <button
                            className="add-to-trip-btn"
                            onClick={() => { setAddToTripEntryId(entry.id); setAddToTripPlaceId(entry.placeId); }}
                            aria-label="Add to trip"
                            title="Add to trip"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          </button>
                          {addToTripEntryId === entry.id && (
                            <div className="trip-dropdown" ref={tripDropdownRef}>
                              <div className="trip-dropdown-title">Add to trip</div>
                              {trips.map((trip) => {
                                const already = trip.entryRefs.some((r) => r.entryId === entry.id);
                                return (
                                  <button
                                    key={trip.id}
                                    className={`trip-dropdown-item${already ? " already" : ""}`}
                                    disabled={already}
                                    onClick={() => handleAddEntryToTrip(trip.id, entry.placeId, entry.id)}
                                  >
                                    {trip.name}{already ? " ✓" : ""}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      {urls.length > 0 ? (
                        <div className="entry-card-image-wrap">
                          <ImageCarousel urls={urls} alt={entry.title} />
                          <span className={badgeClass(entry.category)}>{entry.category}</span>
                        </div>
                      ) : (
                        <div className="entry-card-no-image">
                          <span className={badgeClass(entry.category)}>{entry.category}</span>
                          <span className="no-image-icon">🗺️</span>
                        </div>
                      )}
                      <div className="entry-body">
                        <div className="entry-title-row">
                          <h2>{entry.title}</h2>
                          <div className="entry-actions">
                            <div className="share-wrap">
                              <button className="share-btn" onClick={() => setShareMenuId(shareMenuId === entry.id ? null : entry.id)} aria-label="Share entry" title="Share">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                              </button>
                              {shareMenuId === entry.id && <ShareMenu text={buildEntryShareText(entry, entry.placeName)} onClose={() => setShareMenuId(null)} />}
                            </div>
                            <button
                              className={`heart-btn${favoriteIds.has(entry.id) ? " active" : ""}`}
                              onClick={() => toggleFavorite(entry.id)}
                              aria-label={favoriteIds.has(entry.id) ? "Remove from favorites" : "Add to favorites"}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={favoriteIds.has(entry.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                            </button>
                          </div>
                        </div>
                        <p className="entry-place-label">{entry.placeName}</p>
                        <StarRating rating={entry.rating} />
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="entry-tags">
                            {entry.tags.map((tag) => <span key={tag} className="entry-tag">#{tag}</span>)}
                          </div>
                        )}
                        {entry.address && <p className="entry-address">📍 {entry.address}</p>}
                        {entry.description && <p className="entry-desc">{entry.description}</p>}
                        <div className="entry-footer">
                          <span className="entry-date">
                            {new Date(entry.visitDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                          </span>
                          <span className="read-entry-link" onClick={() => setViewingEntry({ entry, placeName: entry.placeName })}>Read Entry →</span>
                        </div>
                      </div>
                    </article>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="stats-dashboard">
              <div className="welcome-hero">
                <h2 className="welcome-heading">Welcome to your Travel Diary!</h2>
                <p className="welcome-sub">Select a place from the sidebar, or add a new city to start logging your adventures.</p>
              </div>

              {/* ---- Stat Cards Grid ---- */}
              <div className="stats-grid">
                <div className="stat-card accent-teal">
                  <div className="stat-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <div className="stat-value">{dashboardStats.totalPlaces}</div>
                  <div className="stat-label">Places</div>
                </div>
                <div className="stat-card accent-mauve">
                  <div className="stat-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  </div>
                  <div className="stat-value">{dashboardStats.countries}</div>
                  <div className="stat-label">Countries</div>
                </div>
                <div className="stat-card accent-orange">
                  <div className="stat-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                  </div>
                  <div className="stat-value">{dashboardStats.cities}</div>
                  <div className="stat-label">Cities</div>
                </div>
                <div className="stat-card accent-blue">
                  <div className="stat-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  </div>
                  <div className="stat-value">{dashboardStats.totalEntries}</div>
                  <div className="stat-label">Entries</div>
                </div>
                <div className="stat-card accent-red">
                  <div className="stat-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </div>
                  <div className="stat-value">{dashboardStats.favCount}</div>
                  <div className="stat-label">Favorites</div>
                </div>
                <div className="stat-card accent-green">
                  <div className="stat-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4z"/></svg>
                  </div>
                  <div className="stat-value">{dashboardStats.tripCount}</div>
                  <div className="stat-label">Trips</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ======== Entry Detail Modal ======== */}
      {viewingEntry && (
        <div className="entry-modal-overlay" onClick={() => setViewingEntry(null)}>
          <div className="entry-modal" onClick={(e) => e.stopPropagation()}>
            <button className="entry-modal-close" onClick={() => setViewingEntry(null)} aria-label="Close">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            {(() => { const modalUrls = getImageUrls(viewingEntry.entry); return modalUrls.length > 0 ? (
              <div className="entry-modal-image">
                <ImageCarousel urls={modalUrls} alt={viewingEntry.entry.title} />
              </div>
            ) : null; })()}
            <div className="entry-modal-body">
              <span className={badgeClass(viewingEntry.entry.category)}>{viewingEntry.entry.category}</span>
              <h1>{viewingEntry.entry.title}</h1>
              <p className="entry-modal-place">{viewingEntry.placeName}</p>
              {viewingEntry.entry.address && <p className="entry-modal-address">📍 {viewingEntry.entry.address}</p>}
              {viewingEntry.entry.tags && viewingEntry.entry.tags.length > 0 && (
                <div className="entry-tags">
                  {viewingEntry.entry.tags.map((tag) => <span key={tag} className="entry-tag">#{tag}</span>)}
                </div>
              )}
              <div className="entry-modal-meta">
                <span className="entry-date">
                  {new Date(viewingEntry.entry.visitDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                </span>
                <StarRating rating={viewingEntry.entry.rating} />
              </div>
              {viewingEntry.entry.description && (
                <p className="entry-modal-desc">{viewingEntry.entry.description}</p>
              )}
              <div className="modal-share-row">
                <div className="share-wrap">
                  <button className="share-btn modal-share-btn" onClick={() => setShareMenuId(shareMenuId === `modal-${viewingEntry.entry.id}` ? null : `modal-${viewingEntry.entry.id}`)} aria-label="Share entry" title="Share">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    <span>Share</span>
                  </button>
                  {shareMenuId === `modal-${viewingEntry.entry.id}` && <ShareMenu text={buildEntryShareText(viewingEntry.entry, viewingEntry.placeName)} onClose={() => setShareMenuId(null)} />}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======== Confirm Delete Modal ======== */}
      {confirmDelete && (
        <div className="entry-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-delete-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </div>
            <h2>Delete {confirmDelete.type === "country" ? "Country" : "City"}?</h2>
            <p>
              Are you sure you want to delete <strong>{confirmDelete.label}</strong>?
              {confirmDelete.entryCount > 0 && (
                <> This will permanently remove <strong>{confirmDelete.entryCount}</strong> diary {confirmDelete.entryCount === 1 ? "entry" : "entries"}.</>
              )}
            </p>
            <div className="confirm-delete-actions">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="btn-danger"
                onClick={async () => {
                  await deletePlaces(confirmDelete.placeIds);
                  setConfirmDelete(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
