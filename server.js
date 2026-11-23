const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Application Routes
app.use('/api/colleges', require('./routes/colleges'));
app.use('/api',          require('./routes/predict'));
app.use('/',             require('./routes/predict'));
app.use('/api',          require('./routes/trends'));
app.use('/',             require('./routes/trends'));
app.use('/api',          require('./routes/eligibility'));
app.use('/api',          require('./routes/institutes'));
app.use('/',             require('./routes/institutes'));

// Fallback to main portal
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Database/Server error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
    console.log(`\n================================================================`);
    console.log(`🎓 Rankly · IIT JoSAA Counselling & Seat Allocation Cockpit`);
    console.log(`📡 Server active at: http://localhost:${PORT}`);
    console.log(`================================================================\n`);
});
