# Normalisation of RANKLY DBMS

## Table Normalisation Proofs

### IIT_COLLEGE(College_ID, College_Name, City, State)
- **Candidate Key:** `College_ID`
- **FDs:** `College_ID -> College_Name, City, State`
- **Proof:** All non-key attributes are fully functionally dependent on the primary key, and there are no transitive dependencies. It is in **BCNF**.

### BRANCH(Branch_ID, Branch_Name, Branch_Code)
- **Candidate Key:** `Branch_ID`
- **FDs:** `Branch_ID -> Branch_Name, Branch_Code`
- **Proof:** In **BCNF** as `Branch_ID` is a superkey for all FDs.

### COLLEGE_INFO(Info_ID, College_ID, Annual_Fee, Placement_Pct, Avg_Package, Hostel_Rating, Mess_Rating, Campus_Rating, NIRF_Rank)
- **Candidate Key:** `Info_ID`, `College_ID`
- **FDs:** `Info_ID -> College_ID, Annual_Fee...`, `College_ID -> Info_ID, Annual_Fee...`
- **Proof:** **BCNF**. `College_ID` is unique, indicating a 1:1 extension. It isolates frequently updated numeric/rating data from the core static `IIT_COLLEGE` table.

### HISTORICAL_CUTOFF(Cutoff_ID, College_ID, Branch_ID, Year, Category, Opening_Rank, Closing_Rank)
- **Candidate Key:** `Cutoff_ID`
- **FDs:** `Cutoff_ID -> College_ID, Branch_ID, Year, Category, Opening_Rank, Closing_Rank`
- **Proof:** Resolves the M:N relationship between `IIT_COLLEGE` and `BRANCH`. Contains specific attributes (Year, Category, Ranks) for each combination. In **BCNF**.

### STUDENT and STUDENT_PROFILE
- **STUDENT:** `Student_ID -> Name, Email, DOB, Created_At` (BCNF)
- **STUDENT_PROFILE:** `Profile_ID -> Student_ID, JEE_Adv_Rank, Category, Home_City, Home_State` (BCNF)
- **Rationale:** 1:1 decomposition separates immutable identity data (Email, DOB) from volatile profile/application data (Rank, Preferences).
