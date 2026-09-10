const express = require('express');
const { players } = require('../fixtures');
const { sendError } = require('../errors');
const { recordAudit } = require('../audit');

const router = express.Router();

// ZG-73/OC-88 contract (xindeler-zuul PR #131): `target_references` -- never raw uuids, same
// `reference`/`segment` identifier the directory and kick/ban/flag routes already use. Delivery
// is engine-dependent -- this mock treats an offline player as undeliverable, same signal
// `GET /players` already uses to decide who shows up in the live roster.
router.post('/', (req, res) => {
  // ZG-80/OC-92: `big_screen` is additive/optional on the real route, same reasoning as
  // `broadcast.js` -- recorded in the audit log only, no in-game overlay to simulate yet.
  const {
    target_references: targetReferences,
    msg,
    big_screen: bigScreen = false,
  } = req.body || {};
  if (
    !Array.isArray(targetReferences) ||
    targetReferences.length === 0 ||
    targetReferences.length > 50 ||
    typeof msg !== 'string' ||
    msg.trim().length === 0
  ) {
    return sendError(res, 400, 'invalid_request', 'invalid direct message request');
  }

  const deliveredTo = [];
  const notFound = [];
  for (const reference of targetReferences) {
    const player = players.find((p) => p.reference === reference || p.uuid === reference);
    if (player && player.online) {
      deliveredTo.push(reference);
    } else {
      notFound.push(reference);
    }
  }

  recordAudit({
    operatorUuid: req.operatorUuid,
    operatorUsername: req.operator,
    action: 'players.message',
    payload: {
      target_references: targetReferences,
      delivered_to: deliveredTo,
      not_found: notFound,
      big_screen: bigScreen,
    },
    outcome: 'success',
  });
  res.json({ delivered_to: deliveredTo, not_found: notFound });
});

module.exports = router;
