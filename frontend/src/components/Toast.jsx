import React from 'react';
import { useApp } from '../context/AppContext';

export function Toast() {
  const { toastMsg } = useApp();
  return (
    <div
      className={`toast ${toastMsg ? 'on' : ''}`}
      id="toast"
      role="status"
      aria-live="polite"
    >
      {toastMsg}
    </div>
  );
}
