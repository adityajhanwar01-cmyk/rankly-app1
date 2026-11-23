USE rankly;

DROP TRIGGER IF EXISTS trg_shortlist_after_insert;
DROP TRIGGER IF EXISTS trg_shortlist_after_delete;
DROP TRIGGER IF EXISTS trg_preference_before_insert;
DROP TRIGGER IF EXISTS trg_preference_before_update;
DROP TRIGGER IF EXISTS trg_family_pref_before_insert;
DROP TRIGGER IF EXISTS trg_family_pref_before_update;
DROP TRIGGER IF EXISTS trg_profile_after_update;

DELIMITER $$

CREATE TRIGGER trg_shortlist_after_insert
AFTER INSERT ON STUDENT_SHORTLIST
FOR EACH ROW
BEGIN
    DECLARE v_category VARCHAR(50);
    DECLARE v_rank INT;
    DECLARE v_rank_band_start INT;
    DECLARE v_rank_band_end INT;
    DECLARE v_college_id INT;
    DECLARE v_branch_id INT;

    SELECT Category, JEE_Adv_Rank INTO v_category, v_rank 
    FROM STUDENT_PROFILE WHERE Student_ID = NEW.Student_ID;

    SELECT College_ID, Branch_ID INTO v_college_id, v_branch_id
    FROM RECOMMENDATION_RESULT WHERE Result_ID = NEW.Result_ID;

    IF v_rank <= 500 THEN
        SET v_rank_band_start = 1, v_rank_band_end = 500;
    ELSEIF v_rank <= 1000 THEN
        SET v_rank_band_start = 501, v_rank_band_end = 1000;
    ELSEIF v_rank <= 2000 THEN
        SET v_rank_band_start = 1001, v_rank_band_end = 2000;
    ELSEIF v_rank <= 5000 THEN
        SET v_rank_band_start = 2001, v_rank_band_end = 5000;
    ELSE
        SET v_rank_band_start = 5001, v_rank_band_end = 10000;
    END IF;

    IF EXISTS (SELECT 1 FROM PEER_CHOICE_TREND 
               WHERE College_ID = v_college_id AND Branch_ID = v_branch_id 
               AND Profile_Category = v_category AND Rank_Range_Start = v_rank_band_start) THEN
        UPDATE PEER_CHOICE_TREND 
        SET Selection_Count = Selection_Count + 1
        WHERE College_ID = v_college_id AND Branch_ID = v_branch_id 
        AND Profile_Category = v_category AND Rank_Range_Start = v_rank_band_start;
    ELSE
        INSERT INTO PEER_CHOICE_TREND (College_ID, Branch_ID, Profile_Category, Rank_Range_Start, Rank_Range_End, Selection_Count)
        VALUES (v_college_id, v_branch_id, v_category, v_rank_band_start, v_rank_band_end, 1);
    END IF;
END $$

CREATE TRIGGER trg_shortlist_after_delete
AFTER DELETE ON STUDENT_SHORTLIST
FOR EACH ROW
BEGIN
    DECLARE v_category VARCHAR(50);
    DECLARE v_rank INT;
    DECLARE v_rank_band_start INT;
    DECLARE v_college_id INT;
    DECLARE v_branch_id INT;

    SELECT Category, JEE_Adv_Rank INTO v_category, v_rank 
    FROM STUDENT_PROFILE WHERE Student_ID = OLD.Student_ID;

    SELECT College_ID, Branch_ID INTO v_college_id, v_branch_id
    FROM RECOMMENDATION_RESULT WHERE Result_ID = OLD.Result_ID;

    IF v_rank <= 500 THEN SET v_rank_band_start = 1;
    ELSEIF v_rank <= 1000 THEN SET v_rank_band_start = 501;
    ELSEIF v_rank <= 2000 THEN SET v_rank_band_start = 1001;
    ELSEIF v_rank <= 5000 THEN SET v_rank_band_start = 2001;
    ELSE SET v_rank_band_start = 5001; END IF;

    UPDATE PEER_CHOICE_TREND 
    SET Selection_Count = GREATEST(0, Selection_Count - 1)
    WHERE College_ID = v_college_id AND Branch_ID = v_branch_id 
    AND Profile_Category = v_category AND Rank_Range_Start = v_rank_band_start;
END $$

CREATE TRIGGER trg_preference_before_insert
BEFORE INSERT ON STUDENT_PREFERENCE
FOR EACH ROW
BEGIN
    IF NEW.Importance_Wt < 0 OR NEW.Importance_Wt > 100 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Weight must be between 0 and 100';
    END IF;
END $$

CREATE TRIGGER trg_preference_before_update
BEFORE UPDATE ON STUDENT_PREFERENCE
FOR EACH ROW
BEGIN
    IF NEW.Importance_Wt < 0 OR NEW.Importance_Wt > 100 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Weight must be between 0 and 100';
    END IF;
END $$

CREATE TRIGGER trg_family_pref_before_insert
BEFORE INSERT ON FAMILY_PREFERENCE
FOR EACH ROW
BEGIN
    IF NEW.Parent_Wt < 0 OR NEW.Parent_Wt > 100 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Parent weight must be between 0 and 100';
    END IF;
END $$

CREATE TRIGGER trg_family_pref_before_update
BEFORE UPDATE ON FAMILY_PREFERENCE
FOR EACH ROW
BEGIN
    IF NEW.Parent_Wt < 0 OR NEW.Parent_Wt > 100 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Parent weight must be between 0 and 100';
    END IF;
END $$

CREATE TRIGGER trg_profile_after_update
AFTER UPDATE ON STUDENT_PROFILE
FOR EACH ROW
BEGIN
    IF OLD.JEE_Adv_Rank != NEW.JEE_Adv_Rank THEN
        INSERT INTO AUDIT_LOG (Student_ID, Field_Changed, Old_Value, New_Value, Changed_At)
        VALUES (NEW.Student_ID, 'JEE_Adv_Rank', CAST(OLD.JEE_Adv_Rank AS CHAR), CAST(NEW.JEE_Adv_Rank AS CHAR), NOW());
    END IF;
    
    IF OLD.Category != NEW.Category THEN
        INSERT INTO AUDIT_LOG (Student_ID, Field_Changed, Old_Value, New_Value, Changed_At)
        VALUES (NEW.Student_ID, 'Category', OLD.Category, NEW.Category, NOW());
    END IF;
END $$

DELIMITER ;
