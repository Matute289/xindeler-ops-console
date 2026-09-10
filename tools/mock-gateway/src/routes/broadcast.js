const express = require('express');
const { state } = require('../state');
const { recordAudit } = require('../audit');
const { sendError } = require('../errors');

const router = express.Router();
const RATE_LIMIT_MS = 5000;

router.post('/', (req, res) => {
  // ZG-80/OC-92: `big_screen` is additive/optional on the real route -- accepted here for the
  // same reason, defaulting to `false`. No in-game overlay rendering to simulate yet (that's
  // engine-side work, not landed), so this mock only records the flag in the audit log rather
  // than pretending to show anything -- same discipline `playerMessage.js` follows.
  const { msg, big_screen: bigScreen = false } = req.body || {};
  if (!msg || typeof msg !== 'string') {
    return sendError(res, 400, 'invalid_message', 'msg es requerido');
  }
  if (Date.now() - state.lastBroadcastAt < RATE_LIMIT_MS) {
    return sendError(res, 429, 'rate_limited', 'Esperá unos segundos antes de enviar otro mensaje');
  }
  state.lastBroadcastAt = Date.now();
  // OC-67: matches the real `ChatMessage` shape (`{time, parties, content}`) — a system broadcast
  // doesn't map to any of the real `ChatParties` enum's variants (all of them carry a real
  // `PlayerInfo`), so this is this mock's own reasonable stand-in, not a confirmed real shape.
  const chatEntry = {
    time: new Date().toISOString(),
    parties: { System: null },
    content: msg,
  };
  state.chatHistory.push(chatEntry);
  if (state.chatHistory.length > 500) state.chatHistory.shift();
  recordAudit({
    operatorUuid: req.operatorUuid,
    operatorUsername: req.operator,
    action: 'broadcast',
    payload: { msg, big_screen: bigScreen },
    outcome: 'success',
  });
  res.status(204).end();
});

module.exports = router;
