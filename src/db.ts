import { Pool } from 'pg';
import dotenv from 'dotenv';

// Get the configs from .env
dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    // Set port, default to 5432 if not set
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1); // Exit if database connection breaks
});

// Export a function to easily execute queries
export const query = (text: string, params?: any[]) => {
    console.log('EXECUTING QUERY:', text, params || ''); // Log queries for debugging
    return pool.query(text, params);
};

// Function to test the database connection on start
export const connectDb = async () => {
    try {
        await pool.connect(); // Attempt to get a client to test connection
        console.log('Connected to PostgreSQL database successfully!');
        await query(`
            CREATE TABLE IF NOT EXISTS students (
                studentID VARCHAR(255) PRIMARY KEY,
                studentName VARCHAR(255) NOT NULL,
                course VARCHAR(255) NOT NULL,
                presentDate DATE NOT NULL
            );
        `);
        console.log('Students table ensured/created.');
    } catch (err) {
        console.error('Error connecting to PostgreSQL database:', err);
        // Throw the error so server.ts can catch and exit
        throw err;
    }
};