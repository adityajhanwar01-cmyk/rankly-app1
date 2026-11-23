require('dotenv').config();
const mysql = require('mysql2/promise');

function buildConfig() {
    // 1. If DATABASE_URL / MYSQL_URL is provided (e.g. Aiven, Render, Railway)
    const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
    if (dbUrl) {
        try {
            const u = new URL(dbUrl);
            const isCloud = u.hostname.includes('aivencloud.com') ||
                            u.hostname.includes('render.com') ||
                            u.searchParams.get('ssl-mode') === 'REQUIRED' ||
                            process.env.DB_SSL === 'true';

            return {
                host: u.hostname,
                port: parseInt(u.port || '3306', 10),
                user: decodeURIComponent(u.username),
                password: decodeURIComponent(u.password),
                database: u.pathname.replace(/^\//, '') || 'rankly',
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                multipleStatements: true,
                ...(isCloud ? { ssl: { rejectUnauthorized: false } } : {})
            };
        } catch (e) {
            console.warn('⚠️ Could not parse DATABASE_URL, falling back to standard env:', e.message);
        }
    }

    // 2. Standard discrete environment variables
    const host = process.env.DB_HOST || 'localhost';
    const isCloud = host.includes('aivencloud.com') ||
                    host.includes('render.com') ||
                    process.env.DB_SSL === 'true';

    return {
        host: host,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'rankly',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        multipleStatements: true,
        ...(isCloud ? { ssl: { rejectUnauthorized: false } } : {})
    };
}

const config = buildConfig();
const pool = mysql.createPool(config);

// Auto-disable sql_require_primary_key for cloud databases (Aiven / AWS) to support temp tables
pool.on('connection', conn => {
    conn.query('SET SESSION sql_require_primary_key = 0', () => {});
});

// Quick health check on startup
pool.getConnection()
    .then(conn => {
        const host = config.host;
        const db = config.database;
        console.log(`✅ MySQL connected successfully — database: "${db}" on host "${host}"`);
        conn.release();
    })
    .catch(err => {
        console.error('❌ MySQL connection failed:', err.message);
        console.error('   Ensure MySQL server is running and .env credentials are correct.');
    });

module.exports = pool;
