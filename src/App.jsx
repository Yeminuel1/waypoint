import React, { useState, useEffect, useRef, useMemo } from "react";
import { Package, Truck, MapPin, CheckCircle2, Search, Plus, ArrowRight, Clock, ChevronRight, ChevronDown, ChevronUp, ShieldCheck, Trash2, Settings, RefreshCw, Lock, LogOut, Circle, ListChecks, Globe, Warehouse, Building2, Undo2, Zap, FileText, CalendarClock, MessageCircle, X, Send, Sparkles } from "lucide-react";

const DEFAULT_STAGES = ["Label Created", "Picked Up", "In Transit", "Out for Delivery", "Customs Clearance", "Delivered"];
const ICON_MAP = { Package, Truck, MapPin, ShieldCheck, CheckCircle2, Circle };
const DEFAULT_STAGE_ICON_KEYS = ["Package", "Truck", "MapPin", "Truck", "ShieldCheck", "CheckCircle2"];

const REGIONS = [
  "United States", "Canada", "United Kingdom", "European Union", "Australia & NZ",
  "Southeast Asia", "Middle East", "Latin America", "Sub-Saharan Africa", "South Asia",
];

const FAQS = [
  ["How long does delivery take?", "It depends on service level and destination. Standard shipments typically move in a little over a day domestically and longer internationally; Express moves faster. An estimated arrival shows up as soon as a label is created."],
  ["Do you handle customs clearance?", "Yes — international shipments pass through a dedicated Customs Clearance stage, handled by our compliance team so parcels don't get stuck at the border."],
  ["Can I track a shipment without an account?", "Yes. Tracking numbers can be looked up directly from the Track tab — no login required."],
  ["What if my package is delayed or lost?", "Reach out any time through the Contact link and our support team will look into the shipment for you."],
  ["Do you offer returns management?", "Yes — return labels and reverse logistics are handled the same way as an outbound shipment, start to finish."],
];

const CHAT_KNOWLEDGE = [
  {
    keywords: ["how long", "delivery time", "how fast", "when will", "eta", "arrive"],
    reply: "Delivery time depends on service level and destination. Standard shipments typically move in a bit over a day domestically and longer internationally; Express is faster. Once a label is created you'll see an estimated arrival on the Track tab.",
  },
  {
    keywords: ["customs", "border", "duty", "duties", "tariff"],
    reply: "International shipments pass through a dedicated Customs Clearance stage, handled by our compliance team so parcels don't get stuck at the border.",
  },
  {
    keywords: ["track", "tracking number", "where is my", "where's my", "status"],
    reply: "Head to the Track tab and enter your tracking number (format like WPT-188141953N1) — no account needed. I don't have access to live shipment data myself, so that's the fastest way to get a real answer.",
  },
  {
    keywords: ["lost", "delayed", "late", "missing", "problem"],
    reply: "Sorry to hear that. Please reach out through the Contact link and our support team will look into the shipment for you directly.",
  },
  {
    keywords: ["return", "returns", "send back"],
    reply: "Yes — return labels and reverse logistics are handled the same way as an outbound shipment, start to finish.",
  },
  {
    keywords: ["ship", "shipping", "send a package", "create a label"],
    reply: "Shipments are created by our team — reach out through the Contact link with your sender, recipient, and package details and we'll get a label and tracking number set up for you.",
  },
  {
    keywords: ["price", "cost", "how much", "rate", "pricing"],
    reply: "Pricing depends on service level, package size, and destination. Contact our team for a quote tailored to your shipment.",
  },
  {
    keywords: ["contact", "support", "help", "email", "reach"],
    reply: "You can reach our support team any time through the Contact link in the navigation or footer.",
  },
  {
    keywords: ["destination", "country", "where do you", "deliver to", "continent"],
    reply: "We deliver to 80+ destinations across six continents. Check the \"Where we deliver\" section on the Home tab for the regions we focus on.",
  },
  {
    keywords: ["admin", "password", "login", "credentials"],
    reply: "The Admin area is for Waypoint staff only — I can't help with admin access.",
  },
];

function matchChatReply(input) {
  const text = input.toLowerCase();
  for (const entry of CHAT_KNOWLEDGE) {
    if (entry.keywords.some((k) => text.includes(k))) return entry.reply;
  }
  return "I don't have a specific answer for that, but you can check the FAQ section on the Home tab, or reach our support team through the Contact link for anything I can't help with.";
}

function genTracking() {
  const digits = Math.floor(100000000 + Math.random() * 899999999); // 9 digits
  const suffix = Math.floor(Math.random() * 10); // 1 digit
  return `WPT-${digits}N${suffix}`;
}

function fmtDateTime(ms) {
  return new Date(ms).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function hoursFromNow(h) {
  return fmtDateTime(Date.now() + h * 3600 * 1000);
}

// Converts a ms timestamp to the "YYYY-MM-DDTHH:mm" string an <input type="datetime-local"> expects.
function toDatetimeLocal(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Parses a datetime-local input's value back into a ms timestamp, or null if invalid/empty.
function fromDatetimeLocal(value) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

const SEED_SHIPMENTS = [
  {
    id: "WPT-188141953N1",
    sender: "Amara Studio", origin: "Newark, NJ",
    recipient: "Kofi Mensah", dest: "Columbus, OH",
    service: "Express", stage: 2, createdAt: Date.now() - 5 * 3600 * 1000,
    eta: hoursFromNow(3), etaTimestamp: Date.now() + 3 * 3600 * 1000, stageTimes: {}, auto: true,
  },
  {
    id: "WPT-204957710N3",
    sender: "Northfield Supplies", origin: "Dallas, TX",
    recipient: "Adjoa Boateng", dest: "Austin, TX",
    service: "Standard", stage: DEFAULT_STAGES.length - 1, createdAt: Date.now() - 30 * 3600 * 1000,
    eta: "Delivered", etaTimestamp: Date.now() - 2 * 3600 * 1000, stageTimes: {}, auto: false,
  },
  {
    id: "WPT-773421068N0",
    sender: "Bright Print Co.", origin: "Portland, OR",
    recipient: "Yaw Darko", dest: "Seattle, WA",
    service: "Standard", stage: 0, createdAt: Date.now() - 20 * 60 * 1000,
    eta: hoursFromNow(26), etaTimestamp: Date.now() + 26 * 3600 * 1000, stageTimes: {}, auto: true,
  },
];

function StageBadge({ stage, stages, icons }) {
  const Icon = icons[stage] || Circle;
  const color = stage === stages.length - 1 ? "#16A34A" : "#1D4ED8";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: `${color}22`, color }}
    >
      <Icon size={13} /> {stages[stage]}
    </span>
  );
}

function RouteVisual({ stage, stages }) {
  const pct = (stage / (stages.length - 1)) * 100;
  return (
    <div className="w-full py-4">
      <div className="flex justify-between text-[11px] mono mb-2" style={{ color: "#64748B" }}>
        <span>ORIGIN</span>
        <span>DESTINATION</span>
      </div>
      <div className="relative h-1.5 rounded-full" style={{ background: "#E2E8F033" }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: "#1D4ED8" }}
        />
        <div
          className="absolute -top-2.5 transition-all duration-700"
          style={{ left: `calc(${pct}% - 12px)` }}
        >
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center ${stage < stages.length - 1 ? "pulse-ring" : ""}`}
            style={{ background: "#1D4ED8", boxShadow: "0 0 0 4px #1D4ED822" }}
          >
            <Truck size={13} color="#F7F9FC" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Timeline({ stage, createdAt, stages, icons, stageTimes }) {
  return (
    <div className="mt-6 space-y-0">
      {stages.map((label, i) => {
        const done = i <= stage;
        const Icon = icons[i] || Circle;
        const isLast = i === stages.length - 1;
        const ts = stageTimes?.[i] ?? (createdAt + i * 3.2 * 3600 * 1000);
        const timeLabel = done ? fmtDateTime(ts) : "—";
        return (
          <div key={`${label}-${i}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: done ? "#1D4ED8" : "#E2E8F033",
                  color: done ? "#F7F9FC" : "#94A3B8",
                }}
              >
                <Icon size={14} />
              </div>
              {!isLast && (
                <div className="w-0.5 flex-1 min-h-[26px]" style={{ background: i < stage ? "#1D4ED8" : "#E2E8F033" }} />
              )}
            </div>
            <div className="pb-6">
              <p className="text-sm font-semibold" style={{ color: done ? "#0F172A" : "#94A3B8" }}>
                {label}
              </p>
              <p className="text-xs mono mt-0.5" style={{ color: "#94A3B8" }}>
                {timeLabel}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GlobeGraphic() {
  const hubs = [
    [72, 78], [162, 66], [104, 158], [182, 138], [56, 152], [130, 118],
  ];
  const links = [
    "M72,78 Q120,40 162,66",
    "M162,66 Q178,105 182,138",
    "M72,78 Q84,120 104,158",
    "M104,158 Q140,150 182,138",
    "M56,152 Q80,160 104,158",
    "M130,118 Q150,95 162,66",
  ];
  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-[260px] mx-auto">
      <g className="spin-slow" style={{ transformOrigin: "120px 120px" }}>
        <circle cx="120" cy="120" r="98" fill="none" stroke="#CBD5E1" strokeWidth="1.5" />
        <ellipse cx="120" cy="120" rx="98" ry="38" fill="none" stroke="#CBD5E1" strokeWidth="1" />
        <ellipse cx="120" cy="120" rx="98" ry="68" fill="none" stroke="#CBD5E1" strokeWidth="1" />
        <line x1="22" y1="120" x2="218" y2="120" stroke="#CBD5E1" strokeWidth="1" />
        <ellipse cx="120" cy="120" rx="38" ry="98" fill="none" stroke="#CBD5E1" strokeWidth="1" />
        <ellipse cx="120" cy="120" rx="68" ry="98" fill="none" stroke="#CBD5E1" strokeWidth="1" />
        <line x1="120" y1="22" x2="120" y2="218" stroke="#CBD5E1" strokeWidth="1" />
      </g>
      {links.map((d, i) => (
        <path key={i} d={d} stroke="#1D4ED8" strokeWidth="1.5" strokeDasharray="4 4" fill="none" opacity="0.55" />
      ))}
      {hubs.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 5 ? 6 : 4.5} fill="#1D4ED8" opacity={i === 5 ? 1 : 0.9} className={i === 5 ? "pulse-dot" : ""} />
      ))}
    </svg>
  );
}

function StepGraphic({ icon: Icon, isLast }) {
  return (
    <div className="flex items-center">
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "#1D4ED822", border: "1px solid #1D4ED855" }}
      >
        <Icon size={18} style={{ color: "#1D4ED8" }} />
      </div>
      {!isLast && <div className="w-8 md:w-16 h-px mx-2" style={{ background: "#E2E8F0" }} />}
    </div>
  );
}

// Fades + slides a section in the first time it scrolls into view.
function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    try {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        },
        { threshold: 0.15 }
      );
      observer.observe(el);
      return () => observer.disconnect();
    } catch (e) {
      setVisible(true);
    }
  }, []);
  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "reveal-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// Animates a number counting up from 0 to `value` once it scrolls into view.
function Counter({ value, suffix = "", duration = 1200 }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function runCountUp() {
      setStarted(true);
      const start = performance.now();
      function tick(now) {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(value * eased));
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
    if (typeof IntersectionObserver === "undefined") {
      if (!started) runCountUp();
      return;
    }
    try {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !started) {
            runCountUp();
            observer.disconnect();
          }
        },
        { threshold: 0.3 }
      );
      observer.observe(el);
      return () => observer.disconnect();
    } catch (e) {
      if (!started) runCountUp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

export default function WaypointDemo() {
  const [shipments, setShipments] = useState(SEED_SHIPMENTS);
  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [stageIconKeys, setStageIconKeys] = useState(DEFAULT_STAGE_ICON_KEYS);
  const stageIcons = useMemo(() => stageIconKeys.map((k) => ICON_MAP[k] || Circle), [stageIconKeys]);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [openFaq, setOpenFaq] = useState(0);
  const [openTimesFor, setOpenTimesFor] = useState(null);
  const [tab, setTab] = useState("home"); // home | track | ship | admin | privacy | terms
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [searched, setSearched] = useState(false);
  const [adminForm, setAdminForm] = useState({ sender: "", origin: "", recipient: "", dest: "", service: "Standard" });
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [justCreated, setJustCreated] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "Hi! I'm the Waypoint assistant. Ask me about tracking, delivery times, customs, or anything else shipping-related." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const active = shipments.find((s) => s.id === activeId) || null;

  // Load saved data from this browser's localStorage on mount. Data persists
  // across visits on this device, but isn't shared across other devices/users
  // — wire up a real backend (e.g. Supabase) here for that.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("waypoint-shipments");
      if (raw) setShipments(JSON.parse(raw));
    } catch (e) {
      // nothing saved yet, or storage unavailable — keep seed data
    }
    try {
      const raw = localStorage.getItem("waypoint-stages-config");
      if (raw) {
        const cfg = JSON.parse(raw);
        if (cfg.stages) setStages(cfg.stages);
        if (cfg.iconKeys) setStageIconKeys(cfg.iconKeys);
      }
    } catch (e) {
      // nothing saved yet, or storage unavailable — keep defaults
    }
    setLoaded(true);
  }, []);

  // Persist shipments to localStorage whenever they change (after initial load).
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("waypoint-shipments", JSON.stringify(shipments));
    } catch (e) {
      setSaveError(true);
    }
  }, [shipments, loaded]);

  // Persist stage config to localStorage whenever it changes (after initial load).
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("waypoint-stages-config", JSON.stringify({ stages, iconKeys: stageIconKeys }));
    } catch (e) {
      setSaveError(true);
    }
  }, [stages, stageIconKeys, loaded]);

  // Globally advance any shipment flagged `auto` every few seconds, for demo purposes.
  // Admin edits to stage/fields turn `auto` off for that shipment so manual control sticks.
  useEffect(() => {
    const timer = setInterval(() => {
      setShipments((prev) =>
        prev.map((s) =>
          s.auto && s.stage < stages.length - 1
            ? { ...s, stage: s.stage + 1, eta: s.stage + 1 === stages.length - 1 ? "Delivered" : s.eta }
            : s
        )
      );
    }, 4000);
    return () => clearInterval(timer);
  }, [stages.length]);

  // Keep the chat panel scrolled to the latest message.
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatOpen, chatLoading]);

  function updateShipment(id, patch) {
    setShipments((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function deleteShipment(id) {
    setShipments((prev) => prev.filter((s) => s.id !== id));
    if (activeId === id) setActiveId(null);
  }

  function createShipment(details, opts = {}) {
    const id = genTracking();
    const etaHours = details.service === "Express" ? 8 : 26;
    const etaTimestamp = Date.now() + etaHours * 3600 * 1000;
    const shipment = {
      id,
      sender: details.sender, origin: details.origin,
      recipient: details.recipient, dest: details.dest,
      service: details.service, stage: opts.stage ?? 0,
      createdAt: Date.now(),
      eta: fmtDateTime(etaTimestamp), etaTimestamp,
      stageTimes: {},
      auto: opts.auto ?? true,
    };
    setShipments((prev) => [shipment, ...prev]);
    return id;
  }

  function handleTrack() {
    setSearched(true);
    const found = shipments.find((s) => s.id.toLowerCase() === query.trim().toLowerCase());
    setActiveId(found ? found.id : null);
  }

  const sorted = useMemo(() => [...shipments].sort((a, b) => b.createdAt - a.createdAt), [shipments]);

  function handleAdminCreate() {
    if (!adminForm.sender || !adminForm.origin || !adminForm.recipient || !adminForm.dest) return;
    const id = createShipment(adminForm, { auto: false });
    setJustCreated(id);
    setAdminForm({ sender: "", origin: "", recipient: "", dest: "", service: "Standard" });
    setShowAdminForm(false);
  }

  function handleAdminLogin() {
    if (loginForm.username === "admin" && loginForm.password === "9972") {
      setIsAdminAuthed(true);
      setLoginError("");
      setLoginForm({ username: "", password: "" });
    } else {
      setLoginError("Incorrect username or password.");
    }
  }

  // Rule-based responder — matches keywords against CHAT_KNOWLEDGE. No external
  // API call, so it works free on any host with zero setup. A brief simulated
  // delay keeps the "thinking" indicator feeling natural.
  function sendChatMessage() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const nextMessages = [...chatMessages, { role: "user", content: text }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
    setTimeout(() => {
      const reply = matchChatReply(text);
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setChatLoading(false);
    }, 500 + Math.random() * 400);
  }

  // "Delivered" (the last stage) always stays last — new stages are inserted just before it.
  function handleAddStage() {
    const name = newStageName.trim();
    if (!name) return;
    setStages((prev) => {
      const next = [...prev];
      next.splice(next.length - 1, 0, name);
      return next;
    });
    setStageIconKeys((prev) => {
      const next = [...prev];
      next.splice(next.length - 1, 0, "Circle");
      return next;
    });
    setNewStageName("");
  }

  function renameStage(index, name) {
    setStages((prev) => prev.map((s, i) => (i === index ? name : s)));
  }

  function removeStage(index) {
    if (stages.length <= 2 || index === stages.length - 1) return; // keep at least 2 stages; "Delivered" is protected
    const newLength = stages.length - 1;
    setStages((prev) => prev.filter((_, i) => i !== index));
    setStageIconKeys((prev) => prev.filter((_, i) => i !== index));
    setShipments((prev) =>
      prev.map((s) => {
        let stage = s.stage > index ? s.stage - 1 : s.stage;
        stage = Math.min(stage, newLength - 1);
        return { ...s, stage };
      })
    );
  }

  // Swaps stage `index` with its neighbor in the given direction (-1 up, +1 down).
  // "Delivered" (the last stage) is fixed in place and never part of a swap.
  function moveStage(index, dir) {
    const target = index + dir;
    if (index < 0 || index >= stages.length - 1) return;
    if (target < 0 || target >= stages.length - 1) return;
    setStages((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setStageIconKeys((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateStageTime(shipmentId, index, ms) {
    setShipments((prev) =>
      prev.map((s) =>
        s.id === shipmentId ? { ...s, stageTimes: { ...(s.stageTimes || {}), [index]: ms } } : s
      )
    );
  }

  return (
    <div className="min-h-screen w-full" style={{ background: "#F7F9FC", color: "#0F172A", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');
        .display { font-family: 'Oswald', sans-serif; letter-spacing: 0.01em; text-transform: uppercase; }
        .mono { font-family: 'IBM Plex Mono', monospace; }

        .gradient-text {
          background: linear-gradient(135deg, #0F172A 0%, #334155 45%, #1D4ED8 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }

        .card-hover { transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 16px 32px rgba(29,78,216,0.16); border-color: #1D4ED877; }

        .btn-glow { transition: transform .2s ease, box-shadow .2s ease, filter .2s ease; }
        .btn-glow:hover { transform: translateY(-1px); box-shadow: 0 0 0 4px rgba(29,78,216,0.2), 0 10px 24px rgba(29,78,216,0.35); filter: brightness(1.05); }

        .chip-hover { transition: transform .2s ease, border-color .2s ease, background .2s ease; }
        .chip-hover:hover { transform: translateY(-2px); border-color: #1D4ED888; background: #EFF6FFff; }

        @keyframes floatBlob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(24px, -18px) scale(1.06); }
        }
        .blob { position: absolute; border-radius: 9999px; filter: blur(90px); pointer-events: none; animation: floatBlob 12s ease-in-out infinite; }

        @keyframes pulseRing {
          0% { box-shadow: 0 0 0 0 rgba(29,78,216,0.45); }
          70% { box-shadow: 0 0 0 14px rgba(29,78,216,0); }
          100% { box-shadow: 0 0 0 0 rgba(29,78,216,0); }
        }
        .pulse-ring { animation: pulseRing 2.5s ease-out infinite; }

        @keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-slow { animation: spinSlow 60s linear infinite; }

        @keyframes svgPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.35); }
        }
        .pulse-dot { animation: svgPulse 2.5s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }

        .reveal { opacity: 0; transform: translateY(18px); transition: opacity .7s ease, transform .7s ease; }
        .reveal-visible { opacity: 1; transform: translateY(0); }

        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 8px; }
        ::-webkit-scrollbar-thumb:hover { background: #1D4ED8; }
      `}</style>

      {/* Header */}
      <header className="border-b sticky top-0 z-20" style={{ borderColor: "#E2E8F066", background: "#F7F9FCee", backdropFilter: "blur(6px)" }}>
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <button onClick={() => setTab("home")} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: "#1D4ED8" }}>
              <Truck size={17} color="#F7F9FC" />
            </div>
            <span className="display text-2xl">Waypoint</span>
          </button>
          <nav className="flex gap-1">
            {[
              ["home", "Home"],
              ["track", "Track"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="px-3.5 py-2 rounded-md text-sm font-medium transition-all hover:-translate-y-0.5"
                style={{
                  background: tab === key ? "#1D4ED8" : "transparent",
                  color: tab === key ? "#F7F9FC" : "#334155",
                }}
              >
                {label}
              </button>
            ))}
            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=supportwaypoint24zendesk@gmail.com&su=Contact%20Waypoint"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-md text-sm font-medium transition-all hover:-translate-y-0.5"
              style={{ color: "#334155" }}
            >
              Contact
            </a>
            <button
              onClick={() => setTab("admin")}
              className="px-3.5 py-2 rounded-md text-sm font-medium transition-all hover:-translate-y-0.5"
              style={{
                background: tab === "admin" ? "#1D4ED8" : "transparent",
                color: tab === "admin" ? "#F7F9FC" : "#334155",
              }}
            >
              Admin
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-10 relative">
        {/* ---------------- Home tab ---------------- */}
        {tab === "home" && (
          <div>
            {/* Hero */}
            <section className="relative grid md:grid-cols-2 gap-8 items-center py-10 md:py-16 border-b overflow-hidden" style={{ borderColor: "#E2E8F066" }}>
              <div className="blob" style={{ width: 340, height: 340, top: -80, left: -120, background: "#1D4ED8", opacity: 0.08 }} />
              <div className="blob" style={{ width: 280, height: 280, bottom: -100, right: -80, background: "#16A34A", animationDelay: "3s", opacity: 0.06 }} />
              <div className="relative">
                <p className="mono text-xs uppercase tracking-[0.2em] mb-3" style={{ color: "#1D4ED8" }}>
                  Global parcel delivery
                </p>
                <h1 className="display text-5xl md:text-6xl leading-[0.95] max-w-xl gradient-text">
                  Open your world to every doorstep.
                </h1>
                <p className="mt-5 max-w-xl text-sm leading-relaxed" style={{ color: "#334155" }}>
                  Waypoint moves parcels across borders and across town —
                  pairing a trusted carrier network with customs expertise, so your
                  shipments clear faster and arrive on time.
                </p>
                <p className="mt-3 max-w-xl text-sm leading-relaxed" style={{ color: "#64748B" }}>
                  From the first scan at pickup to the final knock on the door, every
                  parcel is tracked end to end — so you and your customers always know
                  exactly where things stand.
                </p>
                <div className="flex flex-wrap gap-3 mt-7">
                  <button
                    onClick={() => setTab("track")}
                    className="btn-glow flex items-center gap-1.5 px-5 py-3 rounded-lg text-sm font-semibold"
                    style={{ background: "#1D4ED8", color: "#F7F9FC" }}
                  >
                    Track a shipment <ArrowRight size={15} />
                  </button>
                </div>
              </div>
              <div className="hidden md:block relative">
                <GlobeGraphic />
              </div>
            </section>

            {/* Trust stats */}
            <Reveal>
              <section className="grid grid-cols-2 md:grid-cols-4 gap-6 py-10 border-b" style={{ borderColor: "#E2E8F066" }}>
                {[
                  [500, "+", "Businesses shipping with us"],
                  [60, "+", "Carrier & customs partners"],
                  [18, "", "Facilities worldwide"],
                  [6, "", "Continents reached"],
                ].map(([num, suffix, label]) => (
                  <div key={label}>
                    <p className="display text-3xl" style={{ color: "#1D4ED8" }}>
                      <Counter value={num} suffix={suffix} />
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#64748B" }}>{label}</p>
                  </div>
                ))}
              </section>
            </Reveal>

            {/* Services */}
            <Reveal>
              <section className="py-10 border-b" style={{ borderColor: "#E2E8F066" }}>
                <h2 className="display text-2xl mb-6">What we do</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-xl card-hover" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                    <Warehouse size={20} style={{ color: "#1D4ED8" }} className="mb-3" />
                    <h3 className="font-semibold text-sm mb-1.5">Fulfillment & warehousing</h3>
                    <p className="text-xs leading-relaxed" style={{ color: "#64748B" }}>
                      Hand off storage and pick-and-pack so you can focus on growing
                      the business, not running a warehouse.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl card-hover" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                    <ShieldCheck size={20} style={{ color: "#1D4ED8" }} className="mb-3" />
                    <h3 className="font-semibold text-sm mb-1.5">Customs & trade compliance</h3>
                    <p className="text-xs leading-relaxed" style={{ color: "#64748B" }}>
                      Our compliance team handles the paperwork so parcels clear
                      borders quickly instead of sitting in customs.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl card-hover" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                    <Globe size={20} style={{ color: "#1D4ED8" }} className="mb-3" />
                    <h3 className="font-semibold text-sm mb-1.5">Cross-border delivery</h3>
                    <p className="text-xs leading-relaxed" style={{ color: "#64748B" }}>
                      A carrier network spanning multiple continents means one
                      partner can get a parcel nearly anywhere.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl card-hover" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                    <Undo2 size={20} style={{ color: "#1D4ED8" }} className="mb-3" />
                    <h3 className="font-semibold text-sm mb-1.5">Returns management</h3>
                    <p className="text-xs leading-relaxed" style={{ color: "#64748B" }}>
                      Return labels and reverse logistics, handled with the same care
                      as the outbound shipment.
                    </p>
                  </div>
                </div>
              </section>
            </Reveal>

            {/* How it works */}
            <Reveal>
              <section className="py-10 border-b" style={{ borderColor: "#E2E8F066" }}>
                <h2 className="display text-2xl mb-2">How it works</h2>
                <p className="text-sm mb-6 max-w-xl" style={{ color: "#64748B" }}>
                  Three steps from your door to theirs — track any of them in real time
                  the moment a label is created.
                </p>
                <div className="flex items-start flex-wrap gap-y-6">
                  {[
                    [Package, "Create a label", "Enter sender, recipient, and service level — a tracking number is issued instantly."],
                    [ShieldCheck, "We handle transit & customs", "Your parcel moves through our carrier network and clears customs with our team's help."],
                    [CheckCircle2, "Delivered", "Tracked every step of the way, right up to the final delivery."],
                  ].map(([Icon, title, desc], i, arr) => (
                  <div key={title} className="flex items-start" style={{ minWidth: 0 }}>
                    <div className="flex flex-col items-start w-40 md:w-48">
                      <StepGraphic icon={Icon} isLast={i === arr.length - 1} />
                      <h3 className="text-sm font-semibold mt-3">{title}</h3>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: "#64748B" }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            </Reveal>

            {/* Why choose us */}
            <Reveal>
              <section className="py-10 border-b" style={{ borderColor: "#E2E8F066" }}>
                <h2 className="display text-2xl mb-6">Why businesses ship with us</h2>
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                  {[
                    "Real-time tracking on every shipment, from label creation to final delivery",
                    "Dedicated customs specialists who handle the paperwork for you",
                    "Transparent pricing with no surprise fees at the border",
                    "A carrier network built for both domestic and cross-border delivery",
                    "Support you can actually reach when a shipment needs attention",
                    "Fulfillment options so you don't have to run your own warehouse",
                  ].map((point) => (
                    <div key={point} className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: "#1D4ED8" }} />
                      <p className="text-sm" style={{ color: "#334155" }}>{point}</p>
                    </div>
                  ))}
                </div>
              </section>
            </Reveal>

            {/* Platform showcase */}
            <Reveal>
              <section className="grid md:grid-cols-2 gap-8 items-center py-10 border-b" style={{ borderColor: "#E2E8F066" }}>
                <div>
                  <p className="mono text-xs uppercase tracking-[0.2em] mb-3" style={{ color: "#1D4ED8" }}>
                    The platform
                  </p>
                  <h2 className="display text-3xl mb-4">See exactly where every parcel is</h2>
                  <p className="text-sm leading-relaxed mb-5" style={{ color: "#334155" }}>
                    Waypoint Pulse gives you and your customers one real-time view of
                    every shipment — from the moment a label is created to the knock on
                    the door.
                  </p>
                  <div className="space-y-2.5 mb-6">
                    {[
                      [Zap, "Live status updates at every stage"],
                      [FileText, "Customs documentation generated automatically"],
                      [Package, "One-click label generation"],
                      [ListChecks, "Exportable shipment reports"],
                    ].map(([Icon, label]) => (
                      <div key={label} className="flex items-center gap-2.5">
                        <Icon size={15} style={{ color: "#1D4ED8" }} className="shrink-0" />
                        <p className="text-sm" style={{ color: "#334155" }}>{label}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setTab("track")}
                    className="btn-glow flex items-center gap-1.5 text-sm font-semibold px-5 py-2.5 rounded-lg"
                    style={{ background: "#1D4ED8", color: "#F7F9FC" }}
                  >
                    Try live tracking <ArrowRight size={15} />
                  </button>
                </div>

                <div className="card-hover rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                  <p className="mono text-xs" style={{ color: "#64748B" }}>TRACKING NUMBER</p>
                  <p className="display text-xl mt-0.5 mb-3">WPT-284719055N2</p>
                  <StageBadge
                    stage={Math.min(2, stages.length - 1)}
                    stages={stages}
                    icons={stageIcons}
                  />
                  <RouteVisual stage={Math.min(2, stages.length - 1)} stages={stages} />
                  <p className="text-xs" style={{ color: "#64748B" }}>Sample preview — try it yourself on the Track tab.</p>
                </div>
              </section>
            </Reveal>

            {/* Destinations */}
            <Reveal>
              <section className="py-10 border-b" style={{ borderColor: "#E2E8F066" }}>
                <h2 className="display text-2xl mb-2">Where we deliver</h2>
                <p className="text-sm mb-6 max-w-xl" style={{ color: "#64748B" }}>
                  80+ destinations across six continents, with new lanes added every
                  quarter.
                </p>
                <div className="flex flex-wrap gap-2">
                  {REGIONS.map((region) => (
                    <span
                      key={region}
                      className="chip-hover flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                      style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#334155" }}
                    >
                      <MapPin size={12} style={{ color: "#1D4ED8" }} /> {region}
                    </span>
                  ))}
                </div>
              </section>
            </Reveal>

            {/* Our story */}
            <Reveal>
              <section className="grid md:grid-cols-2 gap-8 items-center py-10 border-b" style={{ borderColor: "#E2E8F066" }}>
                <div>
                  <p className="mono text-xs uppercase tracking-[0.2em] mb-3" style={{ color: "#1D4ED8" }}>
                    Our story
                  </p>
                  <h2 className="display text-3xl mb-4">Built for ambitious shipments</h2>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: "#334155" }}>
                    Waypoint started in 2005 with a simple idea: moving a parcel
                    across a border shouldn't be any harder than moving it across town.
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                    Two decades later, that's still the job — pairing a carrier network
                    with people who actually know your shipments, so growing businesses
                    can expand internationally without the shipping logistics slowing
                    them down.
                  </p>
                </div>
                <div className="card-hover rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                  <p className="text-sm italic leading-relaxed" style={{ color: "#334155" }}>
                    "The best logistics partner is the one you stop thinking about —
                    because things just arrive."
                  </p>
                  <p className="mono text-xs mt-3" style={{ color: "#64748B" }}>— Waypoint Ops Team</p>
                </div>
              </section>
            </Reveal>

            {/* FAQ */}
            <Reveal>
              <section className="py-10 border-b" style={{ borderColor: "#E2E8F066" }}>
                <h2 className="display text-2xl mb-6">Frequently asked questions</h2>
                <div className="space-y-2">
                  {FAQS.map(([q, a], i) => {
                    const open = openFaq === i;
                    return (
                      <div key={q} className="rounded-lg overflow-hidden transition-colors" style={{ background: "#FFFFFF", border: open ? "1px solid #1D4ED888" : "1px solid #E2E8F0" }}>
                        <button
                          onClick={() => setOpenFaq(open ? null : i)}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
                        >
                          <span className="text-sm font-medium">{q}</span>
                          <ChevronDown
                            size={16}
                            className="shrink-0 transition-transform duration-300"
                            style={{ color: open ? "#1D4ED8" : "#64748B", transform: open ? "rotate(180deg)" : "none" }}
                          />
                        </button>
                        <div
                          className="transition-all duration-300 overflow-hidden"
                          style={{ maxHeight: open ? "200px" : "0px" }}
                        >
                          <p className="px-4 pb-4 text-sm leading-relaxed" style={{ color: "#64748B" }}>{a}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </Reveal>

            {/* CTA banner */}
            <Reveal>
              <section
                className="relative overflow-hidden py-10 px-6 my-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                style={{ background: "linear-gradient(120deg, #FFFFFF 0%, #EFF6FF 100%)", border: "1px solid #E2E8F0" }}
              >
                <div className="blob" style={{ width: 220, height: 220, top: -60, right: -40, background: "#1D4ED8", opacity: 0.06 }} />
                <div className="relative">
                  <h2 className="display text-2xl">Have a tracking number?</h2>
                  <p className="text-sm mt-1" style={{ color: "#64748B" }}>
                    Check the status of a shipment already on its way.
                  </p>
                </div>
                <div className="relative flex gap-3 shrink-0">
                  <button
                    onClick={() => setTab("track")}
                    className="btn-glow flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold"
                    style={{ background: "#1D4ED8", color: "#F7F9FC" }}
                  >
                    Track a shipment <ArrowRight size={15} />
                  </button>
                </div>
              </section>
            </Reveal>
          </div>
        )}

        {/* ---------------- Track tab ---------------- */}
        {tab === "track" && (
          <div>
            <div className="flex gap-2 mb-8">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#94A3B8" }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                  placeholder={`Enter tracking number, e.g. ${active?.id || "WPT-188141953N1"}`}
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-sm mono outline-none"
                  style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#0F172A" }}
                />
              </div>
              <button
                type="button"
                onClick={handleTrack}
                className="btn-glow px-5 py-3 rounded-lg text-sm font-semibold"
                style={{ background: "#1D4ED8", color: "#F7F9FC" }}
              >
                Track
              </button>
            </div>

            {!active && (
              <p className="text-sm" style={{ color: "#64748B" }}>
                {searched
                  ? "No shipment found for that tracking number."
                  : "Enter a tracking number above to see its delivery status."}
              </p>
            )}

            {active && (
              <div className="reveal reveal-visible rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 20px 40px rgba(15,23,42,0.08)" }}>
                {justCreated === active.id && (
                  <div
                    className="mb-5 px-3 py-2 rounded-md text-xs font-medium flex items-center gap-2"
                    style={{ background: "#16A34A22", color: "#16A34A" }}
                  >
                    <CheckCircle2 size={14} /> Label created — this shipment will auto-progress every few seconds for the demo.
                  </div>
                )}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="mono text-xs" style={{ color: "#64748B" }}>TRACKING NUMBER</p>
                    <p className="display text-2xl mt-0.5">{active.id}</p>
                  </div>
                  <StageBadge stage={active.stage} stages={stages} icons={stageIcons} />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
                  <div>
                    <p className="text-xs" style={{ color: "#64748B" }}>From</p>
                    <p className="font-medium">{active.sender}</p>
                    <p style={{ color: "#64748B" }}>{active.origin}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "#64748B" }}>To</p>
                    <p className="font-medium">{active.recipient}</p>
                    <p style={{ color: "#64748B" }}>{active.dest}</p>
                  </div>
                </div>

                <RouteVisual stage={active.stage} stages={stages} />

                <div className="flex items-center gap-1.5 text-sm mt-2" style={{ color: "#334155" }}>
                  <Clock size={14} />
                  {active.stage >= stages.length - 1 ? "Delivered" : <>Estimated arrival <span className="mono">{active.eta}</span></>}
                  <span className="mx-1">·</span>
                  {active.service} service
                </div>

                <Timeline stage={active.stage} createdAt={active.createdAt} stages={stages} icons={stageIcons} stageTimes={active.stageTimes} />
              </div>
            )}
          </div>
        )}

        {/* ---------------- Admin tab ---------------- */}
        {tab === "admin" && !isAdminAuthed && (
          <div className="max-w-sm mx-auto mt-10">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ background: "#E2E8F033" }}>
                <Lock size={18} style={{ color: "#1D4ED8" }} />
              </div>
              <h2 className="display text-2xl">Admin login</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs mono block mb-1" style={{ color: "#64748B" }}>USERNAME</label>
                <input
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                  className="w-full px-3 py-2.5 rounded-md text-sm outline-none"
                  style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#0F172A" }}
                />
              </div>
              <div>
                <label className="text-xs mono block mb-1" style={{ color: "#64748B" }}>PASSWORD</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                  className="w-full px-3 py-2.5 rounded-md text-sm outline-none"
                  style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#0F172A" }}
                />
              </div>
              {loginError && (
                <p className="text-xs" style={{ color: "#DC2626" }}>{loginError}</p>
              )}
              <button
                type="button"
                onClick={handleAdminLogin}
                className="w-full py-2.5 rounded-md font-semibold text-sm mt-1"
                style={{ background: "#1D4ED8", color: "#F7F9FC" }}
              >
                Log in
              </button>
            </div>
          </div>
        )}

        {tab === "admin" && isAdminAuthed && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings size={20} style={{ color: "#1D4ED8" }} />
                <h2 className="display text-3xl">Admin</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAdminForm((v) => !v)}
                  className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-md"
                  style={{ background: "#1D4ED8", color: "#F7F9FC" }}
                >
                  <Plus size={15} /> New shipment
                </button>
                <button
                  onClick={() => setIsAdminAuthed(false)}
                  className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-md"
                  style={{ background: "#E2E8F033", color: "#334155" }}
                >
                  <LogOut size={15} /> Log out
                </button>
              </div>
            </div>

            {saveError && (
              <div
                className="mb-6 px-3 py-2 rounded-md text-xs font-medium"
                style={{ background: "#DC262622", color: "#DC2626" }}
              >
                Changes aren't saving to the database right now — edits may not persist.
              </div>
            )}

            <div className="p-4 rounded-lg mb-6" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
              <div className="flex items-center gap-2 mb-3">
                <ListChecks size={15} style={{ color: "#1D4ED8" }} />
                <h3 className="text-sm font-semibold">Progress stages</h3>
              </div>
              <div className="space-y-2">
                {stages.map((label, i) => {
                  const isLast = i === stages.length - 1;
                  return (
                    <div key={`${label}-${i}`} className="flex items-center gap-2">
                      <span className="mono text-xs w-5 shrink-0" style={{ color: "#64748B" }}>{i + 1}</span>
                      <input
                        value={label}
                        disabled={isLast}
                        onChange={(e) => renameStage(i, e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded text-sm outline-none disabled:opacity-60"
                        style={{ background: "#F7F9FC", border: "1px solid #E2E8F0", color: "#0F172A" }}
                      />
                      <div className="flex gap-0.5 shrink-0">
                        <button
                          onClick={() => moveStage(i, -1)}
                          disabled={isLast || i === 0}
                          className="p-1.5 rounded-md disabled:opacity-25 disabled:cursor-not-allowed hover:brightness-125"
                          style={{ background: "#E2E8F033", color: "#334155" }}
                          title="Move up"
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          onClick={() => moveStage(i, 1)}
                          disabled={isLast || i >= stages.length - 2}
                          className="p-1.5 rounded-md disabled:opacity-25 disabled:cursor-not-allowed hover:brightness-125"
                          style={{ background: "#E2E8F033", color: "#334155" }}
                          title="Move down"
                        >
                          <ChevronDown size={13} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeStage(i)}
                        disabled={isLast || stages.length <= 2}
                        className="p-1.5 rounded-md disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-125"
                        style={{ background: "#DC262622", color: "#DC2626" }}
                        title={isLast ? `"Delivered" can't be removed` : "Remove stage"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddStage()}
                  placeholder="New stage name, e.g. Held at Sorting Facility"
                  className="flex-1 px-2.5 py-1.5 rounded text-sm outline-none"
                  style={{ background: "#F7F9FC", border: "1px solid #E2E8F0", color: "#0F172A" }}
                />
                <button
                  type="button"
                  onClick={handleAddStage}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 shrink-0"
                  style={{ background: "#1D4ED8", color: "#F7F9FC" }}
                >
                  <Plus size={13} /> Add
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: "#64748B" }}>
                New stages are inserted just before "Delivered", which always stays last.
              </p>
            </div>

            {showAdminForm && (
              <div
                className="grid grid-cols-2 gap-3 p-4 rounded-lg mb-6"
                style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
              >
                <input
                  placeholder="Sender name" value={adminForm.sender}
                  onChange={(e) => setAdminForm({ ...adminForm, sender: e.target.value })}
                  className="px-3 py-2 rounded-md text-sm outline-none col-span-1"
                  style={{ background: "#F7F9FC", border: "1px solid #E2E8F0", color: "#0F172A" }}
                />
                <input
                  placeholder="Pickup city" value={adminForm.origin}
                  onChange={(e) => setAdminForm({ ...adminForm, origin: e.target.value })}
                  className="px-3 py-2 rounded-md text-sm outline-none col-span-1"
                  style={{ background: "#F7F9FC", border: "1px solid #E2E8F0", color: "#0F172A" }}
                />
                <input
                  placeholder="Recipient name" value={adminForm.recipient}
                  onChange={(e) => setAdminForm({ ...adminForm, recipient: e.target.value })}
                  className="px-3 py-2 rounded-md text-sm outline-none col-span-1"
                  style={{ background: "#F7F9FC", border: "1px solid #E2E8F0", color: "#0F172A" }}
                />
                <input
                  placeholder="Delivery city" value={adminForm.dest}
                  onChange={(e) => setAdminForm({ ...adminForm, dest: e.target.value })}
                  className="px-3 py-2 rounded-md text-sm outline-none col-span-1"
                  style={{ background: "#F7F9FC", border: "1px solid #E2E8F0", color: "#0F172A" }}
                />
                <select
                  value={adminForm.service}
                  onChange={(e) => setAdminForm({ ...adminForm, service: e.target.value })}
                  className="px-3 py-2 rounded-md text-sm outline-none col-span-1"
                  style={{ background: "#F7F9FC", border: "1px solid #E2E8F0", color: "#0F172A" }}
                >
                  <option>Standard</option>
                  <option>Express</option>
                </select>
                <button
                  type="button"
                  onClick={handleAdminCreate}
                  className="col-span-1 py-2 rounded-md text-sm font-semibold"
                  style={{ background: "#1D4ED8", color: "#F7F9FC" }}
                >
                  Create shipment
                </button>
              </div>
            )}

            <div className="space-y-3">
              {sorted.map((s) => (
                <div key={s.id} className="p-4 rounded-lg" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="mono text-sm" style={{ color: "#0F172A" }}>{s.id}</p>
                    <button
                      onClick={() => deleteShipment(s.id)}
                      className="p-1.5 rounded-md hover:brightness-125"
                      style={{ background: "#DC262622", color: "#DC2626" }}
                      title="Delete shipment"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={s.sender}
                      onChange={(e) => updateShipment(s.id, { sender: e.target.value })}
                      placeholder="Sender"
                      className="px-2.5 py-1.5 rounded text-sm outline-none"
                      style={{ background: "#F7F9FC", border: "1px solid #E2E8F0", color: "#0F172A" }}
                    />
                    <input
                      value={s.origin}
                      onChange={(e) => updateShipment(s.id, { origin: e.target.value })}
                      placeholder="Origin"
                      className="px-2.5 py-1.5 rounded text-sm outline-none"
                      style={{ background: "#F7F9FC", border: "1px solid #E2E8F0", color: "#0F172A" }}
                    />
                    <input
                      value={s.recipient}
                      onChange={(e) => updateShipment(s.id, { recipient: e.target.value })}
                      placeholder="Recipient"
                      className="px-2.5 py-1.5 rounded text-sm outline-none"
                      style={{ background: "#F7F9FC", border: "1px solid #E2E8F0", color: "#0F172A" }}
                    />
                    <input
                      value={s.dest}
                      onChange={(e) => updateShipment(s.id, { dest: e.target.value })}
                      placeholder="Destination"
                      className="px-2.5 py-1.5 rounded text-sm outline-none"
                      style={{ background: "#F7F9FC", border: "1px solid #E2E8F0", color: "#0F172A" }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <select
                      value={s.service}
                      onChange={(e) => updateShipment(s.id, { service: e.target.value })}
                      className="px-2.5 py-1.5 rounded text-sm outline-none"
                      style={{ background: "#F7F9FC", border: "1px solid #E2E8F0", color: "#0F172A" }}
                    >
                      <option>Standard</option>
                      <option>Express</option>
                    </select>

                    <select
                      value={s.stage}
                      onChange={(e) =>
                        updateShipment(s.id, {
                          stage: Number(e.target.value),
                          auto: false,
                          eta: Number(e.target.value) === stages.length - 1 ? "Delivered" : s.eta,
                        })
                      }
                      className="px-2.5 py-1.5 rounded text-sm outline-none"
                      style={{ background: "#F7F9FC", border: "1px solid #E2E8F0", color: "#0F172A" }}
                    >
                      {stages.map((label, i) => (
                        <option key={`${label}-${i}`} value={i}>{label}</option>
                      ))}
                    </select>

                    <label className="flex items-center gap-1.5 text-xs" style={{ color: "#334155" }}>
                      <input
                        type="checkbox"
                        checked={!!s.auto}
                        onChange={(e) => updateShipment(s.id, { auto: e.target.checked })}
                      />
                      <RefreshCw size={12} /> Auto-progress
                    </label>

                    <button
                      onClick={() => setOpenTimesFor(openTimesFor === s.id ? null : s.id)}
                      className="text-xs font-medium px-2.5 py-1.5 rounded flex items-center gap-1"
                      style={{ background: "#E2E8F033", color: "#334155" }}
                    >
                      <CalendarClock size={12} /> {openTimesFor === s.id ? "Hide times" : "Edit times"}
                    </button>

                    <button
                      onClick={() => {
                        setActiveId(s.id);
                        setTab("track");
                      }}
                      className="ml-auto text-xs font-medium px-2.5 py-1.5 rounded flex items-center gap-1"
                      style={{ background: "#E2E8F033", color: "#334155" }}
                    >
                      View <ChevronRight size={12} />
                    </button>
                  </div>

                  {openTimesFor === s.id && (
                    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid #E2E8F0" }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-32 shrink-0" style={{ color: "#64748B" }}>Estimated arrival</span>
                        <input
                          type="datetime-local"
                          value={toDatetimeLocal(s.etaTimestamp ?? Date.now())}
                          onChange={(e) => {
                            const ms = fromDatetimeLocal(e.target.value);
                            if (ms == null) return;
                            updateShipment(s.id, {
                              etaTimestamp: ms,
                              eta: s.stage >= stages.length - 1 ? "Delivered" : fmtDateTime(ms),
                            });
                          }}
                          className="flex-1 px-2.5 py-1.5 rounded text-xs outline-none"
                          style={{ background: "#F7F9FC", border: "1px solid #E2E8F0", color: "#0F172A" }}
                        />
                      </div>
                      {stages.map((label, i) => (
                        <div key={`${label}-${i}`} className="flex items-center gap-2">
                          <span className="text-xs w-32 shrink-0 truncate" style={{ color: "#64748B" }} title={label}>{label}</span>
                          <input
                            type="datetime-local"
                            value={toDatetimeLocal(s.stageTimes?.[i] ?? (s.createdAt + i * 3.2 * 3600 * 1000))}
                            onChange={(e) => {
                              const ms = fromDatetimeLocal(e.target.value);
                              if (ms != null) updateStageTime(s.id, i, ms);
                            }}
                            className="flex-1 px-2.5 py-1.5 rounded text-xs outline-none"
                            style={{ background: "#F7F9FC", border: "1px solid #E2E8F0", color: "#0F172A" }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {sorted.length === 0 && (
                <p className="text-sm" style={{ color: "#64748B" }}>No shipments yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ---------------- Privacy tab ---------------- */}
        {tab === "privacy" && (
          <div className="max-w-2xl">
            <h2 className="display text-4xl mb-6">Privacy Notice</h2>
            <div className="space-y-5 text-sm leading-relaxed" style={{ color: "#334155" }}>
              <p>
                This Privacy Notice explains how Waypoint Inc. ("Waypoint," "we," "us")
                collects, uses, and protects information in connection with our shipping and tracking
                services. This is a demo notice for illustrative purposes.
              </p>
              <div>
                <h3 className="text-base font-semibold mb-1" style={{ color: "#0F172A" }}>Information we collect</h3>
                <p>
                  When you create a shipment or contact us, we may collect sender and recipient names,
                  pickup and delivery addresses, service selections, and any details you send us directly,
                  such as through email.
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1" style={{ color: "#0F172A" }}>How we use information</h3>
                <p>
                  We use shipment information to generate tracking numbers, display delivery status, and
                  respond to support requests. We do not sell personal information to third parties.
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1" style={{ color: "#0F172A" }}>Data retention</h3>
                <p>
                  Shipment and tracking records are retained only as long as needed to provide the service
                  and to meet any applicable legal or recordkeeping obligations.
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1" style={{ color: "#0F172A" }}>Your choices</h3>
                <p>
                  You may contact us at any time to ask what information we hold about a shipment or to
                  request corrections.
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1" style={{ color: "#0F172A" }}>Contact us</h3>
                <p>
                  Questions about this notice can be sent to{" "}
                  <a href="https://mail.google.com/mail/?view=cm&fs=1&to=supportwaypoint24zendesk@gmail.com&su=Contact%20Waypoint" target="_blank" rel="noopener noreferrer" style={{ color: "#1D4ED8" }}>
                    supportwaypoint24zendesk@gmail.com
                  </a>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Terms tab ---------------- */}
        {tab === "terms" && (
          <div className="max-w-2xl">
            <h2 className="display text-4xl mb-6">Terms &amp; Conditions</h2>
            <div className="space-y-5 text-sm leading-relaxed" style={{ color: "#334155" }}>
              <p>
                These Terms &amp; Conditions govern your use of Waypoint Inc.'s shipping and
                tracking services. This is a demo notice for illustrative purposes.
              </p>
              <div>
                <h3 className="text-base font-semibold mb-1" style={{ color: "#0F172A" }}>Acceptance of terms</h3>
                <p>
                  By creating a shipment or otherwise using this service, you agree to be bound by these
                  terms.
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1" style={{ color: "#0F172A" }}>Shipping &amp; delivery</h3>
                <p>
                  Estimated delivery windows are approximate and are not guaranteed. Delivery times may
                  vary based on service level, destination, and factors outside our control.
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1" style={{ color: "#0F172A" }}>Prohibited items</h3>
                <p>
                  You agree not to ship any item that is illegal, hazardous, or otherwise prohibited by
                  applicable law or by our carrier partners.
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1" style={{ color: "#0F172A" }}>Limitation of liability</h3>
                <p>
                  Waypoint Inc. is not liable for indirect, incidental, or consequential damages
                  arising from delays, loss, or damage in transit, except as required by applicable law.
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1" style={{ color: "#0F172A" }}>Changes to these terms</h3>
                <p>
                  We may update these terms from time to time. Continued use of the service after changes
                  are posted constitutes acceptance of the revised terms.
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1" style={{ color: "#0F172A" }}>Contact us</h3>
                <p>
                  Questions about these terms can be sent to{" "}
                  <a href="https://mail.google.com/mail/?view=cm&fs=1&to=supportwaypoint24zendesk@gmail.com&su=Contact%20Waypoint" target="_blank" rel="noopener noreferrer" style={{ color: "#1D4ED8" }}>
                    supportwaypoint24zendesk@gmail.com
                  </a>.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-10" style={{ borderColor: "#E2E8F066" }}>
        <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col items-center gap-3 text-center">
          <div className="flex gap-5 text-sm font-medium">
            <button onClick={() => setTab("privacy")} style={{ color: "#334155" }}>Privacy</button>
            <button onClick={() => setTab("terms")} style={{ color: "#334155" }}>Terms &amp; Conditions</button>
            <a href="https://mail.google.com/mail/?view=cm&fs=1&to=supportwaypoint24zendesk@gmail.com&su=Contact%20Waypoint" target="_blank" rel="noopener noreferrer" style={{ color: "#334155" }}>Contact</a>
          </div>
          <p className="text-xs" style={{ color: "#94A3B8" }}>
            © 2005-2026 Waypoint Inc.<br />All Rights Reserved.
          </p>
        </div>
      </footer>

      {/* Floating AI chat */}
      {chatOpen && (
        <div
          className="fixed z-50 flex flex-col rounded-2xl overflow-hidden reveal reveal-visible"
          style={{
            bottom: "5.5rem", right: "1.5rem",
            width: "min(22rem, calc(100vw - 2rem))",
            height: "min(32rem, calc(100vh - 8rem))",
            background: "#FFFFFFee", border: "1px solid #E2E8F0",
            backdropFilter: "blur(12px)",
            boxShadow: "0 24px 48px rgba(15,23,42,0.18), 0 0 0 1px #1D4ED822",
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#E2E8F0" }}>
            <div className="flex items-center gap-2">
              <Sparkles size={15} style={{ color: "#1D4ED8" }} />
              <span className="text-sm font-semibold">Waypoint Assistant</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="p-1 rounded hover:brightness-125" style={{ color: "#64748B" }}>
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <p
                  className="text-xs leading-relaxed px-3 py-2 rounded-xl max-w-[85%] whitespace-pre-wrap"
                  style={
                    m.role === "user"
                      ? { background: "#1D4ED8", color: "#F7F9FC" }
                      : { background: "#F7F9FC", border: "1px solid #E2E8F0", color: "#1E293B" }
                  }
                >
                  {m.content}
                </p>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <p
                  className="text-xs px-3 py-2 rounded-xl flex items-center gap-1"
                  style={{ background: "#F7F9FC", border: "1px solid #E2E8F0", color: "#64748B" }}
                >
                  <RefreshCw size={11} className="animate-spin" /> Thinking...
                </p>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="flex items-center gap-2 p-2.5 border-t" style={{ borderColor: "#E2E8F0" }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
              placeholder="Ask about tracking, delivery times..."
              className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: "#F7F9FC", border: "1px solid #E2E8F0", color: "#0F172A" }}
            />
            <button
              type="button"
              onClick={sendChatMessage}
              disabled={chatLoading || !chatInput.trim()}
              className="btn-glow p-2 rounded-lg disabled:opacity-40"
              style={{ background: "#1D4ED8", color: "#F7F9FC" }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setChatOpen((v) => !v)}
        className={`fixed z-50 rounded-full flex items-center justify-center shadow-lg hover:brightness-110 hover:scale-105 transition-transform ${!chatOpen ? "pulse-ring" : ""}`}
        style={{ bottom: "1.5rem", right: "1.5rem", width: "3.25rem", height: "3.25rem", background: "#1D4ED8", color: "#F7F9FC" }}
        title="Chat with the Waypoint Assistant"
      >
        {chatOpen ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </div>
  );
}
