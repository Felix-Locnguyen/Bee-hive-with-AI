import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import { Icon } from '../components/Icons';
import { DATA, MONTHS, todayLabel, HIVES_FALLBACK } from '../services/mockData';
import { api } from '../services/api';

Chart.register(...registerables);

const ST = { ok: 'Khỏe mạnh', warn: 'Cần theo dõi', bad: 'Có vấn đề' };

const r1 = (n) => Math.round(n * 10) / 10;
const sumA = (a) => r1(a.reduce((s, v) => s + (v || 0), 0));
const lastIdx = (a) => {
  let i = a.length - 1;
  while (i >= 0 && a[i] == null) i--;
  return i;
};
const pct = (a, b) => ((a / b - 1) * 100);
const sgn = (n, d = 1) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(d);

export function Home() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState(() => {
    const c = { ok: 0, warn: 0, bad: 0 };
    HIVES_FALLBACK.forEach((h) => {
      const s = h.status === 'watch' ? 'warn' : h.status;
      if (c[s] !== undefined) c[s]++;
    });
    return c;
  });

  const chColRef = useRef(null);
  const chHoneyRef = useRef(null);
  const chRevRef = useRef(null);
  const chStRef = useRef(null);

  useEffect(() => {
    api.getHiveStats()
      .then((data) => {
        if (data && data.total) {
          setCounts({
            ok: data.ok || 0,
            warn: data.watch || 0,
            bad: data.bad || 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  const f = DATA.farm;
  const ci = lastIdx(DATA.colonies);
  const hi = lastIdx(DATA.honey);
  const ri = lastIdx(DATA.revenue);

  const colonies = DATA.colonies[ci];
  const honey = sumA(DATA.honey);
  const rev = sumA(DATA.revenue);
  const avg = honey / colonies;

  const dCol = colonies - DATA.colonies[ci - 1];
  const dHoney = pct(DATA.honey[hi], DATA.honey[hi - 1]);
  const dRev = pct(DATA.revenue[ri], DATA.revenue[ri - 1]);
  const tot = counts.ok + counts.warn + counts.bad;

  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const ink = style.getPropertyValue('--ink').trim() || '#1E231F';
    const brand = style.getPropertyValue('--brand').trim() || '#E58A1F';
    const brown = style.getPropertyValue('--c-brown').trim() || '#8A6A3B';
    const muted = style.getPropertyValue('--muted').trim() || '#626C64';
    const line = style.getPropertyValue('--line').trim() || '#DADFD5';
    const okColor = style.getPropertyValue('--ok').trim() || '#23834F';
    const warnColor = style.getPropertyValue('--warn').trim() || '#E8B900';
    const badColor = style.getPropertyValue('--bad').trim() || '#C93A3A';

    const baseOpts = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: muted, font: { size: 10 }, maxRotation: 0 },
        },
        y: {
          beginAtZero: true,
          grid: { color: line },
          border: { display: false },
          ticks: { color: muted, font: { size: 10 }, maxTicksLimit: 5 },
        },
      },
    };

    let colChart, honeyChart, revChart, stChart;

    if (chColRef.current) {
      colChart = new Chart(chColRef.current, {
        type: 'line',
        data: {
          labels: MONTHS,
          datasets: [
            {
              data: DATA.colonies,
              borderColor: ink,
              backgroundColor: ink,
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 3,
              pointHoverRadius: 5,
              spanGaps: false,
            },
          ],
        },
        options: {
          ...baseOpts,
          scales: {
            ...baseOpts.scales,
            y: { ...baseOpts.scales.y, min: 60 },
          },
        },
      });
    }

    if (chHoneyRef.current) {
      honeyChart = new Chart(chHoneyRef.current, {
        type: 'bar',
        data: {
          labels: MONTHS,
          datasets: [
            {
              data: DATA.honey,
              borderRadius: 4,
              backgroundColor: DATA.honey.map((v, i) =>
                i === hi ? brand : brand + '88'
              ),
            },
          ],
        },
        options: baseOpts,
      });
    }

    if (chRevRef.current) {
      revChart = new Chart(chRevRef.current, {
        type: 'bar',
        data: {
          labels: MONTHS,
          datasets: [
            {
              data: DATA.revenue,
              borderRadius: 4,
              backgroundColor: DATA.revenue.map((v, i) =>
                i === ri ? brown : brown + '88'
              ),
            },
          ],
        },
        options: baseOpts,
      });
    }

    if (chStRef.current) {
      stChart = new Chart(chStRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Khỏe mạnh', 'Cần theo dõi', 'Có vấn đề'],
          datasets: [
            {
              data: [counts.ok, counts.warn, counts.bad],
              backgroundColor: [okColor, warnColor, badColor],
              borderColor: style.getPropertyValue('--card').trim() || '#FFFFFF',
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '66%',
          plugins: { legend: { display: false } },
        },
      });
    }

    return () => {
      colChart?.destroy();
      honeyChart?.destroy();
      revChart?.destroy();
      stChart?.destroy();
    };
  }, [counts, hi, ri]);

  return (
    <>
      <div className="pagehead">
        <h1>Tổng quan trang trại</h1>
        <div className="sub">{todayLabel()}</div>
      </div>

      <section className="env" aria-label="Điều kiện môi trường">
        <div className="env-row">
          <div className="env-i">
            <Icon name="thermo" />
            <span>{f.temp}°C</span>
          </div>
          <div className="env-i">
            <Icon name="drop" />
            <span>{f.hum}%</span>
          </div>
          <div className="env-i">
            <Icon name="sun" />
            <span>{f.weather}</span>
          </div>
        </div>
        <div className="env-loc">
          <Icon name="pin" size={16} />
          <span>{f.location}</span>
        </div>
      </section>

      <section className="kpis" aria-label="Chỉ số tổng quan">
        <div className="kpi">
          <Icon name="hex" size={18} />
          <div className="v">{colonies}</div>
          <div className="l">
            Tổng đàn
            <br />
            đàn
          </div>
        </div>
        <div className="kpi">
          <Icon name="jar" size={18} />
          <div className="v">{Number(honey).toLocaleString('en-US')}</div>
          <div className="l">
            Sản lượng mật
            <br />
            kg
          </div>
        </div>
        <div className="kpi">
          <Icon name="coin" size={18} />
          <div className="v">{rev.toFixed(1)}M</div>
          <div className="l">
            Doanh thu
            <br />
            VNĐ
          </div>
        </div>
        <div className="kpi">
          <Icon name="trend" size={18} />
          <div className="v">{avg.toFixed(1)}</div>
          <div className="l">
            Năng suất TB
            <br />
            kg/đàn
          </div>
        </div>
      </section>

      <section className="card">
        <div className="hd">
          <h2>Số lượng đàn trong năm</h2>
          <span className="hint">
            {MONTHS[ci]}: {colonies} đàn
          </span>
        </div>
        <div className="cb">
          <canvas ref={chColRef} />
        </div>
      </section>

      <section className="card">
        <div className="hd">
          <h2>Sản lượng mật</h2>
          <span className="hint">kg / tháng</span>
        </div>
        <div className="cb">
          <canvas ref={chHoneyRef} />
        </div>
      </section>

      <section className="card">
        <div className="hd">
          <h2>Doanh thu</h2>
          <span className="hint">triệu VNĐ / tháng</span>
        </div>
        <div className="cb">
          <canvas ref={chRevRef} />
        </div>
      </section>

      <section className="card">
        <div className="hd">
          <h2>Trạng thái đàn</h2>
          <button className="linkbtn" onClick={() => navigate('/hives')}>
            Xem thùng
          </button>
        </div>
        <div className="donut">
          <div className="cv">
            <canvas ref={chStRef} />
          </div>
          <ul className="lg">
            {['ok', 'warn', 'bad'].map((k) => (
              <li key={k}>
                <span className="sw" style={{ background: `var(--${k})` }} />
                <span className="t">{ST[k]}</span>
                <span className="n">{counts[k]}</span>
              </li>
            ))}
            <li className="hint">{tot} thùng</li>
          </ul>
        </div>
      </section>

      <section className="card">
        <h2>Tóm tắt nhanh</h2>
        <div className="tiles">
          <div className="tile">
            <div className="v">{sgn(dCol, 0)} đàn</div>
            <div className="l">Đàn tăng so với tháng trước</div>
          </div>
          <div className="tile">
            <div className="v">{sgn(dHoney)}%</div>
            <div className="l">Sản lượng tháng này</div>
          </div>
          <div className="tile">
            <div className="v">{sgn(dRev)}%</div>
            <div className="l">Doanh thu tháng này</div>
          </div>
          <div className="tile">
            <div className="v">{avg.toFixed(1)} kg</div>
            <div className="l">Năng suất TB mỗi đàn</div>
          </div>
        </div>
      </section>
    </>
  );
}
