const Contact = require('../models/Contact');
const crypto = require('crypto');

// Helper for migrating old format data on the fly
const normalizeContact = async (contact) => {
  if (!contact) return contact;
  const message = contact.message || '';
  const match = message.match(/^\[Chủ đề:\s*(.*?)\]\s*([\s\S]*)$/i) || message.match(/^\[(.*?)\]\s*([\s\S]*)$/);
  if (match) {
    const extractedTopic = match[1].trim();
    const extractedMessage = match[2].trim();
    contact.topic = extractedTopic;
    contact.message = extractedMessage;
    await Contact.updateOne({ _id: contact._id }, { $set: { topic: extractedTopic, message: extractedMessage } });
  }
  return contact;
};

const contactController = {
  createContact: async (req, res, next) => {
    try {
      const { full_name, phone, message, topic } = req.body;

      if (!full_name || !full_name.trim()) {
        return res.status(400).json({ success: false, message: 'Họ và tên là bắt buộc.' });
      }
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phone || !phoneRegex.test(phone)) {
        return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ.' });
      }
      if (!message || message.trim().length < 10) {
        return res.status(400).json({ success: false, message: 'Nội dung liên hệ phải có ít nhất 10 ký tự.' });
      }

      let user_id = null;
      let source = 'guest';
      if (req.user) {
        user_id = req.user.user_id;
        source = 'user';
      }

      const contact_id = 'CT' + Date.now() + crypto.randomInt(1000, 9999);
      const newContact = new Contact({
        contact_id,
        user_id,
        full_name: full_name.trim(),
        phone: phone.trim(),
        topic: (topic && topic.trim()) ? topic.trim() : 'Liên hệ chung',
        message: message.trim(),
        source,
        status: 'NEW'
      });

      await newContact.save();

      return res.status(201).json({
        success: true,
        message: 'Gửi yêu cầu liên hệ thành công!',
        data: newContact
      });
    } catch (error) {
      next(error);
    }
  },

  getAdminContacts: async (req, res, next) => {
    try {
      const { status, search, source, is_deleted_by_user } = req.query;
      const mongoQuery = {};

      if (status && status !== 'ALL') {
        if (status === 'PENDING') {
          mongoQuery.status = { $in: ['NEW', 'READ', 'PROCESSING'] };
        } else {
          mongoQuery.status = status;
        }
      }

      if (source && source !== 'ALL') {
        mongoQuery.source = source;
      }

      if (is_deleted_by_user === 'true') {
        mongoQuery.is_deleted_by_user = true;
      } else if (is_deleted_by_user === 'false') {
        mongoQuery.is_deleted_by_user = { $ne: true };
      }

      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        mongoQuery.$or = [
          { full_name: searchRegex },
          { phone: searchRegex },
          { contact_id: searchRegex },
          { topic: searchRegex },
          { message: searchRegex }
        ];
      }

      const contacts = await Contact.find(mongoQuery).sort({ created_at: -1 });

      const normalized = [];
      for (const contact of contacts) {
        normalized.push(await normalizeContact(contact));
      }

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách liên hệ thành công.',
        data: normalized
      });
    } catch (error) {
      next(error);
    }
  },

  updateContactReply: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { admin_note, status } = req.body;

      const updateData = {
        handled_at: new Date()
      };

      if (admin_note !== undefined) {
        updateData.admin_note = admin_note.trim();
      }

      if (status) {
        updateData.status = status;
      } else if (admin_note && admin_note.trim()) {
        updateData.status = 'DONE';
      }

      if (req.user) {
        updateData.handled_by = req.user.user_id || req.user.id || 1;
      }

      const query = id.startsWith('CT') ? { contact_id: id } : { _id: id };

      const updatedContact = await Contact.findOneAndUpdate(
        query,
        { $set: updateData },
        { new: true }
      );

      if (!updatedContact) {
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy liên hệ với ID ${id}`
        });
      }

      if (updatedContact.user_id !== null && updatedContact.user_id !== undefined && admin_note && admin_note.trim()) {
        try {
          const notificationService = require('../services/notificationService');
          await notificationService.createNotification({
            userId: updatedContact.user_id,
            title: "CSKH Viettel phản hồi yêu cầu hỗ trợ",
            content: admin_note.trim(),
            type: "SUPPORT",
            link: `/contact?tab=history&id=${updatedContact.contact_id}`
          });
        } catch (err) {
          console.error("Failed to create contact reply notification:", err);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Cập nhật phản hồi thành công",
        data: updatedContact
      });
    } catch (error) {
      next(error);
    }
  },

  getMyRequests: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const contacts = await Contact.find({ user_id: userId, is_deleted_by_user: { $ne: true } }).sort({ created_at: -1 });

      const normalized = [];
      for (const contact of contacts) {
        normalized.push(await normalizeContact(contact));
      }

      return res.status(200).json({
        success: true,
        data: normalized
      });
    } catch (error) {
      next(error);
    }
  },

  getUserHistory: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const contacts = await Contact.find({ user_id: userId, is_deleted_by_user: { $ne: true } }).sort({ created_at: -1 });

      const normalized = [];
      for (const contact of contacts) {
        normalized.push(await normalizeContact(contact));
      }

      return res.status(200).json({
        success: true,
        data: normalized
      });
    } catch (error) {
      next(error);
    }
  },

  getGuestHistory: async (req, res, next) => {
    try {
      const { contact_ids, contact_id, phone } = req.body;
      let query = { is_deleted_by_user: { $ne: true } };

      if (Array.isArray(contact_ids) && contact_ids.length > 0) {
        query.contact_id = { $in: contact_ids };
      } else if (contact_id && phone) {
        query.contact_id = contact_id.trim();
        query.phone = phone.trim();
      } else if (contact_id) {
        query.contact_id = contact_id.trim();
      } else if (phone) {
        query.phone = phone.trim();
      } else {
        return res.status(200).json({
          success: true,
          data: []
        });
      }

      const contacts = await Contact.find(query).sort({ created_at: -1 });

      const normalized = [];
      for (const contact of contacts) {
        normalized.push(await normalizeContact(contact));
      }

      return res.status(200).json({
        success: true,
        data: normalized
      });
    } catch (error) {
      next(error);
    }
  },

  lookupContacts: async (req, res, next) => {
    try {
      const { phone, contact_id } = req.query;
      let query = { is_deleted_by_user: { $ne: true } };

      if (contact_id && phone) {
        query.contact_id = contact_id.trim();
        query.phone = phone.trim();
      } else if (phone) {
        query.phone = phone.trim();
      } else if (contact_id) {
        query.contact_id = contact_id.trim();
      } else {
        return res.status(400).json({
          success: false,
          message: 'Cần truyền số điện thoại hoặc mã yêu cầu để tra cứu.'
        });
      }

      const contacts = await Contact.find(query).sort({ created_at: -1 });

      const normalized = [];
      for (const contact of contacts) {
        normalized.push(await normalizeContact(contact));
      }

      return res.status(200).json({
        success: true,
        data: normalized
      });
    } catch (error) {
      next(error);
    }
  },

  guestLookup: async (req, res, next) => {
    try {
      const { phone, contact_id } = req.body;
      if (!phone || !phone.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại tra cứu là bắt buộc.'
        });
      }

      const query = {
        phone: phone.trim(),
        is_deleted_by_user: { $ne: true }
      };

      if (contact_id && contact_id.trim()) {
        query.contact_id = contact_id.trim();
      }

      const results = await Contact.find(query).sort({ created_at: -1 });

      const normalized = [];
      for (const contact of results) {
        normalized.push(await normalizeContact(contact));
      }

      return res.status(200).json({
        success: true,
        data: normalized
      });
    } catch (error) {
      next(error);
    }
  },

  softDeleteHistory: async (req, res, next) => {
    try {
      const { id } = req.params;
      const query = id.startsWith('CT') ? { contact_id: id } : { _id: id };

      const updated = await Contact.findOneAndUpdate(
        query,
        { $set: { is_deleted_by_user: true, deleted_at_by_user: new Date() } },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy liên hệ cần xóa.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Ẩn lịch sử phản hồi thành công.',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  },

  softDeleteAllHistory: async (req, res, next) => {
    try {
      const { contact_ids } = req.body;
      let filter = {};

      if (req.user && req.user.user_id) {
        filter.user_id = req.user.user_id;
      } else if (Array.isArray(contact_ids) && contact_ids.length > 0) {
        filter.contact_id = { $in: contact_ids };
      } else {
        return res.status(400).json({
          success: false,
          message: 'Không có danh sách yêu cầu để xóa.'
        });
      }

      await Contact.updateMany(
        filter,
        { $set: { is_deleted_by_user: true, deleted_at_by_user: new Date() } }
      );

      return res.status(200).json({
        success: true,
        message: 'Đã xóa tất cả lịch sử phản hồi.'
      });
    } catch (error) {
      next(error);
    }
  },

  deleteContact: async (req, res, next) => {
    try {
      const { id } = req.params;
      const deleted = await Contact.findOneAndDelete({ contact_id: id });
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy liên hệ.' });
      }
      return res.status(200).json({ success: true, message: 'Xóa liên hệ thành công.' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = contactController;
