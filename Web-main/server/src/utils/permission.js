/**
 * Evaluates if a user (or guest if null) has permission to view a package.
 * Rules:
 * 1. Admin has unrestricted access.
 * 2. KHTT (khach_hang_than_thiet) packages require user.is_loyal_customer === true.
 *    If the package also mentions tra_truoc or tra_sau, the corresponding subscription type must match too.
 * 3. Guest (user is null/undefined) can view general, tra_truoc, tra_sau packages but CANNOT view KHTT packages.
 * 4. User prepaid (tra_truoc) can view general and tra_truoc packages, but CANNOT view tra_sau.
 *    If package is KHTT, must also be is_loyal_customer === true.
 * 5. User postpaid (tra_sau) can view general and tra_sau packages, but CANNOT view tra_truoc.
 *    If package is KHTT, must also be is_loyal_customer === true.
 */
function canViewPackage(user, pkg) {
  if (!pkg) return false;

  // 1. Guest (unauthenticated) has 100% access to all packages
  if (!user) return true;

  // 2. Admin has 100% access
  if (user.role === 'admin' || user.role === 'Admin') return true;

  const targetStr = (pkg.doi_tuong_ap_dung || pkg.conditions || '').toLowerCase();
  const descStr = (pkg.dieu_kien_dang_ky || pkg.description || '').toLowerCase();

  const isLoyalPkg = targetStr.includes('khach_hang_than_thiet') || descStr.includes('khach_hang_than_thiet');
  const isPrepaidPkg = targetStr.includes('tra_truoc') || descStr.includes('tra_truoc');
  const isPostpaidPkg = targetStr.includes('tra_sau') || descStr.includes('tra_sau');

  const userType = user.subscription_type || 'tra_truoc';
  const isLoyalUser = !!user.is_loyal_customer;

  // 3. Loyalty Check: nếu package có khach_hang_than_thiet chỉ cho phép khi is_loyal_customer = true
  if (isLoyalPkg && !isLoyalUser) {
    return false;
  }

  // 4. Prepaid Check: nếu subscription_type = tra_truoc ẩn toàn bộ gói chỉ dành cho tra_sau
  if (userType === 'tra_truoc' && isPostpaidPkg && !isPrepaidPkg) {
    return false;
  }

  // 5. Postpaid Check: nếu subscription_type = tra_sau ẩn toàn bộ gói chỉ dành cho tra_truoc
  if (userType === 'tra_sau' && isPrepaidPkg && !isPostpaidPkg) {
    return false;
  }

  return true;
}

module.exports = { canViewPackage };
