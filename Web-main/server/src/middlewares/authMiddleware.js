const crypto = require('crypto');
const Account = require('../models/Account');

const JWT_SECRET = process.env.JWT_SECRET || 'viettel_default_secret_key_123';

function base64url(source) {
  let encoded = Buffer.from(source).toString('base64');
  return encoded.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function decodeBase64url(source) {
  let base64 = source.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

// Generate JWT signed with HMAC-SHA256
function generateToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const stringifiedHeader = base64url(JSON.stringify(header));
  const stringifiedPayload = base64url(JSON.stringify(payload));
  const signatureInput = `${stringifiedHeader}.${stringifiedPayload}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(signatureInput).digest('base64url');
  return `${signatureInput}.${signature}`;
}

// Verify JWT signed with HMAC-SHA256
function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signature] = parts;
    
    const signatureInput = `${headerB64}.${payloadB64}`;
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(signatureInput).digest('base64url');
    
    if (signature !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(decodeBase64url(payloadB64));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

// Middleware: Authenticate Token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Yêu cầu đăng nhập để truy cập tài nguyên.' 
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(403).json({ 
        success: false, 
        message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' 
      });
    }

    const account = await Account.findOne({ user_id: decoded.userId });
    if (!account) {
      return res.status(401).json({ 
        success: false, 
        message: 'Tài khoản không tồn tại trong hệ thống.' 
      });
    }

    if (account.status === 'blocked') {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản này đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.'
      });
    }

    req.user = account;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware: Role check (RBAC)
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Bạn không có quyền thực hiện hành động này.' 
      });
    }
    next();
  };
};

const decodeTokenOptional = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const account = await Account.findOne({ user_id: decoded.userId });
        if (account && account.status !== 'blocked') {
          req.user = account;
        }
      }
    }
  } catch (error) {
    // Ignore decoding errors for guest access
  }
  next();
};

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  requireRole,
  decodeTokenOptional
};
