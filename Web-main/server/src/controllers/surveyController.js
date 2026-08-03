const surveyService = require('../services/surveyService');

module.exports = {
  getConfig: async (req, res, next) => {
    try {
      const answersStr = req.query.answers;
      let answers = {};
      if (answersStr) {
        try {
          answers = JSON.parse(answersStr);
        } catch (e) {
          // Bỏ qua lỗi phân tích JSON
        }
      }
      const result = await surveyService.evaluateState(req.user, answers);
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  },

  submitAnswers: async (req, res, next) => {
    try {
      const userId = req.user ? req.user.user_id : null;
      const { answers, phone, full_name, fullName } = req.body;
      const finalPhone = phone || (answers ? (answers.phone || answers.phoneNumber) : '');
      const finalFullName = full_name || fullName || (answers ? (answers.full_name || answers.fullName || answers.name) : '');

      const result = await surveyService.submitSurveyAnswers(
        userId, 
        answers || {}, 
        finalPhone, 
        finalFullName
      );

      res.status(200).json({
        success: true,
        isCompleted: result.isCompleted,
        message: result.message,
        answers: answers || {},
        packages: result.packages || [],
        nextQuestion: result.nextQuestion || null,
        remainingCount: result.remainingCount || 0,
        currentStepNum: result.currentStepNum || 1,
        totalFixedSteps: result.totalFixedSteps || 3,
        isDynamicPhase: result.isDynamicPhase || false
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/survey/history
   * Lấy lịch sử câu trả lời và kết quả gợi ý trước đó của User
   */
  getHistory: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const result = await surveyService.getSurveyHistory(userId);

      if (!result) {
        return res.status(200).json({
          success: true,
          hasHistory: false,
          message: 'Không tìm thấy lịch sử khảo sát của người dùng.'
        });
      }

      res.status(200).json({
        success: true,
        hasHistory: true,
        isCompleted: true,
        message: 'Lịch sử khảo sát trước đây',
        answers: result.history.answers,
        packages: result.packages || [],
        remainingCount: (result.packages || []).length
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/survey/history
   * Xóa thông tin lịch sử khảo sát hiện tại của User
   */
  deleteHistory: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const success = await surveyService.deleteSurveyHistory(userId);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy lịch sử khảo sát nào để xóa.'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Xóa lịch sử khảo sát thành công!'
      });
    } catch (error) {
      next(error);
    }
  },

  getAdminHistory: async (req, res, next) => {
    try {
      const { search } = req.query;
      const history = await surveyService.getAllSurveys({ search });
      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }
};

