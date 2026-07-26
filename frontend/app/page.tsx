"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import TravelDiary from "./TravelDiary";
import { authFetch } from "../lib/authFetch";
import { apiUrl } from "../lib/apiConfig";

const landingStyles = {
  shell: {
    minHeight: "100vh",
    padding: "clamp(1.5rem, 4vw, 4rem)",
    background: "#f5f0e8",
    color: "#3d362e",
  },
  card: {
    width: "min(1100px, 100%)",
    margin: "0 auto",
    display: "grid",
    gap: "2.5rem",
  },
  heroGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.1fr) minmax(280px, 0.9fr)",
    gap: "clamp(1.5rem, 4vw, 3.5rem)",
    alignItems: "center",
  },
  heroCopy: {
    display: "grid",
    gap: "1.25rem",
    alignContent: "start",
  },
  headline: {
    margin: 0,
    fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
    lineHeight: 1.05,
    letterSpacing: "-0.035em",
    maxWidth: "11ch",
  },
  paragraph: {
    margin: 0,
    maxWidth: "58ch",
    fontSize: "clamp(1.05rem, 2vw, 1.25rem)",
    lineHeight: 1.65,
  },
  ctaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    alignItems: "center",
  },
  primaryCta: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "3.25rem",
    padding: "0.95rem 1.5rem",
    borderRadius: "999px",
    background: "#61c4b4",
    color: "#ffffff",
    fontWeight: 700,
    textDecoration: "none",
    boxShadow: "0 10px 24px rgba(97, 196, 180, 0.24)",
  },
  secondaryLink: {
    color: "#61c4b4",
    fontWeight: 700,
    textDecoration: "none",
  },
  heroVisual: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  screenshotWrap: {
    position: "relative",
    width: "min(100%, 430px)",
    aspectRatio: "16 / 14",
    borderRadius: "32px",
    overflow: "hidden",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    border: "1px solid rgba(61, 54, 46, 0.08)",
    boxShadow: "0 24px 60px rgba(61, 54, 46, 0.16)",
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1rem",
  },
  featureCard: {
    padding: "1.4rem",
    borderRadius: "20px",
    background: "#ffffff",
    border: "1px solid rgba(61, 54, 46, 0.08)",
    boxShadow: "0 10px 28px rgba(61, 54, 46, 0.08)",
  },
  featureTitle: {
    margin: "0 0 0.55rem",
    fontSize: "1.1rem",
  },
  featureText: {
    margin: 0,
    color: "#7e7060",
    lineHeight: 1.6,
  },
  footerCta: {
    display: "flex",
    justifyContent: "flex-start",
  },
} as const;

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
      <div style={landingStyles.shell}>
        <div style={landingStyles.card}>
          <div style={landingStyles.heroGrid}>
            <div style={landingStyles.heroCopy}>
              <h1 style={landingStyles.headline}>Turn every trip into a story.</h1>
              <p style={landingStyles.paragraph}>Capture places, memories, ratings, and photos in one private travel journal.</p>
              <div style={landingStyles.ctaRow}>
                <Link className="btn-primary" href="/register" style={landingStyles.primaryCta}>Create free account</Link>
              </div>
            </div>

            <div style={landingStyles.heroVisual}>
              <div style={landingStyles.screenshotWrap}>
                <Image
                  src="/images/Screenshot_wandernotes.png"
                  alt="WanderNotes dashboard preview"
                  fill
                  priority
                  unoptimized
                  sizes="(max-width: 900px) 100vw, 430px"
                  style={{ objectFit: "cover", objectPosition: "center top" }}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Why WanderNotes</h2>
            </div>
            <div style={landingStyles.featuresGrid}>
              <div style={landingStyles.featureCard}>
                <h3 style={landingStyles.featureTitle}>Interactive travel map</h3>
                <p style={landingStyles.featureText}>See your journeys in a visual map and jump back to every place you visited.</p>
              </div>
              <div style={landingStyles.featureCard}>
                <h3 style={landingStyles.featureTitle}>Photo memories</h3>
                <p style={landingStyles.featureText}>Attach photos to the moments you want to remember most.</p>
              </div>
              <div style={landingStyles.featureCard}>
                <h3 style={landingStyles.featureTitle}>Ratings and notes</h3>
                <p style={landingStyles.featureText}>Rate each entry and add quick notes about what made it special.</p>
              </div>
              <div style={landingStyles.featureCard}>
                <h3 style={landingStyles.featureTitle}>Personal travel entries</h3>
                <p style={landingStyles.featureText}>Keep a private log of the places, stories, and highlights from every trip.</p>
              </div>
            </div>
          </div>

          <p className="auth-footer" style={{ margin: 0, color: "#7e7060" }}>
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </div>
      </div>
    );
  }

  return <TravelDiary initialPlaces={places ?? []} />;
}