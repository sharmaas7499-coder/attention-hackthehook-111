const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HF_BACKEND = process.env.HF_BACKEND_URL || 'https://probablyanurag-attention-brain-api.hf.space';

// ── PROXY all /api/* → HuggingFace backend ───────────────────────────────────
app.use('/api', createProxyMiddleware({
  target: HF_BACKEND,
  changeOrigin: true,
  pathRewrite: { '^/api': '' },
  on: {
    error: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(502).json({ error: 'Backend unreachable', detail: err.message });
    },
    proxyReq: (proxyReq, req) => {
      console.log(`→ ${req.method} ${HF_BACKEND}${req.path.replace('/api','')}`);
    }
  }
}));

// ── Serve React build ─────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n✅ attention: hack the hook`);
  console.log(`   Frontend: http://localhost:${PORT}`);
  console.log(`   Backend proxy → ${HF_BACKEND}\n`);
});
