USE rankly;

CREATE OR REPLACE VIEW v_open_category_snapshot AS
SELECT c.College_Name, b.Branch_Name, h.Opening_Rank, h.Closing_Rank, h.Year
FROM HISTORICAL_CUTOFF h
JOIN IIT_COLLEGE c ON h.College_ID = c.College_ID
JOIN BRANCH b ON h.Branch_ID = b.Branch_ID
WHERE h.Category = 'OPEN' AND h.Year = (SELECT MAX(Year) FROM HISTORICAL_CUTOFF);

CREATE OR REPLACE SQL SECURITY INVOKER VIEW v_recommendation_full AS
SELECT st.Name AS Student_Name, s.Session_Name, c.College_Name, b.Branch_Name,
       r.Risk_Level, r.Overall_Score, r.Match_Pct, 
       COALESCE(t.Trend_Status, 'Stable') AS Trend_Status, 
       t.Rank_Shift_1Y, 
       COALESCE(t.Confidence, 'Medium') AS Confidence
FROM RECOMMENDATION_RESULT r
JOIN IIT_COLLEGE c ON r.College_ID = c.College_ID
JOIN BRANCH b ON r.Branch_ID = b.Branch_ID
JOIN SEARCH_SESSION s ON r.Session_ID = s.Session_ID
JOIN STUDENT st ON s.Student_ID = st.Student_ID
LEFT JOIN STUDENT_PROFILE sp ON st.Student_ID = sp.Student_ID
LEFT JOIN BRANCH_TREND_ANALYTICS t ON r.College_ID = t.College_ID 
                                  AND r.Branch_ID = t.Branch_ID
                                  AND t.Category = COALESCE(sp.Category, 'OPEN')
                                  AND t.Seat_Pool = CASE WHEN sp.Gender = 'Female' THEN 'Female-Only' ELSE 'Gender-Neutral' END
                                  AND t.Program_Type = '4-year B.Tech';

CREATE OR REPLACE VIEW v_explain_result AS
SELECT rd.Result_ID, c.College_Name, b.Branch_Name, ef.Factor_Name, 
       rd.Score, rd.Weight_Used, 
       (rd.Score * rd.Weight_Used / 100) AS Weighted_Contribution
FROM RECOMMENDATION_DETAIL rd
JOIN RECOMMENDATION_RESULT rr ON rd.Result_ID = rr.Result_ID
JOIN IIT_COLLEGE c ON rr.College_ID = c.College_ID
JOIN BRANCH b ON rr.Branch_ID = b.Branch_ID
JOIN EVALUATION_FACTOR ef ON rd.Factor_ID = ef.Factor_ID;

CREATE OR REPLACE VIEW v_students_like_you AS
SELECT p.Profile_Category, p.Rank_Range_Start, p.Rank_Range_End, 
       c.College_Name, b.Branch_Name, p.Selection_Count
FROM PEER_CHOICE_TREND p
JOIN IIT_COLLEGE c ON p.College_ID = c.College_ID
JOIN BRANCH b ON p.Branch_ID = b.Branch_ID
ORDER BY p.Profile_Category, p.Rank_Range_Start, p.Selection_Count DESC;

CREATE OR REPLACE VIEW v_shortlist_ordered AS
SELECT sl.Student_ID, sl.Choice_Order, c.College_Name, b.Branch_Name, 
       rr.Risk_Level, rr.Match_Pct, t.Trend_Status
FROM STUDENT_SHORTLIST sl
JOIN RECOMMENDATION_RESULT rr ON sl.Result_ID = rr.Result_ID
JOIN IIT_COLLEGE c ON rr.College_ID = c.College_ID
JOIN BRANCH b ON rr.Branch_ID = b.Branch_ID
LEFT JOIN BRANCH_TREND_ANALYTICS t ON rr.College_ID = t.College_ID AND rr.Branch_ID = t.Branch_ID
ORDER BY sl.Student_ID, sl.Choice_Order;

CREATE OR REPLACE VIEW v_family_disagreement AS
SELECT sp.Student_ID, pc.Criterion_Name, 
       sp.Importance_Wt AS Student_Wt, fp.Parent_Wt, 
       ABS(sp.Importance_Wt - fp.Parent_Wt) AS Gap
FROM STUDENT_PREFERENCE sp
JOIN FAMILY_PREFERENCE fp ON sp.Student_ID = fp.Student_ID AND sp.Criterion_ID = fp.Criterion_ID
JOIN PREFERENCE_CRITERION pc ON sp.Criterion_ID = pc.Criterion_ID
WHERE ABS(sp.Importance_Wt - fp.Parent_Wt) > 15;

CREATE OR REPLACE VIEW v_shortlist_warnings AS
SELECT s1.Student_ID, s1.Choice_Order AS Reach_Order, s1.College_Name AS Reach_College, 
       s1.Branch_Name AS Reach_Branch, s1.Risk_Level AS Reach_Risk,
       s2.Choice_Order AS Safe_Order, s2.College_Name AS Safe_College, 
       s2.Branch_Name AS Safe_Branch, s2.Risk_Level AS Safe_Risk
FROM v_shortlist_ordered s1
JOIN v_shortlist_ordered s2 ON s1.Student_ID = s2.Student_ID
WHERE s1.Risk_Level = 'Reach' AND s2.Risk_Level = 'Safe' AND s1.Choice_Order > s2.Choice_Order;
