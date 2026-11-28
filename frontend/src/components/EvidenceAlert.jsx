import React, { useEffect, useState } from 'react';
import { Icon } from './Icons';
import { useApp } from '../context/AppContext';

function alertLocation(alert, hivesById) {
  const hive = hivesById[alert.hive_id];
  const zone = hive?.zone || '—';
  const hiveNumber = hive?.code || alert.hive_id;
  const createdAt = new Date(alert.created_at);
  const time = Number.isNaN(createdAt.getTime())
    ? 'Không rõ thời gian'
    : createdAt.toLocaleString('vi-VN');
  return `${time} · Khu ${zone} · Thùng ${hiveNumber}`;
}

function EvidenceImageViewer({ alerts: initialAlerts, initialId, hivesById, onDelete }) {
  const { closeSheet } = useApp();
  const [alerts, setAlerts] = useState(initialAlerts);
  const initialIndex = Math.max(0, alerts.findIndex((alert) => alert.id === initialId));
  const [index, setIndex] = useState(initialIndex);
  const [deleting, setDeleting] = useState(false);
  const current = alerts[index];

  const move = (offset) => {
    setIndex((currentIndex) => (currentIndex + offset + alerts.length) % alerts.length);
  };

  const deleteCurrent = async () => {
    if (!current || deleting) return;
    if (!window.confirm('Xóa ảnh phát hiện này? Thao tác này không thể hoàn tác.')) return;

    setDeleting(true);
    try {
      const deleted = await onDelete(current);
      if (!deleted) return;
      const remaining = alerts.filter((alert) => alert.id !== current.id);
      if (!remaining.length) {
        closeSheet();
        return;
      }
      setAlerts(remaining);
      setIndex(Math.min(index, remaining.length - 1));
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        move(-1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        move(1);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [alerts.length]);

  if (!current) return null;

  return (
    <div className="evidence-fullscreen">
      <header className="evidence-fullscreen-head">
        <button
          type="button"
          className="fullscreen-control fullscreen-delete"
          onClick={deleteCurrent}
          disabled={deleting}
          aria-label="Xóa ảnh phát hiện"
          title="Xóa ảnh"
        >
          <Icon name="trash" size={20} />
        </button>
        <div className="evidence-fullscreen-title">
          <strong>{current.alert_type}</strong>
          <span>{alertLocation(current, hivesById)}</span>
          {alerts.length > 1 && <span>{index + 1} / {alerts.length}</span>}
        </div>
        <button
          type="button"
          className="fullscreen-control"
          onClick={closeSheet}
          aria-label="Đóng ảnh toàn màn hình"
        >
          <Icon name="close" size={22} />
        </button>
      </header>

      <div className="evidence-fullscreen-stage">
        <img src={current.image_url} alt={`Phát hiện ${current.alert_type}`} />
        {alerts.length > 1 && (
          <>
            <button type="button" className="evidence-fullscreen-nav prev" onClick={() => move(-1)} aria-label="Ảnh trước">
              <Icon name="left" size={24} />
            </button>
            <button type="button" className="evidence-fullscreen-nav next" onClick={() => move(1)} aria-label="Ảnh tiếp theo">
              <Icon name="chev" size={24} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function EvidenceAlert({ alerts = [], hivesById = {}, loading, error, onDelete }) {
  const { openSheet } = useApp();
  const [selectedId, setSelectedId] = useState(alerts[0]?.id ?? null);
  const selectedIndex = alerts.findIndex((alert) => alert.id === selectedId);
  const index = selectedIndex >= 0 ? selectedIndex : 0;
  const current = alerts[index];

  useEffect(() => {
    if (!alerts.some((alert) => alert.id === selectedId)) {
      setSelectedId(alerts[0]?.id ?? null);
    }
  }, [alerts, selectedId]);

  if (loading && !current) {
    return <div className="evidence-empty hint" role="status">Đang tải ảnh phát hiện…</div>;
  }

  if (error && !current) {
    return <div className="evidence-empty hint" role="alert">{error}</div>;
  }

  if (!current) {
    return <div className="evidence-empty hint">Chưa ghi nhận phát hiện ong bắp cày.</div>;
  }

  const move = (offset) => {
    if (alerts.length < 2) return;
    setSelectedId(alerts[(index + offset + alerts.length) % alerts.length].id);
  };

  const openImage = () => {
    openSheet(
      <EvidenceImageViewer
        alerts={alerts}
        initialId={current.id}
        hivesById={hivesById}
        onDelete={onDelete}
      />,
      { fullScreen: true }
    );
  };

  return (
    <div className="evidence-gallery global-evidence-gallery">
      <div className="evidence-gallery-row">
        {alerts.length > 1 && (
          <button type="button" className="evidence-nav" onClick={() => move(-1)} aria-label="Ảnh phát hiện trước">
            <Icon name="left" size={20} />
          </button>
        )}
        <button
          type="button"
          className="evidence-thumb"
          onClick={openImage}
          aria-label={`Mở ảnh phát hiện ${current.alert_type} toàn màn hình`}
        >
          <img src={current.image_url} alt={`Phát hiện ${current.alert_type}`} />
        </button>
        {alerts.length > 1 && (
          <button type="button" className="evidence-nav" onClick={() => move(1)} aria-label="Ảnh phát hiện tiếp theo">
            <Icon name="chev" size={20} />
          </button>
        )}
      </div>
      <div className="evidence-meta">
        <div className="evidence-caption">{alertLocation(current, hivesById)}</div>
        {alerts.length > 1 && <div className="evidence-counter">{index + 1} / {alerts.length}</div>}
      </div>
    </div>
  );
}
