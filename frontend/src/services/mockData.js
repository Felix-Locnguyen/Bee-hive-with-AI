// Dữ liệu mẫu & cấu hình tham chiếu từ prototype VietBee

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pad12 = (a) => a.concat(Array(12 - a.length).fill(null));
export const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

export const DATA = {
  farm: { location: 'Long Khánh, Đồng Nai', temp: 28, hum: 72, weather: 'Nắng' },
  colonies: pad12([78, 82, 86, 91, 96, 101, 106, 111, 116, 128]),
  honey: pad12([150, 190, 280, 410, 470, 330, 210, 189, 293, 318]),
  revenue: pad12([9.8, 12.4, 18.2, 26.9, 31.9, 21.5, 13.8, 12.3, 18.7, 21.0]),
  expense: pad12([5.4, 5.1, 6.0, 7.8, 8.6, 7.2, 6.0, 5.9, 8.1, 12.3]),
  expCat: { 'Thiết bị': 24.6, 'Nhân công': 21.0, 'Chăm sóc': 14.2, 'Đóng gói': 7.6, 'Khác': 5.0 },
};

export const INCOME_CATS = ['Bán mật ong', 'Bán đàn giống', 'Bán sáp ong / phấn hoa', 'Thu khác'];
export const EXPENSE_CATS = ['Thiết bị', 'Nhân công', 'Chăm sóc', 'Đóng gói', 'Khác'];

export const INITIAL_TXNS = [
  { date: '2026-10-05', type: 'in', cat: 'Bán mật ong', desc: 'Bán mật ong', amt: 12.5 },
  { date: '2026-10-04', type: 'out', cat: 'Thiết bị', desc: 'Mua thiết bị', amt: 3.2 },
  { date: '2026-10-03', type: 'out', cat: 'Chăm sóc', desc: 'Mua đường', amt: 4.1 },
  { date: '2026-10-02', type: 'in', cat: 'Bán mật ong', desc: 'Bán mật ong', amt: 8.5 },
  { date: '2026-10-01', type: 'out', cat: 'Nhân công', desc: 'Trả công nhân', amt: 5.0 },
  { date: '2026-09-28', type: 'in', cat: 'Bán mật ong', desc: 'Bán mật ong', amt: 9.4 },
  { date: '2026-09-25', type: 'out', cat: 'Đóng gói', desc: 'Mua lọ và nắp', amt: 2.8 },
  { date: '2026-09-20', type: 'out', cat: 'Nhân công', desc: 'Trả công nhân', amt: 6.0 },
];

export const CATCOL = {
  'Thiết bị': '--r1',
  'Vật tư': '--r2',
  'Nhân công': '--r2',
  'Chăm sóc': '--r3',
  'Đóng gói': '--r4',
  'Bảo trì': '--r5',
  'Khác': '--r6',
};

export const ZONES = ['A', 'B', 'C', 'D'];
export const BREEDS = ['Ong Ý', 'Ong nội', 'Ong Carnica'];

export const ISSUE = {
  23: ['Nhiệt độ cao', 'bad', 10],
  41: ['Độ ẩm bất thường', 'warn', 35],
  78: ['Hoạt động giảm', 'warn', 60],
  49: ['Phát hiện thiên địch (sâu ngài sáp)', 'bad', 130],
  9: ['Nhiệt độ cao nhẹ', 'warn', 155],
  71: ['Nhiệt độ thấp', 'bad', 190],
  56: ['Hoạt động giảm', 'warn', 220],
  88: ['Phát hiện thiên địch (kiến)', 'bad', 250],
  62: ['Độ ẩm bất thường', 'warn', 280],
  104: ['Độ ẩm cao kéo dài', 'bad', 300],
  83: ['Nhiệt độ thấp nhẹ', 'warn', 330],
  121: ['Phát hiện thiên địch (ong bắp cày)', 'bad', 360],
  94: ['Hoạt động giảm', 'warn', 420],
  110: ['Độ ẩm bất thường', 'warn', 500],
  117: ['Nhiệt độ cao nhẹ', 'warn', 600],
  126: ['Hoạt động giảm', 'warn', 720],
};

export const DET = {
  49: { label: 'Thiên địch: Sâu ngài sáp', conf: 94, kind: 'moth' },
  88: { label: 'Thiên địch: Kiến', conf: 89, kind: 'ant' },
  121: { label: 'Thiên địch: Ong bắp cày', conf: 96, kind: 'hornet' },
};

export const STAGE = {
  new: 'Đàn mới',
  grow: 'Đang phát triển',
  soon: 'Sắp thu hoạch',
  done: 'Đã thu hoạch',
};

export const ITEM_SRC = [
  ['Thùng ong', 'Thiết bị', 25, 'cái', 10, 520000],
  ['Khung cầu', 'Vật tư', 120, 'cái', 40, 22000],
  ['Đường', 'Chăm sóc', 18, 'kg', 30, 22000],
  ['Lọ mật ong 500ml', 'Đóng gói', 5, 'thùng', 20, 180000],
  ['Camera giám sát thùng', 'Thiết bị', 8, 'cái', 4, 650000],
  ['Cảm biến nhiệt ẩm', 'Thiết bị', 40, 'cái', 15, 85000],
  ['Máy quay mật', 'Thiết bị', 2, 'cái', 1, 5800000],
  ['Dao cắt nắp mật', 'Thiết bị', 6, 'cái', 3, 120000],
  ['Bình xì khói', 'Thiết bị', 5, 'cái', 2, 180000],
  ['Mũ bảo hộ', 'Thiết bị', 10, 'cái', 5, 150000],
  ['Găng tay nuôi ong', 'Thiết bị', 6, 'đôi', 8, 60000],
  ['Bàn chải quét ong', 'Thiết bị', 12, 'cái', 5, 35000],
  ['Máng cho ăn trong thùng', 'Thiết bị', 60, 'cái', 20, 25000],
  ['Tấm nền sáp', 'Vật tư', 140, 'tờ', 60, 6000],
  ['Dây thép căng khung', 'Vật tư', 15, 'cuộn', 5, 30000],
  ['Đinh ghim khung', 'Vật tư', 30, 'hộp', 10, 12000],
  ['Lưới cách chúa', 'Vật tư', 40, 'tấm', 15, 28000],
  ['Cửa thu nhỏ lối ra', 'Vật tư', 50, 'cái', 20, 8000],
  ['Thùng nhân đàn 5 khung', 'Vật tư', 10, 'cái', 5, 280000],
  ['Chân đỡ thùng ong', 'Vật tư', 30, 'cái', 10, 55000],
  ['Khung cầu mini', 'Vật tư', 12, 'cái', 20, 18000],
  ['Lồng nhốt chúa', 'Vật tư', 25, 'cái', 10, 9000],
  ['Bột phấn hoa bổ sung', 'Chăm sóc', 20, 'kg', 8, 120000],
  ['Thuốc trị Varroa', 'Chăm sóc', 4, 'hộp', 6, 95000],
  ['Men tiêu hóa cho ong', 'Chăm sóc', 30, 'gói', 10, 40000],
  ['Siro kích đàn', 'Chăm sóc', 40, 'lít', 20, 35000],
  ['Mùn cưa hun khói', 'Chăm sóc', 25, 'kg', 10, 8000],
  ['Bẫy thiên địch', 'Chăm sóc', 14, 'hộp', 10, 70000],
  ['Dung dịch sát khuẩn', 'Chăm sóc', 12, 'lít', 5, 45000],
  ['Lọ mật ong 1000ml', 'Đóng gói', 22, 'thùng', 10, 260000],
  ['Nắp lọ nhôm', 'Đóng gói', 15, 'thùng', 6, 120000],
  ['Nhãn mác lọ', 'Đóng gói', 8, 'cuộn', 15, 150000],
  ['Hộp quà mật ong', 'Đóng gói', 60, 'cái', 30, 25000],
  ['Túi giấy đựng', 'Đóng gói', 61, 'cái', 50, 3000],
  ['Thùng carton vận chuyển', 'Đóng gói', 80, 'cái', 30, 12000],
  ['Băng keo', 'Đóng gói', 40, 'cuộn', 15, 18000],
  ['Phễu lọc mật inox', 'Đóng gói', 4, 'cái', 2, 250000],
  ['Can đựng mật 20 lít', 'Đóng gói', 30, 'cái', 10, 95000],
  ['Dầu bôi trơn máy quay', 'Thiết bị', 3, 'chai', 2, 85000],
  ['Sơn chống thấm', 'Thiết bị', 12, 'lít', 5, 120000],
  ['Pin cảm biến AA', 'Thiết bị', 0, 'hộp', 10, 90000],
  ['Dây điện nguồn', 'Thiết bị', 60, 'mét', 20, 12000],
  ['Bộ dụng cụ sửa chữa', 'Thiết bị', 4, 'bộ', 2, 350000],
  ['Ốc vít inox', 'Thiết bị', 25, 'hộp', 10, 20000],
  ['Giấy in nhãn QR', 'Đóng gói', 15, 'cuộn', 5, 55000],
  ['Áo bảo hộ', 'Thiết bị', 14, 'bộ', 6, 345000],
  ['Bình chữa cháy mini', 'Thiết bị', 6, 'bình', 3, 280000],
  ['Đèn pin sạc', 'Thiết bị', 10, 'cái', 4, 95000],
];

export const INITIAL_ITEMS = ITEM_SRC.map((a, i) => ({
  code: 'VT' + String(i + 1).padStart(3, '0'),
  name: a[0],
  cat: a[1],
  qty: a[2],
  unit: a[3],
  min: a[4],
  price: a[5],
}));

export const CATS = ['Thiết bị', 'Vật tư', 'Chăm sóc', 'Đóng gói'];
export const CATVIS = {
  'Chăm sóc': { label: 'Thức ăn & Dinh dưỡng' },
  'Vật tư': { label: 'Vật tư nuôi ong' },
  'Đóng gói': { label: 'Bao bì & Đóng gói' },
  'Thiết bị': { label: 'Thiết bị & Máy móc' },
};

const day = (s) => new Date(s + 'T08:00:00').getTime();
export const INITIAL_INV_LOG = [
  { ts: day('2026-10-05'), t: 'in', code: 'VT002', qty: 100 },
  { ts: day('2026-10-04'), t: 'out', code: 'VT001', qty: 20 },
  { ts: day('2026-10-03'), t: 'in', code: 'VT004', qty: 50 },
  { ts: day('2026-10-02'), t: 'out', code: 'VT003', qty: 10 },
  { ts: day('2026-09-29'), t: 'in', code: 'VT006', qty: 20 },
  { ts: day('2026-09-26'), t: 'out', code: 'VT026', qty: 8 },
  { ts: day('2026-09-22'), t: 'in', code: 'VT031', qty: 12 },
];

export const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
export function todayLabel() {
  const d = new Date();
  const d2 = (n) => String(n).padStart(2, '0');
  return `${WEEKDAYS[d.getDay()]}, ${d2(d.getDate())}/${d2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export const INITIAL_ACCOUNT = {
  name: 'Nguyễn Văn An',
  role: 'Chủ trại',
  phone: '0901234456',
  email: 'an.vietbee@gmail.com',
  farm: 'Trang trại ong Long Khánh',
  twofa: true,
  noti: { hive: true, stock: true, report: false, quiet: false },
  members: [
    { name: 'Nguyễn Văn An', role: 'Chủ trại', scope: 'Toàn quyền', zones: '4 khu' },
    { name: 'Trần Thị Lan', role: 'Quản lý', scope: 'Thùng + Kho', zones: '2 khu' },
    { name: 'Lê Văn Hùng', role: 'Nhân viên', scope: 'Thùng', zones: '1 khu' },
    { name: 'Phạm Thu Hà', role: 'Kế toán', scope: 'Tài chính', zones: '—' },
  ],
};

// Generate 128 fallback hives matching prototype
export const HIVES_FALLBACK = (() => {
  const R = rng(2026), now = Date.now(), out = [];
  const stages = [].concat(
    Array(12).fill('new'),
    Array(84).fill('grow'),
    Array(18).fill('soon'),
    Array(14).fill('done')
  );
  for (let i = stages.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    const t = stages[i];
    stages[i] = stages[j];
    stages[j] = t;
  }
  const AGE = { new: [1, 3], grow: [4, 14], soon: [8, 20], done: [12, 24] };
  const W = {
    new: () => 0.15 + R() * 0.15,
    grow: () => 0.8 + R() * 0.5,
    soon: () => 1.3 + R() * 0.5,
    done: () => 1.4 + R() * 0.5,
  };
  const NOTES = [
    ['Kiểm tra định kỳ', 'Đàn ổn định, chúa đẻ tốt', 'Anh Hùng'],
    ['Cho ăn siro', '1 lít siro đường 1:1', 'Chị Lan'],
    ['Thay khung cầu', 'Thay 2 khung cầu mới', 'Anh Hùng'],
    ['Xử lý thiên địch', 'Xử lý thiên địch gây hại', 'Chị Lan'],
    ['Vệ sinh đáy thùng', 'Dọn xác ong, lau đáy', 'Anh Hùng'],
  ];
  let wsum = 0;
  for (let n = 1; n <= 128; n++) {
    const stage = stages[n - 1], is = ISSUE[n], issue = is ? is[0] : null;
    const ar = AGE[stage], age = ar[0] + Math.floor(R() * (ar[1] - ar[0] + 1));
    let t = 32.9 + R() * 1.8, h = 56 + R() * 11, act = 34 + Math.floor(R() * 13);
    if (issue) {
      if (/Nhiệt độ cao nhẹ/.test(issue)) t = 35 + R() * 0.4;
      else if (/Nhiệt độ cao/.test(issue)) t = 35.6 + R() * 0.9;
      else if (/Nhiệt độ thấp nhẹ/.test(issue)) t = 31.4 + R() * 0.5;
      else if (/Nhiệt độ thấp/.test(issue)) t = 29.8 + R() * 1.1;
      if (/Độ ẩm/.test(issue)) h = 76 + R() * 8;
      if (/Hoạt động/.test(issue)) act = 10 + Math.floor(R() * 7);
    }
    if (n === 23) { t = 35.8; h = 78; }
    const w = W[stage]();
    wsum += w;
    const hive = {
      n: n,
      id: 'VB-' + String(n).padStart(3, '0'),
      code: 'V' + n,
      zone: ZONES[Math.floor((n - 1) / 32)],
      breed: BREEDS[Math.floor(R() * 3)],
      stage: stage,
      age: age,
      created: now - age * 30.4 * 864e5 - Math.floor(R() * 20) * 864e5,
      t: Math.round(t * 10) / 10,
      h: Math.round(h),
      act: act,
      status: is ? is[1] : 'ok',
      issue: issue,
      mins: is ? is[2] : null,
      det: DET[n] || null,
      w: w,
      yield: 0,
      hist: [],
    };
    const hist = [];
    for (let k = 0; k < 5; k++) {
      const nt = NOTES[(n + k) % 5];
      hist.push({
        ts: now - (3 + k * 6 + Math.floor(R() * 3)) * 864e5,
        type: nt[0],
        note: nt[1],
        who: nt[2],
      });
    }
    hive.hist = hist;
    out.push(hive);
  }
  const scale = 2840 / wsum;
  let tot = 0;
  out.forEach((h) => {
    h.yield = Math.round(h.w * scale * 10) / 10;
    tot += h.yield;
  });
  out[127].yield = Math.round((out[127].yield + (2840 - tot)) * 10) / 10;
  out.forEach((h) => {
    if (h.stage === 'soon' || h.stage === 'done') {
      h.hist.push({
        ts: now - 9 * 864e5,
        type: 'Thu hoạch',
        note: Math.round(h.yield * 0.4 * 10) / 10 + ' kg mật',
        who: 'Anh Hùng',
      });
    }
    if (h.issue) {
      h.hist.push({
        ts: now - h.mins * 6e4,
        type: 'Cảnh báo tự động',
        note: h.issue,
        who: 'Hệ thống',
      });
    }
    h.hist.sort((a, b) => b.ts - a.ts);
  });
  return out;
})();
