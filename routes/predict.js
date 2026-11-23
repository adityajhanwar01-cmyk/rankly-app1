const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// Zone mapping for IITs
const ZONE_MAP = {
    'IIT Bombay': 'West', 'IIT Gandhinagar': 'West', 'IIT Indore': 'West', 'IIT Goa': 'West',
    'IIT Delhi': 'North', 'IIT Kanpur': 'North', 'IIT Roorkee': 'North', 'IIT Ropar': 'North', 
    'IIT Mandi': 'North', 'IIT Jodhpur': 'North', 'IIT Jammu': 'North', 'IIT (BHU) Varanasi': 'North',
    'IIT Madras': 'South', 'IIT Hyderabad': 'South', 'IIT Tirupati': 'South', 'IIT Palakkad': 'South', 'IIT Dharwad': 'South',
    'IIT Kharagpur': 'East', 'IIT Guwahati': 'East', 'IIT (ISM) Dhanbad': 'East', 'IIT Patna': 'East', 
    'IIT Bhubaneswar': 'East', 'IIT Bhilai': 'East'
};

const CITY_COORDS = {
    'Kota': { lat: 25.18, lng: 75.83, state: 'Rajasthan' },
    'Delhi': { lat: 28.61, lng: 77.20, state: 'Delhi' },
    'New Delhi': { lat: 28.61, lng: 77.20, state: 'Delhi' },
    'Chennai': { lat: 13.08, lng: 80.27, state: 'Tamil Nadu' },
    'Patna': { lat: 25.61, lng: 85.14, state: 'Bihar' },
    'Pune': { lat: 18.52, lng: 73.85, state: 'Maharashtra' },
    'Mumbai': { lat: 19.07, lng: 72.87, state: 'Maharashtra' },
    'Hyderabad': { lat: 17.38, lng: 78.48, state: 'Telangana' },
    'Jaipur': { lat: 26.91, lng: 75.78, state: 'Rajasthan' },
    'Lucknow': { lat: 26.84, lng: 80.94, state: 'Uttar Pradesh' },
    'Indore': { lat: 22.71, lng: 75.85, state: 'Madhya Pradesh' }
};

/**
 * POST /api/predict & POST /predict
 * Multi-Criteria College Predictor backed directly by MySQL sp_generate_recommendations
 */
router.post('/predict', async (req, res) => {
    try {
        const {
            rank,
            category         = 'OPEN',
            categoryRank     = null,
            gender           = 'Male',
            locationPref     = 'All',
            budgetRange      = 'Any',
            branchPref       = '',
            strictBranch     = true,
            includeRelated   = false,
            sortMode         = 'Best Fit',
            homeCity         = 'Kota',
            homeState        = 'Rajasthan',
            homeLat          = null,
            homeLng          = null,
            weights          = {},
            studentPreferences = {},
            studentProfile   = {}
        } = req.body;

        const userRank = parseInt(rank);
        if (!userRank || userRank < 1) {
            return res.status(400).json({ error: 'A valid positive JEE Advanced rank is required.' });
        }

        const userCat = category || 'OPEN';
        const userCatRank = categoryRank ? parseInt(categoryRank) : (userCat !== 'OPEN' ? userRank : null);
        const userGender = gender || 'Male';
        const userCity = homeCity || studentProfile.homeCity || 'Kota';
        
        let cLat = homeLat;
        let cLng = homeLng;
        let cState = homeState || studentProfile.homeState || 'Rajasthan';
        if (!cLat && CITY_COORDS[userCity]) {
            cLat = CITY_COORDS[userCity].lat;
            cLng = CITY_COORDS[userCity].lng;
            cState = CITY_COORDS[userCity].state;
        }

        // Branch preferences as string
        let bPrefStr = '';
        if (Array.isArray(branchPref)) {
            bPrefStr = branchPref.join(',');
        } else if (typeof branchPref === 'string') {
            bPrefStr = branchPref;
        }

        // Weights setup (8 criteria)
        const w1 = parseFloat(weights.w1 ?? weights.branch ?? studentPreferences.w1 ?? studentPreferences.branch ?? 30);
        const w2 = parseFloat(weights.w2 ?? weights.location ?? studentPreferences.w2 ?? studentPreferences.location ?? 15);
        const w3 = parseFloat(weights.w3 ?? weights.fee ?? weights.fees ?? studentPreferences.w3 ?? studentPreferences.fee ?? 15);
        const w4 = parseFloat(weights.w4 ?? weights.mess ?? studentPreferences.w4 ?? studentPreferences.mess ?? 10);
        const w5 = parseFloat(weights.w5 ?? weights.hostel ?? studentPreferences.w5 ?? studentPreferences.hostel ?? 10);
        const w6 = parseFloat(weights.w6 ?? weights.placement ?? studentPreferences.w6 ?? studentPreferences.placement ?? 10);
        const w7 = parseFloat(weights.w7 ?? weights.proximity ?? weights.nearHome ?? studentPreferences.w7 ?? 5);
        const w8 = parseFloat(weights.w8 ?? weights.campus ?? studentPreferences.w8 ?? studentPreferences.campus ?? 5);

        // 1. Create temporary candidate or guest student in DB
        const email = `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}@jee.rankly`;
        const [studentRes] = await pool.query(
            'INSERT INTO STUDENT (Name, Email, DOB, Created_At) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
            [studentProfile.name || 'Candidate', email, '2006-01-01']
        );
        const studentId = studentRes.insertId;

        // 2. Insert profile
        await pool.query(
            'INSERT INTO STUDENT_PROFILE (Student_ID, JEE_Adv_Rank, Category_Rank, Category, Gender, Home_City, Home_State) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [studentId, userRank, userCatRank, userCat, userGender, userCity, cState]
        );

        // 3. Set preferences
        await pool.query(
            'CALL sp_set_preferences(?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [studentId, w1, w2, w3, w4, w5, w6, w7, w8]
        );

        // 4. Create search session
        const [sessionRes] = await pool.query(
            `INSERT INTO SEARCH_SESSION 
             (Student_ID, Session_Name, Location_Pref, Budget_Range, Branch_Pref, Strict_Branch, Include_Related, Category_Rank, Home_City, Home_State, Home_Lat, Home_Lng, Sort_Mode, Created_At)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [studentId, 'Find My IIT Session', locationPref, budgetRange, bPrefStr, strictBranch ? 1 : 0, includeRelated ? 1 : 0, userCatRank, userCity, cState, cLat, cLng, sortMode]
        );
        const sessionId = sessionRes.insertId;

        // 5. Run recommendation stored procedure
        const [results] = await pool.query('CALL sp_generate_recommendations(?)', [sessionId]);
        const rows = results[0] || [];

        // 6. Fetch factor details for the recommendations
        const [detailRows] = await pool.query(`
            SELECT rd.Result_ID, rd.Factor_ID, pc.Criterion_Name, rd.Score, rd.Weight_Used
            FROM RECOMMENDATION_DETAIL rd
            JOIN PREFERENCE_CRITERION pc ON rd.Factor_ID = pc.Criterion_ID
            JOIN RECOMMENDATION_RESULT rr ON rd.Result_ID = rr.Result_ID
            WHERE rr.Session_ID = ?
            ORDER BY rd.Result_ID, rd.Factor_ID
        `, [sessionId]);

        const factorMap = {};
        for (const d of detailRows) {
            if (!factorMap[d.Result_ID]) factorMap[d.Result_ID] = [];
            factorMap[d.Result_ID].push({
                factor_id: d.Factor_ID,
                factor: d.Criterion_Name,
                score: parseFloat(d.Score),
                weight: parseFloat(d.Weight_Used)
            });
        }

        // Fetch college info (placements, fees, NIRF)
        const [collegeInfoRows] = await pool.query(`
            SELECT College_ID, NIRF_Rank, Annual_Fee, Placement_Pct, Avg_Package, Hostel_Rating, Mess_Rating, Campus_Rating
            FROM COLLEGE_INFO
        `);
        const collegeInfoMap = {};
        for (const ci of collegeInfoRows) {
            collegeInfoMap[ci.College_ID] = ci;
        }

        // Format for frontend
        const evaluated = rows.map((r, idx) => {
            const zone = ZONE_MAP[r.College_Name] || 'North';
            const ci = collegeInfoMap[r.College_ID] || {};
            const avgPkg = ci.Avg_Package ? parseFloat(ci.Avg_Package) : (24.0 + (idx % 6) * 1.5);
            const placementPct = ci.Placement_Pct ? parseFloat(ci.Placement_Pct) : 88.0;
            const annualFeeLpa = ci.Annual_Fee ? (parseFloat(ci.Annual_Fee) / 100000).toFixed(1) : '2.2';
            const nirf = ci.NIRF_Rank || (idx + 1);

            return {
                result_id: r.Result_ID,
                cutoff_id: r.Cutoff_ID,
                college_id: r.College_ID,
                branch_id: r.Branch_ID,
                iit_name: r.College_Name,
                college_name: r.College_Name,
                city: r.City,
                state: r.State,
                branch_name: r.Branch_Name,
                branch_code: r.Branch_Code,
                degree: '4-year B.Tech',
                opening_rank: r.Opening_Rank,
                closing_rank: r.Closing_Rank,
                year: r.Year,
                category: r.Seat_Type_Used ? (r.Seat_Type_Used.startsWith('OPEN') ? 'OPEN' : userCat) : userCat,
                seat_type_used: r.Seat_Type_Used,
                distance_km: r.Distance_KM,
                institute_strength: r.Institute_Strength,
                avg_package_lpa: avgPkg,
                placement_percentage: placementPct,
                chance_pct: r.Chance_Pct != null ? parseInt(r.Chance_Pct) : 50,
                college_info: {
                    zone: zone,
                    distance_km: r.Distance_KM,
                    nirf_rank: nirf,
                    annual_fee_lpa: annualFeeLpa,
                    annual_fee: ci.Annual_Fee || 220000,
                    hostel_rating: ci.Hostel_Rating ? parseFloat(ci.Hostel_Rating) : 4.3,
                    mess_rating: ci.Mess_Rating ? parseFloat(ci.Mess_Rating) : 4.0,
                    campus_rating: ci.Campus_Rating ? parseFloat(ci.Campus_Rating) : 4.5
                },
                recommendation: {
                    overall_score: parseFloat(r.Overall_Score),
                    match_pct: parseInt(r.Match_Pct),
                    risk_level: r.Risk_Level,
                    chance_pct: r.Chance_Pct != null ? parseInt(r.Chance_Pct) : 50,
                    seat_type_used: r.Seat_Type_Used,
                    distance_km: r.Distance_KM,
                    factors: factorMap[r.Result_ID] || []
                }
            };
        });

        res.json({
            success: true,
            session_id: sessionId,
            student_id: studentId,
            query: {
                rank: userRank,
                category: userCat,
                categoryRank: userCatRank,
                gender: userGender,
                branchPref: bPrefStr,
                homeCity: userCity,
                homeState: cState
            },
            count: evaluated.length,
            results: evaluated
        });

    } catch (err) {
        console.error('Predict error:', err);
        res.status(500).json({ error: 'Prediction query failed.', message: err.message });
    }
});

/**
 * POST /api/preview (and POST /preview)
 * Fast live preview for /find flow: returns eligible options count + top 5 choices
 */
router.post('/preview', async (req, res) => {
    try {
        const {
            rank,
            category         = 'OPEN',
            categoryRank     = null,
            gender           = 'Male',
            homeCity         = 'Kota',
            branchPref       = '',
            strictBranch     = true,
            includeRelated   = false,
            maxFee           = 0,
            weights          = {}
        } = req.body;

        const userRank = parseInt(rank) || 1500;
        const userCat = category || 'OPEN';
        const userCatRank = categoryRank ? parseInt(categoryRank) : (userCat !== 'OPEN' ? userRank : null);
        const userGender = gender || 'Male';
        const userCity = homeCity || 'Kota';
        
        let bPrefStr = '';
        if (Array.isArray(branchPref)) {
            bPrefStr = branchPref.join(',');
        } else if (typeof branchPref === 'string') {
            bPrefStr = branchPref;
        }

        const w1 = parseFloat(weights.w1 ?? weights.branch ?? 30);
        const w2 = parseFloat(weights.w2 ?? weights.location ?? 15);
        const w3 = parseFloat(weights.w3 ?? weights.fee ?? weights.fees ?? 15);
        const w4 = parseFloat(weights.w4 ?? weights.mess ?? 10);
        const w5 = parseFloat(weights.w5 ?? weights.hostel ?? 10);
        const w6 = parseFloat(weights.w6 ?? weights.placement ?? 10);
        const w7 = parseFloat(weights.w7 ?? weights.proximity ?? weights.nearHome ?? 5);
        const w8 = parseFloat(weights.w8 ?? weights.campus ?? 5);

        // 1. Call sp_preview_recommendations
        const [spResults] = await pool.query(
            'CALL sp_preview_recommendations(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [userRank, userCat, userCatRank, userGender, userCity, bPrefStr, strictBranch ? 1 : 0, includeRelated ? 1 : 0, maxFee || 0, w1, w2, w3, w4, w5, w6, w7, w8]
        );
        const rawMatches = spResults[0] || [];
        
        // Group by College_ID to guarantee 5 distinct IITs in Preview, collecting other eligible branches as "alsoFits"
        const collegeMap = new Map();
        for (const m of rawMatches) {
            const cid = m.College_ID;
            if (!collegeMap.has(cid)) {
                collegeMap.set(cid, {
                    ...m,
                    alsoFits: []
                });
            } else {
                const entry = collegeMap.get(cid);
                if (entry.alsoFits.length < 3 && entry.Branch_Code !== m.Branch_Code && !entry.alsoFits.includes(m.Branch_Code)) {
                    entry.alsoFits.push(m.Branch_Code);
                }
            }
        }
        const topMatches = Array.from(collegeMap.values()).slice(0, 5);

        // 2. Count total eligible options within <= 1.10x closing rank
        const poolCond = userGender === 'Female'
            ? "AND hc.Seat_Pool IN ('Gender-Neutral', 'Female-Only')"
            : "AND hc.Seat_Pool = 'Gender-Neutral'";

        let branchCond = "";
        const countParams = [userRank];
        if (strictBranch && bPrefStr && bPrefStr !== 'Any') {
            const bCodes = bPrefStr.split(',').map(s => s.trim()).filter(Boolean);
            if (bCodes.length > 0) {
                branchCond = `AND b.Branch_Code IN (${bCodes.map(() => '?').join(',')})`;
                countParams.push(...bCodes);
            }
        }

        const [[countRow]] = await pool.query(`
            SELECT COUNT(DISTINCT hc.Cutoff_ID) AS totalEligible
            FROM HISTORICAL_CUTOFF hc
            JOIN BRANCH b ON hc.Branch_ID = b.Branch_ID
            WHERE hc.Year = (SELECT MAX(Year) FROM HISTORICAL_CUTOFF)
              AND hc.Program_Type = '4-year B.Tech'
              AND (
                  (hc.Category = 'OPEN' AND ? <= hc.Closing_Rank * 1.10)
                  ${userCat !== 'OPEN' && userCatRank ? `OR (hc.Category = '${userCat}' AND ${userCatRank} <= hc.Closing_Rank * 1.10)` : ''}
              )
              ${poolCond}
              ${branchCond}
        `, countParams);

        const totalEligible = countRow ? Math.max(topMatches.length, countRow.totalEligible) : topMatches.length;

        return res.json({
            success: true,
            totalEligible,
            topMatches
        });

    } catch (err) {
        console.warn('Preview error:', err.message);
        res.status(500).json({ error: 'Preview failed', message: err.message });
    }
});

/**
 * POST /api/sessions/quick & POST /sessions/quick
 * Creates guest session with balanced defaults (OPEN, Male, no branch filters)
 */
router.post(['/sessions/quick', '/session/quick'], async (req, res) => {
    try {
        const rawRank = req.body.rank || req.query.rank;
        const rank = parseInt(rawRank);

        if (!rank || isNaN(rank) || rank < 1 || rank > 200000) {
            return res.status(400).json({
                success: false,
                error: 'Please enter a valid JEE Advanced rank between 1 and 2,00,000.'
            });
        }

        // 1. Register Guest Student
        const [regResult] = await pool.query(
            'CALL sp_register_student(?, ?, ?, ?, ?, ?, ?)',
            [`Guest_${Date.now()}`, `guest_${Date.now()}@rankly.in`, 'Kota', rank, 'OPEN', '2005-01-01', 'Rajasthan']
        );
        const studentId = regResult[0][0]?.new_student_id || regResult[0][0]?.Student_ID || 1;
        await pool.query('UPDATE STUDENT_PROFILE SET Gender = "Male" WHERE Student_ID = ?', [studentId]);

        // 2. Set Preferences (Balanced Weights)
        await pool.query(
            'CALL sp_set_preferences(?, 10.0, 10.0, 10.0, 10.0, 10.0, 10.0, 10.0, 10.0)',
            [studentId]
        );

        // 3. Create Search Session
        const [sessResult] = await pool.query(
            'CALL sp_create_search_session(?, ?, ?, ?)',
            [studentId, 'Quick_Session', 'All', 'Any']
        );
        const sessionId = sessResult[0][0]?.new_session_id || sessResult[0][0]?.Session_ID || 1;
        await pool.query(
            'UPDATE SEARCH_SESSION SET Branch_Pref = "", Strict_Branch = 0, Include_Related = 1, Sort_Mode = "Best Fit" WHERE Session_ID = ?',
            [sessionId]
        );

        // 4. Generate Recommendations
        const [recResult] = await pool.query('CALL sp_generate_recommendations(?)', [sessionId]);
        const results = recResult[0] || [];

        return res.json({
            success: true,
            quick: true,
            session_id: sessionId,
            student_id: studentId,
            defaults_applied: {
                rank,
                category: 'OPEN',
                gender: 'Male',
                home_city: 'Kota',
                weights: 'balanced'
            },
            count: results.length,
            results
        });
    } catch (err) {
        console.error('Quick session error:', err);
        return res.status(500).json({
            success: false,
            error: 'Failed to start quick session.',
            message: err.message
        });
    }
});

module.exports = router;
