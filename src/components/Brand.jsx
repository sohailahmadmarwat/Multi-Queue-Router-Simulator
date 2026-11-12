import { useState } from 'react';

// The official attachment is included unchanged, including its transparent canvas.
export default function Brand({ className = '' }) {
  const [unavailable, setUnavailable] = useState(false);
  return unavailable
    ? <span className={`brand-wordmark ${className}`}><strong>Multi-Queue</strong><span>Router Simulator</span></span>
    : <img className={`brand-image ${className}`} src={`${import.meta.env.BASE_URL}brand/router-logo.png`} width={1672} height={941} alt="Multi-Queue Router Simulator" decoding="async" onError={() => setUnavailable(true)} />;
}
