import forgotPasswordHandler from '../../api/auth/forgot-password.js';
import registerPhoneHandler from '../../api/auth/register-phone.js';
import resetPasswordHandler from '../../api/auth/reset-password.js';
import sendOtpHandler from '../../api/auth/send-otp.js';
import verifyOtpHandler from '../../api/auth/verify-otp.js';

const handlers = {
  '/api/auth/forgot-password': forgotPasswordHandler,
  '/api/auth/register-phone': registerPhoneHandler,
  '/api/auth/reset-password': resetPasswordHandler,
  '/api/auth/send-otp': sendOtpHandler,
  '/api/auth/verify-otp': verifyOtpHandler
};

export default async (request, context) => {
  const url = new URL(request.url);
  // Get path from query param 'path' or default to parsing the URL pathname
  let relativePath = url.searchParams.get('path');
  let path;
  
  if (relativePath) {
    // Standardize leading slash
    path = relativePath.startsWith('/') ? `/api${relativePath}` : `/api/${relativePath}`;
  } else {
    path = url.pathname.replace(/\/$/, '');
    if (path.startsWith('/.netlify/functions/api')) {
      path = path.replace('/.netlify/functions/api', '/api');
    }
  }

  // Find matching handler
  const handler = handlers[path];
  if (!handler) {
    console.error(`[netlify-api-gateway] Endpoint not found: ${path}`);
    return new Response(JSON.stringify({ error: `Endpoint ${path} not found.` }), {
      status: 404,
      headers: { 'content-type': 'application/json' }
    });
  }

  // Parse headers into plain object
  const reqHeaders = {};
  request.headers.forEach((value, key) => {
    reqHeaders[key] = value;
  });

  // Extract IP address from Netlify Context
  const ip = context.ip || reqHeaders['x-forwarded-for'] || '';

  // Parse body if applicable
  let reqBody = {};
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      reqBody = await request.json();
    } catch (e) {
      // Body might be empty or not JSON
    }
  }

  // Mock Request object (Vercel-like)
  const req = {
    method: request.method,
    headers: reqHeaders,
    body: reqBody,
    socket: { remoteAddress: ip }
  };

  // Mock Response object (Vercel-like)
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.headers['content-type'] = 'application/json';
      this.body = JSON.stringify(data);
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    }
  };

  try {
    console.log(`[netlify-api-gateway] Invoking handler for endpoint: ${path}`);
    await handler(req, res);
    
    return new Response(res.body, {
      status: res.statusCode,
      headers: res.headers
    });
  } catch (error) {
    console.error(`[netlify-api-gateway] Error executing handler for ${path}:`, error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
