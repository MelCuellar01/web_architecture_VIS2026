import { useState } from 'react';
import EntryForm from './EntryForm';

export default function EntriesView({ place, onAddEntry }) {
  const [showForm, setShowForm] = useState(false);

  // Sort entries newest first
  const sortedEntries = [...place.entries].sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        stars.push(<span key={i} className={`star ${i <= rating ? 'filled' : ''}`}>★</span>);
    }
    return <div className="rating-stars">{stars}</div>;
  };

  return (
    <div className="entries-view">
      <header className="place-header glass-pane">
        <h1 className="place-header-title">{place.city}, {place.country}</h1>
        <button className="btn-primary btn-add-entry" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel Entry' : '+ Log Memory'}
        </button>
      </header>
      
      {showForm && (
        <EntryForm 
            placeId={place.id} 
            onAddEntry={async (formData) => {
                await onAddEntry(place.id, formData);
                setShowForm(false);
            }} 
        />
      )}

      {sortedEntries.length === 0 ? (
        <div className="empty-state glass-pane mt-2">
          <p>You haven't logged any diary entries for {place.city} yet.</p>
        </div>
      ) : (
        <div className="entries-feed">
          {sortedEntries.map(entry => (
            <article key={entry.id} className="entry-card glass-pane">
              {entry.imageUrl && (
                <div className="entry-image-banner">
                  <img src={entry.imageUrl} alt={entry.title} className="entry-image" />
                </div>
              )}
              <div className="entry-content">
                <div className="entry-header-row">
                    <h2 className="entry-title">{entry.title}</h2>
                    <span className="entry-category badge">{entry.category}</span>
                </div>
                
                <div className="entry-meta">
                  {renderStars(entry.rating)}
                  <span className="entry-date">
                    {new Date(entry.visitDate).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </span>
                </div>
                
                <p className="entry-desc">{entry.description}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
