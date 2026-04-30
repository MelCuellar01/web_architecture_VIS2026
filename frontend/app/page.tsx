"use client";

import React, { useEffect, useState } from "react";
import TravelDiary from "./TravelDiary";
import { authFetch } from "../lib/authFetch";

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState<any[] | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAuthAndLoad = async () => {
      try {
        const authRes = await authFetch("http://localhost:3000/api/auth/me", { cache: "no-store" });

        if (!authRes.ok) {
          return;
        }

        const res = await authFetch("http://localhost:3000/api/places", { cache: "no-store" });

        if (!res.ok) {
          throw new Error("Failed to fetch places");
        }

        const data = await res.json();
        if (!mounted) return;
        setPlaces(data);
        setLoading(false);
      } catch (err) {
        // authFetch already redirects on 401; keep the loading state from hanging on other errors.
      }
    };

    checkAuthAndLoad();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="loading">Checking authentication…</div>;
  return <TravelDiary initialPlaces={places ?? []} />;
}

