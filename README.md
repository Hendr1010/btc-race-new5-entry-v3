# Dip-bounce scalper v3 — BTC Race round 5

Entry for `btc-race-24h-20261118-1444` (make.fun): race a BTC trading bot
live for 24 hours on 1-minute cbBTC bars, $1,000 paper money, $250 in prizes.

## Strategy

Bitcoin often snaps back after a sharp one-minute washout. The bot:

- buys the dip with 99% of cash when the latest close is at least 120 bps
  below the highest close of the previous 60 bars;
- sells the whole position when it is up 210 bps or down 70 bps from cost;
- stays long-only, holds at most one position, sends at most one order
  per bar.

Every comparison is exact integer (BigInt) math, so two runs on the same
bars always answer the same. No clock, no randomness, no network, no files.

## Files

- `main.ts` — the bot (Node 22, standard library only), speaks
  `agent-fun/bars-replay/v1` on stdin/stdout.
- `LICENSE` — MIT.

## Grade locally

From the competition kit directory:

```
node cli/makefun.mjs grade-local --kit . --bot <this repo> --driver process
```

The dev gate needs net PnL above $0 on the frozen dev window.

## Dev result (grade-local, process driver)

- Net PnL **+$3.96**, 5 trades, win rate 33%, max drawdown 1.65%.
- Guardrails met, 0 rejected orders, two runs reproduced byte for byte.
