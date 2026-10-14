import { useState } from 'react';
import './App.css';

export default function App() {
  const [count, setCount] = useState<number>(0);

  return (
    <div className="container">
      <header className="header">
        <h1>Pasanaku Digital</h1>
        <p className="subtitle">
          Plataforma de ahorro grupal rotativo · Frontend React + Vite
        </p>
      </header>

      <main className="content">
        <div className="card">
          <h2>Panel de Control</h2>
          <p>
            Estado: <strong>Borrador inicial</strong>
          </p>
          <button className="primary-btn" onClick={() => setCount((c) => c + 1)}>
            Contador de prueba: {count}
          </button>
          <p className="hint">
            Edita <code>src/App.tsx</code> para comenzar a implementar las vistas del Pasanaku.
          </p>
        </div>
      </main>
    </div>
  );
}
