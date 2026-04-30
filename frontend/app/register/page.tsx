"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch } from '../../lib/authFetch';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authFetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        redirectOnUnauthorized: false,
      });
      if (res.status === 409) {
        setError('Email already in use');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        // Try to show server-provided error message if present
        let body = null;
        try {
          body = await res.json();
        } catch (e) {
          /* ignore */
        }
        const serverMsg = body?.error || body?.message || null;
        if (res.status === 400) {
          setError(serverMsg || 'Missing email or password');
        } else if (res.status === 409) {
          setError(serverMsg || 'Email already in use');
        } else {
          setError(serverMsg || `Registration failed (${res.status})`);
        }
        setLoading(false);
        return;
      }
      // Redirect to login after successful registration
      router.push('/login');
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Register</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              id="email"
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="your@email.com"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="Choose a strong password"
              disabled={loading}
            />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <div className="auth-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating account…' : 'Register'}
            </button>
          </div>
        </form>
        <p className="auth-footer">
          Already have an account? <a href="/login">Login here</a>
        </p>
      </div>
    </div>
  );
}

