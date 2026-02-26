/**
 * API Utility Module
 *
 * Provides authenticated fetch wrapper for making API calls to the backend.
 * Backend runs on port 3000, frontend on port 5173.
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

/**
 * Authenticated fetch wrapper
 * Automatically includes credentials and handles common request patterns
 *
 * @param {string} url - API endpoint (relative to base URL)
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
export async function authFetch(url, options = {}) {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

  const defaultOptions = {
    credentials: "include", // Include cookies for session auth
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  // Don't set Content-Type for FormData (browser will set it with boundary)
  if (options.body instanceof FormData) {
    delete defaultOptions.headers["Content-Type"];
  }

  const response = await fetch(fullUrl, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  });

  return response;
}

/**
 * GET request helper
 * @param {string} url - API endpoint
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Response>}
 */
export async function get(url, options = {}) {
  return authFetch(url, { ...options, method: "GET" });
}

/**
 * POST request helper
 * @param {string} url - API endpoint
 * @param {Object} data - Request body data
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Response>}
 */
export async function post(url, data, options = {}) {
  return authFetch(url, {
    ...options,
    method: "POST",
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
}

/**
 * PUT request helper
 * @param {string} url - API endpoint
 * @param {Object} data - Request body data
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Response>}
 */
export async function put(url, data, options = {}) {
  return authFetch(url, {
    ...options,
    method: "PUT",
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
}

/**
 * DELETE request helper
 * @param {string} url - API endpoint
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Response>}
 */
export async function del(url, options = {}) {
  return authFetch(url, { ...options, method: "DELETE" });
}

export default {
  authFetch,
  get,
  post,
  put,
  del,
};
