import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs/promises'; // Use fs/promises for async file operations
import path from 'path';     // For constructing file paths

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

/**
 * Connects to the PostgreSQL database and sets up necessary tables from an SQL file.
 */
export async function connectDb(): Promise<void> {
    let client;
    try {
        client = await pool.connect();
        console.log('Connected to PostgreSQL database successfully!');

        console.log('Checking and creating database tables...');

        // Construct the path to your SQL initialization file
        const sqlFilePath = path.join(__dirname, 'sql', 'init.sql');
        const schemaSql = await fs.readFile(sqlFilePath, { encoding: 'utf8' });

        // Execute all queries from the SQL file
        await client.query(schemaSql); // pg can execute multiple statements if separated by semicolons

        console.log('Database schema setup complete from init.sql.');

    } catch (error) {
        console.error('Failed to connect to database or create tables:', error);
        throw new Error('Database initialization failed'); // Re-throw to indicate critical failure
    } finally {
        if (client) {
            client.release(); // Ensure client is released back to the pool
        }
    }
}

/**
 * Executes a SQL query using the connection pool.
 * @param text The SQL query string.
 * @param params Optional array of query parameters.
 * @returns A Promise that resolves to the QueryResult.
 */
export function query(text: string, params?: any[]): Promise<QueryResult> {
    return pool.query(text, params);
}