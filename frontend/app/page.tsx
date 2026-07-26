"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import TravelDiary from "./TravelDiary";
import { authFetch } from "../lib/authFetch";
import { apiUrl } from "../lib/apiConfig";

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState<any[] | null>(null);
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAuthAndLoad = async () => {
      try {
        const authRes = await authFetch(apiUrl("/api/auth/me"), { cache: "no-store", redirectOnUnauthorized: false });

        if (authRes.status === 401) {
          if (!mounted) return;
          setShowLanding(true);
          setLoading(false);
          return;
        }

        if (!authRes.ok) {
          if (!mounted) return;
          setShowLanding(true);
          setLoading(false);
          return;
        }

        const res = await authFetch(apiUrl("/api/places"), { cache: "no-store" });

        if (!res.ok) {
          throw new Error("Failed to fetch places");
        }

        const data = await res.json();
        if (!mounted) return;
        setPlaces(data);
        setShowLanding(false);
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        setShowLanding(true);
        setLoading(false);
      }
    };

    checkAuthAndLoad();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="loading">Checking authentication…</div>;
  if (showLanding) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <h1>Turn every trip into a story.</h1>
          <p>Capture places, memories, ratings, and photos in one private travel journal.</p>
          <div className="auth-actions">
            <Link className="btn-primary" href="/register">Create free account</Link>
          </div>
          <p className="auth-footer">
            Already have an account? <Link href="/login">Log in</Link>
          </p>
          <div className="form-group">
            <h2>Why WanderNotes</h2>
          </div>
          <div className="auth-form">
            <div className="form-group">
              <h3>Interactive travel map</h3>
              <p>See your journeys in a visual map and jump back to every place you visited.</p>
            </div>
            <div className="form-group">
              <h3>Photo memories</h3>
              <p>Attach photos to the moments you want to remember most.</p>
            </div>
            <div className="form-group">
              <h3>Ratings and notes</h3>
              <p>Rate each entry and add quick notes about what made it special.</p>
            </div>
            <div className="form-group">
              <h3>Personal travel entries</h3>
              <p>Keep a private log of the places, stories, and highlights from every trip.</p>
            </div>
          </div>
          <div className="auth-actions">
            <Link className="btn-primary" href="/register">Start your journal</Link>
          </div>
        </div>
      </div>
    );
  }
  return <TravelDiary initialPlaces={places ?? []} />;
}

