import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './Icons';
import { api } from '../services/api';

/**
 * Live MJPEG view mở trong Sheet (Flow B).
 * Mint token 60s → <img src={stream_url}>; unmount sẽ clear src để ngắt stream.
 */
export function LiveCameraSheet({ hiveId, onClose }) {
  const [streamUrl, setStreamUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const imgRef = useRef(null);
  const aliveRef = useRef(true);

  const stopStream = useCallback(() => {
    if (imgRef.current) {
      imgRef.current.src = '';
    }
    setStreamUrl('');
  }, []);

  const startStream = useCallback(async () => {
    setLoading(true);
    setError('');
    stopStream();
    try {
      const data = await api.createStreamToken(hiveId);
      if (!aliveRef.current) return;
      setStreamUrl(data.stream_url);
    } catch (err) {
      if (!aliveRef.current) return;
      const status = err.status;
      if (status === 404) {
        setError('Chưa có camera cho thùng này hoặc file video không tồn tại.');
      } else if (status === 503) {
        setError(err.data?.detail || 'Đã đạt giới hạn xem đồng thời. Hãy đóng một cửa sổ khác.');
      } else if (status === 401 || status === 403) {
        setError('Phiên xem đã hết hạn. Thử lại để lấy phiên mới.');
      } else {
        setError(err.message || 'Không mở được camera trực tiếp.');
      }
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [hiveId, stopStream]);

  useEffect(() => {
    aliveRef.current = true;
    startStream();
    return () => {
      aliveRef.current = false;
      stopStream();
    };
  }, [startStream, stopStream]);

  const handleImgError = () => {
    if (!aliveRef.current) return;
    setLoading(false);
    setError('Mất kết nối luồng video. Đóng và mở lại để thử.');
    stopStream();
  };

  return (
    <div className="live-cam-wrap">
      <div className="hd">
        <h3>Camera trực tiếp</h3>
        <button className="ibtn" onClick={onClose} aria-label="Đóng">
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="hint" style={{ marginTop: 4 }}>
        Thùng {hiveId} · xem live khi bấm “Kiểm tra ong”
      </div>

      {loading && !error && (
        <div className="live-cam-state" role="status">
          Đang mở luồng video…
        </div>
      )}

      {error && (
        <div className="live-cam-state err" role="alert">
          <p>{error}</p>
          <button className="btn sm ghost" onClick={startStream}>
            <Icon name="cam" size={14} />
            Thử lại
          </button>
        </div>
      )}

      {!error && (
        <div className={`live-cam-frame ${loading ? 'is-loading' : ''}`}>
          {streamUrl && (
            <img
              ref={imgRef}
              className="live-cam"
              src={streamUrl}
              alt="Camera trực tiếp"
              onError={handleImgError}
              onLoad={() => setLoading(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
