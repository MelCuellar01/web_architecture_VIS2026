"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch } from '../../lib/authFetch';

export default function LoginPage() {
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
      const res = await authFetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        redirectOnUnauthorized: false,
      });
      if (res.status === 401) {
        setError('E-Mail oder Passwort ungültig.');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError('Login failed');
        setLoading(false);
        return;
      }
      router.push('/');
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Login</h1>
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
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <div className="auth-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Logging in…' : 'Login'}
            </button>
          </div>
        </form>
        <p className="auth-footer">
          Don't have an account? <a href="/register">Register here</a>
        </p>
      </div>
    </div>
  );
}

