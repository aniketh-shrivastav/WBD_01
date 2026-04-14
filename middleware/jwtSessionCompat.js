const {
  AUTH_COOKIE_NAME,
  verifyAuthToken,
  createSessionId,
} = require("../utils/jwtSession");

const sessionStore = new Map();

function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const eqIndex = part.indexOf("=");
      if (eqIndex === -1) return acc;
      const key = part.slice(0, eqIndex).trim();
      const value = decodeURIComponent(part.slice(eqIndex + 1).trim());
      acc[key] = value;
      return acc;
    }, {});
}

function isSwaggerDocsRequest(req) {
  const referer = req.headers.referer || "";
  return referer.includes("/api-docs");
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // In Swagger UI, require explicit Authorize token entry.
  if (isSwaggerDocsRequest(req)) {
    return null;
  }

  const cookies = parseCookies(req.headers.cookie || "");
  if (cookies[AUTH_COOKIE_NAME]) {
    return cookies[AUTH_COOKIE_NAME];
  }

  return null;
}

function createSessionObject(state, req) {
  return new Proxy(state, {
    get(target, prop) {
      if (prop === "destroy") {
        return (callback) => {
          if (target.sid) {
            sessionStore.delete(target.sid);
          }
          delete target.user;
          req.user = null;
          if (typeof callback === "function") callback();
        };
      }
      return target[prop];
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

function jwtSessionCompat(req, _res, next) {
  const token = getTokenFromRequest(req);

  let user = null;
  let sid = createSessionId();

  if (token) {
    try {
      const payload = verifyAuthToken(token);
      sid = payload.sid || sid;
      user = {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        role: payload.role,
        profilePicture: payload.profilePicture,
      };
    } catch {
      // Invalid token: continue unauthenticated.
    }
  }

  const sessionState = sessionStore.get(sid) || { sid };
  if (user) {
    sessionState.user = user;
  } else {
    delete sessionState.user;
  }

  sessionStore.set(sid, sessionState);
  req.user = sessionState.user || null;
  req.session = createSessionObject(sessionState, req);

  next();
}

module.exports = {
  jwtSessionCompat,
};
