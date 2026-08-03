const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  package_id: { type: Number, required: true, unique: true, alias: 'id' },
  ma_goi: { type: String, required: true, index: true },
  ten: { type: String, required: true },
  dohot: { type: String, default: 'normal' },
  phan_loai_goi: { type: String, default: 'Data' },
  gia: { type: Number, required: true },
  data_theo_ngay: { type: String, default: '' },
  free_ngoai_mang: { type: Number, default: 0 },
  free_noi_mang: { type: Number, default: 0 },
  sms: { type: Number, default: 0 },
  doi_tuong_ap_dung: { type: String, default: '' },
  noi_dung_ngoai: { type: String, default: null },
  tien_ich_free: { type: String, default: null },
  data_meta: { type: String, default: null },
  uudaitrong: { type: String, default: '' },
  chu_ky_ngay: { type: Number, default: 30 },
  dangky: { type: String, default: null },
  huygiahan: { type: String, default: null },
  huygoicuoc: { type: String, default: null },
  is_auto_renew: { type: Boolean, default: true },
  service_group: { type: String, default: 'daily_data' },
  registration_policy: { type: String, default: 'ALLOW' },
  allow_parallel_with: { type: [String], default: [] },
  system_type: { type: String, default: 'DATA_BASE' },
  is_addon: { type: Boolean, default: false },
  requires_base_package: { type: Boolean, default: false },
  benefit_group: { type: String, default: 'DATA_MAIN' }
}, { 
  collection: 'goi_cuoc', 
  timestamps: true 
});

packageSchema.index({ ten: 1 });
packageSchema.index({ phan_loai_goi: 1 });
packageSchema.index({ system_type: 1 });

module.exports = mongoose.model('Package', packageSchema);
