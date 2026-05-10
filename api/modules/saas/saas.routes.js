const express = require('express');

const router = express.Router();

router.use('/', require('./routes/templates.routes'));
router.use('/', require('./routes/events.routes'));
router.use('/', require('./routes/contestants.routes'));
router.use('/', require('./routes/judges.routes'));
router.use('/', require('./routes/credentials.routes'));
router.use('/', require('./routes/rounds.routes'));

module.exports = router;
