import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, RadialLinearScale, Filler, Tooltip, Legend,
} from 'chart.js';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import './App.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, RadialLinearScale, Filler, Tooltip, Legend);

const API = process.env.REACT_APP_API_URL || 'https://probablyanurag-attention-brain-api.hf.space';

// ── API helper ────────────────────────────────────────────────────────────────
const api = {
  post: (ep, data, isForm = false) => {
    const opts = isForm
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    return axios.post(`${API}${ep}`, data, opts).then(r => r.data);
  },
  get: ep => axios.get(`${API}${ep}`).then(r => r.data),
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const scoreClass = s => s >= 75 ? 'score-hi' : s >= 55 ? 'score-mid' : 'score-lo';
const trendIcon = t => t === 'up' ? '↑' : t === 'down' ? '↓' : '→';
const overall = s => Math.round((s.attention + s.emotion + (100 - s.language_load) + s.engagement) / 4);

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, show }) {
  return <div className={`toast ${show ? 'toast-show' : ''}`}>{msg}</div>;
}

// ── Signal Bar ────────────────────────────────────────────────────────────────
function SigBar({ label, value, color }) {
  return (
    <div className="sig-row">
      <span className="sig-lbl">{label}</span>
      <div className="sig-track">
        <div className="sig-bar" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="sig-val">{value}</span>
    </div>
  );
}

// ── Score Card ────────────────────────────────────────────────────────────────
function ScoreCard({ icon, name, value, color }) {
  return (
    <div className="sg">
      <div className="sg-icon">{icon}</div>
      <div className="sg-name">{name}</div>
      <div className="sg-val">{value}</div>
      <div className="sg-bar">
        <div className="sg-fill" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPI({ label, value, delta, color, deltaUp }) {
  return (
    <div className={`kpi kpi-${color}`}>
      <div className="kpi-l">{label}</div>
      <div className="kpi-v">{value}</div>
      {delta && <div className={`kpi-d ${deltaUp ? 'up' : 'dn'}`}>{delta}</div>}
    </div>
  );
}

// ── AI Box ────────────────────────────────────────────────────────────────────
function AIBox({ tag, tagClass, children, loading }) {
  return (
    <div className="ai-box">
      <div className={`ai-tag ${tagClass}`}>
        <span className="ai-dot" /> {tag}
      </div>
      {loading
        ? <div className="ai-load"><div className="spin" /> Analysing...</div>
        : <div className="ai-text">{children}</div>}
    </div>
  );
}

// ── Hook Timer ────────────────────────────────────────────────────────────────
function HookTimer({ dropSecond = 4 }) {
  const pct = Math.min(95, (dropSecond / 15) * 100);
  return (
    <div className="hook-timer">
      <div className="ht-lbl">Attention Timeline — Hook Drop Marker</div>
      <div className="ht-bar">
        <div className="ht-grad" />
        <div className="ht-marker" style={{ left: `${pct}%` }}>
          <div className="ht-marker-lbl">{dropSecond}s</div>
        </div>
      </div>
      <div className="ht-ticks">
        <span>0s</span><span>3s</span><span>6s</span><span>10s</span><span>15s</span>
      </div>
    </div>
  );
}

// ── Copy Button ───────────────────────────────────────────────────────────────
function CopyCard({ label, text, onCopy }) {
  return (
    <div className="copy-card">
      {label && <div className="cc-lbl">{label}</div>}
      <div className="cc-text">{text || '—'}</div>
      <button className="cc-btn" onClick={() => onCopy(text)}>Copy →</button>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('landing');
  const [screen, setScreen] = useState('dashboard');
  const [toast, setToast] = useState({ show: false, msg: '' });
  const [analysisMode, setAnalysisMode] = useState('standard');
  const [platform, setPlatform] = useState('Instagram');
  const [contentType, setContentType] = useState('Reel / Video');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [scores, setScores] = useState(null);
  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [organicData, setOrganicData] = useState(null);
  const [adsData, setAdsData] = useState(null);
  const [hooks, setHooks] = useState([]);
  const [hooksLoading, setHooksLoading] = useState(false);
  const [nudges, setNudges] = useState([]);
  const [nudgesLoading, setNudgesLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState(null);
  const [analyseLoading, setAnalyseLoading] = useState(false);
  const [revisedText, setRevisedText] = useState('');
  const [comparison, setComparison] = useState('');
  const [cmpLoading, setCmpLoading] = useState(false);
  const [feedbackId, setFeedbackId] = useState('');
  const [fbLikes, setFbLikes] = useState('');
  const [fbComments, setFbComments] = useState('');
  const [fbReach, setFbReach] = useState('');

  const fileRef = useRef();
  const resultRef = useRef();

  const showToast = useCallback((msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3000);
  }, []);

  const copyText = useCallback((txt) => {
    if (!txt) return;
    navigator.clipboard.writeText(txt).then(() => showToast('Copied ✓'));
  }, [showToast]);

  const go = (s) => {
    setScreen(s);
    if (s === 'model') refreshModelStatus();
  };

  const refreshModelStatus = async () => {
    try {
      const d = await api.get('/model-status');
      setModelStatus(d);
    } catch (e) { console.log('Model status unavailable'); }
  };

  // ── DEFAULTS ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (page === 'app') {
      setNudges(defaultNudges);
    }
  }, [page]);

  // ── FILE HANDLING ────────────────────────────────────────────────────────────
  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };
  const onFileChange = (e) => {
    if (e.target.files[0]) setFile(e.target.files[0]);
  };

  // ── ANALYZE ──────────────────────────────────────────────────────────────────
  const runAnalysis = async () => {
    if (!file && !text.trim()) {
      showToast('Upload a file or paste content first');
      return;
    }
    setAnalyseLoading(true);
    setScores(null); setInsight(''); setOrganicData(null); setAdsData(null);
    setHooks([]); setComparison('');

    try {
      const fd = new FormData();
      if (file) fd.append('file', file);
      if (text) fd.append('text', text);
      fd.append('content_type', contentType);
      fd.append('platform', platform);

      const s = await api.post('/analyze', fd, true);
      if (s.error) throw new Error(s.error);
      setScores(s);
      if (s.analysis_id) setFeedbackId(s.analysis_id);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

      // Insight
      setInsightLoading(true);
      try {
        const ins = await api.post('/get-gemini-insights', {
          scores: s,
          content_type: contentType,
          platform,
          content_preview: text.substring(0, 400),
          mode: analysisMode,
        });
        setInsight(ins.insight || '');
      } catch (e) { setInsight('Insight unavailable.'); }
      setInsightLoading(false);

      // Organic + Ads in parallel
      const [og, ads] = await Promise.allSettled([
        api.post('/organic-performance', {
          scores: s, content_preview: text.substring(0, 300), platform, content_type: contentType
        }),
        api.post('/ads-performance', {
          scores: s, content_preview: text.substring(0, 300), platform, objective: 'conversions'
        }),
      ]);
      if (og.status === 'fulfilled') setOrganicData(og.value);
      if (ads.status === 'fulfilled') setAdsData(ads.value);

    } catch (e) {
      showToast(`Error: ${e.message}`);
    }
    setAnalyseLoading(false);
  };

  // ── HOOKS ────────────────────────────────────────────────────────────────────
  const generateHooks = async () => {
    setHooksLoading(true);
    try {
      const d = await api.post('/generate-hooks', {
        scores: scores || { attention: 60, emotion: 60, language_load: 50, engagement: 60 },
        content_type: contentType, platform, content_preview: text.substring(0, 300)
      });
      setHooks(d.hooks || []);
    } catch (e) { showToast('Hook generation failed'); }
    setHooksLoading(false);
  };

  // ── COMPARE ──────────────────────────────────────────────────────────────────
  const compareVersions = async () => {
    if (!revisedText.trim() || !scores) {
      showToast('Run an analysis and paste revised content first');
      return;
    }
    setCmpLoading(true);
    try {
      const fd = new FormData();
      fd.append('text', revisedText);
      fd.append('content_type', contentType);
      fd.append('platform', platform);
      const rScores = await api.post('/analyze', fd, true);
      const cmp = await api.post('/compare-versions', { original: scores, revised: rScores });
      setComparison(cmp.comparison || '');
    } catch (e) { setComparison(`Error: ${e.message}`); }
    setCmpLoading(false);
  };

  // ── NUDGES ───────────────────────────────────────────────────────────────────
  const generateNudges = async (goal) => {
    setNudgesLoading(true);
    try {
      const d = await api.post('/generate-nudges', {
        avg_scores: { attention: 76, emotion: 64, language_load: 42, engagement: 71 },
        best_platform: 'TikTok', worst_platform: 'LinkedIn',
        best_content_type: 'Reels', goal
      });
      if (d.nudges?.length > 0) { setNudges(d.nudges); showToast('Fresh hacks generated ✓'); }
    } catch (e) { showToast('Using defaults'); }
    setNudgesLoading(false);
  };

  // ── FEEDBACK ─────────────────────────────────────────────────────────────────
  const submitFeedback = async () => {
    if (!feedbackId) { showToast('No analysis ID. Run a scan first.'); return; }
    try {
      const r = await api.post('/feedback', {
        analysis_id: feedbackId,
        likes: parseInt(fbLikes) || null,
        comments: parseInt(fbComments) || null,
        platform_reach: parseInt(fbReach) || null,
        was_helpful: true,
      });
      if (r.ok) {
        showToast(`Feedback saved! Training data: ${r.feedback_count} samples`);
        refreshModelStatus();
      }
    } catch (e) { showToast('Error submitting feedback'); }
  };

  const enterApp = () => setPage('app');

  const screenTitles = {
    dashboard: ['Dashboard', 'Your neuro-performance overview'],
    upload: ['Analyze Content', 'Dual-AI brain scan'],
    organic: ['Organic Performance', 'Maximise reach without spend'],
    ads: ['Ads Performance', 'Make every rupee count'],
    brain: ['Brain Dashboard', 'Deep signal analytics'],
    history: ['History', 'All analyses over time'],
    library: ['Content Library', 'Your scanned archive'],
    peers: ['Peer Ranking', 'Benchmarked vs 2,400+ creators'],
    hacks: ['Growth Hacks', 'AI-generated tactics'],
    model: ['AI Model Status', 'Training progress & architecture'],
  };

  // ── LANDING PAGE ─────────────────────────────────────────────────────────────
  if (page === 'landing') {
    return (
      <div className="landing">
        <div className="grid-bg" />
        <div className="orb o1" /><div className="orb o2" /><div className="orb o3" />
        <nav className="lnav">
          <div className="ln-logo">attention<em>:</em> hack the hook</div>
          <ul className="ln-links">
            <li><a href="#how">How it works</a></li>
            <li><a href="#signals">Signals</a></li>
            <li><a href="#pricing">Pricing</a></li>
          </ul>
          <button className="btn-neon" onClick={enterApp}>Enter Platform →</button>
        </nav>

        <section className="hero">
          <div className="hero-left">
            <div className="h-eye"><span className="h-dot" /> Dual-AI Neuromarketing · Beta</div>
            <h1 className="h1">
              HACK<br />
              <span className="l2">THE</span><br />
              <span className="l3">HOOK.</span>
            </h1>
            <p className="h-sub">
              Your content runs through 4 AI models simultaneously. Gemini watches.
              Llama reads. RoBERTa scores emotion. BART classifies content type.
              Together they tell you exactly where you lose attention — before you hit publish.
            </p>
            <div className="h-btns">
              <button className="btn-neon lg" onClick={enterApp}>Start Free →</button>
              <button className="btn-ghost">See it work</button>
            </div>
            <div className="h-badges">
              <span className="badge b-ai">⚡ 4-Model AI Consensus</span>
              <span className="badge b-fast">⚡ 5s Analysis</span>
              <span className="badge b-free">✦ Free Beta</span>
              <span className="badge b-db">🗄 MongoDB Powered</span>
            </div>
          </div>
          <div className="hero-right">
            <div className="brain-card">
              <div className="bc-hd">
                <div className="bc-dots">
                  <span style={{ background: '#ff5555' }} />
                  <span style={{ background: '#ffbd2e' }} />
                  <span style={{ background: '#28ca41' }} />
                </div>
                <div className="bc-live">● Dual-AI Scan Active</div>
              </div>
              <div className="bc-file">// product_launch_hook.mp4 · TikTok · 0:12</div>
              {[
                { name: 'Attention', val: 87, color: '#c2ff4d' },
                { name: 'Emotion', val: 71, color: '#ff5c1a' },
                { name: 'Lang. Load', val: 38, color: '#a78bfa' },
                { name: 'Engagement', val: 79, color: '#00d4ff' },
                { name: 'Virality', val: 82, color: '#ff2d8a' },
              ].map(({ name, val, color }) => (
                <div key={name} className="bc-sig">
                  <span className="bc-sn">{name}</span>
                  <div className="bc-tr">
                    <div className="bc-fill" style={{ width: `${val}%`, background: color }} />
                  </div>
                  <span className="bc-v">{val}</span>
                </div>
              ))}
              <div className="bc-verdict">
                <strong>Hook drops at 3.8s —</strong> text overlay disappears too fast.
                Emotion strong. Predicted CTR: 3.4%.
              </div>
              <div className="bc-ai-row">
                <span className="bc-ai-lbl">Powered by</span>
                {['Gemini Vision', 'Llama 3.2', 'RoBERTa', 'BART'].map(m => (
                  <span key={m} className="chip">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="stats-strip">
          {[['4', 'AI Models Active'], ['8', 'Signal Dimensions'], ['5s', 'Avg Analysis Time'], ['∞', 'Gets Smarter Over Time']].map(([n, l]) => (
            <div key={l} className="si">
              <div className="si-num">{n}</div>
              <div className="si-lbl">{l}</div>
            </div>
          ))}
        </div>

        <section className="features" id="how">
          <div className="sec-eye">// Platform capabilities</div>
          <h2 className="sec-h2">Stop A/B testing.<br />Start <em>brain testing.</em></h2>
          <div className="feat-grid">
            {[
              ['🧠', '4-Model AI Analysis', 'Gemini watches video. Llama reads copy. RoBERTa scores emotion. BART classifies content. All 4 in one scan.'],
              ['📈', 'Organic Performance', 'Hashtag strategy, best posting times, virality score, hook rewrites — generated from your brain signals.', true],
              ['💸', 'Ads Performance', 'CTR prediction, CPC estimate, ad copy generator, A/B test ideas. Before you spend a single rupee.', true],
              ['🗄', 'MongoDB Intelligence', 'Every scan stored. Your custom AI model trains on your data over time and gets better the more you use it.', true],
              ['🔥', 'Roast Mode', 'Brutal honest feedback. Gen Z energy. No sugarcoating. Straight to what\'s killing your content.'],
              ['⚡', 'Hook Generator', '5 alternative hooks in question, shock, story, stat, and challenge formats. Swap and rescan instantly.'],
            ].map(([icon, title, body, isNew]) => (
              <div key={title} className="feat">
                <span className="feat-i">{icon}</span>
                <div className="feat-t">{title}{isNew && <span className="feat-new">New</span>}</div>
                <div className="feat-b">{body}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="cta-sec" id="pricing">
          <div className="cta-pill">✦ Free Beta · No Credit Card</div>
          <h2 className="cta-h2">Stop guessing.<br />Start <em>hacking.</em></h2>
          <p className="cta-p">Join 200+ creators who test content at the neurological level before posting.</p>
          <div className="cta-form">
            <input className="cta-inp" type="email" placeholder="your@email.com" />
            <button className="btn-neon" onClick={enterApp}>Join →</button>
          </div>
        </section>

        <footer className="lf">
          <div className="lf-logo">attention<em>:</em> hack the hook</div>
          <div className="lf-note">Gemini Vision + Llama 3.2 + RoBERTa + BART + MongoDB · Trains over time</div>
        </footer>
        <Toast msg={toast.msg} show={toast.show} />
      </div>
    );
  }

  // ── APP SHELL ────────────────────────────────────────────────────────────────
  const [activeTitle, activeSubtitle] = screenTitles[screen] || ['Dashboard', ''];

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sb-logo">
          <div className="sb-lt">attention<em>:</em></div>
          <div className="sb-ls">// hack the hook</div>
        </div>
        <nav>
          <div className="sb-sec">
            <div className="sb-lbl">Core</div>
            {[
              { id: 'dashboard', icon: '⬡', label: 'Dashboard' },
              { id: 'upload', icon: '⬆', label: 'Analyze Content', badge: 'AI', badgeCls: 'nb-ai' },
            ].map(({ id, icon, label, badge, badgeCls }) => (
              <button key={id} className={`ni ${screen === id ? 'active' : ''}`} onClick={() => go(id)}>
                <span className="ni-ic">{icon}</span>{label}
                {badge && <span className={`ni-badge ${badgeCls}`}>{badge}</span>}
              </button>
            ))}
          </div>
          <div className="sb-sec">
            <div className="sb-lbl">Performance</div>
            {[
              { id: 'organic', icon: '🌱', label: 'Organic', badge: 'NEW', badgeCls: 'nb-new' },
              { id: 'ads', icon: '💸', label: 'Ads', badge: 'NEW', badgeCls: 'nb-blue' },
              { id: 'brain', icon: '◎', label: 'Brain Dashboard' },
            ].map(({ id, icon, label, badge, badgeCls }) => (
              <button key={id} className={`ni ${screen === id ? 'active' : ''}`} onClick={() => go(id)}>
                <span className="ni-ic">{icon}</span>{label}
                {badge && <span className={`ni-badge ${badgeCls}`}>{badge}</span>}
              </button>
            ))}
          </div>
          <div className="sb-sec">
            <div className="sb-lbl">Content</div>
            {[
              { id: 'history', icon: '▤', label: 'History' },
              { id: 'library', icon: '◫', label: 'Library' },
            ].map(({ id, icon, label }) => (
              <button key={id} className={`ni ${screen === id ? 'active' : ''}`} onClick={() => go(id)}>
                <span className="ni-ic">{icon}</span>{label}
              </button>
            ))}
          </div>
          <div className="sb-sec">
            <div className="sb-lbl">Intelligence</div>
            {[
              { id: 'peers', icon: '◈', label: 'Peer Ranking' },
              { id: 'hacks', icon: '⚡', label: 'Growth Hacks' },
              { id: 'model', icon: '🤖', label: 'AI Model', badge: 'BETA', badgeCls: 'nb-hot' },
            ].map(({ id, icon, label, badge, badgeCls }) => (
              <button key={id} className={`ni ${screen === id ? 'active' : ''}`} onClick={() => go(id)}>
                <span className="ni-ic">{icon}</span>{label}
                {badge && <span className={`ni-badge ${badgeCls}`}>{badge}</span>}
              </button>
            ))}
          </div>
        </nav>
        <div className="sb-foot">
          <div className="user-chip">
            <div className="u-av">JD</div>
            <div>
              <div className="u-nm">Jamie Dhaliwal</div>
              <div className="u-pl">Beta Access</div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        <div className="topbar">
          <div>
            <div className="tb-title">{activeTitle}</div>
            <div className="tb-sub">{activeSubtitle}</div>
          </div>
          <div className="tb-acts">
            <button className="btn btn-out" onClick={() => go('library')}>Library</button>
            <button className="btn btn-p" onClick={() => go('upload')}>+ Analyze</button>
          </div>
        </div>

        <div className="content">
          {/* ── DASHBOARD ── */}
          {screen === 'dashboard' && (
            <div className="screen-enter">
              <div className="kpi-row">
                <KPI label="Avg Brain Score" value="74" delta="↑ +6 pts this week" color="neon" deltaUp />
                <KPI label="Pieces Analysed" value="23" delta="↑ 4 this week" color="orange" deltaUp />
                <KPI label="Avg CTR Potential" value="2.8%" delta="↑ +0.4%" color="blue" deltaUp />
                <KPI label="Organic Reach" value="71" delta="↑ +8 pts" color="pink" deltaUp />
                <KPI label="Peer Percentile" value="78%" delta="↑ Top 22%" color="purple" deltaUp />
              </div>
              <div className="two-col">
                <div className="panel">
                  <div className="ph">
                    <div><div className="pt">Score Trend — 30 Days</div><div className="ps">Avg neuro-score per analysis</div></div>
                    <button className="pa">Export →</button>
                  </div>
                  <Line
                    data={{ labels: ['Mar 1','5','10','15','20','25','31'], datasets: [{ data: [58,63,60,68,71,74,78], borderColor: '#ff5c1a', backgroundColor: 'rgba(255,92,26,.05)', borderWidth: 2, tension: .4, fill: true, pointRadius: 3 }] }}
                    options={{ ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, min: 40 } } }}
                    height={150}
                  />
                </div>
                <div className="panel">
                  <div className="ph"><div><div className="pt">Signal Breakdown</div><div className="ps">All-time averages</div></div></div>
                  {[['Attention',76,'#c2ff4d'],['Emotion',64,'#ff5c1a'],['Lang Load',42,'#a78bfa'],['Engagement',71,'#00d4ff'],['Virality',68,'#ff2d8a']].map(([l,v,c]) => (
                    <SigBar key={l} label={l} value={v} color={c} />
                  ))}
                  <div className="divider" />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 3 }}>Overall</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, color: 'white', letterSpacing: 1, lineHeight: 1 }}>74<span style={{ fontSize: 15, color: 'rgba(255,255,255,.3)', fontFamily: 'sans-serif' }}>/100</span></div>
                  </div>
                </div>
              </div>
              <div className="two-col">
                <div className="panel">
                  <div className="ph"><div className="pt">Recent Analyses</div><button className="pa" onClick={() => go('history')}>All →</button></div>
                  {[
                    { dot: '#c2ff4d', txt: 'TikTok POV hook — Score 88 · Virality 91', time: '2 hours ago · TikTok Reel' },
                    { dot: '#ff5c1a', txt: 'Product launch caption — Score 61 · High lang load ⚠️', time: 'Yesterday · LinkedIn' },
                    { dot: '#00d4ff', txt: '5 tips carousel — Score 74 · CTR 2.3%', time: '2 days ago · Instagram' },
                    { dot: '#ff2d8a', txt: 'Brand story reel — Score 82 · Emotion 88 🔥', time: '3 days ago · Instagram' },
                  ].map(({ dot, txt, time }) => (
                    <div key={txt} className="ai-item">
                      <div className="ai-dot" style={{ background: dot }} />
                      <div><div className="ai-txt">{txt}</div><div className="ai-tm">{time}</div></div>
                    </div>
                  ))}
                </div>
                <div className="panel">
                  <div className="ph"><div className="pt">Peer Standing</div><button className="pa" onClick={() => go('peers')}>Full →</button></div>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, color: '#c2ff4d', letterSpacing: 2, lineHeight: 1 }}>78<span style={{ fontSize: 18, color: 'rgba(255,255,255,.3)', fontFamily: 'sans-serif' }}>%ile</span></div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>vs 2,400+ peers</div>
                  </div>
                  {[['Attention','82%','#c2ff4d','Top 18%'],['Emotion','66%','#ff5c1a','Top 34%'],['Ads CTR','74%','#00d4ff','Top 26%']].map(([l,w,c,t]) => (
                    <div key={l} className="sig-row">
                      <span className="sig-lbl">{l}</span>
                      <div className="sig-track"><div className="sig-bar" style={{ width: w, background: c }} /></div>
                      <span className="sig-val" style={{ fontSize: 9 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── ANALYZE ── */}
          {screen === 'upload' && (
            <div className="screen-enter">
              <div className="mode-tabs">
                {[['standard','🧠 Standard'],['roast','🔥 Roast'],['organic','🌱 Organic'],['ads','💸 Ads']].map(([m,l]) => (
                  <button key={m} className={`mt ${analysisMode === m ? 'active' : ''}`} onClick={() => setAnalysisMode(m)}>{l}</button>
                ))}
              </div>

              <div
                className={`upload-zone ${drag ? 'drag' : ''}`}
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
              >
                {file ? (
                  <>
                    <div className="uz-ic">✅</div>
                    <div className="uz-t">{file.name}</div>
                    <div className="uz-s">{(file.size / 1024).toFixed(0)}KB · {file.type || 'unknown'}</div>
                  </>
                ) : (
                  <>
                    <div className="uz-ic">⬆️</div>
                    <div className="uz-t">Drop content here</div>
                    <div className="uz-s">Video, image, audio — or paste text below</div>
                    <div className="uz-pills">
                      {['MP4','MOV','JPG/PNG','Audio','Text'].map(p => <span key={p} className="up-p">{p}</span>)}
                    </div>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" style={{ display: 'none' }} accept="video/*,image/*,audio/*" onChange={onFileChange} />

              <div style={{ marginBottom: 16 }}>
                <div className="sec-lbl">Or paste your copy / script</div>
                <textarea className="ta" rows={5} value={text} onChange={e => setText(e.target.value)} placeholder="Paste your TikTok script, Instagram caption, LinkedIn post, YouTube description, or ad copy..." />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div className="sec-lbl">Platform</div>
                <div className="pill-row">
                  {['Instagram','TikTok','LinkedIn','YouTube Shorts','X / Twitter','Facebook'].map(p => (
                    <button key={p} className={`pill ${platform === p ? 'active' : ''}`} onClick={() => setPlatform(p)}>{p}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <div className="sec-lbl">Content Type</div>
                <div className="pill-row">
                  {['Reel / Video','Static Image','Carousel','Caption Only','Ad Creative'].map(t => (
                    <button key={t} className={`pill ${contentType === t ? 'active' : ''}`} onClick={() => setContentType(t)}>{t}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                <button className="btn btn-p btn-lg" onClick={runAnalysis} disabled={analyseLoading}>
                  {analyseLoading ? '⏳ Scanning...' : 'Run Dual-AI Scan ⚡'}
                </button>
                <button className="btn btn-d btn-lg" onClick={generateHooks} disabled={hooksLoading}>
                  {hooksLoading ? '⏳ Generating...' : 'Generate Hooks 🎣'}
                </button>
              </div>

              {/* RESULTS */}
              {scores && (
                <div ref={resultRef} className="r-wrap">
                  <div className="divider" />
                  <div className="r-hd">
                    <div className="r-top">
                      <div>
                        <div className="r-file">// {file?.name || 'pasted_content'} · {platform}</div>
                        <div className="r-platform">{contentType} · {platform} · {analysisMode} mode{scores.dual_ai ? ' · Dual-AI ✓' : ''}</div>
                        {scores.mock && <span className="mock-t">Demo Mode</span>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="r-score">{overall(scores)}</div>
                        <div className="r-score-lbl">Neuro Score</div>
                      </div>
                    </div>

                    <div className="score-grid">
                      <ScoreCard icon="👁️" name="Attention" value={scores.attention} color="#c2ff4d" />
                      <ScoreCard icon="❤️" name="Emotion" value={scores.emotion} color="#ff5c1a" />
                      <ScoreCard icon="🧩" name="Lang Load" value={scores.language_load} color="#a78bfa" />
                      <ScoreCard icon="🔁" name="Engagement" value={scores.engagement} color="#00d4ff" />
                      <ScoreCard icon="🚀" name="Virality" value={scores.virality_score || 65} color="#ff2d8a" />
                      <ScoreCard icon="🎯" name="CTR Potential" value={scores.ctr_potential || 55} color="#00d4ff" />
                      <ScoreCard icon="📱" name="Platform Fit" value={scores.platform_fit || 70} color="#c2ff4d" />
                      <div className="sg">
                        <div className="sg-icon">⏱️</div>
                        <div className="sg-name">Hook Drops</div>
                        <div className="sg-val">{scores.hook_drop_second || 4}s</div>
                      </div>
                    </div>

                    <HookTimer dropSecond={scores.hook_drop_second || 4} />
                  </div>

                  <AIBox
                    tag={`Dual-AI · ${analysisMode === 'roast' ? '🔥 Roast' : analysisMode === 'organic' ? '🌱 Organic' : analysisMode === 'ads' ? '💸 Ads' : 'Neuro Insight'}`}
                    tagClass={analysisMode === 'roast' ? 'at-r' : analysisMode === 'organic' ? 'at-og' : analysisMode === 'ads' ? 'at-ad' : 'at-d'}
                    loading={insightLoading}
                  >
                    {insight}
                  </AIBox>

                  <ActionCards scores={scores} />

                  {/* Hooks */}
                  {hooks.length > 0 && (
                    <div className="panel" style={{ marginBottom: 14 }}>
                      <div className="ph"><div><div className="pt">Alternative Hooks 🎣</div><div className="ps">Ranked by predicted attention score</div></div></div>
                      {hooks.map((h, i) => (
                        <div key={i} className="hk">
                          <div className="hk-style" style={{ color: { question: '#00d4ff', shock: '#ff2d8a', story: '#ff5c1a', stat: '#c2ff4d', challenge: '#a78bfa' }[h.style] || '#999' }}>{(h.style || 'hook').toUpperCase()}</div>
                          <div className="hk-text">"{h.hook}"</div>
                          <div className="hk-meta">
                            <span className="hk-score">↑ {h.predicted_attention} attention</span>
                            <span className="hk-why">{h.why_it_works}</span>
                            <button className="hk-use" onClick={() => { setText(h.hook + '\n\n' + text); showToast('Hook added ✓'); }}>Use →</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Compare */}
                  <div className="panel" style={{ marginBottom: 14 }}>
                    <div className="ph"><div><div className="pt">Before / After Comparison</div><div className="ps">Paste revised version to compare</div></div></div>
                    <textarea className="ta" rows={4} value={revisedText} onChange={e => setRevisedText(e.target.value)} placeholder="Paste your improved version here..." />
                    <button className="btn btn-o btn-lg" style={{ marginTop: 11 }} onClick={compareVersions} disabled={cmpLoading}>
                      {cmpLoading ? '⏳ Comparing...' : 'Compare Scores →'}
                    </button>
                    {comparison && (
                      <AIBox tag="Comparison Analysis" tagClass="at-d" loading={false}>{comparison}</AIBox>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ORGANIC ── */}
          {screen === 'organic' && (
            <div className="screen-enter">
              <div className="og-hd">
                <div className="og-eye">// Organic Growth Engine</div>
                <div className="og-title">MAXIMISE ORGANIC REACH</div>
                <div className="og-sub">AI analyses your brain signals and tells you exactly how to get more eyes on content without spending.</div>
              </div>
              {!organicData ? (
                <div className="empty-st">
                  <div className="es-ic">🌱</div>
                  <div className="es-t">No analysis yet</div>
                  <div className="es-s">Analyze content first, then come back for organic strategy</div>
                  <button className="btn btn-p btn-lg" onClick={() => go('upload')}>Analyze Content →</button>
                </div>
              ) : (
                <>
                  <div className="kpi-row">
                    <KPI label="Organic Score" value={organicData.organic_score || 70} color="neon" />
                    <KPI label="Best Post Time" value={organicData.best_post_time || '—'} color="orange" />
                    <KPI label="Reach Multiplier" value={`${organicData.estimated_reach_multiplier || 2}x`} delta="vs unoptimized" color="blue" deltaUp />
                  </div>
                  <div className="two-col">
                    <div className="panel">
                      <div className="ph"><div><div className="pt">Hashtag Strategy</div><div className="ps">AI-selected for max organic reach</div></div></div>
                      <p className="ai-text" style={{ fontSize: 12, marginBottom: 12 }}>{organicData.hashtag_strategy}</p>
                      <div className="sec-lbl">Recommended Tags</div>
                      <div className="tag-cloud">
                        {(organicData.top_hashtags || []).map(t => (
                          <span key={t} className="htag" onClick={() => copyText('#' + t)}>#{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="panel">
                      <div className="ph"><div><div className="pt">Caption Optimization</div></div></div>
                      <div className="sec-lbl">Hook Rewrite</div>
                      <CopyCard label="Stronger Opening" text={organicData.hook_rewrite} onCopy={copyText} />
                      <div className="sec-lbl">CTA Suggestion</div>
                      <CopyCard label="Call to Action" text={organicData.cta_suggestion} onCopy={copyText} />
                    </div>
                  </div>
                  <div className="panel">
                    <div className="ph"><div><div className="pt">Trending Angle + Platform Tip</div></div></div>
                    <p className="ai-text" style={{ fontSize: 13, lineHeight: 1.78, marginBottom: 14 }}>{organicData.trending_angle}</p>
                    <p className="ai-text" style={{ fontSize: 13, lineHeight: 1.78 }}>{organicData.platform_specific_tip}</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── ADS ── */}
          {screen === 'ads' && (
            <div className="screen-enter">
              <div className="ads-hd">
                <div className="ads-eye">// Paid Performance Intelligence</div>
                <div className="ads-title">MAKE EVERY RUPEE COUNT</div>
                <div className="ads-sub">AI predicts your CTR, estimates CPC, and generates optimized ad copy before you spend.</div>
              </div>
              {!adsData ? (
                <div className="empty-st">
                  <div className="es-ic">💸</div>
                  <div className="es-t">No analysis yet</div>
                  <div className="es-s">Analyze content first, then come back for ads performance</div>
                  <button className="btn btn-p btn-lg" onClick={() => go('upload')}>Analyze Content →</button>
                </div>
              ) : (
                <>
                  <div className="kpi-row">
                    <KPI label="Ads Score" value={adsData.ads_score || 60} color="blue" />
                    <KPI label="Predicted CTR" value={adsData.predicted_ctr || '—'} color="neon" />
                    <KPI label="Est. CPC" value={adsData.predicted_cpc || '—'} color="orange" />
                    <KPI label="Hook Score for Ads" value={adsData.hook_for_ads_score || '—'} color="pink" />
                  </div>
                  <div className="two-col">
                    <div className="panel">
                      <div className="ph"><div><div className="pt">Generated Ad Copy</div><div className="ps">Two headlines + primary text</div></div></div>
                      <div className="sec-lbl">Headline 1</div>
                      <CopyCard text={adsData.headline_option_1} onCopy={copyText} />
                      <div className="sec-lbl">Headline 2</div>
                      <CopyCard text={adsData.headline_option_2} onCopy={copyText} />
                      <div className="sec-lbl">Primary Text (125 chars)</div>
                      <CopyCard text={adsData.primary_text} onCopy={copyText} />
                    </div>
                    <div className="panel">
                      <div className="ph"><div><div className="pt">Campaign Intelligence</div></div></div>
                      {[['Best Objective', adsData.best_objective], ['Audience Targeting', adsData.audience_suggestion], ['A/B Test Idea', adsData.split_test_idea], ['Budget Advice', adsData.budget_advice]].map(([lbl, val]) => (
                        <div key={lbl} style={{ marginBottom: 12 }}>
                          <div className="sec-lbl">{lbl}</div>
                          <p className="ai-text" style={{ fontSize: 12 }}>{val || '—'}</p>
                        </div>
                      ))}
                      <div className="sec-lbl">Ad Fatigue Risk</div>
                      <FatigueBar level={adsData.fatigue_risk || 'medium'} />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── BRAIN DASHBOARD ── */}
          {screen === 'brain' && (
            <div className="screen-enter">
              <div className="kpi-row">
                <KPI label="Peak Attention" value="92" delta="↑ TikTok POV · 3d ago" color="neon" deltaUp />
                <KPI label="Avg Emotion" value="64" delta="↓ Below top-quartile" color="orange" />
                <KPI label="Avg Virality" value="68" delta="↑ Above peer avg" color="pink" deltaUp />
                <KPI label="Engagement" value="71" delta="↑ Prefrontal active" color="blue" deltaUp />
              </div>
              <div className="two-col">
                <div className="panel">
                  <div className="ph"><div><div className="pt">Attention Timeline</div><div className="ps">Last analysis · frame-by-frame</div></div></div>
                  <Line data={attentionData} options={{ ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, min: 20 } } }} height={150} />
                </div>
                <div className="panel">
                  <div className="ph"><div><div className="pt">Signal Distribution</div></div></div>
                  <Doughnut data={donutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom', labels: { font: { family: 'JetBrains Mono', size: 9 }, color: '#555', padding: 10 } } }, cutout: '70%' }} height={195} />
                </div>
              </div>
            </div>
          )}

          {/* ── HISTORY ── */}
          {screen === 'history' && (
            <div className="screen-enter">
              <div className="panel" style={{ marginBottom: 16 }}>
                <div className="ph"><div><div className="pt">90-Day Score Trend</div></div></div>
                <Bar data={histData} options={{ ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, min: 30 } } }} height={115} />
              </div>
              <div className="hist-t">
                <div className="ht-hd">
                  {['Content','Score','Virality','Platform','Type','Trend'].map(h => <span key={h} className="ht-hc">{h}</span>)}
                </div>
                {historyItems.map((r, i) => (
                  <div key={i} className="ht-row">
                    <div><div className="ht-nm">{r.name}</div><div className="ht-mt">{r.date}</div></div>
                    <div><span className={`sp sp-${r.score >= 75 ? 'h' : r.score >= 60 ? 'm' : 'l'}`}>{r.score}</span></div>
                    <div><span className={`sp sp-${r.virality >= 75 ? 'h' : r.virality >= 60 ? 'm' : 'l'}`}>{r.virality}</span></div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{r.platform}</div>
                    <div><span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, padding: '2px 5px', borderRadius: 2, background: 'rgba(255,92,26,.1)', color: '#ff5c1a' }}>{r.type}</span></div>
                    <div style={{ color: r.trend === 'up' ? '#4ade80' : r.trend === 'down' ? '#f87171' : '#666' }}>{trendIcon(r.trend)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── LIBRARY ── */}
          {screen === 'library' && (
            <div className="screen-enter">
              <div className="lib-grid">
                {libItems.map((it, i) => (
                  <div key={i} className="lib-c">
                    <div className="lc-th" style={{ background: it.color + '18', color: it.color }}>{it.score}</div>
                    <div className="lc-bd">
                      <div className="lc-nm">{it.name}</div>
                      <div className="lc-mt">{it.type} · {it.platform}</div>
                      <div className="lc-sigs">
                        <span className="lc-s" style={{ background: 'rgba(194,255,77,.08)', color: '#3a6e00' }}>ATT {it.a}</span>
                        <span className="lc-s" style={{ background: 'rgba(255,92,26,.08)', color: '#ff5c1a' }}>EMO {it.e}</span>
                        <span className="lc-s" style={{ background: 'rgba(255,45,138,.08)', color: '#ff2d8a' }}>VIRAL {it.v}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PEERS ── */}
          {screen === 'peers' && (
            <div className="screen-enter">
              <div className="peer-hero">
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#ff5c1a', marginBottom: 9 }}>// Your Standing</div>
                  <div className="ph-rank">78<span style={{ fontSize: 32, color: 'rgba(194,255,77,.35)' }}>%</span></div>
                  <div className="ph-rl">Percentile · vs 2,400+ peers</div>
                  <p className="ph-desc">You're outperforming 78% of creators. Attention is exceptional — emotion load is your biggest growth lever.</p>
                </div>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,.22)', marginBottom: 7 }}>PERCENTILE POSITION</div>
                  <div className="pct-bar"><div className="pct-fill" style={{ width: '78%' }} /></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,.22)' }}>
                    <span>0%</span><span style={{ color: '#c2ff4d' }}>You · 78%</span><span>100%</span>
                  </div>
                </div>
              </div>
              <div className="two-col">
                <div className="panel">
                  <div className="ph"><div><div className="pt">Radar — You vs Peers</div></div></div>
                  <Radar data={radarData} options={radarOpts} height={210} />
                </div>
                <div className="panel">
                  <div className="ph"><div><div className="pt">Leaderboard</div><div className="ps">Top creators this week</div></div></div>
                  {leaderboard.map((u, i) => (
                    <div key={i} className="lb-row">
                      <div className={`lb-rank ${i < 3 ? 'top' : ''}`}>{i + 1}</div>
                      <div className="lb-av" style={{ background: u.c, color: i === 1 ? '#05050d' : 'white' }}>{u.i}</div>
                      <div className="lb-nm">{u.you ? <strong>You</strong> : `Creator ${u.i}`}</div>
                      {u.tag && <span className="lb-b">{u.tag}</span>}
                      <div className="lb-sc">{u.s}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── GROWTH HACKS ── */}
          {screen === 'hacks' && (
            <div className="screen-enter">
              <div className="hacks-hd">
                <div className="hh-eye">// AI Growth Intelligence</div>
                <div className="hh-title">PERSONALISED GROWTH HACKS</div>
                <p className="hh-sub">4-model AI analyses your signals + platform trends. Choose organic, ads, or both.</p>
              </div>
              <div className="gen-bar">
                <div className="gb-text"><strong>Generate fresh hacks</strong> — AI analyses your brain data + current platform trends</div>
                <div style={{ display: 'flex', gap: 7 }}>
                  <button className="btn btn-d" onClick={() => generateNudges('organic')} disabled={nudgesLoading}>🌱 Organic</button>
                  <button className="btn btn-d" onClick={() => generateNudges('ads')} disabled={nudgesLoading}>💸 Ads</button>
                  <button className="btn btn-p" onClick={() => generateNudges('both')} disabled={nudgesLoading}>
                    {nudgesLoading ? '⏳...' : 'Both ⚡'}
                  </button>
                </div>
              </div>
              <div className="nudge-grid">
                {nudges.map((n, i) => (
                  <NudgeCard key={i} nudge={n} onApply={() => showToast('Hack saved ✓')} />
                ))}
              </div>
              <div className="panel">
                <div className="ph"><div><div className="pt">Platform Trend Intelligence</div><div className="ps">Signal performance this week</div></div></div>
                <Line data={trendsData} options={{ ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, min: 40, max: 100 } } }} height={125} />
              </div>
            </div>
          )}

          {/* ── AI MODEL STATUS ── */}
          {screen === 'model' && (
            <div className="screen-enter">
              <div className="panel" style={{ marginBottom: 16, background: 'linear-gradient(135deg,rgba(0,212,255,.05) 0%,transparent 60%)', borderColor: 'rgba(0,212,255,.15)' }}>
                <div className="ph">
                  <div><div className="pt">AI Model Architecture</div><div className="ps">4 models + 1 custom model that trains on your data</div></div>
                  <button className="btn btn-d" style={{ fontSize: 10 }} onClick={refreshModelStatus}>Refresh</button>
                </div>
                <p className="ai-text" style={{ fontSize: 13, lineHeight: 1.75 }}>
                  Your custom model starts learning from day 1. Every analysis contributes to a growing dataset stored in MongoDB.
                  Once 20+ analyses have real-world feedback, the model retrains automatically using Gradient Boosting and improves every 20 new feedback submissions.
                </p>
              </div>

              <div className="model-grid">
                {[
                  { icon: '🔵', name: 'Gemini 2.0 Flash', status: modelStatus?.models_active?.gemini_2_flash, desc: 'Vision + multimodal. Watches video, analyzes images, reads context. Generates all text insights.' },
                  { icon: '🦙', name: 'Llama 3.2-3B', status: modelStatus?.models_active?.llama_3_2_3b, desc: 'Text linguistics via HF Inference API. Hook strength, reading grade, CTA presence, urgency scoring.' },
                  { icon: '🟢', name: 'RoBERTa Sentiment', status: modelStatus?.models_active?.roberta_sentiment, desc: 'Local ~500MB. Twitter-trained. Scores positive/negative/neutral emotion on content text.' },
                  { icon: '🟠', name: 'BART Zero-Shot', status: modelStatus?.models_active?.bart_zero_shot, desc: 'Local ~1.6GB. Classifies content as educational, entertainment, promotional, storytelling, or news.' },
                  { icon: '🤖', name: 'Custom GBR Model', status: modelStatus?.custom_model_trained, desc: `Gradient Boosting Regressor. Trained on ${modelStatus?.training_samples || 0} samples from your MongoDB data.` },
                  { icon: '🗄', name: 'MongoDB Atlas', status: modelStatus?.database === 'connected', desc: `${modelStatus?.total_analyses || 0} total analyses stored. Powers the custom model training pipeline.` },
                ].map(({ icon, name, status, desc }) => (
                  <div key={name} className="model-card">
                    <div className="mc-icon">{icon}</div>
                    <div className="mc-name">{name}</div>
                    <div className={`mc-status ${status === undefined ? 'mc-pending' : status ? 'mc-active' : 'mc-inactive'}`}>
                      {status === undefined ? '⏳ Checking...' : status ? '● Active' : '○ Unavailable'}
                    </div>
                    <div className="mc-desc">{desc}</div>
                    {name === 'Custom GBR Model' && (
                      <div className="progress-bar">
                        <div className="pb-fill" style={{ width: `${Math.min(100, ((modelStatus?.feedback_count || 0) / 20) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="panel">
                <div className="ph"><div><div className="pt">Submit Post Performance</div><div className="ps">Real-world data accelerates model training</div></div></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                  {[['Analysis ID', feedbackId, setFeedbackId, 'text', 'from last scan'],
                    ['Likes', fbLikes, setFbLikes, 'number', 'e.g. 1240'],
                    ['Comments', fbComments, setFbComments, 'number', 'e.g. 84'],
                    ['Platform Reach', fbReach, setFbReach, 'number', 'e.g. 12000']
                  ].map(([lbl, val, setter, type, ph]) => (
                    <div key={lbl}>
                      <div className="sec-lbl" style={{ marginBottom: 5 }}>{lbl}</div>
                      <input className="ta" type={type} value={val} onChange={e => setter(e.target.value)} placeholder={ph} style={{ minHeight: 40, padding: '8px 10px' }} />
                    </div>
                  ))}
                </div>
                <button className="btn btn-p btn-lg" onClick={submitFeedback}>Submit Performance Data →</button>
                {modelStatus && (
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,.3)', marginTop: 10 }}>
                    {modelStatus.feedback_count} feedback samples · {modelStatus.total_analyses} total analyses
                    {modelStatus.custom_model_trained ? ` · Custom model: ${modelStatus.training_samples} samples` : ' · Need 20 feedback samples to start training'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <Toast msg={toast.msg} show={toast.show} />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ActionCards({ scores }) {
  const acts = [];
  if (scores.attention < 60) acts.push({ p: 'h', t: 'Strengthen Your Hook', b: `Attention ${scores.attention} — hook failing. Rewrite first 2 seconds with bold visual or surprising stat.` });
  if (scores.emotion < 65) acts.push({ p: 'h', t: 'Inject Emotional Trigger', b: `Emotion ${scores.emotion}. Add personal story, relatable struggle, or visceral contrast moment.` });
  if (scores.language_load > 60) acts.push({ p: scores.language_load > 75 ? 'h' : 'm', t: 'Simplify Language', b: `Lang load ${scores.language_load} — too complex. Cut sentences in half. Delete all jargon.` });
  if (scores.engagement < 65) acts.push({ p: 'm', t: 'Add a Decision Moment', b: `Engagement ${scores.engagement}. Add question, opinion bait, or CTA.` });
  if (scores.attention >= 80) acts.push({ p: 'l', t: 'Hook is Strong ✓', b: `Attention ${scores.attention} — top tier. Replicate this format across platforms.` });
  if (acts.length === 0) acts.push({ p: 'l', t: 'All Signals Healthy ✓', b: `Score ${overall(scores)} — well balanced. Try A/B testing caption for marginal gains.` });
  const cls = { h: 'ach', m: 'acm', l: 'acl' };
  const lbl = { h: '↑ Fix This First', m: '→ Improve Next', l: '✓ Keep Going' };
  return (
    <>
      <div style={{ marginBottom: 11 }}><div className="sec-lbl">Priority Actions</div></div>
      <div className="ac-grid">
        {acts.slice(0, 4).map((a, i) => (
          <div key={i} className={`ac ${cls[a.p]}`}>
            <div className="ac-p">{lbl[a.p]}</div>
            <div className="ac-t">{a.t}</div>
            <div className="ac-b">{a.b}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function FatigueBar({ level }) {
  const colors = { low: 'rgba(74,222,128,.35)', medium: 'rgba(251,191,36,.35)', high: 'rgba(248,113,113,.35)' };
  const count = level === 'low' ? 1 : level === 'medium' ? 2 : 3;
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 3, flex: 1 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ flex: 1, height: 5, borderRadius: 2, background: i <= count ? colors[level] : 'rgba(255,255,255,.04)' }} />
        ))}
      </div>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,.3)', marginLeft: 8 }}>{level?.toUpperCase()}</span>
    </div>
  );
}

function NudgeCard({ nudge: n, onApply }) {
  const [applied, setApplied] = useState(false);
  const tC = { hook: 'nt-h', brain: 'nt-br', trend: 'nt-tr', copy: 'nt-cp', ads: 'nt-ad', organic: 'nt-og' };
  const dC = { easy: 'd-e', medium: 'd-m', hard: 'd-h' };
  return (
    <div className="nudge">
      <div className={`n-type ${tC[n.type] || 'nt-h'}`}>{n.typeLabel}</div>
      <div className="n-title">{n.title}</div>
      <div className="n-body">{n.body}</div>
      <div className="n-meta">
        <div className="n-impact"><span className="n-idot" />{n.impact}</div>
        <span className={`n-diff ${dC[n.difficulty] || 'd-e'}`}>{n.difficulty}</span>
      </div>
      <div className="n-time">⏱ {n.time_to_implement}</div>
      <button className="n-apply" onClick={() => { setApplied(true); onApply(); }} style={applied ? { background: '#c2ff4d', color: '#05050d', borderColor: '#c2ff4d' } : {}}>
        {applied ? '✓ Saved' : 'Apply this hack →'}
      </button>
    </div>
  );
}

// ── Static data ───────────────────────────────────────────────────────────────
const defaultNudges = [
  { type: 'hook', typeLabel: '⚡ Hook Fix', title: 'Open with result not process', body: "Lead with the transformation. 'I made ₹1L from one post — here's the exact structure' beats 'Today I'm going to teach you' every time.", impact: '+12 attention', difficulty: 'easy', time_to_implement: '10 mins' },
  { type: 'brain', typeLabel: '🧠 Brain Trick', title: 'Contrast triggers emotion 8x more', body: "Your emotion score is below peer avg. 'Everyone told me X. I did Y.' Contrast activates limbic response faster than agreement.", impact: '+9 emotion', difficulty: 'easy', time_to_implement: '5 mins' },
  { type: 'ads', typeLabel: '💸 Ads Hack', title: 'First frame must work muted', body: '85% of social ads play muted. Bold text overlay in frame 1 + visual pattern interrupt = documented CTR increase of 30-40%.', impact: '+35% CTR', difficulty: 'medium', time_to_implement: '1 hour' },
  { type: 'organic', typeLabel: '🌱 Organic Play', title: 'Tuesday 7-9pm IST is your window', body: 'Platform algorithms reward early engagement velocity. Peak posting window gets 3x more first-hour engagement — which then feeds the algorithm.', impact: '3x early reach', difficulty: 'easy', time_to_implement: '2 mins' },
];

const historyItems = [
  { name: "POV hook — 'You're doing it wrong'", type: 'Reel', platform: 'TikTok', score: 88, virality: 91, trend: 'up', date: '28 Mar' },
  { name: 'Monday motivation reel', type: 'Reel', platform: 'Instagram', score: 82, virality: 78, trend: 'up', date: '26 Mar' },
  { name: '5 growth hacks carousel', type: 'Carousel', platform: 'Instagram', score: 74, virality: 65, trend: 'flat', date: '24 Mar' },
  { name: 'Product launch caption', type: 'Caption', platform: 'LinkedIn', score: 61, virality: 44, trend: 'down', date: '22 Mar' },
  { name: 'Tutorial reel 60s', type: 'Reel', platform: 'YouTube', score: 78, virality: 70, trend: 'up', date: '18 Mar' },
];

const libItems = [
  { name: 'POV Hook Reel', type: 'Reel', platform: 'TikTok', score: 88, color: '#ff5c1a', a: 91, e: 82, v: 91 },
  { name: 'Monday Motivation', type: 'Reel', platform: 'Instagram', score: 82, color: '#c2ff4d', a: 85, e: 74, v: 78 },
  { name: '5 Growth Hacks', type: 'Carousel', platform: 'Instagram', score: 74, color: '#b39dfa', a: 72, e: 68, v: 65 },
  { name: 'Product Launch', type: 'Caption', platform: 'LinkedIn', score: 61, color: '#00d4ff', a: 58, e: 54, v: 44 },
  { name: 'Tutorial 60s', type: 'Reel', platform: 'YouTube', score: 78, color: '#4ade80', a: 80, e: 70, v: 70 },
  { name: 'Brand Story', type: 'Reel', platform: 'Instagram', score: 83, color: '#ff2d8a', a: 85, e: 88, v: 80 },
];

const leaderboard = [
  { i: 'AK', s: 94, tag: 'Top', c: '#ff5c1a' }, { i: 'MR', s: 91, c: '#c2ff4d' },
  { i: 'SL', s: 89, c: '#b39dfa' }, { i: 'JD', s: 88, tag: 'You', c: '#ff2d8a', you: true },
  { i: 'PW', s: 85, c: '#00d4ff' }, { i: 'TN', s: 82, c: '#fbbf24' },
];

// ── Chart configs ─────────────────────────────────────────────────────────────
const mono = { family: "'JetBrains Mono', monospace", size: 9 };
const tt = { backgroundColor: '#0c0c1a', titleFont: mono, bodyFont: mono, padding: 9, cornerRadius: 5 };
const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: tt },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,.03)' }, ticks: { font: mono, color: '#444' } },
    y: { grid: { color: 'rgba(255,255,255,.03)' }, ticks: { font: mono, color: '#444' }, min: 0, max: 100 },
  },
};
const attentionData = {
  labels: Array.from({ length: 30 }, (_, i) => i === 0 ? '0s' : i === 15 ? '8s' : i === 29 ? '15s' : ''),
  datasets: [{
    data: Array.from({ length: 30 }, (_, i) => Math.floor(55 + 35 * Math.abs(Math.sin(i * 0.4 + 1)) * (0.7 + 0.3 * Math.random()))),
    borderColor: '#c2ff4d', backgroundColor: 'rgba(194,255,77,.04)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 0,
  }],
};
const donutData = {
  labels: ['Attention', 'Emotion', 'Language', 'Engagement', 'Virality'],
  datasets: [{ data: [76, 64, 42, 71, 68], backgroundColor: ['#c2ff4d', '#ff5c1a', '#b39dfa', '#00d4ff', '#ff2d8a'], borderWidth: 0 }],
};
const histData = {
  labels: ['Mar 1', '5', '8', '10', '13', '15', '18', '20', '22', '24', '26', '28', '31'],
  datasets: [{
    data: [55, 60, 58, 65, 62, 68, 55, 69, 61, 74, 82, 88, 78],
    backgroundColor: (ctx) => { const v = ctx.dataset.data[ctx.dataIndex]; return v >= 75 ? 'rgba(194,255,77,.5)' : v >= 60 ? 'rgba(255,92,26,.45)' : 'rgba(248,113,113,.4)'; },
    borderRadius: 4, borderSkipped: false,
  }],
};
const radarData = {
  labels: ['Attention', 'Emotion', 'Lang Simplicity', 'Engagement', 'Virality', 'Ads CTR'],
  datasets: [
    { label: 'You', data: [76, 64, 58, 71, 68, 74], borderColor: '#ff5c1a', backgroundColor: 'rgba(255,92,26,.07)', borderWidth: 2, pointBackgroundColor: '#ff5c1a' },
    { label: 'Peer Avg', data: [61, 72, 45, 68, 62, 65], borderColor: 'rgba(255,255,255,.12)', backgroundColor: 'rgba(255,255,255,.02)', borderWidth: 1.5, borderDash: [4, 4], pointBackgroundColor: 'rgba(255,255,255,.18)' },
  ],
};
const radarOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: true, position: 'bottom', labels: { font: mono, color: '#555' } }, tooltip: tt },
  scales: { r: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { display: false }, pointLabels: { font: { family: "'JetBrains Mono', monospace", size: 8 }, color: '#555' }, min: 0, max: 100 } },
};
const trendsData = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [
    { label: 'Reels', data: [72, 75, 73, 78, 80, 82, 85], borderColor: '#ff5c1a', backgroundColor: 'transparent', borderWidth: 2, tension: 0.4, pointRadius: 3 },
    { label: 'Carousels', data: [65, 67, 66, 70, 71, 72, 74], borderColor: '#b39dfa', backgroundColor: 'transparent', borderWidth: 2, tension: 0.4, pointRadius: 3 },
    { label: 'Captions', data: [58, 60, 59, 62, 61, 63, 65], borderColor: '#00d4ff', backgroundColor: 'transparent', borderWidth: 2, tension: 0.4, pointRadius: 3 },
  ],
};
