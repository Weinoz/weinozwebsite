'use client';

import { useActionState } from 'react';
import { loginAction } from '../actions';

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--purple-ink)',
      }}
    >
      <form
        action={action}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          width: '100%',
          maxWidth: '340px',
          padding: '2rem',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(160,32,240,0.2)',
          borderRadius: '16px',
        }}
      >
        <div>
          <p style={{ fontWeight: 900, fontSize: '1.4rem', color: 'white' }}>Admin</p>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.25rem' }}>
            Accès réservé
          </p>
        </div>

        <input
          type="password"
          name="password"
          placeholder="Mot de passe"
          required
          autoFocus
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.06)',
            color: 'white',
            fontSize: '0.95rem',
            outline: 'none',
          }}
        />

        {state?.error && (
          <p style={{ fontSize: '0.8rem', color: '#fca5a5' }}>{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
            color: 'white',
            fontWeight: 700,
            cursor: pending ? 'not-allowed' : 'pointer',
            opacity: pending ? 0.7 : 1,
            border: 'none',
            fontSize: '0.95rem',
          }}
        >
          {pending ? 'Connexion…' : 'Entrer'}
        </button>
      </form>
    </div>
  );
}
