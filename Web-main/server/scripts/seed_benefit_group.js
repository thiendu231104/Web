/**
 * seed_benefit_group.js
 * Chạy: node scripts/seed_benefit_group.js
 * (từ thư mục d:\viettel\server)
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const BENEFIT_GROUP_MAP = {
  // FACEBOOK
  'FB5K': 'FACEBOOK', 'FB15K': 'FACEBOOK', 'FB50K': 'FACEBOOK',
  '3FB30': 'FACEBOOK', '6FB30': 'FACEBOOK', '12FB30': 'FACEBOOK', '12FB50K': 'FACEBOOK',
  // YOUTUBE
  'YT5K': 'YOUTUBE', 'YT15K': 'YOUTUBE', 'YT50K': 'YOUTUBE', 'YT10N': 'YOUTUBE',
  // TIKTOK
  'T5K': 'TIKTOK', 'T15KN': 'TIKTOK', 'TIK10N': 'TIKTOK',
  // SPORT
  '5GSPORT': 'SPORT',
  // MOVIE
  '5GPHIM': 'MOVIE',
  // GENERAL_DATA
  'SD90': 'GENERAL_DATA', 'SD150': 'GENERAL_DATA', '5G150': 'GENERAL_DATA',
  '5G230B': 'GENERAL_DATA', '12SD150': 'GENERAL_DATA', '5G480B': 'GENERAL_DATA',
  // VOICE_SMS
  'T30': 'VOICE_SMS', 'T50K': 'VOICE_SMS', 'DT20K': 'VOICE_SMS', 'DT50K': 'VOICE_SMS',
  'DT100K': 'VOICE_SMS', 'DT200K': 'VOICE_SMS', 'TV35K': 'VOICE_SMS',
  'TV65K': 'VOICE_SMS', 'TV7K': 'VOICE_SMS',
  // ADDON_DATA
  'MP100GB': 'ADDON_DATA', 'MP30GB': 'ADDON_DATA',
  'ST5K': 'ADDON_DATA', 'ST7K': 'ADDON_DATA', 'ST10K': 'ADDON_DATA',
  'ST15K': 'ADDON_DATA', 'ST30K': 'ADDON_DATA',
};

async function run() {
  await mongoose.connect(MONGODB_URI);
  const col = mongoose.connection.collection('goi_cuoc');

  let totalUpdated = 0;
  let notFound = [];

  for (const [maGoi, group] of Object.entries(BENEFIT_GROUP_MAP)) {
    const res = await col.updateMany(
      { ma_goi: { $regex: new RegExp(`^${maGoi}$`, 'i') } },
      { $set: { benefit_group: group } }
    );
    if (res.modifiedCount > 0) {
      console.log(`✅  ${maGoi.padEnd(12)} → ${group} (${res.modifiedCount} docs)`);
      totalUpdated += res.modifiedCount;
    } else {
      notFound.push(maGoi);
    }
  }

  if (notFound.length) {
    console.log(`\n⬜  Không tìm thấy trong DB: ${notFound.join(', ')}`);
  }
  console.log(`\n=== Hoàn thành: ${totalUpdated} gói đã được cập nhật benefit_group ===`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
