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
  const requestIdRef = useRef(0);

  const stopStream = useCallback(() => {
    requestIdRef.current += 1;
    setLoading(false);
    setError('');
    if (imgRef.current) {
      imgRef.current.src = '';
    }
    setStreamUrl('');
  }, []);

  const startStream = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    setStreamUrl('');
    if (imgRef.current) {
      imgRef.current.src = '';
    }
    try {
      const data = await api.createStreamToken(hiveId);
      if (!aliveRef.current || requestId !== requestIdRef.current) return;
      setStreamUrl(data.stream_url);
    } catch (err) {
      if (!aliveRef.current || requestId !== requestIdRef.current) return;
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
      requestIdRef.current += 1;
      if (imgRef.current) {
        imgRef.current.src = '';
      }
    };
  }, [startStream]);

  const handleImgError = () => {
    if (!aliveRef.current) return;
    setLoading(false);
    setError('Mất kết nối luồng video. Đóng và mở lại để thử.');
    stopStream();
  };

  return (
    <div className="live-cam-fullscreen">
      <header className="live-cam-fullscreen-head">
        <div className="live-cam-title">
          <strong>Camera trực tiếp</strong>
          <span>Thùng {hiveId} · YOLO nhận diện trực tiếp</span>
        </div>
        <div className="live-cam-controls">
          {streamUrl ? (
            <button className="btn sm ghost live-cam-toggle" onClick={stopStream}>
              Tắt camera
            </button>
          ) : (
            <button
              className="btn sm ghost live-cam-toggle"
              onClick={startStream}
              disabled={loading}
            >
              {loading ? 'Đang mở…' : 'Bật camera'}
            </button>
          )}
          <button className="ibtn" onClick={onClose} aria-label="Đóng">
            <Icon name="close" size={20} />
          </button>
        </div>
      </header>

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
        <div className={`live-cam-frame fullscreen ${loading ? 'is-loading' : ''}`}>
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
