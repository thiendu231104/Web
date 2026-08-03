let timeOffsetMs = 0;

/**
 * Lấy mốc thời gian hệ thống (Thời gian thực + Time Offset)
 */
function getVirtualDate() {
  return new Date(Date.now() + timeOffsetMs);
}

/**
 * Đặt mốc thời gian ảo mới cho toàn bộ hệ thống
 */
function setVirtualDate(targetDate) {
  if (!targetDate) return getVirtualDate();
  const targetMs = new Date(targetDate).getTime();
  if (isNaN(targetMs)) return getVirtualDate();
  timeOffsetMs = targetMs - Date.now();
  return getVirtualDate();
}

/**
 * Cộng thêm khoảng thời gian (miliseconds) vào thời gian ảo
 */
function advanceVirtualTime(ms) {
  timeOffsetMs += Number(ms) || 0;
  return getVirtualDate();
}

/**
 * Cài lại thời gian thực hệ thống
 */
function resetVirtualTime() {
  timeOffsetMs = 0;
  return getVirtualDate();
}

/**
 * Kiểm tra xem thời gian ảo có đang khác thời gian thực hay không
 */
function isCustomTime() {
  return timeOffsetMs !== 0;
}

function getTimeOffsetMs() {
  return timeOffsetMs;
}

module.exports = {
  getVirtualDate,
  setVirtualDate,
  advanceVirtualTime,
  resetVirtualTime,
  isCustomTime,
  getTimeOffsetMs
};
