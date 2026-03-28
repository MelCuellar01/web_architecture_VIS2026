import { useState, useMemo } from 'react';

export default function Sidebar({ places, onSelectPlace, selectedPlaceId, onAddPlace }) {
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!city || !country) return;
    await onAddPlace(city, country);
    setCity('');
    setCountry('');
    setIsAdding(false);
  };

  // Group places by Country for a beautiful sidebar nested display
  const groupedPlaces = useMemo(() => {
    const groups = {};
    places.forEach(place => {
      if (!groups[place.country]) groups[place.country] = [];
      groups[place.country].push(place);
    });
    return groups;
  }, [places]);

  return (
    <aside className="sidebar glass-pane">
      <h2 className="sidebar-title">My Places</h2>
      
      <div className="sidebar-places-list">
        {Object.entries(groupedPlaces).length === 0 ? (
          <p className="sidebar-empty">No places yet.</p>
        ) : (
          Object.entries(groupedPlaces).map(([countryName, countryPlaces]) => (
            <div key={countryName} className="country-group">
              <h3 className="country-header">{countryName}</h3>
              <ul className="city-list">
                {countryPlaces.map(place => (
                  <li 
                    key={place.id} 
                    className={`city-item ${selectedPlaceId === place.id ? 'active' : ''}`}
                    onClick={() => onSelectPlace(place.id)}
                  >
                    <span className="city-name">{place.city}</span>
                    <span className="entry-count">{place.entries.length} entries</span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        {isAdding ? (
          <form className="add-place-form" onSubmit={handleSubmit}>
            <input 
              type="text" 
              placeholder="City" 
              value={city} 
              onChange={e => setCity(e.target.value)} 
              required 
            />
            <input 
              type="text" 
              placeholder="Country" 
              value={country} 
              onChange={e => setCountry(e.target.value)} 
              required 
            />
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={() => setIsAdding(false)}>Cancel</button>
              <button type="submit" className="btn-save">Save</button>
            </div>
          </form>
        ) : (
          <button className="btn-add-place btn-primary" onClick={() => setIsAdding(true)}>
            + Add New Place
          </button>
        )}
      </div>
    </aside>
  );
}
