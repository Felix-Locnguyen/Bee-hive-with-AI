import React, { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { Icon } from '../components/Icons';
import { useApp } from '../context/AppContext';
import {
  CATS,
  CATVIS,
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
const n0 = (n) => Number(n).toLocaleString('en-US');
const catVis = (c) => CATVIS[c] || { label: c };
const stockSt = (i) => (i.qty <= 0 ? 'bad' : i.qty <= i.min ? 'warn' : 'ok');
const STOCK_LABEL = { ok: 'Đủ hàng', warn: 'Sắp hết', bad: 'Hết hàng' };
const INV_PAGE = 4;

export function Inventory() {
  const {
    items,
    setItems,
    invLogs,
    setInvLogs,
    showToast,
    openSheet,
    closeSheet,
  } = useApp();

  const [invState, setInvState] = useState({
    q: '',
    cat: 'all',
    st: 'all',
    sk: 'code',
    dir: 1,
    page: 1,
    tab: 'in', // 'in' | 'out'
    hf: 'all', // history filter: 'all' | 'in' | 'out'
    pre: '',
    fcat: 'all',
    newItem: false,
  });

  // Form states
  const [formDate, setFormDate] = useState(isoDay(Date.now()));
  const [formQty, setFormQty] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formSup, setFormSup] = useState('');
  const [formWhy, setFormWhy] = useState('Sử dụng tại trại');
  const [formWho, setFormWho] = useState('');
  const [formErr, setFormErr] = useState('');

  // New item fields
  const [newCustName, setNewCustName] = useState('');
  const [newCustUnit, setNewCustUnit] = useState('');
  const [newCustMin, setNewCustMin] = useState(0);
  const [newCustCat, setNewCustCat] = useState(CATS[0]);

  const chCatRef = useRef(null);
  const invFormRef = useRef(null);

  const byCode = (c) => items.find((i) => i.code === c);

  const nextCode = () => {
    let mx = 0;
    items.forEach((i) => {
      const m = /^VT(\d+)$/.exec(i.code);
      if (m) mx = Math.max(mx, +m[1]);
    });
    return 'VT' + String(mx + 1).padStart(3, '0');
  };

  // Lọc danh sách hàng hóa
  const invFiltered = () => {
    const f = invState;
    const q = f.q.trim().toLowerCase();
    const o = { bad: 0, warn: 1, ok: 2 };
    const a = items.filter(
      (i) =>
        (f.cat === 'all' || i.cat === f.cat) &&
        (f.st === 'all' || stockSt(i) === f.st) &&
        (!q || (i.name + ' ' + i.code).toLowerCase().includes(q))
    );
    a.sort((x, y) => {
      let r =
        f.sk === 'name'
          ? x.name.localeCompare(y.name, 'vi')
          : f.sk === 'qty'
          ? x.qty - y.qty
          : f.sk === 'st'
          ? o[stockSt(x)] - o[stockSt(y)]
          : x.code.localeCompare(y.code);
      return r * f.dir || x.code.localeCompare(y.code);
    });
    return a;
  };

  const filtered = invFiltered();
  const pages = Math.max(1, Math.ceil(filtered.length / INV_PAGE));
  const currentPage = Math.min(Math.max(1, invState.page), pages);
  const start = (currentPage - 1) * INV_PAGE;
  const shownItems = filtered.slice(start, start + INV_PAGE);

  // Thống kê tổng
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const lowCount = items.filter((i) => stockSt(i) !== 'ok').length;
  const totalVal = items.reduce((s, i) => s + i.qty * i.price, 0);

  // Phân loại kho cho Donut
  const catVal = CATS.map((c) => ({
    c: c,
    v: items.filter((i) => i.cat === c).reduce((s, i) => s + i.qty * i.price, 0),
    n: items.filter((i) => i.cat === c).length,
  }));
  const tv = catVal.reduce((s, x) => s + x.v, 0) || 1;

  // Biểu đồ Donut phân loại kho
  useEffect(() => {
    if (!chCatRef.current) return;
    const style = getComputedStyle(document.documentElement);
    const cv = CATS.map((c) =>
      items.filter((i) => i.cat === c).reduce((s, i) => s + i.qty * i.price, 0)
    );
    const colors = CATS.map((c) =>
      style.getPropertyValue(CATCOL[c] || '--r1').trim()
    );

    const chart = new Chart(chCatRef.current, {
      type: 'doughnut',
      data: {
        labels: CATS.map((c) => catVis(c).label),
        datasets: [
          {
            data: cv,
            backgroundColor: colors,
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

    return () => chart.destroy();
  }, [items]);

  // Menu 3 chấm item
  const handleOpenMenu = (item) => {
    openSheet(
      <div>
        <h3>{item.name}</h3>
        <div className="hint" style={{ marginTop: 6 }}>
          {item.code} · {catVis(item.cat).label}
        </div>
        <div style={{ marginTop: 14 }}>
          <button
            className="btn ghost"
            onClick={() => {
              closeSheet();
              handleOpenMinThreshold(item);
            }}
          >
            Đặt ngưỡng
          </button>
          <div className="mdiv" />
          <button
            className="btn ghost mbtn-danger"
            onClick={() => {
              closeSheet();
              handleOpenDelete(item);
            }}
          >
            Xóa
          </button>
        </div>
      </div>
    );
  };

  // Đặt ngưỡng sắp hết
  const handleOpenMinThreshold = (item) => {
    let inputVal = item.min;
    openSheet(
      <div>
        <h3>Đặt ngưỡng sắp hết</h3>
        <div className="hint" style={{ marginTop: 8 }}>
          {item.name} ({item.code}) · đang còn {n0(item.qty)} {item.unit}
        </div>
        <div className="fld" style={{ marginTop: 10 }}>
          <label htmlFor="minVal">Nhắc khi tồn còn ≤</label>
          <input
            id="minVal"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            defaultValue={item.min}
            onChange={(e) => (inputVal = parseInt(e.target.value, 10))}
          />
        </div>
        <button
          className="btn"
          style={{ marginTop: 14 }}
          onClick={() => {
            const v = Number(inputVal);
            if (!Number.isInteger(v) || v < 0 || v > 99999) {
              showToast('Nhập số nguyên từ 0 đến 99.999');
              return;
            }
            setItems((prev) =>
              prev.map((i) => (i.code === item.code ? { ...i, min: v } : i))
            );
            closeSheet();
            showToast('Đã cập nhật ngưỡng của "' + item.name + '"');
          }}
        >
          Lưu
        </button>
        <button
          className="btn ghost"
          style={{ marginTop: 8 }}
          onClick={closeSheet}
        >
          Hủy
        </button>
      </div>
    );
  };

  // Xóa mặt hàng
  const handleOpenDelete = (item) => {
    openSheet(
      <div>
        <h3>Xóa mặt hàng?</h3>
        <div className="hint" style={{ marginTop: 8 }}>
          {item.name} ({item.code}) sẽ bị xóa khỏi danh sách kho. Đây là bản demo — reload sẽ khôi phục dữ liệu.
        </div>
        <button
          className="btn"
          style={{ marginTop: 14 }}
          onClick={() => {
            setItems((prev) => prev.filter((i) => i.code !== item.code));
            closeSheet();
            showToast('Đã xóa "' + item.name + '" — bản demo, reload sẽ khôi phục');
          }}
        >
          Xóa
        </button>
        <button
          className="btn ghost"
          style={{ marginTop: 8 }}
          onClick={closeSheet}
        >
          Giữ lại
        </button>
      </div>
    );
  };

  // Sheet cảnh báo tồn kho đầy đủ
  const handleOpenAlertsSheet = () => {
    const o = { bad: 0, warn: 1 };
    const a = items
      .filter((i) => stockSt(i) !== 'ok')
      .sort((x, y) => o[stockSt(x)] - o[stockSt(y)] || x.qty / x.min - y.qty / y.min);

    openSheet(
      <div>
        <div className="hd">
          <h3>Cảnh báo tồn kho</h3>
          <button className="ibtn" onClick={closeSheet} aria-label="Đóng">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="hint" style={{ marginTop: 4 }}>
          {a.length} mặt hàng dưới ngưỡng
        </div>
        <div className="rows" style={{ marginTop: 8 }}>
          {a.length === 0 ? (
            <div className="empty">Mọi mặt hàng đều đủ tồn kho.</div>
          ) : (
            a.map((i) => (
              <div
                key={i.code}
                className="rowb"
                style={{ cursor: 'default', gridTemplateColumns: 'auto 1fr auto' }}
              >
                <span className={`st ${stockSt(i)}`}>
                  <i />
                </span>
                <span>
                  <b style={{ fontWeight: 600 }}>{i.name}</b>
                  <br />
                  <span className="m">
                    còn {n0(i.qty)} {i.unit} · nhắc tại {n0(i.min)} {i.unit}
                  </span>
                </span>
                <button
                  className="btn sm ghost"
                  onClick={() => {
                    closeSheet();
                    handleRestock(i.code);
                  }}
                >
                  Nhập thêm
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Sheet lịch sử kho đầy đủ
  const handleOpenHistSheet = () => {
    openSheet(
      <div>
        <div className="hd">
          <h3>Lịch sử kho</h3>
          <button className="ibtn" onClick={closeSheet} aria-label="Đóng">
            <Icon name="close" size={20} />
          </button>
        </div>
        <ul className="log" style={{ marginTop: 10 }}>
          {invLogs.map((e, idx) => {
            const it = byCode(e.code);
            const nm = it ? `${it.unit} ${it.name.toLowerCase()}` : 'mặt hàng đã xóa';
            return (
              <li key={idx}>
                <span className="d">{ddmm(e.ts)}</span>
                <span>
                  {e.t === 'in' ? 'Nhập' : 'Xuất'} {n0(e.qty)} {nm}
                  {e.note && <span className="s">{e.note}</span>}
                </span>
                <span className="a">
                  {e.t === 'in' ? '+' : '−'}
                  {n0(e.qty)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  // Nhấn "Nhập thêm" tự động cuộn xuống form nhập
  const handleRestock = (code) => {
    setInvState((prev) => ({
      ...prev,
      tab: 'in',
      newItem: false,
      pre: code,
    }));
    const cur = byCode(code);
    if (cur) setFormPrice(cur.price);
    invFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Lưu nhập / xuất kho
  const handleSaveStock = () => {
    const f = invState;
    const t = f.tab;
    const it = byCode(f.pre || (items[0] && items[0].code));
    const qty = parseInt(formQty, 10);

    if (!(qty > 0)) {
      setFormErr('Nhập số lượng lớn hơn 0.');
      return;
    }
    if (!formDate) {
      setFormErr('Chọn ngày.');
      return;
    }

    const when = formDate === isoDay(Date.now()) ? Date.now() : day(formDate);

    if (t === 'in' && f.newItem) {
      const name = newCustName.trim();
      const unit = newCustUnit.trim();
      const minV = Number(newCustMin) || 0;
      if (!name) {
        setFormErr('Nhập tên hàng mới.');
        return;
      }
      if (items.some((i) => i.name.trim().toLowerCase() === name.toLowerCase())) {
        setFormErr('Tên hàng đã tồn tại: ' + name);
        return;
      }
      if (!unit) {
        setFormErr('Nhập đơn vị (hộp, thùng, cái…).');
        return;
      }
      const nit = {
        code: nextCode(),
        name,
        cat: newCustCat,
        qty,
        unit,
        min: minV,
        price: formPrice >= 0 ? formPrice : 0,
      };
      setItems([nit, ...items]);
      setInvLogs([
        { ts: when, t: 'in', code: nit.code, qty, note: formSup ? 'NCC: ' + formSup : '' },
        ...invLogs,
      ]);
      setInvState((prev) => ({ ...prev, newItem: false, pre: nit.code }));
      setFormErr('');
      setFormQty('');
      showToast('Đã tạo mặt hàng "' + name + '" + nhập kho');
      return;
    }

    if (!it) {
      setFormErr('Chọn mặt hàng.');
      return;
    }

    let note = '';
    if (t === 'out') {
      if (qty > it.qty) {
        setFormErr(`Không đủ hàng: ${it.name} chỉ còn ${n0(it.qty)} ${it.unit}.`);
        return;
      }
      note = formWhy + (formWho.trim() ? ' · ' + formWho.trim() : '');
      setItems((prev) =>
        prev.map((i) => (i.code === it.code ? { ...i, qty: i.qty - qty } : i))
      );
    } else {
      note = formSup.trim() ? 'NCC: ' + formSup.trim() : '';
      setItems((prev) =>
        prev.map((i) =>
          i.code === it.code
            ? { ...i, qty: i.qty + qty, price: formPrice >= 0 ? formPrice : i.price }
            : i
        )
      );
    }

    setInvLogs([{ ts: when, t, code: it.code, qty, note }, ...invLogs]);
    setFormErr('');
    setFormQty('');
    showToast(t === 'in' ? 'Đã nhập kho' : 'Đã xuất kho');
  };

  const pool = items
    .slice()
    .filter((i) => invState.fcat === 'all' || i.cat === invState.fcat)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

  const selCode = invState.newItem && invState.tab === 'in'
    ? '__new__'
    : byCode(invState.pre) && (invState.fcat === 'all' || byCode(invState.pre).cat === invState.fcat)
    ? invState.pre
    : pool.length
    ? pool[0].code
    : '__new__';

  const isNew = selCode === '__new__';
  const curItem = byCode(selCode) || { unit: '', price: 0 };

  const lowAlerts = items
    .filter((i) => stockSt(i) !== 'ok')
    .sort((x, y) => x.qty / x.min - y.qty / y.min)
    .slice(0, 4);

  const histShown = invLogs
    .filter((e) => invState.hf === 'all' || e.t === invState.hf)
    .slice(0, 4);

  return (
    <>
      <div className="pagehead">
        <h1>Quản lý kho hàng</h1>
        <div className="sub">Tồn kho, nhập xuất và cảnh báo</div>
      </div>

      <section className="kpis" aria-label="Tổng quan kho">
        <div className="kpi">
          <div className="v">{items.length}</div>
          <div className="l">Mặt hàng</div>
        </div>
        <div className="kpi">
          <div className="v">{n0(totalQty)}</div>
          <div className="l">Số lượng</div>
        </div>
        <div className="kpi">
          <div className="v">{lowCount}</div>
          <div className="l">Cần chú ý</div>
        </div>
        <div className="kpi">
          <div className="v">{(totalVal / 1e6).toFixed(1)}M</div>
          <div className="l">Giá trị kho</div>
        </div>
      </section>

      <section className="card" aria-label="Danh sách hàng hóa">
        <h2>Danh sách hàng hóa</h2>
        <div className="search" style={{ marginTop: 10 }}>
          <Icon name="search" size={18} />
          <input
            type="search"
            placeholder="Tìm tên hàng hoặc mã"
            value={invState.q}
            onChange={(e) =>
              setInvState((prev) => ({ ...prev, q: e.target.value, page: 1 }))
            }
            aria-label="Tìm hàng hóa"
            autoComplete="off"
          />
        </div>

        <div className="cats" role="group" aria-label="Lọc theo danh mục">
          <button
            data-act="inv-catpill"
            aria-pressed={invState.cat === 'all'}
            onClick={() =>
              setInvState((prev) => ({ ...prev, cat: 'all', page: 1 }))
            }
          >
            Tất cả
          </button>
          {CATS.map((c) => (
            <button
              key={c}
              data-act="inv-catpill"
              aria-pressed={invState.cat === c}
              onClick={() =>
                setInvState((prev) => ({ ...prev, cat: c, page: 1 }))
              }
            >
              {catVis(c).label}
            </button>
          ))}
        </div>

        <div className="fld" style={{ marginTop: 10 }}>
          <label htmlFor="is">Trạng thái</label>
          <select
            id="is"
            value={invState.st}
            onChange={(e) =>
              setInvState((prev) => ({ ...prev, st: e.target.value, page: 1 }))
            }
          >
            <option value="all">Tất cả</option>
            <option value="ok">Đủ hàng</option>
            <option value="warn">Sắp hết</option>
            <option value="bad">Hết hàng</option>
          </select>
        </div>

        <div className="icards">
          {shownItems.length === 0 ? (
            <div className="empty">Không có mặt hàng nào khớp bộ lọc.</div>
          ) : (
            shownItems.map((i) => {
              const s = stockSt(i);
              const v = catVis(i.cat);
              const pct =
                i.min > 0 ? Math.min(100, Math.round((i.qty / i.min) * 100)) : null;

              return (
                <article key={i.code} className="icard">
                  <div className="itop">
                    <span className="iname">{i.name}</span>
                    <span className="iq">
                      <span className="iqty">{n0(i.qty)}</span>
                      <span className="iunit">{i.unit}</span>
                      {pct !== null && (
                        <span className={`ibar s-${s}`} title={`${pct}% ngưỡng`}>
                          <i style={{ width: `${pct}%` }} />
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="imeta">
                    <b className="icode">{i.code}</b> · {v.label}
                  </div>
                  <div className="ibot">
                    <span className={`spill s-${s}`}>
                      <i className="sdot" />
                      {STOCK_LABEL[s]}
                    </span>
                    <button
                      className="ithr"
                      onClick={() => handleOpenMinThreshold(i)}
                    >
                      Ngưỡng · {n0(i.min)}
                    </button>
                    <button
                      className="imenu"
                      aria-label={`Hành động khác cho ${i.name}`}
                      onClick={() => handleOpenMenu(i)}
                    >
                      ⋯
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="pager">
          <button
            className="btn sm ghost"
            disabled={currentPage <= 1}
            onClick={() =>
              setInvState((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
            }
          >
            « Trước
          </button>
          <span className="hint">
            Trang {currentPage}/{pages} · {filtered.length} mặt hàng
          </span>
          <button
            className="btn sm ghost"
            disabled={currentPage >= pages}
            onClick={() =>
              setInvState((prev) => ({ ...prev, page: Math.min(pages, prev.page + 1) }))
            }
          >
            Sau »
          </button>
        </div>
      </section>

      <section className="card">
        <div className="hd">
          <h2>Cảnh báo tồn kho</h2>
          <span className="hint">{lowCount} mặt hàng</span>
          <button
            className="ibtn"
            aria-label="Xem toàn bộ cảnh báo tồn kho"
            onClick={handleOpenAlertsSheet}
          >
            <Icon name="menu" size={22} />
          </button>
        </div>
        <div className="rows" style={{ marginTop: 6 }}>
          {lowAlerts.length === 0 ? (
            <div className="empty">Mọi mặt hàng đều đủ tồn kho.</div>
          ) : (
            lowAlerts.map((i) => (
              <div
                key={i.code}
                className="rowb"
                style={{ cursor: 'default', gridTemplateColumns: 'auto 1fr auto' }}
              >
                <span className={`st ${stockSt(i)}`}>
                  <i />
                </span>
                <span>
                  <b style={{ fontWeight: 600 }}>{i.name}</b>
                  <br />
                  <span className="m">
                    còn {n0(i.qty)} {i.unit} · nhắc tại {n0(i.min)} {i.unit}
                  </span>
                </span>
                <button
                  className="btn sm ghost"
                  onClick={() => handleRestock(i.code)}
                >
                  Nhập thêm
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="card">
        <h2>Phân loại kho</h2>
        <div className="hint">Tỷ trọng theo giá trị tồn kho</div>
        <div className="donut">
          <div className="cv">
            <canvas ref={chCatRef} />
          </div>
          <ul className="lg">
            {catVal.map((x) => (
              <li key={x.c}>
                <span
                  className="sw"
                  style={{ background: `var(${CATCOL[x.c] || '--r1'})` }}
                />
                <span className="t">{catVis(x.c).label}</span>
                <span className="n">{Math.round((x.v / tv) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card" id="invForm" ref={invFormRef} aria-label="Nhập xuất kho">
        <h2 style={{ marginBottom: 10 }}>Nhập / Xuất kho</h2>
        <div>
          <div className="seg full" role="group" aria-label="Nhập hoặc xuất">
            <button
              data-act="inv-tab"
              data-v="in"
              aria-pressed={invState.tab === 'in'}
              onClick={() =>
                setInvState((prev) => ({ ...prev, tab: 'in', newItem: false }))
              }
            >
              Nhập kho
            </button>
            <button
              data-act="inv-tab"
              data-v="out"
              aria-pressed={invState.tab === 'out'}
              onClick={() =>
                setInvState((prev) => ({ ...prev, tab: 'out', newItem: false }))
              }
            >
              Xuất kho
            </button>
          </div>

          <div className="fld" style={{ marginTop: 10 }}>
            <label htmlFor="iCat">Loại</label>
            <select
              id="iCat"
              value={invState.fcat}
              onChange={(e) =>
                setInvState((prev) => ({ ...prev, fcat: e.target.value }))
              }
            >
              <option value="all">Tất cả</option>
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {catVis(c).label}
                </option>
              ))}
            </select>
          </div>

          <div className="fld">
            <label htmlFor="iItem">Tên hàng</label>
            <select
              id="iItem"
              value={selCode}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '__new__') {
                  setInvState((prev) => ({ ...prev, newItem: true }));
                } else {
                  setInvState((prev) => ({ ...prev, newItem: false, pre: v }));
                  const found = byCode(v);
                  if (found) setFormPrice(found.price);
                }
              }}
            >
              {pool.map((i) => (
                <option key={i.code} value={i.code}>
                  {i.name}
                </option>
              ))}
              {invState.tab === 'in' && (
                <option value="__new__">＋ Tạo mặt hàng mới…</option>
              )}
            </select>
          </div>

          {isNew && invState.tab === 'in' && (
            <div>
              <div className="hint" style={{ marginTop: 8 }}>
                Khởi tạo mặt hàng mới trong loại đang chọn.
              </div>
              <div className="two" style={{ marginTop: 6 }}>
                <div className="fld">
                  <label htmlFor="iNewName">Tên hàng mới</label>
                  <input
                    id="iNewName"
                    type="text"
                    maxLength={60}
                    placeholder="Ví dụ: Mật hoa ong"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                  />
                </div>
                <div className="fld">
                  <label htmlFor="iNewUnit">Đơn vị</label>
                  <input
                    id="iNewUnit"
                    type="text"
                    maxLength={12}
                    placeholder="hộp / thùng / cái"
                    value={newCustUnit}
                    onChange={(e) => setNewCustUnit(e.target.value)}
                  />
                </div>
              </div>
              <div className="two">
                <div className="fld">
                  <label htmlFor="iMin">Ngưỡng nhắc</label>
                  <input
                    id="iMin"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    value={newCustMin}
                    onChange={(e) => setNewCustMin(e.target.value)}
                  />
                </div>
                <div className="fld">
                  <label htmlFor="iNewCat">Loại hàng</label>
                  <select
                    id="iNewCat"
                    value={newCustCat}
                    onChange={(e) => setNewCustCat(e.target.value)}
                  >
                    {CATS.map((c) => (
                      <option key={c} value={c}>
                        {catVis(c).label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="two" style={{ marginTop: 8 }}>
            <div className="fld">
              <label htmlFor="iQty">Số lượng</label>
              <input
                id="iQty"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                placeholder="0"
                value={formQty}
                onChange={(e) => setFormQty(e.target.value)}
              />
            </div>
            <div className="fld">
              <label htmlFor="iDate">
                {invState.tab === 'in' ? 'Ngày nhập' : 'Ngày xuất'}
              </label>
              <input
                id="iDate"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
          </div>

          {invState.tab === 'in' ? (
            <>
              <div className="fld">
                <label htmlFor="iSup">Nhà cung cấp</label>
                <input
                  id="iSup"
                  type="text"
                  maxLength={60}
                  placeholder="Ví dụ: Cơ sở Ong Việt"
                  value={formSup}
                  onChange={(e) => setFormSup(e.target.value)}
                />
              </div>
              <div className="fld">
                <label htmlFor="iPrice">
                  Giá nhập (VNĐ{isNew ? '' : ` / ${curItem.unit}`})
                </label>
                <input
                  id="iPrice"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1000"
                  value={formPrice}
                  onChange={(e) => setFormPrice(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </>
          ) : (
            <>
              <div className="fld">
                <label htmlFor="iWhy">Mục đích</label>
                <select
                  id="iWhy"
                  value={formWhy}
                  onChange={(e) => setFormWhy(e.target.value)}
                >
                  <option>Sử dụng tại trại</option>
                  <option>Bán hàng</option>
                  <option>Hư hỏng / thanh lý</option>
                  <option>Chuyển kho</option>
                </select>
              </div>
              <div className="fld">
                <label htmlFor="iWho">Người thực hiện</label>
                <input
                  id="iWho"
                  type="text"
                  maxLength={40}
                  placeholder="Ví dụ: Anh Hùng"
                  value={formWho}
                  onChange={(e) => setFormWho(e.target.value)}
                />
              </div>
            </>
          )}

          {formErr && (
            <div className="err" role="alert">
              {formErr}
            </div>
          )}

          <button className="btn" onClick={handleSaveStock}>
            {invState.tab === 'in'
              ? isNew
                ? 'Tạo mặt hàng + Lưu phiếu nhập'
                : 'Lưu phiếu nhập'
              : 'Lưu phiếu xuất'}
          </button>
        </div>
      </section>

      <section className="card">
        <div className="hd">
          <h2>Lịch sử kho</h2>
          <button
            className="ibtn"
            data-act="invhist-open"
            aria-label="Xem toàn bộ lịch sử kho"
            onClick={handleOpenHistSheet}
          >
            <Icon name="menu" size={22} />
          </button>
        </div>
        <div
          className="seg"
          role="group"
          aria-label="Lọc lịch sử"
          style={{ marginTop: 10 }}
        >
          {[
            ['all', 'Tất cả'],
            ['in', 'Nhập'],
            ['out', 'Xuất'],
          ].map((x) => (
            <button
              key={x[0]}
              data-act="hist-filter"
              data-v={x[0]}
              aria-pressed={invState.hf === x[0]}
              onClick={() => setInvState((prev) => ({ ...prev, hf: x[0] }))}
            >
              {x[1]}
            </button>
          ))}
        </div>
        <ul className="log" style={{ marginTop: 6 }}>
          {histShown.length === 0 ? (
            <div className="empty">Chưa có phiếu nào.</div>
          ) : (
            histShown.map((e, idx) => {
              const it = byCode(e.code);
              const nm = it ? `${it.unit} ${it.name.toLowerCase()}` : 'mặt hàng đã xóa';
              return (
                <li key={idx}>
                  <span className="d">{ddmm(e.ts)}</span>
                  <span>
                    {e.t === 'in' ? 'Nhập' : 'Xuất'} {n0(e.qty)} {nm}
                    {e.note && <span className="s">{e.note}</span>}
                  </span>
                  <span className="a">
                    {e.t === 'in' ? '+' : '−'}
                    {n0(e.qty)}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </>
  );
}
