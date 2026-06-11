const express = require('express');
const router = express.Router();
const { saveMessage, getChatHistory } = require('../controllers/chatController');

// Route to save a message
router.post('/', saveMessage);

// Route to get chat history for a user
router.get('/:user_id', getChatHistory);

module.exports = router;
