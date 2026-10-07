const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  app.use('/api', createProxyMiddleware({
    target: process.env.COMMENT_TRACKER_API_PROXY || 'http://localhost:5000',
    changeOrigin: true,
    onProxyReq(proxyReq) {
      proxyReq.setHeader('Origin', 'https://comment-tracker-frontend.onrender.com');
    },
    onProxyRes(proxyRes) {
      const cookies = proxyRes.headers['set-cookie'];
      if (cookies) {
        proxyRes.headers['set-cookie'] = cookies.map(cookie => cookie
          .replace(/;\s*SameSite=None/ig, '; SameSite=Lax')
          .replace(/;\s*Secure/ig, ''));
      }
    },
  }));
};
