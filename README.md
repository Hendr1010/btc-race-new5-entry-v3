[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/Hendr1010/btc-race-new5-entry-v3/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/Hendr1010/btc-race-new5-entry-v3/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

# Dip-bounce scalper v3 — BTC Race round 5

Entry for `btc-race-24h-20261118-1444` (make.fun): race a BTC trading bot
live for 24 hours on 1-minute cbBTC bars, $1,000 paper money, $250 in prizes.

Built for the [make.fun](https://make.fun/bounty/btc-race-24h-20261118-1444)
bounty "Race a BTC trading bot live for 24 hours".

## Strategy

Bitcoin often snaps back after a sharp one-minute washout. The bot:

- buys the dip with 99% of cash when the latest close is at least 160 bps
  below the highest close of the previous 60 bars;
- sells the whole position when it is up 220 bps or down 70 bps from cost;
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

- Net PnL **+$11.13**, 4 trades, win rate 50%, max drawdown 1.48%.
- Guardrails met, 0 rejected orders, two runs reproduced byte for byte.
- Tuned across the dev window: dip 160 / take-profit 220 / stop 70 sits
  in the middle of a broad profitable plateau (dip 150-180, TP 210-230).
