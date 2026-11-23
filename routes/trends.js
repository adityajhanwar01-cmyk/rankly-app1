const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// Helper to format shift display
function formatShift(shiftPct, absChange) {
    const isVolatile = Math.abs(shiftPct) > 100;
    let shiftDisplay = '';
    if (shiftPct > 100) {
        shiftDisplay = '>+100%';
    } else if (shiftPct < -100) {
        shiftDisplay = '<-100%';
    } else if (shiftPct < 0) {
        shiftDisplay = `${Math.abs(shiftPct).toFixed(1)}% tighter`;
    } else {
        shiftDisplay = `${shiftPct.toFixed(1)}% easier`;
    }
    return {
        shift_display: shiftDisplay,
        is_volatile: isVolatile,
        abs_change: absChange
    };
}

// ─── 1. TOP MOVERS (Tightening vs Loosening) ───
// Rules: confidence >= 'Medium', latest closing >= 150, de-duplicated per (IIT, branch)
router.get('/trends/movers', async (req, res) => {
    try {
        const category = req.query.category || 'OPEN';
        const poolType = req.query.pool || req.query.seatPool || req.query.seat_pool || 'Gender-Neutral';
        const programType = req.query.program_type || req.query.programType || '4-year B.Tech';

        const [rows] = await pool.query(`
            SELECT 
                bta.Trend_ID as trend_id,
                c.College_ID as college_id,
                c.College_Name as college_name,
                c.City as city,
                b.Branch_ID as branch_id,
                b.Branch_Name as branch_name,
                b.Branch_Code as branch_code,
                bta.Category as category,
                bta.Seat_Pool as seat_pool,
                bta.Program_Type as program_type,
                bta.Latest_Closing as closing_rank,
                bta.Latest_Closing as latest_closing,
                bta.Rank_Shift_1Y as rank_shift_1y,
                bta.Rank_Shift_2Y as rank_shift_2y,
                bta.Tightening_Pct as tightening_pct,
                bta.Annual_Trend_Pct as annual_trend_pct,
                bta.Volatility as volatility,
                bta.Trend_Status as trend_status,
                bta.Confidence as confidence,
                bta.Base_Year as base_year,
                bta.Projected_Closing as projected_closing
            FROM BRANCH_TREND_ANALYTICS bta
            JOIN IIT_COLLEGE c ON bta.College_ID = c.College_ID
            JOIN BRANCH b ON bta.Branch_ID = b.Branch_ID
            WHERE bta.Category = ?
              AND bta.Seat_Pool = ?
              AND bta.Program_Type = ?
              AND bta.Confidence IN ('High', 'Medium')
              AND bta.Latest_Closing >= 150
            ORDER BY bta.Rank_Shift_1Y ASC
        `, [category, poolType, programType]);

        // De-duplicate per (college_id, branch_id) keeping strongest
        const uniqueMap = new Map();
        for (const r of rows) {
            const key = `${r.college_id}_${r.branch_id}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, r);
            }
        }
        const distinctRows = Array.from(uniqueMap.values());

        // Negative shift in rank means closing rank dropped = TIGHTENING (higher demand)
        // Positive shift in rank means closing rank rose = EASING (relaxed)
        const tighteningRows = distinctRows
            .filter(r => r.rank_shift_1y != null && parseFloat(r.rank_shift_1y) < 0)
            .sort((a, b) => parseFloat(a.rank_shift_1y) - parseFloat(b.rank_shift_1y)) // most negative first
            .slice(0, 5)
            .map(r => {
                const shiftVal = parseFloat(r.rank_shift_1y);
                const absChange = Math.round(r.latest_closing * (shiftVal / 100.0) / (1 + (shiftVal / 100.0)));
                const fmt = formatShift(shiftVal, absChange);
                return {
                    ...r,
                    type: 'tightening',
                    shift_display: fmt.shift_display,
                    is_volatile: fmt.is_volatile,
                    abs_change: fmt.abs_change,
                    impact_label: 'Harder to secure'
                };
            });

        const looseningRows = distinctRows
            .filter(r => r.rank_shift_1y != null && parseFloat(r.rank_shift_1y) > 0)
            .sort((a, b) => parseFloat(b.rank_shift_1y) - parseFloat(a.rank_shift_1y)) // most positive first
            .slice(0, 5)
            .map(r => {
                const shiftVal = parseFloat(r.rank_shift_1y);
                const absChange = Math.round(r.latest_closing * (shiftVal / 100.0) / (1 + (shiftVal / 100.0)));
                const fmt = formatShift(shiftVal, absChange);
                return {
                    ...r,
                    type: 'loosening',
                    shift_display: fmt.shift_display,
                    is_volatile: fmt.is_volatile,
                    abs_change: fmt.abs_change,
                    impact_label: 'Relaxed cutoff'
                };
            });

        return res.json({
            success: true,
            category,
            pool: poolType,
            program_type: programType,
            tightening: tighteningRows,
            loosening: looseningRows
        });
    } catch (err) {
        console.error('Error fetching movers:', err);
        return res.status(500).json({ error: 'Failed to fetch movers', message: err.message });
    }
});

// ─── 2. DIVERGING HEATMAP MATRIX ───
router.get('/trends/heatmap', async (req, res) => {
    try {
        const category = req.query.category || 'OPEN';
        const poolType = req.query.pool || req.query.seatPool || req.query.seat_pool || 'Gender-Neutral';
        const programType = req.query.program_type || req.query.programType || '4-year B.Tech';

        const [colleges] = await pool.query(`
            SELECT College_ID as college_id, College_Name as college_name, City as city
            FROM IIT_COLLEGE
            ORDER BY College_ID ASC
        `);

        const [branches] = await pool.query(`
            SELECT Branch_ID as branch_id, Branch_Name as branch_name, Branch_Code as branch_code
            FROM BRANCH
            ORDER BY Branch_ID ASC
        `);

        const [matrixRows] = await pool.query(`
            SELECT 
                bta.College_ID as college_id,
                bta.Branch_ID as branch_id,
                bta.Latest_Closing as closing_2025,
                bta.Rank_Shift_1Y as rank_shift_1y,
                bta.Tightening_Pct as tightening_pct,
                bta.Annual_Trend_Pct as annual_trend_pct,
                bta.Trend_Status as trend_status,
                bta.Confidence as confidence
            FROM BRANCH_TREND_ANALYTICS bta
            WHERE bta.Category = ?
              AND bta.Seat_Pool = ?
              AND bta.Program_Type = ?
        `, [category, poolType, programType]);

        const matrix = {};
        matrixRows.forEach(row => {
            const key = `${row.college_id}_${row.branch_id}`;
            const shiftVal = parseFloat(row.rank_shift_1y) || 0;
            const fmt = formatShift(shiftVal, 0);
            matrix[key] = {
                shift_1y: shiftVal,
                shift_display: fmt.shift_display,
                is_volatile: fmt.is_volatile,
                tightening_pct: parseFloat(row.tightening_pct) || 0,
                annual_trend_pct: parseFloat(row.annual_trend_pct) || 0,
                trend_status: row.trend_status || 'Stable',
                confidence: row.confidence || 'Medium',
                closing_2025: row.closing_2025
            };
        });

        return res.json({
            success: true,
            category,
            pool: poolType,
            program_type: programType,
            colleges,
            branches,
            matrix
        });
    } catch (err) {
        console.error('Error fetching heatmap:', err);
        return res.status(500).json({ error: 'Failed to fetch heatmap', message: err.message });
    }
});

// ─── 3. HISTORICAL SERIES & PROJECTION ───
router.get('/trends/:college/:branch/series', async (req, res) => {
    try {
        const { college, branch } = req.params;
        const category = req.query.category || 'OPEN';
        const poolType = req.query.pool || req.query.seatPool || req.query.seat_pool || 'Gender-Neutral';
        const programType = req.query.program_type || req.query.programType || '4-year B.Tech';

        let collegeId = parseInt(college);
        if (isNaN(collegeId)) {
            const [cRows] = await pool.query('SELECT College_ID FROM IIT_COLLEGE WHERE College_Name LIKE ? OR LOWER(REPLACE(College_Name, " ", "-")) LIKE ? LIMIT 1', [`%${college}%`, `%${college}%`]);
            if (cRows.length > 0) collegeId = cRows[0].College_ID;
            else collegeId = 1;
        }

        let branchId = parseInt(branch);
        if (isNaN(branchId)) {
            const [bRows] = await pool.query('SELECT Branch_ID FROM BRANCH WHERE Branch_Code LIKE ? OR Branch_Name LIKE ? LIMIT 1', [`%${branch}%`, `%${branch}%`]);
            if (bRows.length > 0) branchId = bRows[0].Branch_ID;
            else branchId = 1;
        }

        const [infoRows] = await pool.query(`
            SELECT c.College_Name as college_name, c.City as city, b.Branch_Name as branch_name, b.Branch_Code as branch_code
            FROM IIT_COLLEGE c, BRANCH b
            WHERE c.College_ID = ? AND b.Branch_ID = ?
        `, [collegeId, branchId]);

        const meta = infoRows[0] || { college_name: 'IIT Bombay', branch_name: 'Computer Science and Engineering', branch_code: 'CSE', city: 'Mumbai' };

        // Fetch all historical records for both pools
        const [cutoffs] = await pool.query(`
            SELECT Year as year, Category as category, Seat_Pool as seat_pool, Program_Type as program_type,
                   Opening_Rank as opening_rank, Closing_Rank as closing_rank
            FROM HISTORICAL_CUTOFF
            WHERE College_ID = ? AND Branch_ID = ? AND Category = ? AND Program_Type = ?
            ORDER BY Year ASC, Seat_Pool ASC
        `, [collegeId, branchId, category, programType]);

        // Final round by year definition: 2024 is round 5, 2021-2023 & 2025 is round 6
        const roundMap = { 2021: 6, 2022: 6, 2023: 6, 2024: 5, 2025: 6 };

        const buildSeriesWithDeltas = (poolName) => {
            const seriesRows = cutoffs.filter(c => (c.seat_pool || 'Gender-Neutral') === poolName);
            const enriched = [];
            for (let i = 0; i < seriesRows.length; i++) {
                const cur = seriesRows[i];
                let rankDiff = null;
                let pctDiff = null;
                if (i > 0) {
                    const prev = seriesRows[i - 1];
                    rankDiff = cur.closing_rank - prev.closing_rank;
                    pctDiff = prev.closing_rank > 0 ? parseFloat(((rankDiff / prev.closing_rank) * 100).toFixed(2)) : 0;
                }
                enriched.push({
                    year: cur.year,
                    category: cur.category,
                    seat_pool: cur.seat_pool,
                    round_number: roundMap[cur.year] || 6,
                    opening_rank: cur.opening_rank,
                    closing_rank: cur.closing_rank,
                    change_rank: rankDiff,
                    change_pct: pctDiff
                });
            }
            return enriched;
        };

        const primarySeries = buildSeriesWithDeltas(poolType);
        const secondaryPoolName = poolType === 'Gender-Neutral' ? 'Female-Only' : 'Gender-Neutral';
        const overlaySeries = buildSeriesWithDeltas(secondaryPoolName);

        // Fetch precomputed robust analytics from BRANCH_TREND_ANALYTICS
        const [btaRows] = await pool.query(`
            SELECT Latest_Closing, Projected_Closing, Projected_Lower_80, Projected_Upper_80,
                   Rank_Shift_1Y, Rank_Shift_2Y, Tightening_Pct, Annual_Trend_Pct, Volatility,
                   Trend_Status, Confidence
            FROM BRANCH_TREND_ANALYTICS
            WHERE College_ID = ? AND Branch_ID = ? AND Category = ? AND Seat_Pool = ? AND Program_Type = ?
        `, [collegeId, branchId, category, poolType, programType]);

        let analytics = null;
        let projection = null;

        if (btaRows.length > 0) {
            const b = btaRows[0];
            const shift1y = parseFloat(b.Rank_Shift_1Y) || 0;
            const fmt = formatShift(shift1y, 0);
            analytics = {
                rank_shift_1y: shift1y,
                rank_shift_2y: parseFloat(b.Rank_Shift_2Y) || 0,
                shift_display: fmt.shift_display,
                is_volatile: fmt.is_volatile,
                tightening_pct: parseFloat(b.Tightening_Pct) || 0,
                annual_trend_pct: parseFloat(b.Annual_Trend_Pct) || 0,
                volatility: parseFloat(b.Volatility) || 0,
                trend_status: b.Trend_Status || 'Stable',
                confidence: b.Confidence || 'Medium'
            };
            projection = {
                projected_year: 2026,
                projected_cutoff: b.Projected_Closing,
                lower_bound: b.Projected_Lower_80,
                upper_bound: b.Projected_Upper_80,
                confidence: b.Confidence || 'Medium',
                label: 'estimate'
            };
        } else {
            // Fallback if not enough points
            analytics = {
                rank_shift_1y: 0,
                rank_shift_2y: 0,
                shift_display: '0.0%',
                is_volatile: false,
                tightening_pct: 0,
                annual_trend_pct: 0,
                volatility: 0,
                trend_status: 'Stable',
                confidence: 'Low'
            };
            projection = {
                projected_year: 2026,
                projected_cutoff: primarySeries.length > 0 ? primarySeries[primarySeries.length - 1].closing_rank : 1000,
                lower_bound: primarySeries.length > 0 ? Math.round(primarySeries[primarySeries.length - 1].closing_rank * 0.9) : 900,
                upper_bound: primarySeries.length > 0 ? Math.round(primarySeries[primarySeries.length - 1].closing_rank * 1.1) : 1100,
                confidence: 'Low',
                label: 'estimate'
            };
        }

        return res.json({
            success: true,
            college_id: collegeId,
            branch_id: branchId,
            meta,
            category,
            pool: poolType,
            program_type: programType,
            series: {
                primary: primarySeries,
                neutral: poolType === 'Gender-Neutral' ? primarySeries : overlaySeries,
                female: poolType === 'Female-Only' ? primarySeries : overlaySeries,
                overlay: overlaySeries
            },
            projection,
            analytics
        });
    } catch (err) {
        console.error('Error fetching series:', err);
        return res.status(500).json({ error: 'Failed to fetch series', message: err.message });
    }
});

// ─── 4. GENERAL TRENDS LIST ───
router.get('/trends', async (req, res) => {
    try {
        const category = req.query.category || 'OPEN';
        const poolType = req.query.pool || req.query.seatPool || req.query.seat_pool || 'Gender-Neutral';
        const programType = req.query.program_type || req.query.programType || '4-year B.Tech';
        const statusFilter = req.query.status || null;
        const confidenceFilter = req.query.confidence || null;

        let query = `
            SELECT 
                bta.Trend_ID as trend_id,
                c.College_ID as college_id,
                c.College_Name as college_name,
                c.City as city,
                b.Branch_ID as branch_id,
                b.Branch_Name as branch_name,
                b.Branch_Code as branch_code,
                bta.Category as category,
                bta.Seat_Pool as seat_pool,
                bta.Program_Type as program_type,
                bta.Rank_Shift_1Y as rank_shift_1y,
                bta.Rank_Shift_2Y as rank_shift_2y,
                bta.Tightening_Pct as tightening_pct,
                bta.Annual_Trend_Pct as annual_trend_pct,
                bta.Volatility as volatility,
                bta.Years_Used as years_used,
                hc21.Closing_Rank as closing_2021,
                hc22.Closing_Rank as closing_2022,
                hc23.Closing_Rank as closing_2023,
                hc24.Closing_Rank as closing_2024,
                COALESCE(hc25.Closing_Rank, bta.Latest_Closing) as closing_2025,
                bta.Projected_Closing as projected_closing,
                bta.Trend_Status as trend_status,
                bta.Confidence as confidence
            FROM BRANCH_TREND_ANALYTICS bta
            JOIN IIT_COLLEGE c ON bta.College_ID = c.College_ID
            JOIN BRANCH b ON bta.Branch_ID = b.Branch_ID
            LEFT JOIN HISTORICAL_CUTOFF hc21 ON (hc21.College_ID = bta.College_ID AND hc21.Branch_ID = bta.Branch_ID AND hc21.Category = bta.Category AND hc21.Seat_Pool = bta.Seat_Pool AND hc21.Program_Type = bta.Program_Type AND hc21.Year = 2021)
            LEFT JOIN HISTORICAL_CUTOFF hc22 ON (hc22.College_ID = bta.College_ID AND hc22.Branch_ID = bta.Branch_ID AND hc22.Category = bta.Category AND hc22.Seat_Pool = bta.Seat_Pool AND hc22.Program_Type = bta.Program_Type AND hc22.Year = 2022)
            LEFT JOIN HISTORICAL_CUTOFF hc23 ON (hc23.College_ID = bta.College_ID AND hc23.Branch_ID = bta.Branch_ID AND hc23.Category = bta.Category AND hc23.Seat_Pool = bta.Seat_Pool AND hc23.Program_Type = bta.Program_Type AND hc23.Year = 2023)
            LEFT JOIN HISTORICAL_CUTOFF hc24 ON (hc24.College_ID = bta.College_ID AND hc24.Branch_ID = bta.Branch_ID AND hc24.Category = bta.Category AND hc24.Seat_Pool = bta.Seat_Pool AND hc24.Program_Type = bta.Program_Type AND hc24.Year = 2024)
            LEFT JOIN HISTORICAL_CUTOFF hc25 ON (hc25.College_ID = bta.College_ID AND hc25.Branch_ID = bta.Branch_ID AND hc25.Category = bta.Category AND hc25.Seat_Pool = bta.Seat_Pool AND hc25.Program_Type = bta.Program_Type AND hc25.Year = 2025)
            WHERE bta.Category = ?
              AND bta.Seat_Pool = ?
              AND bta.Program_Type = ?
        `;
        const params = [category, poolType, programType];

        if (statusFilter && statusFilter !== 'ALL') {
            query += ` AND bta.Trend_Status = ?`;
            params.push(statusFilter);
        }
        if (confidenceFilter && confidenceFilter !== 'ALL') {
            query += ` AND bta.Confidence = ?`;
            params.push(confidenceFilter);
        }

        query += ` ORDER BY c.College_ID ASC, b.Branch_ID ASC`;

        const [rows] = await pool.query(query, params);

        const enriched = rows.map(r => {
            const shift1y = parseFloat(r.rank_shift_1y) || 0;
            const fmt = formatShift(shift1y, 0);
            return {
                ...r,
                shift_display: fmt.shift_display,
                is_volatile: fmt.is_volatile
            };
        });

        return res.json({
            success: true,
            pool: poolType,
            category,
            program_type: programType,
            count: enriched.length,
            trends: enriched
        });
    } catch (err) {
        console.error('Error fetching trends list:', err);
        return res.status(500).json({ error: 'Failed to fetch trends', message: err.message });
    }
});

// ─── 5. PEER TRENDS ───
router.get('/peer-trends', async (req, res) => {
    try {
        const category = req.query.category || '';
        const minRank = parseInt(req.query.minRank) || 0;
        const maxRank = parseInt(req.query.maxRank) || 50000;
        const collegeId = req.query.collegeId ? parseInt(req.query.collegeId) : null;

        let query = `
            SELECT p.Peer_ID as Peer_Trend_ID, p.Profile_Category, p.Rank_Range_Start, p.Rank_Range_End,
                   c.College_Name, c.College_ID, b.Branch_Name, b.Branch_ID, b.Branch_Code,
                   p.Selection_Count,
                   c.City, ci.NIRF_Rank
            FROM PEER_CHOICE_TREND p
            JOIN IIT_COLLEGE c ON p.College_ID = c.College_ID
            JOIN BRANCH b ON p.Branch_ID = b.Branch_ID
            LEFT JOIN COLLEGE_INFO ci ON c.College_ID = ci.College_ID
            WHERE 1=1
        `;
        const params = [];
        if (category && category !== 'ALL') {
            query += ` AND p.Profile_Category = ?`;
            params.push(category);
        }
        if (minRank > 0) {
            query += ` AND p.Rank_Range_End >= ?`;
            params.push(minRank);
        }
        if (maxRank < 50000) {
            query += ` AND p.Rank_Range_Start <= ?`;
            params.push(maxRank);
        }
        if (collegeId) {
            query += ` AND p.College_ID = ?`;
            params.push(collegeId);
        }
        query += ` ORDER BY p.Selection_Count DESC, p.Rank_Range_Start ASC LIMIT 50`;

        const [rows] = await pool.query(query, params);
        res.json({ success: true, count: rows.length, results: rows });
    } catch (err) {
        console.error('Peer trends error:', err);
        res.status(500).json({ error: 'Failed to fetch peer trends', message: err.message });
    }
});

module.exports = router;
