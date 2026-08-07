/**
 * sessionService.js — Session Memory & Candidate Package State Manager
 *
 * Chịu trách nhiệm:
 * - Tạo / load / cập nhật ChatSession trong MongoDB.
 * - Quyết định session hiện tại còn phù hợp (REFINEMENT) hay phải đóng và tạo mới (NEW SESSION).
 * - Lọc candidatePackages theo requirement mới (deterministic, không phụ thuộc LLM).
 * - LLM KHÔNG quản lý session. Backend quyết định hoàn toàn.
 *
 * NGUYÊN TẮC:
 * - `candidatePackageIds` (Pool gốc Lần 1): CỐ ĐỊNH, KHÔNG BAO GIỜ bị xóa/sửa trong suốt Session ACTIVE.
 * - `currentCandidatePackageIds`: Chỉ là kết quả tạm của lượt thoại gần nhất.
 * - Mọi lần refine (Lần 2, 3, 4...) LUÔN lọc từ `candidatePackageIds` gốc, KHÔNG lọc từ `currentCandidatePackageIds`.
 * - Session CLOSED + tạo mới: pool gốc cũng không còn candidate nào phù hợp → reset về toàn bộ DB.
 */

const ChatSession = require('../../models/ChatSession');
const Package = require('../../models/Package');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Tạo sessionKey nhất quán từ userId hoặc sessionId.
 */
function buildSessionKey(userId, sessionId) {
  if (userId) return `user:${String(userId)}`;
  if (sessionId) return `guest:${String(sessionId)}`;
  return null;
}

/**
 * Kiểm tra một package có thỏa mãn requirements hay không.
 * Đây là bộ lọc deterministic của Backend — không liên quan đến LLM.
 */
function packageMatchesRequirements(pkg, req) {
  if (!pkg || !req) return false;

  const cycleDays = Number(pkg.chu_ky_ngay) || 30;

  // --- Lọc theo is_combo ---
  if (req.is_combo === true) {
    const hasVoice = (Number(pkg.free_noi_mang) > 0 || Number(pkg.free_ngoai_mang) > 0);
    const isComboType = (pkg.service_group === 'COMBO' || pkg.system_type === 'COMBO' || pkg.benefit_group === 'COMBO' || (pkg.phan_loai_goi || '').toLowerCase() === 'combo');
    if (!hasVoice && !isComboType) return false;
  }

  // --- Lọc theo duration_days ---
  if (req.duration_days != null && req.duration_days > 0) {
    const dd = req.duration_days;
    if (dd === 30 || dd === 31) {
      if (cycleDays < 30) return false;
    } else if (dd === 180) {
      if (cycleDays !== 180) return false;
    } else if (dd === 360) {
      if (cycleDays < 360) return false;
    } else {
      if (Math.abs(cycleDays - dd) > 7) return false;
    }
  } else if (req.cycle_preference === 'monthly') {
    if (cycleDays < 30) return false;
  } else if (req.cycle_preference === 'short') {
    if (cycleDays >= 30) return false;
  } else if (req.cycle_preference === 'long_term') {
    if (cycleDays < 30) return false;
  }

  // --- Lọc theo budget_max ---
  if (req.budget_max != null && req.budget_max > 0) {
    if (Number(pkg.gia) > req.budget_max) return false;
  }

  // --- Lọc theo data_type: general (loại bỏ gói không có data lướt web) ---
  if (req.data_type === 'general') {
    const benefitGroup = pkg.benefit_group || '';
    const dataStr = String(pkg.data_theo_ngay || '').trim();
    const isAppOnly = ['APP_META', 'APP_TIKTOK', 'APP_YOUTUBE', 'APP_TV360'].includes(benefitGroup) || dataStr === '0' || dataStr === '';
    if (isAppOnly) return false;
  }

  return true;
}

/**
 * Kiểm tra requirement mới có phải là "Requirement Break" hay Refinement.
 *
 * LUÔN lọc từ `candidatePackageIds` GỐC (pool Lần 1) — KHÔNG lọc từ `currentCandidatePackageIds`.
 * Điều này đảm bảo:
 * - Lần 2 refine chỉ hỏi thêm điều kiện → backend tìm lại trong pool gốc Lần 1.
 * - Lần 3 refine thêm → vẫn tìm từ pool gốc Lần 1, không bị mất gói cước.
 * - Chỉ khi pool gốc Lần 1 KHÔNG có gói nào thỏa điều kiện mới → SESSION BREAK.
 *
 * Trả về:
 *   { isRefinement: true, filteredIds: [...], filteredPackages: [...] } — pool gốc còn >= 1 gói phù hợp
 *   { isRefinement: false }                                             — pool gốc = 0 gói phù hợp
 */
async function checkRefinementOrBreak(session, newRequirements) {
  // BẮT BUỘC dùng candidatePackageIds (pool gốc Lần 1), KHÔNG dùng currentCandidatePackageIds
  const originalPoolIds = session && session.candidatePackageIds;
  if (!originalPoolIds || originalPoolIds.length === 0) {
    return { isRefinement: false };
  }

  // Load toàn bộ packages từ pool gốc Lần 1
  const originalPkgs = await Package.find({
    package_id: { $in: originalPoolIds }
  }).lean();

  if (!originalPkgs || originalPkgs.length === 0) {
    return { isRefinement: false };
  }

  // Lọc theo requirement mới trên TẬP GỐC
  const filtered = originalPkgs.filter(pkg => packageMatchesRequirements(pkg, newRequirements));

  if (filtered.length === 0) {
    // Pool gốc Lần 1 cũng không có gói nào phù hợp → Requirement Break → Tạo Session mới
    return { isRefinement: false };
  }

  return {
    isRefinement: true,
    filteredIds: filtered.map(p => p.package_id),
    filteredPackages: filtered
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Tải session ACTIVE hiện tại của user/guest.
 * Nếu không có session ACTIVE, trả về null.
 */
async function getActiveSession(userId, sessionId) {
  const key = buildSessionKey(userId, sessionId);
  if (!key) return null;

  return await ChatSession.findOne({ sessionKey: key, status: 'ACTIVE' })
    .sort({ updatedAt: -1 })
    .lean();
}

/**
 * Đóng session ACTIVE hiện tại (gán status = CLOSED).
 */
async function closeSession(sessionId) {
  if (!sessionId) return;
  await ChatSession.findByIdAndUpdate(sessionId, { status: 'CLOSED' });
}

/**
 * Tạo session mới ACTIVE với candidates ban đầu từ full DB search.
 */
async function createSession(userId, sessionId, requirements, candidatePackages) {
  const key = buildSessionKey(userId, sessionId);
  if (!key) return null;

  const candidateIds = (candidatePackages || []).map(p => p.package_id || p.numericId).filter(Boolean);

  const session = await ChatSession.create({
    sessionKey: key,
    userId: userId || null,
    sessionId: userId ? null : sessionId,
    status: 'ACTIVE',
    originalRequirements: requirements,
    currentRequirements: requirements,
    candidatePackageIds: candidateIds,
    currentCandidatePackageIds: candidateIds,
    refinementCount: 0
  });

  return session;
}

/**
 * Cập nhật session sau khi refine (lọc xuống nhóm candidates nhỏ hơn).
 */
async function updateSessionAfterRefinement(session, newRequirements, filteredIds) {
  if (!session || !session._id) return;

  await ChatSession.findByIdAndUpdate(session._id, {
    currentRequirements: newRequirements,
    currentCandidatePackageIds: filteredIds,
    refinementCount: (session.refinementCount || 0) + 1
  });
}

/**
 * Hàm chính — Orchestrate Session Memory logic.
 *
 * Flow:
 * 1. Load session ACTIVE hiện tại.
 * 2. Nếu có session ACTIVE + requirements mới còn candidates → REFINEMENT.
 * 3. Nếu không → CLOSE session cũ, tạo session mới với full DB search.
 *
 * @param {ObjectId|null} userId
 * @param {string|null}   guestSessionId
 * @param {object}        newRequirements — intent đã trích xuất từ NLU Pass 1
 * @param {function}      fullDbSearchFn  — hàm async (requirements) => packages[] — Pure RAG search
 *
 * @returns {{ packages: Package[], sessionMode: 'REFINEMENT'|'NEW_SESSION', session: ChatSession }}
 */
async function resolveSessionPackages(userId, guestSessionId, newRequirements, fullDbSearchFn) {
  const activeSession = await getActiveSession(userId, guestSessionId);

  // --- TH1: Không có session ACTIVE hoặc là greeting ---
  if (!activeSession) {
    const freshPackages = await fullDbSearchFn(newRequirements);
    const session = await createSession(userId, guestSessionId, newRequirements, freshPackages);
    return { packages: freshPackages, sessionMode: 'NEW_SESSION', session };
  }

  // --- TH2: Có session ACTIVE → Kiểm tra refinement hay break ---
  const { isRefinement, filteredIds, filteredPackages } = await checkRefinementOrBreak(activeSession, newRequirements);

  if (isRefinement && filteredIds && filteredIds.length > 0) {
    // REFINEMENT: cập nhật session, trả về packages đã lọc
    await updateSessionAfterRefinement(activeSession, newRequirements, filteredIds);
    console.log(`[SessionService] REFINEMENT: session ${activeSession._id} — ${filteredIds.length} candidates remaining.`);
    return { packages: filteredPackages, sessionMode: 'REFINEMENT', session: activeSession };
  } else {
    // REQUIREMENT BREAK: đóng session cũ, tạo session mới với full DB search
    await closeSession(activeSession._id);
    console.log(`[SessionService] SESSION BREAK: session ${activeSession._id} CLOSED. Creating new session...`);

    const freshPackages = await fullDbSearchFn(newRequirements);
    const newSession = await createSession(userId, guestSessionId, newRequirements, freshPackages);
    return { packages: freshPackages, sessionMode: 'NEW_SESSION', session: newSession };
  }
}

module.exports = {
  resolveSessionPackages,
  getActiveSession,
  closeSession,
  createSession
};
