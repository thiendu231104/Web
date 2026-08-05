import type { Package, User } from '../types';
import { canViewPackage } from './permission';

/**
 * Checks whether a `data_theo_ngay` string contains valid daily high-speed data (> 0.1 GB).
 * Returns false if string is zero, empty, "0GB/ngày", "0 GB", null/undefined, or number <= 0.1.
 */
export function isValidDailyData(val: string | null | undefined): boolean {
  if (!val) return false;
  const str = String(val).trim().toLowerCase();
  if (!str || str === '0' || str === 'null' || str === 'undefined' || str === 'false') return false;

  // Check for explicit zero data patterns at start
  if (/^0\s*(gb|mb|\/|\s|$)/i.test(str) || /^0\/ngày/i.test(str)) return false;

  // Extract first floating-point or integer number from string
  const match = str.match(/(\d+(?:\.\d+)?)/);
  if (!match) return false;
  const num = parseFloat(match[1]);
  return !isNaN(num) && num > 0.1;
}

/**
 * Filters and sorts packages on the client-side based on filter configurations and user roles.
 */
export function filterPackagesLocally(
  packages: Package[],
  filters: any,
  currentUser: User | null | undefined,
  sort: string
): Package[] {
  // 1. Safeguard checking user view permission
  let list = packages.filter(pkg => canViewPackage(currentUser, pkg));

  // 2. Filter by Category
  if (filters.category && filters.category !== 'all') {
    const cat = filters.category.toLowerCase();
    list = list.filter(pkg => {
      const loaiLower = (pkg.phan_loai_goi || '').toLowerCase();
      if (cat === 'data') return loaiLower === 'data';
      if (cat === 'combo') return loaiLower === 'combo';
      if (cat === 'social' || cat === 'mxh') {
        return loaiLower === 'social' || loaiLower === 'mxh' || loaiLower.includes('trí') || loaiLower.includes('mạng xã hội');
      }
      if (cat === 'voice') return loaiLower === 'thoại' || loaiLower === 'combo';
      return loaiLower === cat;
    });
  }

  // 3. Filter by Price
  if (filters.price && filters.price !== 'all') {
    const priceOpt = filters.price;
    list = list.filter(pkg => {
      const p = pkg.gia || 0;
      if (priceOpt === 'Gia_re' || priceOpt === 'under_50') return p < 50000;
      if (priceOpt === 'Trung_binh' || priceOpt === '50_100') return p >= 50000 && p <= 150000;
      if (priceOpt === 'Cao_cap' || priceOpt === 'above_200') return p > 150000;
      if (priceOpt === '100_200') return p > 100000 && p <= 200000;
      return true;
    });
  }

  // 4. Filter by Cycle
  if (filters.cycle && filters.cycle !== 'all') {
    const cycleOpt = filters.cycle;
    list = list.filter(pkg => {
      const days = typeof pkg.chu_ky_ngay === 'number' ? pkg.chu_ky_ngay : parseInt(String(pkg.chu_ky_ngay) || '30');
      if (cycleOpt === 'daily') return days <= 1;
      if (cycleOpt === 'weekly') return days > 1 && days <= 15;
      if (cycleOpt === 'monthly') return days > 15 && days <= 90;
      if (cycleOpt === 'yearly') return days > 90;
      if (/^\d+$/.test(cycleOpt)) return days === parseInt(cycleOpt);
      return true;
    });
  }

  // 5. Filter by Data benefit
  if (filters.data && filters.data !== 'all') {
    const hasData = filters.data === 'yes' || filters.data === 'true';
    list = list.filter(pkg => {
      const valid = isValidDailyData(pkg.data_theo_ngay);
      return hasData ? valid : !valid;
    });
  }

  // 6. Filter by Call benefit
  if (filters.call && filters.call !== 'all') {
    const hasCall = filters.call === 'yes' || filters.call === 'true';
    list = list.filter(pkg => {
      const internal = pkg.free_noi_mang || 0;
      const external = pkg.free_ngoai_mang || 0;
      const hasVoice = (typeof internal === 'number' ? internal > 0 : internal !== '0' && internal !== '') || (typeof external === 'number' ? external > 0 : external !== '0' && external !== '');
      return hasCall ? hasVoice : !hasVoice;
    });
  }

  // 7. Filter by SMS benefit
  if (filters.sms && filters.sms !== 'all') {
    const hasSms = filters.sms === 'yes' || filters.sms === 'true';
    list = list.filter(pkg => {
      const smsVal = pkg.sms || 0;
      const isZero = typeof smsVal === 'number' ? smsVal === 0 : smsVal === '0' || smsVal === '';
      return hasSms ? !isZero : isZero;
    });
  }

  // 8. Filter by Promo App
  if (filters.promo && filters.promo !== 'all') {
    const app = filters.promo.toLowerCase();
    list = list.filter(pkg => {
      const tienIch = (pkg.tien_ich_free || '').toLowerCase();
      const noiDung = (pkg.noi_dung_ngoai || '').toLowerCase();
      return tienIch.includes(app) || noiDung.includes(app);
    });
  }

  // 9. Filter by Target (Đối tượng áp dụng)
  if (filters.target && filters.target !== 'all' && filters.target !== '') {
    const tgt = filters.target.toLowerCase();
    list = list.filter(pkg => {
      const cond = (pkg.doi_tuong_ap_dung || '').toLowerCase();
      return cond.includes(tgt);
    });
  }

  // 10. Filter by Local Keyword
  if (filters.keyword && filters.keyword.trim()) {
    const kw = filters.keyword.toLowerCase().trim();
    list = list.filter(pkg => {
      const name = (pkg.ten || '').toLowerCase();
      const code = (pkg.ma_goi || pkg._id || '').toLowerCase();
      const desc = (pkg.uudaitrong || '').toLowerCase();
      return name.includes(kw) || code.includes(kw) || desc.includes(kw);
    });
  }

  // 12. Sort List
  list = [...list].sort((a, b) => {
    if (sort === 'price_asc') return a.gia - b.gia;
    if (sort === 'price_desc') return b.gia - a.gia;
    if (sort === 'name') return (a.ten || '').localeCompare(b.ten || '');
    return 0; // Keep baseline sorting from API
  });

  return list;
}
