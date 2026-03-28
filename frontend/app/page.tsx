interface Place {
  _id?: string;
  id?: string;
  name: string;
  city: string;
  country: string;
}

export default async function Page() {
  const res = await fetch('http://localhost:3000/api/places', {
    cache: 'no-store' // Ensures fresh data is fetched on every request
  });

  if (!res.ok) {
    throw new Error('Failed to fetch places');
  }

  const places: Place[] = await res.json();

  return (
    <main>
      <h1>Places List</h1>
      <ul>
        {places.map((place, index) => (
          <li key={place._id || place.id || index}>
            <strong>{place.name}</strong> - {place.city}, {place.country}
          </li>
        ))}
      </ul>
    </main>
  );
}
