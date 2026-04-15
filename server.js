// =============================================================================
// AMD·FVG Signal Bot — Webhook Server
// Stack: Node.js + Express → Telegram Bot API
// Deploy: Railway / Render (set env vars in dashboard)
// =============================================================================

import express    from "express";
import fetch      from "node-fetch";
import { config } from "dotenv";

config(); // loads .env locally; on Railway/Render use env dashboard

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Env vars (set these in Railway / Render dashboard) ──────────────────────
const TELEGRAM_TOKEN  = process.env.TELEGRAM_TOKEN;   // from @BotFather
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // your channel/group ID
const WEBHOOK_SECRET  = process.env.WEBHOOK_SECRET;    // optional auth token

if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error("❌  Missing TELEGRAM_TOKEN or TELEGRAM_CHAT_ID in env");
  process.exit(1);
}

app.use(express.json());

// =============================================================================
// ── HEALTH CHECK ─────────────────────────────────────────────────────────────
// =============================================================================
app.get("/", (req, res) => {
  res.json({ status: "AMD·FVG Bot is live 🟢", ts: new Date().toISOString() });
});

// =============================================================================
// ── WEBHOOK ENDPOINT ─────────────────────────────────────────────────────────
// TradingView alert → POST /webhook
// Body (JSON) sent from Pine Script alert message:
// {
//   "direction": "BUY" | "SELL",
//   "symbol":    "EURUSD",
//   "entry":     "1.08450",
//   "sl":        "1.08200",
//   "tp":        "1.08950",
//   "rr":        "3",
//   "session":   "London",
//   "bias":      "Bullish",
//   "timeframe": "15m"
// }
// =============================================================================
app.post("/webhook", async (req, res) => {
  try {
    // Optional: verify secret header to block random POSTs
    if (WEBHOOK_SECRET) {
      const incoming = req.headers["x-webhook-secret"];
      if (incoming !== WEBHOOK_SECRET) {
        console.warn("⚠️  Unauthorized webhook attempt");
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const payload = req.body;
    console.log("📨 Incoming signal:", JSON.stringify(payload, null, 2));

    // Validate required fields
    const required = ["direction", "symbol", "entry", "sl", "tp"];
    for (const field of required) {
      if (!payload[field]) {
        return res.status(400).json({ error: `Missing field: ${field}` });
      }
    }

    // Format and send to Telegram
    const message = formatSignal(payload);
    await sendTelegram(message);

    res.json({ ok: true, message: "Signal sent to Telegram ✅" });

  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// =============================================================================
// ── SIGNAL FORMATTER ─────────────────────────────────────────────────────────
// Telegram supports MarkdownV2 — we escape special chars carefully
// =============================================================================
function formatSignal(p) {
  const isBuy     = p.direction?.toUpperCase() === "BUY";
  const dirEmoji  = isBuy  ? "🟢" : "🔴";
  const dirWord   = isBuy  ? "BUY" : "SELL";
  const biasEmoji = isBuy  ? "🔼" : "🔽";

  // Session emoji map
  const sessionEmoji = {
    asia:    "🌏 Asia",
    london:  "🇬🇧 London",
    "new york": "🗽 New York",
    ny:      "🗽 New York",
  };
  const session = sessionEmoji[(p.session || "").toLowerCase()] || (p.session || "—");

  // Calculate pip distance for context
  const entry = parseFloat(p.entry);
  const sl    = parseFloat(p.sl);
  const tp    = parseFloat(p.tp);
  const isGold = p.symbol?.toUpperCase().includes("XAU");
  const pipDiv  = isGold ? 0.1 : 0.0001;
  const slPips  = Math.abs(((entry - sl) / pipDiv)).toFixed(1);
  const tpPips  = Math.abs(((tp - entry) / pipDiv)).toFixed(1);

  // Build message (plain MarkdownV2 — escape . and - carefully)
  const lines = [
    `${dirEmoji} *AMD·FVG SIGNAL — ${dirWord}*`,
    ``,
    `📌 *Pair:*     \`${p.symbol?.toUpperCase()}\``,
    `🕐 *Session:*  ${session}`,
    `${biasEmoji} *Bias:*     ${p.bias || (isBuy ? "Bullish" : "Bearish")}`,
    `📊 *TF:*       ${p.timeframe || "15m"}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🎯 *Entry:*  \`${fmt(p.entry)}\``,
    `🛑 *SL:*     \`${fmt(p.sl)}\`  \\(${slPips} pips\\)`,
    `✅ *TP:*     \`${fmt(p.tp)}\`  \\(${tpPips} pips\\)`,
    `⚖️ *RR:*     1:${p.rr || "3"}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `_Signal by AMD·FVG Strategy • Alimap Inc\\._`,
  ];

  return lines.join("\n");
}

// Escape dots and dashes for MarkdownV2
function fmt(val) {
  return String(val).replace(/\./g, "\\.").replace(/-/g, "\\-");
}

// =============================================================================
// ── TELEGRAM SENDER ───────────────────────────────────────────────────────────
// =============================================================================
async function sendTelegram(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

  const body = {
    chat_id:    TELEGRAM_CHAT_ID,
    text:       text,
    parse_mode: "MarkdownV2",
    disable_web_page_preview: true,
  };

  const response = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(`Telegram API error: ${JSON.stringify(result)}`);
  }

  console.log("✅ Telegram message sent. Message ID:", result.result.message_id);
  return result;
}

// =============================================================================
// ── START SERVER ──────────────────────────────────────────────────────────────
// =============================================================================
app.listen(PORT, () => {
  console.log(`
  ┌────────────────────────────────────────┐
  │  AMD·FVG Signal Bot                    │
  │  Webhook server running on port ${PORT}   │
  │  POST /webhook  ←  TradingView alerts  │
  │  GET  /         ←  Health check        │
  └────────────────────────────────────────┘
  `);
});
