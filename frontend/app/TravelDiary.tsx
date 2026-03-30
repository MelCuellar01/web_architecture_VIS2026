"use client";

import { useState, useMemo } from "react";

interface Entry {
  id: string;
  title: string;
  description: string;
  category: string;
  rating: number;
  visitDate: string;
  imageUrl: string | null;
  createdAt: string;
}

interface Place {
  id: string;
  city: string;
  country: string;
  entries: Entry[];
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

function EntryForm({
  placeId,
  onDone,
}: {
  placeId: string;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [rating, setRating] = useState("5");
  const [visitDate, setVisitDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    "General",
    "Restaurant",
    "Museum",
    "Park",
    "Landmark",
    "Hotel",
    "Event",
  ];

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
    if (imageFile) formData.append("image", imageFile);

    await fetch(`${API_BASE}/api/places/${encodeURIComponent(placeId)}/entries`, {
      method: "POST",
      body: formData,
    });

    setSubmitting(false);
    onDone();
  };

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <h3>New Entry</h3>
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
        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was it like?"
          rows={3}
        />
      </div>
      <div className="form-group">
        <label>Photo (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? "Saving…" : "Save Entry"}
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
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [showFavorites, setShowFavorites] = useState(false);

  const toggleFavorite = (entryId: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
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

        <div className="sidebar-section-label">Recent Places</div>

        <div className="sidebar-places">
          {Object.keys(groupedPlaces).length === 0 ? (
            <p className="sidebar-empty">No places yet.</p>
          ) : (
            Object.entries(groupedPlaces).map(([countryName, countryPlaces]) => (
              <div key={countryName} className="country-group">
                <h3 className="country-header">{countryName}</h3>
                <ul>
                  {countryPlaces.map((place) => (
                    <li
                      key={place.id}
                      className={`place-item${selectedPlaceId === place.id ? " active" : ""}`}
                      onClick={() => {
                        setSelectedPlaceId(place.id);
                        setShowFavorites(false);
                        setShowEntryForm(false);
                      }}
                    >
                      <span className="place-dot" />
                      <span>{place.city}</span>
                      <span className="entry-count">
                        {place.entries.length}
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
              setShowEntryForm(false);
            }}
          >
            <span className="favorites-icon">♥</span>
            <span>Favorites</span>
            <span className="entry-count">{favoriteIds.size}</span>
          </button>
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
            <input type="text" placeholder="Search entries..." readOnly />
          </div>
          {selectedPlace && (
            <button
              className={`btn-topbar${showEntryForm ? " cancel" : ""}`}
              onClick={() => setShowEntryForm(!showEntryForm)}
            >
              {showEntryForm ? "Cancel" : "Add Entry"}
            </button>
          )}
        </header>

        {/* ---- Main Content ---- */}
        <main className="diary-main">
          {showFavorites ? (
            <>
              <h1 className="place-heading">♥ Favorites</h1>
              {favoriteEntries.length === 0 ? (
                <div className="empty-state">
                  <p>No favorites yet. Click the heart icon on any entry to add it here.</p>
                </div>
              ) : (
                <div className="entries-grid">
                  {favoriteEntries.map((entry) => (
                    <article key={entry.id} className="entry-card">
                      {entry.imageUrl ? (
                        <div className="entry-card-image-wrap">
                          <img src={`${API_BASE}${entry.imageUrl}`} alt={entry.title} />
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
                          <button className="heart-btn active" onClick={() => toggleFavorite(entry.id)} aria-label="Remove from favorites">♥</button>
                        </div>
                        <p className="entry-place-label">{entry.placeName}</p>
                        {entry.description && <p className="entry-desc">{entry.description}</p>}
                        <div className="entry-footer">
                          <span className="entry-date">
                            {new Date(entry.visitDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                          </span>
                          <StarRating rating={entry.rating} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          ) : selectedPlace ? (
            <>
              <h1 className="place-heading">
                {selectedPlace.city}, {selectedPlace.country}
              </h1>

              {showEntryForm && (
                <EntryForm
                  placeId={selectedPlace.id}
                  onDone={async () => {
                    await fetchPlaces();
                    setShowEntryForm(false);
                  }}
                />
              )}

              {sortedEntries.length === 0 ? (
                <div className="empty-state">
                  <p>No entries for {selectedPlace.city} yet. Add your first memory!</p>
                </div>
              ) : (
                <div className="entries-grid">
                  {sortedEntries.map((entry) => (
                    <article key={entry.id} className="entry-card">
                      {entry.imageUrl ? (
                        <div className="entry-card-image-wrap">
                          <img
                            src={`${API_BASE}${entry.imageUrl}`}
                            alt={entry.title}
                          />
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
                          <button
                            className={`heart-btn${favoriteIds.has(entry.id) ? " active" : ""}`}
                            onClick={() => toggleFavorite(entry.id)}
                            aria-label={favoriteIds.has(entry.id) ? "Remove from favorites" : "Add to favorites"}
                          >
                            {favoriteIds.has(entry.id) ? "♥" : "♡"}
                          </button>
                        </div>
                        <StarRating rating={entry.rating} />
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
                          <span className="read-entry-link">Read Entry →</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state welcome">
              <h2>Welcome to your Travel Diary!</h2>
              <p>
                Select a place from the sidebar, or add a new city to start
                logging your adventures.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
