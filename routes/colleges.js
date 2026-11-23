// routes/colleges.js
// College Search, Multi-Tier Autosuggestion Engine & Query Explorer

const express = require('express');
const router = express.Router();
const pool = require('../db');

// ----------------------------------------------------------------------------
// GET /api/colleges/regions
// Return geographical regions
// ----------------------------------------------------------------------------
router.get('/regions', async (req, res) => {
    try {
        const [regions] = await pool.query('SELECT region_id, region_name FROM regions ORDER BY region_id ASC');
        res.json({ success: true, regions });
    } catch (err) {
        console.error('Fetch regions error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ----------------------------------------------------------------------------
// GET /api/colleges/types
// Return institute types
// ----------------------------------------------------------------------------
router.get('/types', async (req, res) => {
    try {
        const [types] = await pool.query(
            'SELECT type_id, type_name, is_national_importance FROM institute_types ORDER BY is_national_importance DESC, type_id ASC'
        );
        res.json({ success: true, types });
    } catch (err) {
        console.error('Fetch types error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ----------------------------------------------------------------------------
// GET /api/colleges/suggest
// Autosuggestion based on colleges, cities, states, and top searches
// ----------------------------------------------------------------------------
router.get('/suggest', async (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
        return res.json({ suggestions: [] });
    }

    const suggestions = [];
    const seenTexts = new Set();

    try {
        // Tier 1: Matching Colleges
        const [colleges] = await pool.query(
            `SELECT c.name, c.city, s.state_name, it.type_name
             FROM colleges c
             JOIN states s ON c.state_id = s.state_id
             JOIN institute_types it ON c.type_id = it.type_id
             WHERE c.name LIKE ? OR c.city LIKE ?
             LIMIT 6`,
            [`%${q}%`, `%${q}%`]
        );
        colleges.forEach(col => {
            const label = `${col.name} (${col.city})`;
            if (!seenTexts.has(label.toLowerCase())) {
                seenTexts.add(label.toLowerCase());
                suggestions.push({
                    text: label,
                    source: 'college',
                    badge: col.type_name.includes('IIT') ? 'IIT' : 'College'
                });
            }
        });

        // Tier 2: Popular Searches (from view if available)
        try {
            const [popular] = await pool.query(
                `SELECT normalized_term AS term 
                 FROM v_top_searches_30d 
                 WHERE normalized_term LIKE ? 
                 ORDER BY search_count DESC 
                 LIMIT 3`,
                [`%${q.toLowerCase()}%`]
            );
            popular.forEach(row => {
                const clean = row.term.trim();
                if (!seenTexts.has(clean.toLowerCase())) {
                    seenTexts.add(clean.toLowerCase());
                    suggestions.push({
                        text: clean,
                        source: 'trending',
                        badge: 'Popular Search'
                    });
                }
            });
        } catch (e) {
            // view may be optional
        }

        res.json({ suggestions: suggestions.slice(0, 8) });
    } catch (err) {
        console.error('Autosuggest error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ----------------------------------------------------------------------------
// GET /api/colleges/search
// Search colleges with region, type filters
// ----------------------------------------------------------------------------
router.get('/search', async (req, res) => {
    const { q, regionId, typeId, onlyINI, page = 1, limit = 12 } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 12));
    const offset = (pageNum - 1) * limitNum;

    try {
        let whereClauses = ['1=1'];
        let params = [];

        if (q && q.trim()) {
            whereClauses.push('(c.name LIKE ? OR c.city LIKE ? OR s.state_name LIKE ?)');
            const queryParam = `%${q.trim()}%`;
            params.push(queryParam, queryParam, queryParam);
        }

        if (regionId && parseInt(regionId)) {
            whereClauses.push('s.region_id = ?');
            params.push(parseInt(regionId));
        }

        if (typeId && parseInt(typeId)) {
            whereClauses.push('c.type_id = ?');
            params.push(parseInt(typeId));
        }

        if (onlyINI === 'true' || onlyINI === '1') {
            whereClauses.push('it.is_national_importance = 1');
        }

        const whereSql = whereClauses.join(' AND ');

        // 1. Fetch total count
        const [countRows] = await pool.query(
            `SELECT COUNT(*) AS total
             FROM colleges c
             JOIN states s ON c.state_id = s.state_id
             JOIN regions r ON s.region_id = r.region_id
             JOIN institute_types it ON c.type_id = it.type_id
             WHERE ${whereSql}`,
            params
        );
        const total = countRows[0].total;

        // 2. Fetch colleges
        const [colleges] = await pool.query(
            `SELECT c.college_id, c.name, c.city, c.established_year, c.website,
                    s.state_id, s.state_name,
                    r.region_id, r.region_name,
                    it.type_id, it.type_name, it.is_national_importance
             FROM colleges c
             JOIN states s ON c.state_id = s.state_id
             JOIN regions r ON s.region_id = r.region_id
             JOIN institute_types it ON c.type_id = it.type_id
             WHERE ${whereSql}
             ORDER BY it.is_national_importance DESC, c.name ASC
             LIMIT ? OFFSET ?`,
            [...params, limitNum, offset]
        );

        res.json({
            success: true,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
            colleges
        });
    } catch (err) {
        console.error('College search error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
