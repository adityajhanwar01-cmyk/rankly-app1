const express = require('express');
const router  = express.Router();
const pool    = require('../db');

/**
 * GET /api/institutes
 * List all IITs joined with COLLEGE_INFO, optionally filtered by search / state
 */
router.get('/institutes', async (req, res) => {
    try {
        const { search = '', state = '', sort = 'nirf' } = req.query;

        let query = `
            SELECT 
                c.College_ID,
                c.College_Name,
                c.City,
                c.State,
                ci.Annual_Fee,
                ci.Placement_Pct,
                ci.Avg_Package,
                ci.Hostel_Rating,
                ci.Mess_Rating,
                ci.Campus_Rating,
                ci.NIRF_Rank
            FROM IIT_COLLEGE c
            LEFT JOIN COLLEGE_INFO ci ON c.College_ID = ci.College_ID
            WHERE 1=1
        `;
        const params = [];

        if (search) {
          query += ` AND (c.College_Name LIKE ? OR c.City LIKE ? OR c.State LIKE ?)`;
          params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (state) {
          query += ` AND c.State = ?`;
          params.push(state);
        }

        if (sort === 'package') {
          query += ` ORDER BY ci.Avg_Package DESC`;
        } else if (sort === 'fee') {
          query += ` ORDER BY ci.Annual_Fee ASC`;
        } else if (sort === 'placement') {
          query += ` ORDER BY ci.Placement_Pct DESC`;
        } else if (sort === 'name') {
          query += ` ORDER BY c.College_Name ASC`;
        } else {
          query += ` ORDER BY ci.NIRF_Rank ASC`;
        }

        const [rows] = await pool.query(query, params);
        res.json({ success: true, count: rows.length, results: rows });
    } catch (err) {
        console.error('Institutes error:', err);
        res.status(500).json({ error: 'Failed to fetch institutes.', message: err.message });
    }
});

/**
 * GET /api/institutes/directory
 * All 23 IITs with full info, package (LPA), placement %, fees, and all offered branches
 */
router.get('/institutes/directory', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.College_ID,
                c.College_Name,
                c.City,
                c.State,
                ci.NIRF_Rank,
                ci.Avg_Package,
                ci.Placement_Pct,
                ci.Annual_Fee,
                ci.Campus_Rating,
                ci.Hostel_Rating
            FROM IIT_COLLEGE c
            LEFT JOIN COLLEGE_INFO ci ON c.College_ID = ci.College_ID
            ORDER BY ci.NIRF_Rank ASC, c.College_Name ASC
        `;
        const [colleges] = await pool.query(query);

        const [branches] = await pool.query(`
            SELECT DISTINCT 
                hc.College_ID,
                b.Branch_ID,
                b.Branch_Code,
                b.Branch_Name
            FROM HISTORICAL_CUTOFF hc
            JOIN BRANCH b ON hc.Branch_ID = b.Branch_ID
            ORDER BY hc.College_ID, b.Branch_Name ASC
        `);

        const branchMap = {};
        branches.forEach(b => {
            if (!branchMap[b.College_ID]) branchMap[b.College_ID] = [];
            branchMap[b.College_ID].push({
                id: b.Branch_ID,
                code: b.Branch_Code,
                name: b.Branch_Name
            });
        });

        const results = colleges.map(c => ({
            ...c,
            Avg_Package: c.Avg_Package ? parseFloat(c.Avg_Package) : null,
            Placement_Pct: c.Placement_Pct ? parseFloat(c.Placement_Pct) : null,
            Annual_Fee: c.Annual_Fee ? parseFloat(c.Annual_Fee) : null,
            branches: branchMap[c.College_ID] || [],
            branchCount: (branchMap[c.College_ID] || []).length
        }));

        res.json({ success: true, count: results.length, data: results });
    } catch (err) {
        console.error('Directory error:', err);
        res.status(500).json({ error: 'Failed to fetch institutes directory.', message: err.message });
    }
});


/**
 * GET /api/institutes/:id
 * Specific IIT with full info and offered branches / historical cutoffs
 */
router.get('/institutes/:id', async (req, res) => {
    try {
        const collegeId = parseInt(req.params.id);
        if (isNaN(collegeId)) {
            return res.status(400).json({ error: 'Invalid college ID.' });
        }

        const [collegeRows] = await pool.query(`
            SELECT c.*, ci.Annual_Fee, ci.Placement_Pct, ci.Avg_Package, 
                   ci.Hostel_Rating, ci.Mess_Rating, ci.Campus_Rating, ci.NIRF_Rank
            FROM IIT_COLLEGE c
            LEFT JOIN COLLEGE_INFO ci ON c.College_ID = ci.College_ID
            WHERE c.College_ID = ?
        `, [collegeId]);

        if (collegeRows.length === 0) {
            return res.status(404).json({ error: 'College not found.' });
        }

        const [cutoffs] = await pool.query(`
            SELECT hc.Cutoff_ID, hc.Year, hc.Category, hc.Opening_Rank, hc.Closing_Rank,
                   b.Branch_ID, b.Branch_Name, b.Branch_Code
            FROM HISTORICAL_CUTOFF hc
            JOIN BRANCH b ON hc.Branch_ID = b.Branch_ID
            WHERE hc.College_ID = ?
            ORDER BY b.Branch_Name, hc.Year DESC, hc.Category
        `, [collegeId]);

        res.json({
            success: true,
            college: collegeRows[0],
            cutoffs: cutoffs
        });
    } catch (err) {
        console.error('College detail error:', err);
        res.status(500).json({ error: 'Failed to fetch college details.', message: err.message });
    }
});

/**
 * GET /api/branches
 * List all available engineering branches
 */
router.get('/branches', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM BRANCH ORDER BY Branch_Name');
        res.json({ success: true, count: rows.length, results: rows });
    } catch (err) {
        console.error('Branches error:', err);
        res.status(500).json({ error: 'Failed to fetch branches.', message: err.message });
    }
});

/**
 * GET /api/stats/overview
 * Overview metrics for dashboard
 */
router.get('/stats/overview', async (req, res) => {
    try {
        const [[colleges]] = await pool.query('SELECT COUNT(*) as total_colleges FROM IIT_COLLEGE');
        const [[branches]] = await pool.query('SELECT COUNT(*) as total_branches FROM BRANCH');
        const [[cutoffs]] = await pool.query('SELECT COUNT(*) as total_cutoffs FROM HISTORICAL_CUTOFF');
        const [[students]] = await pool.query('SELECT COUNT(*) as total_students FROM STUDENT');
        const [[stats]] = await pool.query(`
            SELECT 
                ROUND(AVG(Avg_Package), 1) as avg_package,
                ROUND(AVG(Placement_Pct), 1) as avg_placement,
                ROUND(AVG(Annual_Fee), 0) as avg_fee
            FROM COLLEGE_INFO
        `);

        res.json({
            success: true,
            counts: {
                colleges: colleges.total_colleges,
                branches: branches.total_branches,
                cutoffs: cutoffs.total_cutoffs,
                students: students.total_students
            },
            averages: {
                avg_package_lpa: stats.avg_package,
                avg_placement_pct: stats.avg_placement,
                avg_annual_fee: stats.avg_fee
            }
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Failed to fetch overview stats.', message: err.message });
    }
});

/**
 * GET /api/iits/chances & /iits/chances
 * Returns Safe/Moderate/Reach counts and best admission chances per IIT
 */
router.get(['/iits/chances', '/institutes/chances'], async (req, res) => {
    try {
        const rank = parseInt(req.query.rank) || 1842;
        const category = req.query.category || 'OPEN';
        const categoryRank = req.query.category_rank || req.query.categoryRank ? parseInt(req.query.category_rank || req.query.categoryRank) : null;
        const gender = req.query.gender || 'Male';
        const pwd = req.query.pwd === '1' || req.query.pwd === 'true' ? 1 : 0;

        const [rows] = await pool.query('CALL sp_iit_chances(?, ?, ?, ?, ?)', [rank, category, categoryRank, gender, pwd]);
        res.json({ success: true, count: rows[0].length, results: rows[0] });
    } catch (err) {
        console.error('iits/chances error:', err);
        res.status(500).json({ error: 'Failed to compute IIT chances.', message: err.message });
    }
});

/**
 * GET /api/iits/:id/branches & /iits/:id/branches
 * Returns all branches for an IIT with cutoffs, chances, and trends
 */
router.get(['/iits/:id/branches', '/institutes/:id/branches'], async (req, res) => {
    try {
        const collegeId = parseInt(req.params.id) || 1;
        const rank = parseInt(req.query.rank) || 1842;
        const category = req.query.category || 'OPEN';
        const categoryRank = req.query.category_rank || req.query.categoryRank ? parseInt(req.query.category_rank || req.query.categoryRank) : null;
        const gender = req.query.gender || 'Male';
        const pwd = req.query.pwd === '1' || req.query.pwd === 'true' ? 1 : 0;

        const [rows] = await pool.query('CALL sp_iit_branches(?, ?, ?, ?, ?, ?)', [collegeId, rank, category, categoryRank, gender, pwd]);
        res.json({ success: true, college_id: collegeId, count: rows[0].length, branches: rows[0] });
    } catch (err) {
        console.error('iits/:id/branches error:', err);
        res.status(500).json({ error: 'Failed to fetch IIT branches.', message: err.message });
    }
});

/**
 * GET /api/compare & /compare
 * Returns comparative metrics for 2-3 option IDs
 */
router.get('/compare', async (req, res) => {
    try {
        const rawIds = req.query.ids || req.query.result_ids || req.query.resultIds || '';
        const idList = rawIds.toString().split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);

        if (idList.length === 0) {
            return res.json({ success: true, count: 0, finalists: [] });
        }

        const placeholders = idList.map(() => '?').join(',');
        const [rows] = await pool.query(`SELECT * FROM v_compare_options WHERE result_id IN (${placeholders})`, idList);

        // If results found in v_compare_options, return them
        if (rows.length > 0) {
            return res.json({ success: true, count: rows.length, finalists: rows });
        }

        // Fallback: If result_ids were not in RECOMMENDATION_RESULT (e.g. comparing directly by college_id)
        const [colleges] = await pool.query(`
            SELECT 
                c.College_ID as college_id,
                c.College_Name as college_name,
                c.City as city,
                c.State as state,
                COALESCE(ci.NIRF_Rank, 50) as nirf_rank,
                COALESCE(ci.Annual_Fee, 220000) as annual_fee,
                COALESCE(ci.Placement_Pct, 85.0) as placement_pct,
                COALESCE(ci.Avg_Package, 18.0) as avg_package_lpa,
                COALESCE(ci.Hostel_Rating, 4.0) as hostel_rating,
                COALESCE(ci.Mess_Rating, 3.8) as mess_rating,
                COALESCE(ci.Campus_Rating, 4.2) as campus_rating,
                88 as match_pct,
                88.0 as overall_score,
                'Moderate' as risk_level,
                65 as chance_pct
            FROM IIT_COLLEGE c
            LEFT JOIN COLLEGE_INFO ci ON c.College_ID = ci.College_ID
            WHERE c.College_ID IN (${placeholders})
        `, idList);

        res.json({ success: true, count: colleges.length, finalists: colleges });
    } catch (err) {
        console.error('compare error:', err);
        res.status(500).json({ error: 'Failed to fetch comparison data.', message: err.message });
    }
});

module.exports = router;
