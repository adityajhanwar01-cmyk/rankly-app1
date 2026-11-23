# 🎓 Rankly — IIT JoSAA Counselling & Seat Recommendation Cockpit
### Official JoSAA Cutoffs (2021–2025) & Multi-Factor IIT Recommendation Platform

A comprehensive, production-grade **Counselling and Recommendation Platform** modeling official JoSAA cutoff records across all 23 Indian Institutes of Technology (IITs). Features personalized seat predictions, multi-factor preference scoring, cutoff trajectory trends, and peer comparisons.

---

## 🌟 Key System Capabilities

1. **🔮 Multi-Criteria College Predictor (`sp_generate_recommendations`)**:
   - Evaluates candidate JEE Advanced rank against official JoSAA historical cutoffs (2021–2025).
   - Multi-factor preference scoring across **8 criteria**: Placement average, NIRF rank, Annual fees, Mess food, Hostel, Campus life, Proximity to home, and Branch strength.
   - Calculates **Risk Classification** (`Safe`, `Moderate`, `Reach`) and probability percentages.

2. **📈 Cutoff Trajectory Analytics (`BRANCH_TREND_ANALYTICS`)**:
   - Evaluates 5-year closing rank velocity across all 23 IITs.
   - Classifies cutoff shifts as `Rising` (tightening demand), `Stable`, or `Falling` (easing cutoff).

3. **🏛️ 23 IITs Master Directory**:
   - Complete institutional data: NIRF rankings, average & highest placement packages, fees, and infrastructure ratings.

4. **⚖️ Decision Cockpit & Program Comparison**:
   - Compare top programs side-by-side across placements, NIRF rank, fees, hostel/mess ratings, and distance.

5. **🔍 Transparent Factor Breakdown ("Why this score?")**:
   - Interactive 8-factor radar breakdown, mathematical scoring transparency, and cutoff record verification.

---

## 🚀 Quick Setup & Installation

### 1. Prerequisites
- **Node.js** (v18+)
- **MySQL Server** (v8.0+)

### 2. Configure Environment
Create a `.env` file in the project root:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=rankly
PORT=3000
```

### 3. Initialize Database (Optional if already created)
```bash
node scripts/init_database.js
```

### 4. Install Dependencies & Start Server
```bash
npm install
npm start
```

Visit the application at:
- **Web Portal:** `http://localhost:3000/`

### 5. Run Automated Tests
```bash
npm test
```
