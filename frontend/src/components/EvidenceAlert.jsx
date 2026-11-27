import React from 'react';
import { Icon } from './Icons';

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/**
 * Khối “bằng chứng” camera AI mới nhất: thumbnail, conf, giờ, ack, enlarge.
 */
export function EvidenceAlert({ alert, loading, onAck, onEnlarge }) {
  if (loading && !alert) {
    return (
      <div className="evidence-empty hint" role="status">
        Đang tải bằng chứng camera…
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="evidence-empty hint">
        Chưa có cảnh báo camera AI cho thùng này.
      </div>
    );
  }

  const confPct = Math.round((alert.confidence || 0) * 100);

  return (
    <div className="evidence">
      <button
        type="button"
        className="evidence-thumb"
        onClick={() => onEnlarge?.(alert)}
        aria-label="Phóng to ảnh bằng chứng"
      >
        <img src={alert.image_url} alt={`Cảnh báo ${alert.alert_type}`} />
      </button>

      <div className="evidence-meta">
        <div className="evidence-title">
          <span className="st bad">
            <i />
            {alert.alert_type}
          </span>
          {alert.is_acknowledged && (
            <span className="st ok">
              <i />
              Đã xử lý
            </span>
          )}
        </div>
        <div className="hint">
          Độ tin cậy {confPct}% · {fmtTime(alert.created_at)}
        </div>
        <div className="evidence-actions">
          {!alert.is_acknowledged && (
            <button
              type="button"
              className="btn sm ghost"
              onClick={() => onAck?.(alert)}
            >
              <Icon name="shield" size={14} />
              Đã xử lý
            </button>
          )}
          <button
            type="button"
            className="btn sm ghost"
            onClick={() => onEnlarge?.(alert)}
          >
            Phóng to
          </button>
        </div>
      </div>
    </div>
  );
}
