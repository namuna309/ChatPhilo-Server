
const express = require('express');
const authRoutes = require('../routes/authRoutes');
const chatRoutes = require('../routes/chatRoutes');

const router = express.Router();


router.use(authRoutes);
router.use(chatRoutes);


module.exports = router;