'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('סיסמה או מייל שגויים, נסי שוב');
      setLoading(false);
    } else {
      window.location.href = '/';
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>📋 ניהול פרויקטים</h1>
        <p>הכניסי מייל וסיסמה להמשך</p>
        <input
          type="email"
          placeholder="מייל"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ letterSpacing: 'normal', textAlign: 'right' }}
          dir="ltr"
        />
        <input
          type="password"
          placeholder="סיסמה"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
        <button onClick={handleLogin} disabled={loading}>
          {loading ? 'מתחברת...' : 'כניסה'}
        </button>
        {error && <div className="login-error">{error}</div>}
      </div>
    </div>
  );
}
