const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Package = require('./models/Package');
require('dotenv').config();

const csvPath = 'd:\\webviettel\\goicuocviettel.csv';
const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!uri) {
  console.error("No MONGODB_URI found in env!");
  process.exit(1);
}

// Helper to extract package code (e.g. "SD90 -30 ngày" -> "SD90")
function extractPackageCode(name) {
  if (!name) return 'UNKNOWN';
  return name.split('-')[0].split(' ')[0].trim().toUpperCase();
}

// Helper to parse cycle days (e.g. "30 ngày" -> "30")
function extractCycleDays(durationStr) {
  if (!durationStr) return '30';
  const match = durationStr.match(/\d+/);
  return match ? match[0] : '30';
}

async function seed() {
  try {
    console.log("Connecting to MongoDB for seeding...");
    await mongoose.connect(uri, { dbName: 'goicuocviettel' });
    console.log("Connected successfully!");

    const csvRows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (data) => csvRows.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Loaded ${csvRows.length} packages from CSV.`);

    let insertedCount = 0;
    let skippedCount = 0;

    for (const row of csvRows) {
      const ma_goi = extractPackageCode(row.ten);
      
      // Check if already exists in DB (by ma_goi or id or ten)
      const existing = await Package.findOne({ 
        $or: [
          { ma_goi: ma_goi },
          { id: parseInt(row.id) },
          { ten: row.ten }
        ] 
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Determine category (phan_loai_goi)
      let phan_loai_goi = 'Data';
      if (row.Nhom_Goi) {
        if (row.Nhom_Goi.includes('Combo') || row.thoai) {
          phan_loai_goi = 'Combo';
        } else if (row.Nhom_Goi.includes('MXH') || row.Nhom_Goi.includes('Giải Trí') || row.uudaingoai) {
          phan_loai_goi = 'Social';
        }
      }

      // Create new package doc matching goi_cuoc collection schema
      const newPkgData = {
        id: parseInt(row.id),
        ma_goi: ma_goi,
        ten: row.ten,
        dohot: row.dohot || 'normal',
        phan_loai_goi: phan_loai_goi,
        gia: parseInt(row.gia) || 0,
        phan_khuc_gia: parseInt(row.gia) < 50000 ? 'Gia_re' : parseInt(row.gia) <= 150000 ? 'Trung_binh' : 'Cao_cap',
        data_theo_ngay: row.dulieu || '',
        free_noi_mang: row.thoai && row.thoai.includes('nội mạng') ? row.thoai : '0',
        free_ngoai_mang: row.thoai && row.thoai.includes('ngoại mạng') ? row.thoai : '0',
        tienich: row.tienich || '0',
        sms: row.sms || '0',
        doi_tuong_ap_dung: row.doituong || 'Tất cả thuê bao',
        dieu_kien_dang_ky: row.doituong || 'Thuê bao di động hoạt động bình thường',
        chinh_sach_ap_dung: row.uudaitrong || 'Tự động gia hạn.',
        noi_dung_ngoai: row.uudaingoai || '0',
        tien_ich_free: row.tienich || '0',
        uudaitrong: row.uudaitrong || '',
        chu_ky_ngay: extractCycleDays(row.thoigian),
        dangky: row.dangky || `Soạn ${ma_goi} gửi 191`,
        huygiahan: row.huygiahan || 'Soạn HUY gửi 191',
        huygoicuoc: row.huygoicuoc || 'Soạn HUYDATA gửi 191',
        diem_noi_bat: row.taggoiy ? row.taggoiy.split(',')[0] : '',
        do_uu_tien: '1',
        goi_thay_the: '',
        
        // Save CSV columns too just in case
        loai: row.loai,
        dulieu: row.dulieu,
        thoai: row.thoai,
        noidung: row.noidung,
        uudaingoai: row.uudaingoai,
        thoigian: row.thoigian,
        tang: row.tang,
        taggoiy: row.taggoiy,
        Nhom_Goi: row.Nhom_Goi
      };

      await Package.create(newPkgData);
      insertedCount++;
    }

    console.log(`Seeding complete. Inserted: ${insertedCount}, Skipped (already exist): ${skippedCount}`);

    // If database is completely empty (should not be as cluster already has 999 docs), we can check
    const totalCount = await Package.countDocuments();
    console.log(`Total packages in DB now: ${totalCount}`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

seed();
