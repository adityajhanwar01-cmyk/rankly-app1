

USE rankly;

-- a) sp_register_student
DROP PROCEDURE IF EXISTS sp_register_student;
DELIMITER $$
CREATE PROCEDURE sp_register_student(
    IN p_name VARCHAR(255),
    IN p_email VARCHAR(255),
    IN p_home_city VARCHAR(255),
    IN p_rank INT,
    IN p_category VARCHAR(50),
    IN p_dob DATE,
    IN p_home_state VARCHAR(255)
)
BEGIN
    DECLARE v_student_id INT;
    
    INSERT INTO STUDENT (Name, Email, DOB, Created_At)
    VALUES (p_name, p_email, p_dob, CURRENT_TIMESTAMP);
    
    SET v_student_id = LAST_INSERT_ID();
    
    INSERT INTO STUDENT_PROFILE (Student_ID, JEE_Adv_Rank, Category, Home_City, Home_State)
    VALUES (v_student_id, p_rank, p_category, p_home_city, p_home_state);
    
    INSERT INTO STUDENT_PREFERENCE (Student_ID, Criterion_ID, Importance_Wt)
    SELECT v_student_id, Criterion_ID, Default_Weight
    FROM PREFERENCE_CRITERION;
    
    SELECT v_student_id AS new_student_id;
END$$
DELIMITER ;

-- b) sp_set_preferences
DROP PROCEDURE IF EXISTS sp_set_preferences;
DELIMITER $$
CREATE PROCEDURE sp_set_preferences(
    IN p_student_id INT,
    IN p_w1 DECIMAL(5,2), IN p_w2 DECIMAL(5,2), IN p_w3 DECIMAL(5,2), IN p_w4 DECIMAL(5,2),
    IN p_w5 DECIMAL(5,2), IN p_w6 DECIMAL(5,2), IN p_w7 DECIMAL(5,2), IN p_w8 DECIMAL(5,2)
)
BEGIN
    IF p_w1 < 0 OR p_w2 < 0 OR p_w3 < 0 OR p_w4 < 0 OR p_w5 < 0 OR p_w6 < 0 OR p_w7 < 0 OR p_w8 < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Weights must be >= 0';
    END IF;
    
    IF p_w1 + p_w2 + p_w3 + p_w4 + p_w5 + p_w6 + p_w7 + p_w8 = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'At least one weight must be > 0';
    END IF;

    INSERT INTO STUDENT_PREFERENCE (Student_ID, Criterion_ID, Importance_Wt) VALUES
    (p_student_id, 1, p_w1), (p_student_id, 2, p_w2), (p_student_id, 3, p_w3), (p_student_id, 4, p_w4),
    (p_student_id, 5, p_w5), (p_student_id, 6, p_w6), (p_student_id, 7, p_w7), (p_student_id, 8, p_w8)
    ON DUPLICATE KEY UPDATE Importance_Wt = VALUES(Importance_Wt);
END$$
DELIMITER ;

-- c) sp_set_family_preferences
DROP PROCEDURE IF EXISTS sp_set_family_preferences;
DELIMITER $$
CREATE PROCEDURE sp_set_family_preferences(
    IN p_student_id INT,
    IN p_w1 DECIMAL(5,2), IN p_w2 DECIMAL(5,2), IN p_w3 DECIMAL(5,2), IN p_w4 DECIMAL(5,2),
    IN p_w5 DECIMAL(5,2), IN p_w6 DECIMAL(5,2), IN p_w7 DECIMAL(5,2), IN p_w8 DECIMAL(5,2)
)
BEGIN
    IF p_w1 < 0 OR p_w2 < 0 OR p_w3 < 0 OR p_w4 < 0 OR p_w5 < 0 OR p_w6 < 0 OR p_w7 < 0 OR p_w8 < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Weights must be >= 0';
    END IF;
    
    IF p_w1 + p_w2 + p_w3 + p_w4 + p_w5 + p_w6 + p_w7 + p_w8 = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'At least one weight must be > 0';
    END IF;

    INSERT INTO FAMILY_PREFERENCE (Student_ID, Criterion_ID, Parent_Wt) VALUES
    (p_student_id, 1, p_w1), (p_student_id, 2, p_w2), (p_student_id, 3, p_w3), (p_student_id, 4, p_w4),
    (p_student_id, 5, p_w5), (p_student_id, 6, p_w6), (p_student_id, 7, p_w7), (p_student_id, 8, p_w8)
    ON DUPLICATE KEY UPDATE Parent_Wt = VALUES(Parent_Wt);
END$$
DELIMITER ;

-- d) sp_create_search_session
DROP PROCEDURE IF EXISTS sp_create_search_session;
DELIMITER $$
CREATE PROCEDURE sp_create_search_session(
    IN p_student_id INT,
    IN p_session_name VARCHAR(255),
    IN p_location_pref VARCHAR(255),
    IN p_budget_range VARCHAR(50)
)
BEGIN
    INSERT INTO SEARCH_SESSION (Student_ID, Session_Name, Location_Pref, Budget_Range, Created_At)
    VALUES (p_student_id, p_session_name, p_location_pref, p_budget_range, CURRENT_TIMESTAMP);
    
    SELECT LAST_INSERT_ID() AS new_session_id;
END$$
DELIMITER ;

-- e) sp_generate_recommendations
DROP PROCEDURE IF EXISTS sp_generate_recommendations;
DELIMITER $$
CREATE PROCEDURE sp_generate_recommendations(IN p_session_id INT)
BEGIN
    DECLARE v_student_id INT;
    DECLARE v_location_pref VARCHAR(255);
    DECLARE v_budget VARCHAR(50);
    
    DECLARE v_rank INT;
    DECLARE v_category VARCHAR(50);
    DECLARE v_home_city VARCHAR(255);
    DECLARE v_home_state VARCHAR(255);
    
    DECLARE v_w1 DECIMAL(5,2); DECLARE v_w2 DECIMAL(5,2); DECLARE v_w3 DECIMAL(5,2); DECLARE v_w4 DECIMAL(5,2);
    DECLARE v_w5 DECIMAL(5,2); DECLARE v_w6 DECIMAL(5,2); DECLARE v_w7 DECIMAL(5,2); DECLARE v_w8 DECIMAL(5,2);
    DECLARE v_tot_wt DECIMAL(10,2);
    
    DECLARE v_latest_year INT;
    DECLARE v_done INT DEFAULT FALSE;
    
    -- Cursor variables
    DECLARE c_cutoff_id INT;
    DECLARE c_college_id INT;
    DECLARE c_branch_id INT;
    DECLARE c_closing_rank INT;
    DECLARE c_city VARCHAR(255);
    DECLARE c_state VARCHAR(255);
    DECLARE c_nirf INT;
    DECLARE c_fee DECIMAL(10,2);
    DECLARE c_mess DECIMAL(3,2);
    DECLARE c_hostel DECIMAL(3,2);
    DECLARE c_place DECIMAL(5,2);
    DECLARE c_avg DECIMAL(5,2);
    DECLARE c_campus DECIMAL(3,2);
    
    DECLARE cur CURSOR FOR 
        SELECT hc.Cutoff_ID, hc.College_ID, hc.Branch_ID, hc.Closing_Rank,
               ic.City, ic.State, ci.NIRF_Rank, ci.Annual_Fee, ci.Mess_Rating, ci.Hostel_Rating,
               ci.Placement_Pct, ci.Avg_Package, ci.Campus_Rating
        FROM HISTORICAL_CUTOFF hc
        JOIN IIT_COLLEGE ic ON hc.College_ID = ic.College_ID
        JOIN COLLEGE_INFO ci ON hc.College_ID = ci.College_ID
        WHERE hc.Year = v_latest_year AND hc.Category = v_category
          AND v_rank <= 1.10 * hc.Closing_Rank;
          
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;
    
    SELECT Student_ID, Location_Pref, Budget_Range INTO v_student_id, v_location_pref, v_budget
    FROM SEARCH_SESSION WHERE Session_ID = p_session_id;
    
    SELECT JEE_Adv_Rank, Category, Home_City, Home_State INTO v_rank, v_category, v_home_city, v_home_state
    FROM STUDENT_PROFILE WHERE Student_ID = v_student_id;
    
    SELECT MAX(IF(Criterion_ID=1, Importance_Wt, 0)), MAX(IF(Criterion_ID=2, Importance_Wt, 0)),
           MAX(IF(Criterion_ID=3, Importance_Wt, 0)), MAX(IF(Criterion_ID=4, Importance_Wt, 0)),
           MAX(IF(Criterion_ID=5, Importance_Wt, 0)), MAX(IF(Criterion_ID=6, Importance_Wt, 0)),
           MAX(IF(Criterion_ID=7, Importance_Wt, 0)), MAX(IF(Criterion_ID=8, Importance_Wt, 0))
    INTO v_w1, v_w2, v_w3, v_w4, v_w5, v_w6, v_w7, v_w8
    FROM STUDENT_PREFERENCE WHERE Student_ID = v_student_id;
    
    SET v_tot_wt = v_w1 + v_w2 + v_w3 + v_w4 + v_w5 + v_w6 + v_w7 + v_w8;
    IF v_tot_wt = 0 THEN SET v_tot_wt = 1; END IF;
    
    SELECT MAX(Year) INTO v_latest_year FROM HISTORICAL_CUTOFF WHERE Category = v_category;
    
    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO c_cutoff_id, c_college_id, c_branch_id, c_closing_rank, c_city, c_state,
                       c_nirf, c_fee, c_mess, c_hostel, c_place, c_avg, c_campus;
        IF v_done THEN LEAVE read_loop; END IF;
        
        BEGIN
            DECLARE v_risk VARCHAR(20);
            DECLARE v_s1 DECIMAL(5,2); DECLARE v_s2 DECIMAL(5,2); DECLARE v_s3 DECIMAL(5,2); DECLARE v_s4 DECIMAL(5,2);
            DECLARE v_s5 DECIMAL(5,2); DECLARE v_s6 DECIMAL(5,2); DECLARE v_s7 DECIMAL(5,2); DECLARE v_s8 DECIMAL(5,2);
            DECLARE v_overall DECIMAL(5,2);
            DECLARE v_res_id INT;
            
            IF v_rank <= 0.85 * c_closing_rank THEN SET v_risk = 'Safe';
            ELSEIF v_rank <= c_closing_rank THEN SET v_risk = 'Moderate';
            ELSE SET v_risk = 'Reach'; END IF;
            
            SET v_s1 = GREATEST(0, LEAST(100, 101 - COALESCE(c_nirf, 100)));
            SET v_s2 = IF(c_city = v_location_pref, 100, IF(c_state = v_location_pref, 60, IF(v_location_pref = 'Any', 50, 20)));
            
            IF v_budget = 'Low' THEN SET v_s3 = GREATEST(0, LEAST(100, (200000 - c_fee)/2000));
            ELSEIF v_budget = 'Medium' THEN SET v_s3 = GREATEST(0, LEAST(100, (350000 - c_fee)/3500));
            ELSEIF v_budget = 'High' THEN SET v_s3 = GREATEST(0, LEAST(100, (500000 - c_fee)/5000));
            ELSE SET v_s3 = 50; END IF;
            
            SET v_s4 = COALESCE(c_mess, 0) / 5.0 * 100;
            SET v_s5 = COALESCE(c_hostel, 0) / 5.0 * 100;
            SET v_s6 = (COALESCE(c_place, 0) + LEAST(100, COALESCE(c_avg, 0) * 100 / 30)) / 2;
            SET v_s7 = IF(c_city = v_home_city, 100, IF(c_state = v_home_state, 60, 0));
            SET v_s8 = COALESCE(c_campus, 0) / 5.0 * 100;
            
            SET v_overall = (v_s1*v_w1 + v_s2*v_w2 + v_s3*v_w3 + v_s4*v_w4 + v_s5*v_w5 + v_s6*v_w6 + v_s7*v_w7 + v_s8*v_w8) / v_tot_wt;
            
            INSERT INTO RECOMMENDATION_RESULT (Session_ID, College_ID, Branch_ID, Cutoff_ID, Overall_Score, Match_Pct, Risk_Level, Created_At)
            VALUES (p_session_id, c_college_id, c_branch_id, c_cutoff_id, v_overall, v_overall, v_risk, CURRENT_TIMESTAMP);
            SET v_res_id = LAST_INSERT_ID();
            
            INSERT INTO RECOMMENDATION_DETAIL (Result_ID, Factor_ID, Score, Weight_Used) VALUES
            (v_res_id, 1, v_s1, v_w1), (v_res_id, 2, v_s2, v_w2), (v_res_id, 3, v_s3, v_w3), (v_res_id, 4, v_s4, v_w4),
            (v_res_id, 5, v_s5, v_w5), (v_res_id, 6, v_s6, v_w6), (v_res_id, 7, v_s7, v_w7), (v_res_id, 8, v_s8, v_w8);
        END;
    END LOOP;
    CLOSE cur;
END$$
DELIMITER ;

-- f) sp_refresh_trends
DROP PROCEDURE IF EXISTS sp_refresh_trends;
DELIMITER $$
CREATE PROCEDURE sp_refresh_trends(IN p_base_year INT)
BEGIN
    INSERT INTO BRANCH_TREND_ANALYTICS (College_ID, Branch_ID, Category, Rank_Shift_1Y, Rank_Shift_2Y, Trend_Status, Confidence, Last_Updated)
    SELECT 
        y0.College_ID, y0.Branch_ID, y0.Category,
        CASE WHEN y1.Closing_Rank IS NOT NULL THEN (y0.Closing_Rank - y1.Closing_Rank) / y1.Closing_Rank * 100 ELSE NULL END AS s1,
        CASE WHEN y2.Closing_Rank IS NOT NULL THEN (y0.Closing_Rank - y2.Closing_Rank) / y2.Closing_Rank * 100 ELSE NULL END AS s2,
        CASE 
            WHEN y1.Closing_Rank IS NOT NULL AND ((y0.Closing_Rank - y1.Closing_Rank) / y1.Closing_Rank * 100) <= -5 THEN 'Rising'
            WHEN y1.Closing_Rank IS NOT NULL AND ((y0.Closing_Rank - y1.Closing_Rank) / y1.Closing_Rank * 100) >= 5 THEN 'Falling'
            ELSE 'Stable'
        END AS ts,
        CASE 
            WHEN y1.Closing_Rank IS NOT NULL AND y2.Closing_Rank IS NOT NULL AND 
                 SIGN(y0.Closing_Rank - y1.Closing_Rank) = SIGN(y1.Closing_Rank - y2.Closing_Rank) THEN 'High'
            WHEN y1.Closing_Rank IS NOT NULL AND y2.Closing_Rank IS NOT NULL THEN 'Medium'
            WHEN y1.Closing_Rank IS NOT NULL THEN 'Low'
            ELSE 'Low'
        END AS conf,
        CURRENT_TIMESTAMP
    FROM HISTORICAL_CUTOFF y0
    LEFT JOIN HISTORICAL_CUTOFF y1 ON y0.College_ID=y1.College_ID AND y0.Branch_ID=y1.Branch_ID AND y0.Category=y1.Category AND y1.Year = p_base_year - 1
    LEFT JOIN HISTORICAL_CUTOFF y2 ON y0.College_ID=y2.College_ID AND y0.Branch_ID=y2.Branch_ID AND y0.Category=y2.Category AND y2.Year = p_base_year - 2
    WHERE y0.Year = p_base_year
    ON DUPLICATE KEY UPDATE 
        Rank_Shift_1Y = VALUES(Rank_Shift_1Y), Rank_Shift_2Y = VALUES(Rank_Shift_2Y),
        Trend_Status = VALUES(Trend_Status), Confidence = VALUES(Confidence), Last_Updated = CURRENT_TIMESTAMP;
END$$
DELIMITER ;

-- g) sp_family_consensus
DROP PROCEDURE IF EXISTS sp_family_consensus;
DELIMITER $$
CREATE PROCEDURE sp_family_consensus(
    IN p_student_id INT,
    IN p_session_id INT,
    IN p_student_ratio DECIMAL(3,2)
)
BEGIN
    DECLARE v_count INT;
    
    SELECT COUNT(*) INTO v_count FROM FAMILY_PREFERENCE WHERE Student_ID = p_student_id;
    IF v_count = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No family preferences found for this student';
    END IF;
    
    INSERT INTO FAMILY_CONSENSUS (Student_ID, Session_ID, Result_ID, Student_Score, Parent_Score, Consensus_Score, Disagreement_Flags)
    SELECT 
        p_student_id, p_session_id, rr.Result_ID,
        SUM(rd.Score * sp.Importance_Wt) / SUM(sp.Importance_Wt) AS s_score,
        SUM(rd.Score * fp.Parent_Wt) / SUM(fp.Parent_Wt) AS p_score,
        p_student_ratio * (SUM(rd.Score * sp.Importance_Wt) / SUM(sp.Importance_Wt)) + (1 - p_student_ratio) * (SUM(rd.Score * fp.Parent_Wt) / SUM(fp.Parent_Wt)) AS c_score,
        GROUP_CONCAT(CASE WHEN ABS(sp.Importance_Wt - fp.Parent_Wt) > 15 THEN sp.Criterion_ID ELSE NULL END) AS flags
    FROM RECOMMENDATION_RESULT rr
    JOIN RECOMMENDATION_DETAIL rd ON rr.Result_ID = rd.Result_ID
    JOIN STUDENT_PREFERENCE sp ON sp.Criterion_ID = rd.Factor_ID AND sp.Student_ID = p_student_id
    JOIN FAMILY_PREFERENCE fp ON fp.Criterion_ID = rd.Factor_ID AND fp.Student_ID = p_student_id
    WHERE rr.Session_ID = p_session_id
    GROUP BY rr.Result_ID;
END$$
DELIMITER ;

-- h) sp_add_to_shortlist
DROP PROCEDURE IF EXISTS sp_add_to_shortlist;
DELIMITER $$
CREATE PROCEDURE sp_add_to_shortlist(
    IN p_student_id INT,
    IN p_result_id INT,
    IN p_choice_order INT
)
BEGIN
    IF p_choice_order <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Choice order must be > 0';
    END IF;
    
    UPDATE STUDENT_SHORTLIST 
    SET Choice_Order = Choice_Order + 1 
    WHERE Student_ID = p_student_id AND Choice_Order >= p_choice_order;
    
    INSERT INTO STUDENT_SHORTLIST (Student_ID, Result_ID, Choice_Order, Added_At)
    VALUES (p_student_id, p_result_id, p_choice_order, CURRENT_TIMESTAMP);
END$$
DELIMITER ;

-- i) sp_reorder_shortlist
DROP PROCEDURE IF EXISTS sp_reorder_shortlist;
DELIMITER $$
CREATE PROCEDURE sp_reorder_shortlist(
    IN p_student_id INT,
    IN p_shortlist_id INT,
    IN p_new_order INT
)
BEGIN
    DECLARE v_old_order INT;
    
    SELECT Choice_Order INTO v_old_order FROM STUDENT_SHORTLIST WHERE Shortlist_ID = p_shortlist_id AND Student_ID = p_student_id;
    
    IF v_old_order IS NOT NULL AND v_old_order != p_new_order THEN
        IF v_old_order > p_new_order THEN
            UPDATE STUDENT_SHORTLIST 
            SET Choice_Order = Choice_Order + 1 
            WHERE Student_ID = p_student_id AND Choice_Order >= p_new_order AND Choice_Order < v_old_order;
        ELSE
            UPDATE STUDENT_SHORTLIST 
            SET Choice_Order = Choice_Order - 1 
            WHERE Student_ID = p_student_id AND Choice_Order <= p_new_order AND Choice_Order > v_old_order;
        END IF;
        
        UPDATE STUDENT_SHORTLIST 
        SET Choice_Order = p_new_order 
        WHERE Shortlist_ID = p_shortlist_id AND Student_ID = p_student_id;
    END IF;
END$$
DELIMITER ;
