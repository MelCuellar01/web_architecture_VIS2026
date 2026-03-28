import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import EntriesView from './components/EntriesView'

function App() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);

  const fetchPlaces = async () => {
    try {
      const response = await fetch('/api/places');
      const data = await response.json();
      setPlaces(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (error) {
      console.error("Error fetching places:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaces();
  }, []);

  const handleAddPlace = async (city, country) => {
    try {
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, country })
      });
      if (response.ok) {
        const newPlace = await response.json();
        await fetchPlaces();
        setSelectedPlaceId(newPlace.id);
      }
    } catch (error) {
      console.error("Error creating place:", error);
    }
  };

  const handleAddEntry = async (placeId, formData) => {
    try {
      const response = await fetch(`/api/places/${placeId}/entries`, {
        method: 'POST',
        body: formData // sending multipart/form-data
      });
      if (response.ok) {
        await fetchPlaces();
      }
    } catch (error) {
      console.error("Error creating entry:", error);
    }
  };

  const selectedPlace = places.find(p => p.id === selectedPlaceId);

  return (
    <div className="app-two-columns">
      <Sidebar 
        places={places} 
        onSelectPlace={setSelectedPlaceId} 
        selectedPlaceId={selectedPlaceId} 
        onAddPlace={handleAddPlace} 
      />
      <main className="main-content">
        {loading ? (
          <div className="empty-state glass-pane">Loading your diary...</div>
        ) : selectedPlace ? (
          <EntriesView place={selectedPlace} onAddEntry={handleAddEntry} />
        ) : (
          <div className="empty-state glass-pane start-prompt">
            <h2>Welcome to your Travel Diary!</h2>
            <p>Select a place from the sidebar, or add a new City and Country to start logging your adventures.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
