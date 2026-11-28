import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { Chart, registerables } from 'chart.js';
import { Icon } from '../components/Icons';
import { LiveCameraSheet } from '../components/LiveCameraSheet';
import { useApp } from '../context/AppContext';
import { HIVES_FALLBACK, STAGE, rng } from '../services/mockData';
import { api } from '../services/api';

Chart.register(...registerables);

const ST = { ok: 'Khỏe mạnh', warn: 'Cần theo dõi', bad: 'Có vấn đề' };

const d2 = (n) => String(n).padStart(2, '0');
const ddmm = (ms) => {
  const d = new Date(ms);
  return d2(d.getDate()) + '/' + d2(d.getMonth() + 1);
};
const hhmm = (ms) => {
  const d = new Date(ms);
  return d2(d.getHours()) + ':' + d2(d.getMinutes());
};
const isoDay = (ms) => {
  const d = new Date(ms);
  return d.getFullYear() + '-' + d2(d.getMonth() + 1) + '-' + d2(d.getDate());
};
const r1 = (n) => Math.round(n * 10) / 10;
const ago = (m) =>
  m < 60
    ? m + ' phút'
    : m < 1440
    ? Math.floor(m / 60) + ' giờ'
    : Math.floor(m / 1440) + ' ngày';

function generateSeries(hive, range) {
  const R = rng(hive.n * 97 + (range === '24h' ? 1 : range === '7d' ? 2 : 3));
  const n = range === '24h' ? 24 : range === '7d' ? 28 : 30;
  const step = range === '24h' ? 36e5 : range === '7d' ? 6 * 36e5 : 864e5;
  const now = Date.now(), labels = [], T = [], H = [], m = Math.max(4, Math.round(n * 0.3));

  for (let i = 0; i < n; i++) {
    const d = new Date(now - (n - 1 - i) * step);
    const diur = Math.sin(((d.getHours() - 6) / 24) * 2 * Math.PI) * 0.35;
    labels.push(
      range === '24h'
        ? d2(d.getHours()) + ':00'
        : range === '7d'
        ? d2(d.getDate()) + '/' + d2(d.getMonth() + 1) + ' ' + d2(d.getHours()) + 'h'
        : d2(d.getDate()) + '/' + d2(d.getMonth() + 1)
    );

    let t = (hive.status === 'ok' ? hive.t : 33.7) + diur + (R() - 0.5) * 0.3;
    let hh = (hive.status === 'ok' ? hive.h : 62) - diur * 4 + (R() - 0.5) * 3;

    if (hive.status !== 'ok' && i >= n - m) {
      const w = (i - (n - m) + 1) / m;
      t = t * (1 - w) + hive.t * w;
      hh = hh * (1 - w) + hive.h * w;
    }
    T.push(r1(t));
    H.push(Math.round(hh));
  }
  T[n - 1] = hive.t;
  H[n - 1] = hive.h;
  return { labels, T, H };
}

export function HiveDetail() {
  const { id } = useParams();
  const hiveId = parseInt(id, 10);
  const navigate = useNavigate();
  const { showToast, openSheet, closeSheet } = useApp();

  const [hive, setHive] = useState(() => {
    return HIVES_FALLBACK.find((h) => h.n === hiveId) || HIVES_FALLBACK[0];
  });
  const [range, setRange] = useState('24h');
  const [formType, setFormType] = useState('Kiểm tra');
  const [formStatus, setFormStatus] = useState(hive.status);
  const [formDate, setFormDate] = useState(isoDay(Date.now()));
  const [formYield, setFormYield] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formErr, setFormErr] = useState('');

  const qrCanvasRef = useRef(null);
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // Lấy chi tiết từ Backend nếu có
  useEffect(() => {
    api.getHive(hiveId)
      .then((data) => {
        if (data && data.code) {
          setHive((prev) => ({
            ...prev,
            code: data.code,
            zone: data.zone,
            status: data.status === 'watch' ? 'warn' : data.status,
            issue: data.issue || '',
          }));
        }
      })
      .catch(() => {});
  }, [hiveId]);

  // Vẽ mã QR
  useEffect(() => {
    if (qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        `vietbee://hive/${hive.id}`,
        { width: 116, margin: 1 },
        () => {}
      );
    }
  }, [hive]);

  // Vẽ biểu đồ nhiệt độ & độ ẩm
  useEffect(() => {
    if (!chartRef.current) return;
    const s = generateSeries(hive, range);
    const style = getComputedStyle(document.documentElement);
    const muted = style.getPropertyValue('--muted').trim() || '#626C64';
    const line = style.getPropertyValue('--line').trim() || '#DADFD5';
    const brand = style.getPropertyValue('--brand').trim() || '#E58A1F';
    const blue = style.getPropertyValue('--c-blue').trim() || '#4F7CA3';

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const baseOpts = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          labels: { boxWidth: 10, boxHeight: 10, color: muted, font: { size: 11 } },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: muted, font: { size: 10 }, maxTicksLimit: 6, maxRotation: 0 },
        },
        y: {
          position: 'left',
          suggestedMin: 30,
          suggestedMax: 38,
          grid: { color: line },
          border: { display: false },
          ticks: { color: muted, font: { size: 10 }, maxTicksLimit: 5 },
        },
        y1: {
          position: 'right',
          suggestedMin: 40,
          suggestedMax: 90,
          grid: { drawOnChartArea: false },
          border: { display: false },
          ticks: { color: muted, font: { size: 10 }, maxTicksLimit: 5 },
        },
      },
    };

    chartInstanceRef.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: s.labels,
        datasets: [
          {
            label: 'Nhiệt độ (°C)',
            data: s.T,
            yAxisID: 'y',
            borderColor: brand,
            backgroundColor: brand,
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
          {
            label: 'Độ ẩm (%)',
            data: s.H,
            yAxisID: 'y1',
            borderColor: blue,
            backgroundColor: blue,
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
        ],
      },
      options: baseOpts,
    });

    return () => {
      chartInstanceRef.current?.destroy();
    };
  }, [hive, range]);

  const handleCopyQR = () => {
    const text = `vietbee://hive/${hive.id}`;
    navigator.clipboard?.writeText(text);
    showToast('Đã sao chép mã');
  };

  const handleOpenLiveCam = () => {
    openSheet(
      <LiveCameraSheet hiveId={hiveId} onClose={closeSheet} />,
      { fullScreen: true }
    );
  };

  const handleOpenHistSheet = () => {
    openSheet(
      <div>
        <div className="hd">
          <h3>Lịch sử ghi nhận</h3>
          <button className="ibtn" onClick={closeSheet} aria-label="Đóng">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="hint" style={{ marginTop: 4 }}>
          {hive.id} · Khu {hive.zone} · {hive.hist.length} ghi nhận
        </div>
        <ul className="log" style={{ marginTop: 8 }}>
          {hive.hist.map((e, idx) => (
            <li key={idx}>
              <span className="d">
                {ddmm(e.ts)}
                <br />
                {hhmm(e.ts)}
              </span>
              <span>
                {e.type}
                <span className="s">{e.note}</span>
              </span>
              <span className="m hint">{e.who}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const handleSaveRecord = () => {
    if (!formDate) {
      setFormErr('Chọn ngày ghi nhận.');
      return;
    }
    const note = formNote.trim();
    let text = note || 'Không có ghi chú';
    let addedYield = 0;

    if (formType === 'Thu hoạch') {
      const y = parseFloat(formYield);
      if (!(y > 0)) {
        setFormErr('Nhập sản lượng lớn hơn 0 kg.');
        return;
      }
      text = y + ' kg mật' + (note ? ' · ' + note : '');
      addedYield = y;
    }

    const changed = formStatus !== hive.status;
    const lbl = ST[formStatus] || formStatus;
    if (changed) {
      text += ' · Trạng thái: ' + lbl;
    }

    const when = formDate === isoDay(Date.now()) ? Date.now() : new Date(formDate + 'T08:00:00').getTime();
    const newEntry = { ts: when, type: formType, note: text, who: 'Bạn' };

    setHive((prev) => {
      const updatedHist = [newEntry, ...prev.hist].sort((a, b) => b.ts - a.ts);
      return {
        ...prev,
        yield: r1(prev.yield + addedYield),
        status: formStatus,
        issue: changed
          ? formStatus === 'ok'
            ? ''
            : note || (formStatus === 'bad' ? 'Có vấn đề được ghi nhận' : 'Cần theo dõi thêm')
          : prev.issue,
        mins: changed && formStatus !== 'ok' ? 0 : prev.mins,
        hist: updatedHist,
      };
    });

    setFormErr('');
    setFormNote('');
    setFormYield('');
    showToast(changed ? 'Đã lưu ghi nhận · Trạng thái: ' + lbl : 'Đã lưu ghi nhận');
  };

  const tCls = hive.t >= 35 ? 'bad' : hive.t >= 34.8 ? 'warn' : hive.t < 32 ? 'bad' : '';
  const hCls = hive.h >= 75 ? 'bad' : '';
  const aCls = hive.act < 20 ? 'warn' : '';

  return (
    <>
      <button className="back" onClick={() => navigate('/hives')}>
        <Icon name="left" size={18} />
        Quay lại
      </button>

      <div className="pagehead">
        <h1>{hive.id}</h1>
        <div className="sub">
          Khu {hive.zone} · {hive.breed}
        </div>
      </div>

      <section className="card" style={{ marginTop: 0 }}>
        <div className="hd">
          <h2>Thông tin chung</h2>
          <span className={`st ${hive.status}`}>
            <i />
            {ST[hive.status]}
          </span>
        </div>

        {hive.issue && (
          <div className={`alertbar ${hive.status}`}>
            <span>
              <b>{hive.issue}</b>
            </span>
            <span className="hint">{ago(hive.mins || 0)} trước</span>
          </div>
        )}

        <dl className="dl">
          <div>
            <dt>Mã thùng</dt>
            <dd>{hive.id}</dd>
          </div>
          <div>
            <dt>Khu vực</dt>
            <dd>Khu {hive.zone}</dd>
          </div>
          <div>
            <dt>Giống ong</dt>
            <dd>{hive.breed}</dd>
          </div>
          <div>
            <dt>Tuổi đàn</dt>
            <dd>{hive.age} tháng</dd>
          </div>
          <div>
            <dt>Ngày tạo</dt>
            <dd>
              {ddmm(hive.created)}/{new Date(hive.created).getFullYear()}
            </dd>
          </div>
          <div>
            <dt>Giai đoạn</dt>
            <dd>{STAGE[hive.stage] || 'Đang nuôi'}</dd>
          </div>
          <div>
            <dt>Sản lượng cộng dồn</dt>
            <dd>{hive.yield} kg</dd>
          </div>
        </dl>

        <div className="cur">
          <div>
            <div className="l">
              <Icon name="thermo" size={14} />
              Nhiệt độ
            </div>
            <div className={`v ${tCls}`}>
              {hive.t}
              <small>°C</small>
            </div>
          </div>
          <div>
            <div className="l">
              <Icon name="drop" size={14} />
              Độ ẩm
            </div>
            <div className={`v ${hCls}`}>
              {hive.h}
              <small>%</small>
            </div>
          </div>
          <div>
            <div className="l">
              <Icon name="pulse" size={14} />
              Hoạt động
            </div>
            <div className={`v ${aCls}`}>
              {hive.act}
              <small>/phút</small>
            </div>
          </div>
        </div>
      </section>

      <section className="card camera-ai-card">
        <div className="hd">
          <h2>Camera AI</h2>
        </div>
        <button type="button" className="camera-launch-card" onClick={handleOpenLiveCam}>
          <span className="camera-launch-icon"><Icon name="cam" size={18} /></span>
          <span className="camera-launch-copy">
            <strong>Kiểm tra ong</strong>
            <small>Mở camera trực tiếp toàn màn hình</small>
          </span>
          <Icon name="chev" size={18} />
        </button>
      </section>

      <section className="card">
        <h2>Mã QR định danh</h2>
        <div className="qrbox">
          <div className="qrimg">
            <canvas ref={qrCanvasRef} />
          </div>
          <div className="qrmeta">
            Quét để mở hồ sơ thùng ngay tại trại.
            <code>vietbee://hive/{hive.id}</code>
            <button className="btn ghost sm" onClick={handleCopyQR}>
              <Icon name="copy" size={14} />
              Sao chép mã
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="hd">
          <h2>Nhiệt độ và độ ẩm</h2>
          <div className="seg" role="group" aria-label="Khoảng thời gian">
            {['24h', '7d', '30d'].map((r) => (
              <button
                key={r}
                aria-pressed={range === r}
                onClick={() => setRange(r)}
              >
                {r === '24h' ? '24 giờ' : r === '7d' ? '7 ngày' : '30 ngày'}
              </button>
            ))}
          </div>
        </div>
        <div className="cb">
          <canvas ref={chartRef} />
        </div>
      </section>

      <section className="card">
        <div className="hd">
          <h2>Lịch sử ghi nhận</h2>
          <button
            className="ibtn"
            aria-label="Xem toàn bộ lịch sử ghi nhận"
            onClick={handleOpenHistSheet}
          >
            <Icon name="menu" size={22} />
          </button>
        </div>
        <ul className="log" style={{ marginTop: 6 }}>
          {hive.hist.slice(0, 4).map((e, idx) => (
            <li key={idx}>
              <span className="d">
                {ddmm(e.ts)}
                <br />
                {hhmm(e.ts)}
              </span>
              <span>
                {e.type}
                <span className="s">{e.note}</span>
              </span>
              <span className="m hint">{e.who}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Ghi nhận mới</h2>
        <div className="fld">
          <label htmlFor="rType">Loại ghi nhận</label>
          <select
            id="rType"
            value={formType}
            onChange={(e) => setFormType(e.target.value)}
          >
            <option>Kiểm tra</option>
            <option>Cho ăn</option>
            <option>Thu hoạch</option>
            <option>Xử lý bệnh</option>
            <option>Thay khung cầu</option>
            <option>Khác</option>
          </select>
        </div>

        <div className="fld">
          <label htmlFor="rStatus">Trạng thái thùng</label>
          <select
            id="rStatus"
            value={formStatus}
            onChange={(e) => setFormStatus(e.target.value)}
          >
            <option value="ok">Bình thường</option>
            <option value="warn">Cần theo dõi</option>
            <option value="bad">Có vấn đề</option>
          </select>
        </div>

        <div className="two">
          <div className="fld">
            <label htmlFor="rDate">Ngày</label>
            <input
              id="rDate"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
          </div>
          {formType === 'Thu hoạch' && (
            <div className="fld" id="rYieldWrap">
              <label htmlFor="rYield">Sản lượng (kg)</label>
              <input
                id="rYield"
                type="number"
                step="0.1"
                min="0"
                placeholder="0.0"
                value={formYield}
                onChange={(e) => setFormYield(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="fld">
          <label htmlFor="rNote">Ghi chú</label>
          <textarea
            id="rNote"
            placeholder="Ví dụ: đàn đông, chúa đẻ tốt"
            value={formNote}
            onChange={(e) => setFormNote(e.target.value)}
          />
        </div>

        {formErr && <div className="err">{formErr}</div>}

        <button className="btn" onClick={handleSaveRecord}>
          Lưu ghi nhận
        </button>
      </section>
    </>
  );
}
