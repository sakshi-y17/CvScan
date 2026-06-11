const pool = require('../config/db');

/**
 * Save a new chat message to the history.
 * POST /api/chat
 */
const saveMessage = async (req, res) => {
  try {
    const { user_id, role, content } = req.body;

    // Validation
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required.' });
    }
    if (!role || !['user', 'assistant'].includes(role)) {
      return res.status(400).json({ error: "role is required and must be either 'user' or 'assistant'." });
    }
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({ error: 'content is required and must be a non-empty string.' });
    }

    const query = `
      INSERT INTO chat_history (user_id, role, content)
      VALUES (?, ?, ?)
    `;
    const [result] = await pool.execute(query, [user_id, role, content.trim()]);

    return res.status(201).json({
      message: 'Message saved successfully.',
      data: {
        id: result.insertId,
        user_id,
        role,
        content: content.trim(),
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error in saveMessage:', error);
    return res.status(500).json({
      error: 'An internal server error occurred while saving the message.'
    });
  }
};

/**
 * Retrieve chat history for a specific user_id, sorted by timestamp ascending.
 * GET /api/chat/:user_id
 */
const getChatHistory = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id parameter is required.' });
    }

    const query = `
      SELECT id, user_id, role, content, timestamp
      FROM chat_history
      WHERE user_id = ?
      ORDER BY timestamp ASC
    `;
    const [rows] = await pool.execute(query, [user_id]);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error in getChatHistory:', error);
    return res.status(500).json({
      error: 'An internal server error occurred while retrieving chat history.'
    });
  }
};

module.exports = {
  saveMessage,
  getChatHistory
};
