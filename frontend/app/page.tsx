import TravelDiary from "./TravelDiary";

export default async function Page() {
  const res = await fetch("http://localhost:3000/api/places", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch places");
  }

  const places = await res.json();

  return <TravelDiary initialPlaces={places} />;
}
