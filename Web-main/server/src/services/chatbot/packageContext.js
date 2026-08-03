const mongoose = require('mongoose');

/**
 * In-memory cache để tránh query MongoDB nhiều lần trong cùng một lifecycle.
 * Cache hết hạn sau 5 phút để đảm bảo dữ liệu không quá cũ.
 */
let _packageCache = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút

/**
 * Lấy danh sách gói cước từ database (có cache in-memory).
 */
const getPackageContext = async () => {
  const now = Date.now();
  if (_packageCache && (now - _cacheTime) < CACHE_TTL_MS) {
    return _packageCache;
  }
  const db = mongoose.connection.db;
  const packages = await db.collection('goi_cuoc').find({}).toArray();
  _packageCache = packages;
  _cacheTime = now;
  return packages;
};

/**
 * Bóc tách và định dạng gói cước cho Pass 2 AI Context & Hard Matching (An toàn tuyệt đối)
 */
const sanitizePackage = (pkg) => {
  if (!pkg) return null;
  
  const rawDaily = pkg?.data_theo_ngay != null ? String(pkg.data_theo_ngay).trim() : '';
  const hasDailyData = rawDaily !== '' && rawDaily !== '0';
  
  const rawMeta = pkg?.data_meta != null ? String(pkg.data_meta).trim() : '';
  const hasMetaData = rawMeta !== '' && rawMeta !== '0';

  const freeNoi = pkg?.free_noi_mang != null ? Number(pkg.free_noi_mang) : 0;
  const freeNgoai = pkg?.free_ngoai_mang != null ? Number(pkg.free_ngoai_mang) : 0;
  const cycleLabel = Number(pkg?.chu_ky_ngay || 30) >= 30 ? 'tháng' : `${pkg?.chu_ky_ngay || 1} ngày`;

  // Xử lý Cú pháp Đăng ký (cu_phap_dk): Tuyệt đối không dùng huygoicuoc hay huygiahan!
  let cuPhapDk = "Đăng ký trực tiếp trên App/Web My Viettel hoặc bấm nút Đăng ký ở Card bên dưới";
  if (pkg?.dangky && String(pkg.dangky).trim() !== '' && String(pkg.dangky).trim() !== '0') {
    const s = String(pkg.dangky).trim();
    cuPhapDk = /^soạn/i.test(s) ? s : `Soạn ${s} gửi 191`;
  }

  return {
    package_id: pkg?.package_id,
    ma_goi: pkg?.ma_goi || '',
    ten: pkg?.ten || '',
    gia: pkg?.gia != null ? Number(pkg.gia) : 0,
    chu_ky_ngay: pkg?.chu_ky_ngay != null ? Number(pkg.chu_ky_ngay) : 30,
    data_luot_web: hasDailyData ? pkg.data_theo_ngay : null,
    data_theo_ngay: hasDailyData ? `Data lướt web dùng chung: ${pkg.data_theo_ngay}` : null,
    raw_data_theo_ngay: pkg?.data_theo_ngay || '',
    data_mxh: hasMetaData ? pkg.data_meta : null,
    data_meta: hasMetaData ? `Data ưu tiên Mạng xã hội: ${pkg.data_meta}` : null,
    raw_data_meta: pkg?.data_meta || null,
    cu_phap_dk: cuPhapDk,
    free_noi_mang: freeNoi,
    free_noi_mang_text: freeNoi > 0 ? `Miễn phí ${freeNoi} phút` : null,
    free_ngoai_mang: freeNgoai,
    free_ngoai_mang_text: freeNgoai > 0 ? `Miễn phí ${freeNgoai} phút` : null,
    tien_ich_free: pkg?.tien_ich_free || null,
    dangky: pkg?.dangky || null,
    sms: pkg?.sms != null ? Number(pkg.sms) : 0,
    benefit_group: pkg?.benefit_group || '',
    cycle_type: pkg?.cycle_type || (Number(pkg?.chu_ky_ngay || 30) >= 30 ? 'MONTH' : 'DAY'),
    is_addon: pkg?.is_addon || false,
    requires_base_package: pkg?.requires_base_package || false,
    system_type: pkg?.system_type || '',
    service_group: pkg?.service_group || '',
    registration_policy: pkg?.registration_policy || 'ALLOW',
    allow_parallel_with: pkg?.allow_parallel_with || [],
    phan_loai_goi: pkg?.phan_loai_goi || 'Data'
  };
};

module.exports = {
  getPackageContext,
  sanitizePackage
};
