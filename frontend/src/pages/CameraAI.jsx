import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Icon } from '../components/Icons';
import { BboxOverlay } from '../components/BboxOverlay';
import { useApp } from '../context/AppContext';
import { DET } from '../services/mockData';

export function CameraAI() {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [scannerActive, setScannerActive] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState(121); // 121 (ong bắp cày), 49 (sâu ngài sáp), 88 (kiến)
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!scannerActive) return;

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 220, height: 220 } },
      false
    );
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        showToast(`Đã nhận diện QR: ${decodedText}`);
        scanner.clear();
        setScannerActive(false);

        // Trích xuất mã hive ví dụ vietbee://hive/VB-023 hoặc V23
        const match = decodedText.match(/(?:VB-|V)?(\d+)/i);
        if (match && match[1]) {
          navigate(`/hives/${parseInt(match[1], 10)}`);
        }
      },
      () => {}
    );

    return () => {
      try {
        scanner.clear();
      } catch {}
    };
  }, [scannerActive, navigate, showToast]);

  return (
    <>
      <div className="pagehead">
        <h1>Camera &amp; Giám sát AI</h1>
        <div className="sub">Nhận diện thiên địch và quét mã QR thùng ong</div>
      </div>

      <section className="card">
        <div className="hd">
          <h2>Quét mã QR Thùng</h2>
          <button
            className={`btn sm ${scannerActive ? 'ghost' : ''}`}
            onClick={() => setScannerActive(!scannerActive)}
          >
            {scannerActive ? 'Đóng Camera' : 'Mở Camera Quét'}
          </button>
        </div>

        {scannerActive ? (
          <div style={{ marginTop: 12 }}>
            <div id="qr-reader" style={{ width: '100%', borderRadius: 12 }} />
          </div>
        ) : (
          <div className="hint" style={{ marginTop: 8 }}>
            Nhấn mở camera để quét nhãn QR dán trên thùng ong, tự động mở hồ sơ thùng tại chỗ.
          </div>
        )}
      </section>

      <section className="card">
        <div className="hd">
          <h2>Thị giác máy tính AI (YOLO)</h2>
          <span className="st bad">
            <i /> Đang giám sát
          </span>
        </div>
        <div className="hint" style={{ marginTop: 6 }}>
          Mô hình AI phát hiện thiên địch (ong bắp cày, sâu ngài sáp, kiến) từ camera lối vào tổ.
        </div>

        <div className="seg full" style={{ marginTop: 12 }}>
          <button
            aria-pressed={selectedDemo === 121}
            onClick={() => setSelectedDemo(121)}
          >
            Ong bắp cày
          </button>
          <button
            aria-pressed={selectedDemo === 49}
            onClick={() => setSelectedDemo(49)}
          >
            Sâu ngài sáp
          </button>
          <button
            aria-pressed={selectedDemo === 88}
            onClick={() => setSelectedDemo(88)}
          >
            Đàn kiến
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <BboxOverlay
            detection={DET[selectedDemo]}
            hiveCode={`VB-${String(selectedDemo).padStart(3, '0')}`}
            minsAgo={12}
          />
        </div>

        <button
          className="btn ghost"
          style={{ marginTop: 12 }}
          onClick={() => navigate(`/hives/${selectedDemo}`)}
        >
          Xem chi tiết thùng VB-{String(selectedDemo).padStart(3, '0')}
        </button>
      </section>
    </>
  );
}
