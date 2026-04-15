// =============================================================================
// TRADINGVIEW ALERT MESSAGE — paste this into the "Message" field
// when creating your alert on the AMD·FVG strategy
// =============================================================================
//
// In TradingView:
//   1. Right-click chart → Add Alert
//   2. Condition: AMD·FVG Strategy → "AMD·FVG BUY" or "AMD·FVG SELL"
//   3. Notifications → enable "Webhook URL"
//   4. Webhook URL: https://your-server.railway.app/webhook
//   5. Paste the JSON below into the "Message" field
//   6. Click Create
//
// TradingView fills {{placeholders}} dynamically at alert fire time.
// =============================================================================

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

// =============================================================================
// NOTE ON PINE SCRIPT PLOTS
// Because TradingView alert messages can only access plotted values via
// {{plot_0}}, {{plot_1}} etc., add these 4 hidden plots to your Pine Script
// (add at the bottom of ICT_AMD_FVG_Strategy.pine):
// =============================================================================

// ── Add these lines to the BOTTOM of ICT_AMD_FVG_Strategy.pine ──────────────

plot(slPrice,    "SL_PLOT",      display=display.none)   // → {{plot_0}}
plot(tpPrice,    "TP_PLOT",      display=display.none)   // → {{plot_1}}

// Session as number: 1=Asia, 2=London, 3=NY
sessionNum = inAsia ? 1 : inLondon ? 2 : inNY ? 3 : 0
plot(sessionNum, "SESSION_PLOT", display=display.none)   // → {{plot_2}}

// Bias as number: 1=Bullish, -1=Bearish
plot(manipBias,  "BIAS_PLOT",    display=display.none)   // → {{plot_3}}
