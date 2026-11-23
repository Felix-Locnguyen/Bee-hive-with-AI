import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export function Sheet() {
  const { sheet, closeSheet } = useApp();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeSheet();
    };
    if (sheet.isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sheet.isOpen, closeSheet]);

  return (
    <>
      <div
        className={`scrim ${sheet.isOpen ? 'on' : ''}`}
        id="scrim"
        onClick={closeSheet}
      />
      <div
        className={`sheet ${sheet.isOpen ? 'on' : ''}`}
        id="sheet"
        role="dialog"
        aria-modal="true"
      >
        <div className="grab" />
        {sheet.content}
      </div>
    </>
  );
}
