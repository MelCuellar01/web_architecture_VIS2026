import { useState, useEffect } from 'react'
import PlaceForm from './components/PlaceForm'
import PlaceList from './components/PlaceList'

function App() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = 
useState(true);

  const fetchPlaces = async () => {
    try {
      const response = await fetch('/api/places');
      const data = await response.json();
      // Sort newest first
      setPlaces(data.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate)));
    } catch (error) {
      console.error("Error fetching places:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaces();
  }, []);

  const handleAddPlace = async (newPlace) => {
    try {
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlace)
      });
      if (response.ok) {
        fetchPlaces(); // Refresh the list
      }
    } catch (error) {
      console.error("Error saving place:", error);
    }
  };

  return (
    <div className="app-container">
      <h1 className="app-title">My Travel Diary</h1>
      <PlaceForm onAddPlace={handleAddPlace} />
      {loading ? (
        <div className="empty-state glass-pane">Loading your adventures...</div>
      ) : (
        <PlaceList places={places} />
      )}
    </div>
  )
}

export default App
