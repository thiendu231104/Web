/**
 * migrate_benefit_group.js
 * Chạy bằng: mongosh <connection_string> migrate_benefit_group.js
 * Hoặc paste toàn bộ vào mongosh shell.
 *
 * Tác dụng: Set field benefit_group cho tất cả document trong collection goi_cuoc
 * dựa theo ma_goi. Nếu gói chưa có trong mapping → benefit_group = '' (giữ nguyên).
 */

const BENEFIT_GROUP_MAP = {
  // ── FACEBOOK ─────────────────────────────────────────────────────────────
  'FB5K':    'FACEBOOK',
  'FB15K':   'FACEBOOK',
  'FB50K':   'FACEBOOK',
  '3FB30':   'FACEBOOK',
  '6FB30':   'FACEBOOK',
  '12FB30':  'FACEBOOK',
  '12FB50K': 'FACEBOOK',

  // ── YOUTUBE ──────────────────────────────────────────────────────────────
  'YT5K':    'YOUTUBE',
  'YT15K':   'YOUTUBE',
  'YT50K':   'YOUTUBE',
  'YT10N':   'YOUTUBE',

  // ── TIKTOK ───────────────────────────────────────────────────────────────
  'T5K':     'TIKTOK',
  'T15KN':   'TIKTOK',
  'TIK10N':  'TIKTOK',

  // ── SPORT ────────────────────────────────────────────────────────────────
  '5GSPORT': 'SPORT',

  // ── MOVIE ────────────────────────────────────────────────────────────────
  '5GPHIM':  'MOVIE',

  // ── GENERAL_DATA ─────────────────────────────────────────────────────────
  'SD90':    'GENERAL_DATA',
  'SD150':   'GENERAL_DATA',
  '5G150':   'GENERAL_DATA',
  '5G230B':  'GENERAL_DATA',
  '12SD150': 'GENERAL_DATA',
  '5G480B':  'GENERAL_DATA',

  // ── VOICE_SMS ────────────────────────────────────────────────────────────
  'T30':     'VOICE_SMS',
  'T50K':    'VOICE_SMS',
  'DT20K':   'VOICE_SMS',
  'DT50K':   'VOICE_SMS',
  'DT100K':  'VOICE_SMS',
  'DT200K':  'VOICE_SMS',
  'TV35K':   'VOICE_SMS',
  'TV65K':   'VOICE_SMS',
  'TV7K':    'VOICE_SMS',

  // ── ADDON_DATA ───────────────────────────────────────────────────────────
  'MP100GB': 'ADDON_DATA',
  'MP30GB':  'ADDON_DATA',
  'ST5K':    'ADDON_DATA',
  'ST7K':    'ADDON_DATA',
  'ST10K':   'ADDON_DATA',
  'ST15K':   'ADDON_DATA',
  'ST30K':   'ADDON_DATA',
};

// ─── Chạy migration ───────────────────────────────────────────────────────────

const db = db.getSiblingDB('viettel'); // đổi tên DB nếu cần
const col = db.getCollection('goi_cuoc');

let updated = 0;
let skipped = 0;

for (const [maGoi, group] of Object.entries(BENEFIT_GROUP_MAP)) {
  const result = col.updateMany(
    { ma_goi: { $regex: new RegExp(`^${maGoi}$`, 'i') } },
    { $set: { benefit_group: group } }
  );
  if (result.modifiedCount > 0) {
    print(`✅  ${maGoi.padEnd(12)} → ${group} (${result.modifiedCount} docs)`);
    updated += result.modifiedCount;
  } else {
    print(`⬜  ${maGoi.padEnd(12)} → ${group} (không tìm thấy trong DB)`);
    skipped++;
  }
}

print('');
print(`=== Hoàn thành: ${updated} gói được cập nhật, ${skipped} mã không tồn tại trong DB ===`);
