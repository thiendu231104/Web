const UserActivity = require('../models/UserActivity');

/**
 * Thuật toán Gộp log theo Phiên (Session-Scoped Package Aggregation)
 * Trong cùng 1 phiên (user_id hoặc session_id), mỗi package_id CHỈ TỒN TẠI TỐI ĐA 1 BẢN GHI.
 * Mọi hành động lặp lại trên cùng gói cước đó trong phiên BẮT BUỘC phải gộp/nâng cấp bản ghi cũ.
 */
async function logOrMergeActivity({
  req,
  userId = null,
  sessionId = null,
  packageId,
  actionType,
  flowType = null,
  searchKeyword = null,
  source = null
}) {
  try {
    // 1. Strict Rule A: Check Admin actor
    const userRole = req?.user?.role;
    if (userRole === 'admin' || userRole === 'ADMIN') {
      console.log('⏭️ Skipped logging for Admin user');
      return null;
    }

    // 2. Identify User ID vs Guest Session ID
    let finalUserId = req?.user?.user_id ?? req?.user?.id ?? userId ?? null;
    if (finalUserId !== null && finalUserId !== undefined) {
      finalUserId = Number(finalUserId);
      if (isNaN(finalUserId)) finalUserId = null;
    } else {
      finalUserId = null;
    }

    let finalSessionId = req?.headers?.['x-session-id'] ||
                         req?.headers?.['session-id'] ||
                         req?.cookies?.sessionId ||
                         req?.body?.session_id ||
                         req?.query?.session_id ||
                         sessionId ||
                         null;
    if (finalSessionId) {
      finalSessionId = String(finalSessionId).trim();
    }

    const targetPackageId = Number(packageId);
    if (isNaN(targetPackageId)) return null;

    const cleanKeyword = searchKeyword && typeof searchKeyword === 'string' ? searchKeyword.trim() : null;

    // Determine default source & flow_type if not provided
    let finalSource = source || (req?.body?.source ?? req?.query?.source ?? null);
    if (!finalSource) {
      if (cleanKeyword || actionType === 'SEARCH') {
        finalSource = 'search';
      } else if (actionType === 'COMPARE_AND_SUBSCRIBE') {
        finalSource = 'compare';
      } else {
        finalSource = 'detail';
      }
    }

    let finalFlowType = flowType;
    if (!finalFlowType) {
      if (actionType === 'SEARCH' || (actionType === 'VIEW_PACKAGE' && cleanKeyword)) {
        finalFlowType = 'SEARCH_VIEW';
      } else if (actionType === 'SUBSCRIBE' || actionType === 'COMPARE_AND_SUBSCRIBE') {
        if (finalSource === 'compare' || actionType === 'COMPARE_AND_SUBSCRIBE') {
          finalFlowType = 'COMPARE_SUBSCRIBE';
        } else if (cleanKeyword || finalSource === 'search') {
          finalFlowType = 'SEARCH_VIEW_SUBSCRIBE';
        } else {
          finalFlowType = 'VIEW_SUBSCRIBE';
        }
      } else {
        finalFlowType = 'VIEW_ONLY';
      }
    }

    // 3. Tìm bản ghi ĐÃ TỒN TẠI của gói cước này trong phiên hiện tại (No time limit)
    const query = { package_id: targetPackageId };
    if (finalUserId) {
      query.user_id = finalUserId;
    } else if (finalSessionId) {
      query.session_id = finalSessionId;
      query.user_id = null;
    } else {
      return null;
    }

    let existingLog = await UserActivity.findOne(query).sort({ created_at: -1 });

    if (existingLog) {
      // Deduplication Guard for React Strict Mode / fast re-renders (within 3 seconds for exact same action)
      const threeSecondsAgo = new Date(Date.now() - 3000);
      if (existingLog.action_type === actionType && 
          existingLog.flow_type === finalFlowType && 
          existingLog.created_at >= threeSecondsAgo) {
        console.log('⏭️ Bỏ qua log trùng lặp trong khoảng 3s');
        return existingLog;
      }

      // 4. NẾU ĐÃ CÓ -> GỘM VÀ CẬP NHẬT TRỰC TIẾP
      existingLog.action_type = actionType || existingLog.action_type;

      // Rules for flow_type evolution:
      if (actionType === 'SUBSCRIBE' || actionType === 'COMPARE_AND_SUBSCRIBE') {
        if (existingLog.flow_type === 'SEARCH_VIEW' || finalFlowType === 'SEARCH_VIEW_SUBSCRIBE') {
          existingLog.flow_type = 'SEARCH_VIEW_SUBSCRIBE';
        } else if (existingLog.flow_type === 'VIEW_ONLY' || finalFlowType === 'VIEW_SUBSCRIBE') {
          existingLog.flow_type = 'VIEW_SUBSCRIBE';
        } else if (finalSource === 'compare' || finalFlowType === 'COMPARE_SUBSCRIBE') {
          existingLog.flow_type = 'COMPARE_SUBSCRIBE';
        } else if (finalSource === 'search' || finalFlowType === 'SEARCH_SUBSCRIBE_DIRECT') {
          existingLog.flow_type = 'SEARCH_SUBSCRIBE_DIRECT';
        } else {
          existingLog.flow_type = finalFlowType || existingLog.flow_type;
        }
      } else if (finalFlowType) {
        if (existingLog.flow_type === 'VIEW_ONLY' && finalFlowType === 'SEARCH_VIEW') {
          existingLog.flow_type = 'SEARCH_VIEW';
        } else if (existingLog.flow_type.includes('SUBSCRIBE')) {
          // Keep subscribe state if already subscribed
        } else {
          existingLog.flow_type = finalFlowType;
        }
      }

      if (finalSource) {
        existingLog.source = finalSource;
      }
      if (cleanKeyword) {
        existingLog.search_keyword = cleanKeyword;
      }

      await existingLog.save();
      console.log('🔄 Đã gộp dữ liệu vào bản ghi cũ:', existingLog._id);
      return existingLog;
    } else {
      // 5. NẾU CHƯA CÓ -> MỚI TẠO BẢN GHI DUY NHẤT FOR PACKAGE IN SESSION
      const newLog = await UserActivity.create({
        user_id: finalUserId,
        session_id: finalSessionId,
        package_id: targetPackageId,
        action_type: actionType,
        flow_type: finalFlowType,
        source: finalSource,
        search_keyword: cleanKeyword,
        created_at: new Date()
      });
      console.log('✨ Tạo mới bản ghi phiên:', newLog._id);
      return newLog;
    }
  } catch (err) {
    console.error('❌ LỖI GHI/GỘM CSDL user_activities:', err);
    return null;
  }
}

const logUserActivity = logOrMergeActivity;

module.exports = {
  logUserActivity,
  logOrMergeActivity
};
