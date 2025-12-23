const fs = require('fs');
const path = require('path');
const db = require('./db');

async function setupDatabase() {
    try {
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        const queries = schema.split(';').filter(query => query.trim().length > 0);

        console.log('Running schema setup...');
        for (const query of queries) {
            await db.query(query);
        }
        console.log('Database setup completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error setting up database:', error);
        process.exit(1);
    }
}

setupDatabase();
