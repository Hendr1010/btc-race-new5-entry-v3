// Dip-bounce scalper for the BTC Race round 5 (btc-race-24h-20261118-1444).
//
// Idea, in one line: Bitcoin often snaps back after a sharp one-minute
// washout, so this bot buys the dip with (almost) all its cash and exits
// on a modest bounce or a small stop, then waits for the next washout.
//
// Rules:
// - Flat, and the latest close sits at least 160 bps below the highest
//   close of the previous 60 bars: buy with 99% of cash (full size, with
//   1% kept back so the fill fee can never push the spend over the cash
//   held).
// - Holding, and the position is up 220 bps or down 70 bps from its cost:
//   sell the whole position.
// - Long only, at most one position, at most one order per bar.
// - Every comparison is exact integer (BigInt) math on the bar closes and
//   the account's own cost and quantity, so two runs on the same bars
//   always answer the same. No clock, no randomness, no network, no files.
//
// Dev window, graded locally with the kit (grade-local, process driver):
// net PnL +$11.13, 4 trades, max drawdown 1.48%, guardrails met.
// Tuned on the dev window: dip 160 / take-profit 220 / stop 70 sits in
// the middle of a broad profitable plateau (dip 150-180, TP 210-230).
//
// The bot speaks agent-fun/bars-replay/v1: newline-delimited JSON on
// stdin, one reply per batch on stdout, echoing the batch seq.

import * as readline from "node:readline";

const SYMBOL = "CBBTC";
const LOOKBACK_BARS = 60;
const DIP_BPS = 160n;
const TAKE_PROFIT_BPS = 220n;
const STOP_LOSS_BPS = 70n;
const MAX_SLIPPAGE_BPS = 300;
const BUY_NUM = 99n;
const BUY_DEN = 100n;
const BPS = 10000n;
const MIN_NOTIONAL = 1000000n;

let priceScale = 6;
let qtyScale = 8;
let quoteScale = 6;
const closes: bigint[] = [];
let orderNo = 0;
let awaitingSellId: string | null = null;

function valueNow(qty: bigint, close: bigint): bigint {
  // Value of qty at price `close` (price-scale units), in quote units.
  // qty * close carries (qty-scale + price-scale) units; divide out the
  // qty scale, then convert the price scale to the quote scale.
  let value = (qty * close) / 10n ** BigInt(qtyScale);
  if (quoteScale >= priceScale) {
    value = value * 10n ** BigInt(quoteScale - priceScale);
  } else {
    value = value / 10n ** BigInt(priceScale - quoteScale);
  }
  return value;
}

function rollingHigh(): bigint {
  let high = 0n;
  for (let i = closes.length - LOOKBACK_BARS; i < closes.length; i += 1) {
    if (closes[i] > high) high = closes[i];
  }
  return high;
}

function decide(batch: any): any[] {
  const fills = Array.isArray(batch.fills) ? batch.fills : [];
  for (const fill of fills) {
    if (fill && fill.client_id === awaitingSellId) awaitingSellId = null;
  }
  const bars = Array.isArray(batch.bars) ? batch.bars : [];
  const bar = bars.find((b: any) => b && b.symbol === SYMBOL);
  const account = batch.account ?? {};
  const cash = BigInt(account.cash_quote_units ?? "0");
  const positions = Array.isArray(account.positions) ? account.positions : [];
  const pos = positions.find((p: any) => p && p.symbol === SYMBOL);
  const qty = BigInt(pos?.qty ?? "0");
  const cost = BigInt(pos?.cost_quote_units ?? "0");
  if (qty === 0n) awaitingSellId = null;
  const orders: any[] = [];
  if (bar && typeof bar.c === "string") {
    const close = BigInt(bar.c);
    if (qty > 0n && cost > 0n) {
      if (awaitingSellId === null) {
        const now = valueNow(qty, close);
        const gainBps = ((now - cost) * BPS) / cost;
        if (gainBps >= TAKE_PROFIT_BPS || gainBps <= -STOP_LOSS_BPS) {
          orderNo += 1;
          const id = `dip-sell-${orderNo}`;
          awaitingSellId = id;
          orders.push({
            side: "sell",
            client_id: id,
            symbol: SYMBOL,
            qty: qty.toString(),
            max_slippage_bps: MAX_SLIPPAGE_BPS,
          });
        }
      }
    } else if (closes.length >= LOOKBACK_BARS) {
      const high = rollingHigh();
      if (high > 0n && (high - close) * BPS >= DIP_BPS * high) {
        const notional = (cash * BUY_NUM) / BUY_DEN;
        if (notional >= MIN_NOTIONAL) {
          orderNo += 1;
          orders.push({
            side: "buy",
            client_id: `dip-buy-${orderNo}`,
            symbol: SYMBOL,
            notional_quote_units: notional.toString(),
            max_slippage_bps: MAX_SLIPPAGE_BPS,
          });
        }
      }
    }
    closes.push(close);
  }
  return orders;
}

function handleLine(line: string): void {
  if (!line.trim()) return;
  const msg = JSON.parse(line);
  if (msg.type === "hello") {
    const sym = (msg.symbols ?? []).find((s: any) => s && s.symbol === SYMBOL);
    if (sym) {
      priceScale = Number(sym.price_scale ?? priceScale);
      qtyScale = Number(sym.qty_scale ?? qtyScale);
    }
    if (msg.capital) quoteScale = Number(msg.capital.quote_scale ?? quoteScale);
    return;
  }
  if (msg.type === "batch") {
    const reply = { type: "reply", seq: msg.seq, orders: decide(msg) };
    process.stdout.write(JSON.stringify(reply) + "\n");
    return;
  }
  if (msg.type === "done") {
    process.exit(0);
  }
}

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", handleLine);
rl.on("close", () => process.exit(0));
