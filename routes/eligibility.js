const express = require('express');
const router  = express.Router();
const pool    = require('../db');

/**
 * POST /api/check-eligibility
 * JoSAA Board & Rank Eligibility Rule Engine
 * 75% aggregate rule for OPEN/OBC/EWS; 65% for SC/ST/PwD
 */
router.post('/check-eligibility', async (req, res) => {
    try {
        const {
            class12Percentage,
            category = 'OPEN',
            pwd = false,
            rank = null
        } = req.body;

        if (class12Percentage === undefined || class12Percentage === null) {
            return res.status(400).json({ error: 'Class 12 percentage is required.' });
        }

        const pct = parseFloat(class12Percentage);
        if (isNaN(pct) || pct < 0 || pct > 100) {
            return res.status(400).json({ error: 'Class 12 percentage must be between 0% and 100%.' });
        }

        // Standard JoSAA threshold
        const isRelaxedCategory = ['SC', 'ST'].includes(category.toUpperCase()) || pwd === true || pwd === 'true';
        const requiredPercentage = isRelaxedCategory ? 65.0 : 75.0;
        const isEligible = pct >= requiredPercentage;

        let message = '';
        if (isEligible) {
            message = `Eligible for IIT Admissions! Your score (${pct}%) meets the minimum cutoff of ${requiredPercentage}% for category ${category}${pwd ? ' (PwD)' : ''}.`;
        } else {
            const shortfall = (requiredPercentage - pct).toFixed(1);
            message = `Not eligible under percentage criterion. Minimum required for ${category}${pwd ? ' (PwD)' : ''} is ${requiredPercentage}% (shortfall of ${shortfall}%). Alternatively, qualifying within the top 20 percentile of your class 12 board exam also satisfies eligibility.`;
        }

        // Fetch criteria criteria list
        const [criteria] = await pool.query('SELECT * FROM PREFERENCE_CRITERION ORDER BY Criterion_ID');

        res.json({
            success: true,
            eligible: isEligible,
            percentage: pct,
            required_percentage: requiredPercentage,
            category: category,
            pwd: pwd,
            message: message,
            criteria_list: criteria
        });
    } catch (err) {
        console.error('Eligibility check error:', err);
        res.status(500).json({ error: 'Eligibility check failed.', message: err.message });
    }
});

/**
 * GET /api/options-count
 * Returns the count of eligible IIT-branch options for a given rank, category and seat pool.
 * Uses the Reach threshold (closing_rank >= rank / 1.10) — same as eligibility.js predicts.
 */
router.get('/options-count', async (req, res) => {
    try {
        const rank     = parseInt(req.query.rank)    || 0;
        const category = (req.query.category         || 'OPEN').toUpperCase();
        const seatPool = req.query.pool               || 'Gender-Neutral';

        if (!rank || rank < 1) {
            return res.json({ count: 0 });
        }

        // Reach threshold: student rank ≤ 110% of closing
        const threshold = Math.ceil(rank / 1.10);

        const [rows] = await pool.query(
            `SELECT COUNT(DISTINCT CONCAT(College_ID, '_', Branch_ID, '_', Program_Type)) AS cnt
               FROM HISTORICAL_CUTOFF
              WHERE Year       = 2025
                AND Category   = ?
                AND Seat_Pool  = ?
                AND Closing_Rank >= ?`,
            [category, seatPool, threshold]
        );

        const count = rows[0]?.cnt || 0;
        res.json({ count: parseInt(count) });
    } catch (err) {
        console.error('options-count error:', err.message);
        res.json({ count: 0 });
    }
});

module.exports = router;

