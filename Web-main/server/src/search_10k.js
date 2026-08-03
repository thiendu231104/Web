const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

async function run() {
  try {
    await mongoose.connect(uri, { dbName: 'goicuocviettel' });
    console.log("Connected to MongoDB");

    const packages = await mongoose.connection.db.collection('goi_cuoc').find({ gia: 10000 }).toArray();
    console.log("All 10k Packages:\n", JSON.stringify(packages.map(p => ({
      ma_goi: p.ma_goi,
      ten: p.ten,
      gia: p.gia,
      chu_ky_ngay: p.chu_ky_ngay,
      phan_loai_goi: p.phan_loai_goi,
      data_theo_ngay: p.data_theo_ngay,
      tien_ich_free: p.tien_ich_free
    })), null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

run();
