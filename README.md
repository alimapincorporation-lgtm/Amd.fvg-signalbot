# AMD·FVG Signal Bot — Setup Guide
## TradingView → Webhook Server → Telegram

---

## STEP 1 — Create Your Telegram Bot

1. Open Telegram → search **@BotFather**
2. Send `/newbot`
3. Choose a name: e.g. `AMD FVG Signals`
4. Choose a username: e.g. `amd_fvg_bot`
5. BotFather gives you a **token** → save it (goes in `TELEGRAM_TOKEN`)

**Create your signal channel:**
1. Telegram → New Channel → e.g. `AMD·FVG Signals`
2. Add your bot as an **Administrator** (so it can post)
3. Get the channel ID:
   - Forward any message from your channel to **@userinfobot**
   - It returns the chat ID (format: `-1001234567890`)
   - Save it (goes in `TELEGRAM_CHAT_ID`)

---

## STEP 2 — Deploy to Railway (recommended)

### Option A: Deploy from GitHub (best)
```bash
# 1. Push this folder to a GitHub repo
git init
git add .
git commit -m "AMD·FVG Signal Bot"
git remote add origin https://github.com/YOUR_USERNAME/amd-fvg-bot.git
git push -u origin main

# 2. Go to railway.app → New Project → Deploy from GitHub
# 3. Select your repo → Railway auto-detects Node.js
# 4. Go to Variables tab → add:
#    TELEGRAM_TOKEN    = your_token
#    TELEGRAM_CHAT_ID  = your_chat_id
#    WEBHOOK_SECRET    = any_random_string
# 5. Railway gives you a URL: https://amd-fvg-bot.up.railway.app
```

### Option B: Deploy to Render
```
1. render.com → New → Web Service
2. Connect your GitHub repo
3. Build command:  npm install
4. Start command:  npm start
5. Add env vars in Environment tab (same as above)
6. Render gives you: https://amd-fvg-bot.onrender.com
```

---

## STEP 3 — Update Pine Script

Add these 4 lines to the **very bottom** of `ICT_AMD_FVG_Strategy.pine`
(they expose internal values to TradingView's {{plot_N}} placeholders):

```pine
plot(slPrice,    "SL_PLOT",      display=display.none)
plot(tpPrice,    "TP_PLOT",      display=display.none)
sessionNum = inAsia ? 1 : inLondon ? 2 : inNY ? 3 : 0
plot(sessionNum, "SESSION_PLOT", display=display.none)
plot(manipBias,  "BIAS_PLOT",    display=display.none)
```

---

## STEP 4 — Create TradingView Alert

1. Load your chart on **15m** with AMD·FVG Strategy applied
2. Right-click chart → **Add Alert**
3. **Condition:** `AMD·FVG Strategy` → `AMD·FVG BUY` (create one for BUY, one for SELL)
4. **Expiration:** Open-ended
5. **Notifications:** Check ✅ **Webhook URL**
6. **Webhook URL:** `https://your-server.railway.app/webhook`
7. **Message** (paste this JSON):

```json
{
  "direction":  "{{strategy.order.action}}",
  "symbol":     "{{ticker}}",
  "entry":      "{{strategy.order.price}}",
  "sl":         "{{plot_0}}",
  "tp":         "{{plot_1}}",
  "rr":         "3",
  "session":    "{{plot_2}}",
  "bias":       "{{plot_3}}",
  "timeframe":  "{{interval}}",
  "timestamp":  "{{time}}"
}
```

8. Click **Create** — repeat for SELL alert

---

## STEP 5 — Test It

### Test webhook manually:
```bash
curl -X POST https://your-server.railway.app/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your_secret" \
  -d '{
    "direction": "BUY",
    "symbol":    "EURUSD",
    "entry":     "1.08450",
    "sl":        "1.08200",
    "tp":        "1.08950",
    "rr":        "3",
    "session":   "London",
    "bias":      "Bullish",
    "timeframe": "15m"
  }'
```

Expected Telegram message:
```
🟢 AMD·FVG SIGNAL — BUY

📌 Pair:     EURUSD
🕐 Session:  🇬🇧 London
🔼 Bias:     Bullish
📊 TF:       15m

━━━━━━━━━━━━━━━━━━━━
🎯 Entry:  1.08450
🛑 SL:     1.08200  (25.0 pips)
✅ TP:     1.08950  (50.0 pips)
⚖️ RR:     1:3
━━━━━━━━━━━━━━━━━━━━

Signal by AMD·FVG Strategy • Alimap Inc.
```

---

## ARCHITECTURE SUMMARY

```
TradingView 15m chart
    → Alert fires (BUY or SELL)
        → POST https://your-server.railway.app/webhook
            → server.js validates + formats signal
                → Telegram Bot API
                    → Your Telegram channel 📱
```

---

## FILES IN THIS PROJECT

```
amd-fvg-bot/
├── server.js                    ← Main webhook server
├── package.json                 ← Node.js dependencies
├── .env.example                 ← Environment variable template
├── TRADINGVIEW_ALERT_SETUP.js   ← Alert JSON + Pine plot additions
└── README.md                    ← This file
```

---

*Built by Alimap Inc. | AMD·FVG ICT Strategy Signal Bot*
