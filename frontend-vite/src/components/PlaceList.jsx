export default function PlaceList({ places }) {
  if (places.length === 0) {
    return (
      <div className="empty-state glass-pane">
        No places visited yet. Add your first adventure above!
      </div>
    );
  }

  return (
    <div className="places-feed">
      {places.map((place) => (
        <div key={place.id} className="glass-pane place-item glass-card">
          <div className="place-image-wrapper">
            {place.imageUrl ? (
              <img src={place.imageUrl} alt={place.name} className="place-image" />
            ) : (
              <div className="place-image-placeholder">
                <span>🏙️ No Photo Available</span>
              </div>
            )}
          </div>
          <div className="place-content">
            <h3 className="place-title">{place.name}</h3>
            <div className="place-location">📍 {place.location}</div>
            <p className="place-desc">{place.description}</p>
            <div className="place-date">
              Visited on {new Date(place.visitDate).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
