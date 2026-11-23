import React, { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { Icon } from '../components/Icons';
import { useApp } from '../context/AppContext';
import {
  DATA,
  MONTHS,
  INCOME_CATS,
  EXPENSE_CATS,
  CATCOL,
} from '../services/mockData';

Chart.register(...registerables);

const d2 = (n) => String(n).padStart(2, '0');
const ddmm = (ms) => {
  const d = new Date(ms);
  return d2(d.getDate()) + '/' + d2(d.getMonth() + 1);
};
const day = (s) => new Date(s + 'T08:00:00').getTime();
const isoDay = (ms) => {
  const d = new Date(ms);
  return d.getFullYear() + '-' + d2(d.getMonth() + 1) + '-' + d2(d.getDate());
};
const r1 = (n) => Math.round(n * 10) / 10;
const sumA = (a) => r1(a.reduce((s, v) => s + (v || 0), 0));

export function Finance() {
  const { txns, setTxns, showToast, openSheet, closeSheet } = useApp();

  const [finType, setFinType] = useState('in'); // 'in' | 'out'
  const [fDate, setFDate] = useState(isoDay(Date.now()));
  const [fAmt, setFAmt] = useState('');
  const [fCat, setFCat] = useState(INCOME_CATS[0]);
  const [fDesc, setFDesc] = useState('');
  const [fErr, setFErr] = useState('');

  const chFinRef = useRef(null);
  const chExpRef = useRef(null);

  const rev = sumA(DATA.revenue);
  const exp = sumA(DATA.expense);
  const profit = r1(rev - exp);
  const ec = DATA.expCat;
  const etot = sumA(Object.values(ec));

  // Chart setup
  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const ink = style.getPropertyValue('--ink').trim() || '#1E231F';
    const ok = style.getPropertyValue('--ok').trim() || '#23834F';
    const bad = style.getPropertyValue('--bad').trim() || '#C93A3A';
    const muted = style.getPropertyValue('--muted').trim() || '#626C64';
    const line = style.getPropertyValue('--line').trim() || '#DADFD5';

    const prof = DATA.revenue.map((v, i) =>
      v == null ? null : r1(v - (DATA.expense[i] || 0))
    );

    let finChart, expChart;

    if (chFinRef.current) {
      finChart = new Chart(chFinRef.current, {
        type: 'bar',
        data: {
          labels: MONTHS,
          datasets: [
            {
              type: 'line',
              label: 'Lợi nhuận',
              data: prof,
              borderColor: ink,
              backgroundColor: ink,
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 2.5,
              order: 0,
            },
            {
              label: 'Thu',
              data: DATA.revenue,
              backgroundColor: ok,
              borderRadius: 3,
              order: 1,
            },
            {
              label: 'Chi',
              data: DATA.expense,
              backgroundColor: bad,
              borderRadius: 3,
              order: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
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
              ticks: { color: muted, font: { size: 10 } },
            },
            y: {
              beginAtZero: true,
              grid: { color: line },
              border: { display: false },
              ticks: { color: muted, font: { size: 10 }, maxTicksLimit: 5 },
            },
          },
        },
      });
    }

    if (chExpRef.current) {
      const expKeys = Object.keys(ec);
      const expVals = expKeys.map((k) => ec[k]);
      const expColors = expKeys.map((k) =>
        style.getPropertyValue(CATCOL[k] || '--r1').trim()
      );

      expChart = new Chart(chExpRef.current, {
        type: 'doughnut',
        data: {
          labels: expKeys,
          datasets: [
            {
              data: expVals,
              backgroundColor: expColors,
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
      finChart?.destroy();
      expChart?.destroy();
    };
  }, [ec]);

  const handleOpenTxnSheet = () => {
    const all = txns.slice().sort((a, b) => day(b.date) - day(a.date));
    openSheet(
      <div>
        <div className="hd">
          <h3>Lịch sử giao dịch</h3>
          <button className="ibtn" onClick={closeSheet} aria-label="Đóng">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="hint" style={{ marginTop: 4 }}>
          {txns.length} giao dịch · đơn vị triệu VNĐ
        </div>
        <ul className="log" style={{ marginTop: 8 }}>
          {all.map((t, idx) => (
            <li key={idx}>
              <span className="d">{ddmm(day(t.date))}</span>
              <span>
                {t.desc}
                <span className="s">{t.cat}</span>
              </span>
              <span className={`a ${t.type}`}>
                {t.type === 'in' ? '+' : '−'}
                {t.amt.toFixed(1)}M
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const handleSaveTxn = () => {
    const amt = parseFloat(fAmt);
    if (!fDate) {
      setFErr('Chọn ngày giao dịch.');
      return;
    }
    if (!(amt > 0)) {
      setFErr('Nhập số tiền lớn hơn 0.');
      return;
    }

    const m = new Date(fDate + 'T08:00:00').getMonth();
    const arr = finType === 'in' ? DATA.revenue : DATA.expense;
    arr[m] = r1((arr[m] || 0) + amt);
    if (finType === 'out') DATA.expCat[fCat] = r1((DATA.expCat[fCat] || 0) + amt);
    if (finType === 'in' && DATA.expense[m] == null) DATA.expense[m] = 0;
    if (finType === 'out' && DATA.revenue[m] == null) DATA.revenue[m] = 0;

    const newTxn = {
      date: fDate,
      type: finType,
      cat: fCat,
      desc: fDesc.trim() || fCat,
      amt: amt,
    };

    setTxns([newTxn, ...txns]);
    setFErr('');
    setFAmt('');
    setFDesc('');
    showToast(finType === 'in' ? 'Đã lưu khoản thu' : 'Đã lưu khoản chi');
  };

  const cats = finType === 'in' ? INCOME_CATS : EXPENSE_CATS;
  const sortedTxns = txns.slice().sort((a, b) => day(b.date) - day(a.date));

  return (
    <>
      <div className="pagehead">
        <h1>Quản lý tài chính</h1>
        <div className="sub">Năm {new Date().getFullYear()} · đơn vị triệu VNĐ</div>
      </div>

      <section className="kpis c3" aria-label="Tổng quan tài chính">
        <div className="kpi">
          <Icon name="coin" size={18} />
          <div className="v in">{rev.toFixed(1)}M</div>
          <div className="l">Doanh thu</div>
        </div>
        <div className="kpi">
          <Icon name="wallet" size={18} />
          <div className="v out">{exp.toFixed(1)}M</div>
          <div className="l">Chi phí</div>
        </div>
        <div className="kpi">
          <Icon name="trend" size={18} />
          <div className="v">{profit.toFixed(1)}M</div>
          <div className="l">
            Lợi nhuận
            {rev > 0 && (
              <>
                <br />
                biên {((profit / rev) * 100).toFixed(1)}%
              </>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="hd">
          <h2>Thu – Chi – Lợi nhuận</h2>
          <span className="hint">theo tháng</span>
        </div>
        <div className="cb" style={{ height: 220 }}>
          <canvas ref={chFinRef} />
        </div>
      </section>

      <section className="card" id="finForm">
        <h2>Ghi nhận giao dịch</h2>
        <div
          className="seg full"
          role="group"
          aria-label="Loại giao dịch"
          style={{ marginTop: 10 }}
        >
          <button
            data-act="fin-type"
            data-v="in"
            aria-pressed={finType === 'in'}
            onClick={() => {
              setFinType('in');
              setFCat(INCOME_CATS[0]);
            }}
          >
            + Khoản thu
          </button>
          <button
            data-act="fin-type"
            data-v="out"
            aria-pressed={finType === 'out'}
            onClick={() => {
              setFinType('out');
              setFCat(EXPENSE_CATS[0]);
            }}
          >
            − Khoản chi
          </button>
        </div>

        <div className="two" style={{ marginTop: 10 }}>
          <div className="fld">
            <label htmlFor="fDate">Ngày</label>
            <input
              id="fDate"
              type="date"
              value={fDate}
              onChange={(e) => setFDate(e.target.value)}
            />
          </div>
          <div className="fld">
            <label htmlFor="fAmt">Số tiền (triệu VNĐ)</label>
            <input
              id="fAmt"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              placeholder="0.0"
              value={fAmt}
              onChange={(e) => setFAmt(e.target.value)}
            />
          </div>
        </div>

        <div className="fld">
          <label htmlFor="fCat">Danh mục</label>
          <select
            id="fCat"
            value={fCat}
            onChange={(e) => setFCat(e.target.value)}
          >
            {cats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="fld">
          <label htmlFor="fDesc">Mô tả</label>
          <input
            id="fDesc"
            type="text"
            maxLength={60}
            placeholder={
              finType === 'in'
                ? 'Ví dụ: Bán mật ong cho đại lý'
                : 'Ví dụ: Mua đường nuôi ong'
            }
            value={fDesc}
            onChange={(e) => setFDesc(e.target.value)}
          />
        </div>

        {fErr && (
          <div className="err" role="alert">
            {fErr}
          </div>
        )}

        <button className="btn" data-act="fin-save" onClick={handleSaveTxn}>
          {finType === 'in' ? 'Lưu khoản thu' : 'Lưu khoản chi'}
        </button>
      </section>

      <section className="card">
        <h2>Phân bổ chi phí</h2>
        <div className="donut">
          <div className="cv">
            <canvas ref={chExpRef} />
          </div>
          <ul className="lg">
            {Object.keys(ec).map((k) => (
              <li key={k}>
                <span
                  className="sw"
                  style={{ background: `var(${CATCOL[k] || '--r1'})` }}
                />
                <span className="t">{k}</span>
                <span className="n">{etot ? Math.round((ec[k] / etot) * 100) : 0}%</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card">
        <div className="hd">
          <h2>Lịch sử giao dịch</h2>
          <button
            className="ibtn"
            data-act="txn-open"
            aria-label="Xem toàn bộ lịch sử giao dịch"
            onClick={handleOpenTxnSheet}
          >
            <Icon name="menu" size={22} />
          </button>
        </div>
        <ul className="log" id="txns" style={{ marginTop: 6 }}>
          {sortedTxns.slice(0, 4).map((t, idx) => (
            <li key={idx}>
              <span className="d">{ddmm(day(t.date))}</span>
              <span>
                {t.desc}
                <span className="s">{t.cat}</span>
              </span>
              <span className={`a ${t.type}`}>
                {t.type === 'in' ? '+' : '−'}
                {t.amt.toFixed(1)}M
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
