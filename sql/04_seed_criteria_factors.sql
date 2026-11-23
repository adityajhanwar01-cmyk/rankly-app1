USE rankly;

INSERT INTO PREFERENCE_CRITERION (Criterion_ID, Criterion_Name, Default_Weight) VALUES
(1, 'Branch Quality and Infrastructure', 30),
(2, 'Location', 15),
(3, 'Fees', 15),
(4, 'Mess and Food Quality', 10),
(5, 'Hostel Facilities', 10),
(6, 'Placement Record', 10),
(7, 'Proximity to Home', 5),
(8, 'Campus Life', 5);

INSERT INTO EVALUATION_FACTOR (Factor_ID, Factor_Name, Criterion_ID) VALUES
(1, 'Branch Infrastructure Score', 1),
(2, 'Location Match Score', 2),
(3, 'Fee Affordability Score', 3),
(4, 'Mess Quality Score', 4),
(5, 'Hostel Quality Score', 5),
(6, 'Placement Score', 6),
(7, 'Home Proximity Score', 7),
(8, 'Campus Life Score', 8);
