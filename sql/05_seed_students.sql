USE rankly;

INSERT INTO STUDENT (Student_ID, Name, Email, DOB, Created_At) VALUES
(1, 'Aarav Sharma', 'aarav@email.com', '2007-03-15', CURRENT_TIMESTAMP),
(2, 'Priya Patel', 'priya@email.com', '2007-06-22', CURRENT_TIMESTAMP),
(3, 'Rohan Gupta', 'rohan@email.com', '2007-01-10', CURRENT_TIMESTAMP),
(4, 'Ananya Singh', 'ananya@email.com', '2007-09-05', CURRENT_TIMESTAMP),
(5, 'Vikram Reddy', 'vikram@email.com', '2007-11-18', CURRENT_TIMESTAMP),
(6, 'Sneha Iyer', 'sneha@email.com', '2007-04-30', CURRENT_TIMESTAMP),
(7, 'Arjun Kumar', 'arjun@email.com', '2007-07-14', CURRENT_TIMESTAMP),
(8, 'Diya Nair', 'diya@email.com', '2007-02-28', CURRENT_TIMESTAMP),
(9, 'Karthik Menon', 'karthik@email.com', '2006-12-01', CURRENT_TIMESTAMP),
(10, 'Ishaan Joshi', 'ishaan@email.com', '2007-08-20', CURRENT_TIMESTAMP),
(11, 'Meera Krishnan', 'meera@email.com', '2007-05-12', CURRENT_TIMESTAMP),
(12, 'Rahul Verma', 'rahul@email.com', '2007-10-03', CURRENT_TIMESTAMP);

INSERT INTO STUDENT_PROFILE (Profile_ID, Student_ID, JEE_Adv_Rank, Category, Home_City, Home_State) VALUES
(1, 1, 850, 'OPEN', 'Mumbai', 'Maharashtra'),
(2, 2, 1500, 'OPEN', 'Ahmedabad', 'Gujarat'),
(3, 3, 3200, 'OBC-NCL', 'New Delhi', 'Delhi'),
(4, 4, 5500, 'SC', 'Patna', 'Bihar'),
(5, 5, 200, 'OPEN', 'Hyderabad', 'Telangana'),
(6, 6, 4200, 'OPEN', 'Chennai', 'Tamil Nadu'),
(7, 7, 7800, 'ST', 'Ranchi', 'Jharkhand'),
(8, 8, 1100, 'EWS', 'Kochi', 'Kerala'),
(9, 9, 2800, 'OPEN', 'Bangalore', 'Karnataka'),
(10, 10, 600, 'OPEN', 'Pune', 'Maharashtra'),
(11, 11, 1800, 'OBC-NCL', 'Coimbatore', 'Tamil Nadu'),
(12, 12, 4500, 'EWS', 'Lucknow', 'Uttar Pradesh');

INSERT INTO STUDENT_PREFERENCE (Pref_ID, Student_ID, Criterion_ID, Importance_Wt) VALUES
(1, 1, 1, 40), (2, 1, 2, 10), (3, 1, 3, 5), (4, 1, 4, 5), (5, 1, 5, 5), (6, 1, 6, 25), (7, 1, 7, 5), (8, 1, 8, 5),
(9, 2, 1, 20), (10, 2, 2, 25), (11, 2, 3, 20), (12, 2, 4, 10), (13, 2, 5, 10), (14, 2, 6, 5), (15, 2, 7, 5), (16, 2, 8, 5),
(17, 3, 1, 30), (18, 3, 2, 15), (19, 3, 3, 15), (20, 3, 4, 10), (21, 3, 5, 10), (22, 3, 6, 10), (23, 3, 7, 5), (24, 3, 8, 5),
(25, 4, 1, 25), (26, 4, 2, 10), (27, 4, 3, 25), (28, 4, 4, 10), (29, 4, 5, 15), (30, 4, 6, 10), (31, 4, 7, 0), (32, 4, 8, 5),
(33, 5, 1, 45), (34, 5, 2, 5), (35, 5, 3, 5), (36, 5, 4, 5), (37, 5, 5, 5), (38, 5, 6, 30), (39, 5, 7, 0), (40, 5, 8, 5),
(41, 6, 1, 20), (42, 6, 2, 20), (43, 6, 3, 10), (44, 6, 4, 15), (45, 6, 5, 15), (46, 6, 6, 5), (47, 6, 7, 10), (48, 6, 8, 5),
(49, 7, 1, 30), (50, 7, 2, 10), (51, 7, 3, 20), (52, 7, 4, 10), (53, 7, 5, 10), (54, 7, 6, 10), (55, 7, 7, 5), (56, 7, 8, 5),
(57, 8, 1, 35), (58, 8, 2, 15), (59, 8, 3, 15), (60, 8, 4, 10), (61, 8, 5, 5), (62, 8, 6, 10), (63, 8, 7, 5), (64, 8, 8, 5),
(65, 9, 1, 30), (66, 9, 2, 15), (67, 9, 3, 10), (68, 9, 4, 5), (69, 9, 5, 5), (70, 9, 6, 15), (71, 9, 7, 10), (72, 9, 8, 10),
(73, 10, 1, 35), (74, 10, 2, 10), (75, 10, 3, 10), (76, 10, 4, 5), (77, 10, 5, 10), (78, 10, 6, 20), (79, 10, 7, 5), (80, 10, 8, 5),
(81, 11, 1, 25), (82, 11, 2, 20), (83, 11, 3, 15), (84, 11, 4, 10), (85, 11, 5, 10), (86, 11, 6, 10), (87, 11, 7, 5), (88, 11, 8, 5),
(89, 12, 1, 25), (90, 12, 2, 10), (91, 12, 3, 25), (92, 12, 4, 10), (93, 12, 5, 10), (94, 12, 6, 10), (95, 12, 7, 5), (96, 12, 8, 5);

INSERT INTO FAMILY_PREFERENCE (Family_Pref_ID, Student_ID, Criterion_ID, Parent_Wt) VALUES
(1, 2, 1, 35), (2, 2, 2, 10), (3, 2, 3, 25), (4, 2, 4, 5), (5, 2, 5, 5), (6, 2, 6, 15), (7, 2, 7, 0), (8, 2, 8, 5),
(9, 4, 1, 15), (10, 4, 2, 5), (11, 4, 3, 30), (12, 4, 4, 10), (13, 4, 5, 10), (14, 4, 6, 5), (15, 4, 7, 20), (16, 4, 8, 5);

INSERT INTO SEARCH_SESSION (Session_ID, Student_ID, Session_Name, Location_Pref, Budget_Range, Created_At) VALUES
(1, 1, 'CSE Focus Near Home', 'Mumbai', 'High', CURRENT_TIMESTAMP),
(2, 1, 'Best Branch Anywhere', 'Any', 'High', CURRENT_TIMESTAMP),
(3, 2, 'Affordable Near Gujarat', 'Gujarat', 'Low', CURRENT_TIMESTAMP),
(4, 2, 'Best Overall', 'Any', 'Medium', CURRENT_TIMESTAMP),
(5, 3, 'Delhi Preference', 'Delhi', 'Medium', CURRENT_TIMESTAMP),
(6, 5, 'Top CSE Programs', 'Any', 'High', CURRENT_TIMESTAMP),
(7, 6, 'Comfort Priority', 'Tamil Nadu', 'Medium', CURRENT_TIMESTAMP),
(8, 9, 'South India Focus', 'Karnataka', 'Medium', CURRENT_TIMESTAMP),
(9, 9, 'Open to All', 'Any', 'High', CURRENT_TIMESTAMP),
(10, 10, 'Top Colleges', 'Any', 'High', CURRENT_TIMESTAMP);

INSERT INTO PEER_CHOICE_TREND (Peer_ID, College_ID, Branch_ID, Profile_Category, Rank_Range_Start, Rank_Range_End, Selection_Count) VALUES
(1, 1, 1, 'OPEN', 1, 500, 45),
(2, 1, 1, 'OPEN', 501, 1000, 38),
(3, 2, 1, 'OPEN', 1, 500, 42),
(4, 3, 1, 'OPEN', 1, 500, 35),
(5, 1, 7, 'OPEN', 1, 500, 30),
(6, 1, 3, 'OPEN', 501, 1000, 28),
(7, 2, 3, 'OPEN', 501, 1000, 25),
(8, 4, 1, 'OPEN', 501, 1000, 22),
(9, 8, 1, 'OPEN', 1001, 2000, 20),
(10, 5, 1, 'OPEN', 501, 1000, 18),
(11, 3, 7, 'OPEN', 501, 1000, 15),
(12, 6, 1, 'OPEN', 1001, 2000, 12),
(13, 7, 1, 'OPEN', 1001, 2000, 10),
(14, 1, 1, 'OBC-NCL', 1, 1000, 35),
(15, 2, 1, 'SC', 1, 2000, 28);
