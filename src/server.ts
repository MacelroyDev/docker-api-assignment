import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import dotenv from 'dotenv';
import { query, connectDb } from './db';
import cors from 'cors';
// Removed: import bcrypt from 'bcryptjs'; // Password handling is external

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Configure CORS - allow requests from your React app's origin
// IMPORTANT: Change 'http://localhost:3000' to your actual React app's URL
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware to parse JSON request bodies
app.use(express.json());

// --- ROUTES ---

// 1. User Management (Registration - without password handling)
app.post('/users/register', async (req: Request, res: Response) => {
    const { username, email } = req.body; // Removed 'password' from destructuring

    if (!username || !email) { // Updated validation
        return res.status(400).json({ message: 'Username and email are required.' });
    }

    try {
        // Removed: const hashedPassword = await bcrypt.hash(password, 10);

        const result = await query(
            'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id, username, email, created_at', // Updated INSERT query
            [username, email] // Updated parameters
        );

        const newUser = result.rows[0];
        res.status(201).json({ message: 'User registered successfully!', user: newUser });
    } catch (error: any) {
        // Check for unique constraint violation errors (PostgreSQL error code 23505)
        if (error.code === '23505') {
            if (error.detail.includes('username')) {
                return res.status(409).json({ message: 'Username already exists.' });
            }
            if (error.detail.includes('email')) {
                return res.status(409).json({ message: 'Email already exists.' });
            }
        }
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Internal server error during user registration.' });
    }
});

// GET all users (for testing/admin purposes - restrict in production!)
app.get('/users', async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT id, username, email, created_at FROM users');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Internal server error while fetching users.' });
    }
});


// 2. Markets Management (No changes from previous version)
app.post('/markets', async (req: Request, res: Response) => {
    const { image_link, label, description, content, latitude, longitude, website_link } = req.body;

    if (!image_link || !label) {
        return res.status(400).json({ message: 'Image link and label are required for a market.' });
    }

    try {
        const result = await query(
            'INSERT INTO markets (image_link, label, description, content, latitude, longitude, website_link) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [image_link, label, description, content, latitude, longitude, website_link]
        );
        res.status(201).json({ message: 'Market created successfully!', market: result.rows[0] });
    } catch (error) {
        console.error('Error creating market:', error);
        res.status(500).json({ message: 'Internal server error while creating market.' });
    }
});

app.get('/markets', async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM markets ORDER BY label ASC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching markets:', error);
        res.status(500).json({ message: 'Internal server error while fetching markets.' });
    }
});

app.get('/markets/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid market ID.' });
    }
    try {
        const result = await query('SELECT * FROM markets WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Market not found.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(`Error fetching market with ID ${id}:`, error);
        res.status(500).json({ message: 'Internal server error while fetching market.' });
    }
});


// 3. Vendors Management (No changes from previous version)
app.post('/vendors', async (req: Request, res: Response) => {
    const { image_link, name, category, location, contact, email, website, markets, products, description, content } = req.body;

    if (!image_link || !name) {
        return res.status(400).json({ message: 'Image link and name are required for a vendor.' });
    }

    // Ensure 'markets' and 'products' are arrays, default to empty if not provided
    const marketsArray = Array.isArray(markets) ? markets : [];
    const productsArray = Array.isArray(products) ? products : [];

    try {
        const result = await query(
            'INSERT INTO vendors (image_link, name, category, location, contact, email, website, markets, products, description, content) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
            [image_link, name, category, location, contact, email, website, marketsArray, productsArray, description, content]
        );
        res.status(201).json({ message: 'Vendor created successfully!', vendor: result.rows[0] });
    } catch (error) {
        console.error('Error creating vendor:', error);
        res.status(500).json({ message: 'Internal server error while creating vendor.' });
    }
});

app.get('/vendors', async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM vendors ORDER BY name ASC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ message: 'Internal server error while fetching vendors.' });
    }
});

app.get('/vendors/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid vendor ID.' });
    }
    try {
        const result = await query('SELECT * FROM vendors WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Vendor not found.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(`Error fetching vendor with ID ${id}:`, error);
        res.status(500).json({ message: 'Internal server error while fetching vendor.' });
    }
});


// 4. Articles Management (No changes from previous version)
app.post('/articles', async (req: Request, res: Response) => {
    const { user_id, market_id, title, content } = req.body;

    if (!user_id || !title || !content) {
        return res.status(400).json({ message: 'User ID, title, and content are required for an article.' });
    }

    if (isNaN(parseInt(user_id))) {
        return res.status(400).json({ message: 'Invalid user ID.' });
    }
    if (market_id && isNaN(parseInt(market_id))) {
        return res.status(400).json({ message: 'Invalid market ID.' });
    }

    try {
        const result = await query(
            'INSERT INTO articles (user_id, market_id, title, content) VALUES ($1, $2, $3, $4) RETURNING *',
            [user_id, market_id, title, content]
        );
        res.status(201).json({ message: 'Article created successfully!', article: result.rows[0] });
    } catch (error: any) {
        // Specific error for foreign key violation (user_id or market_id doesn't exist)
        if (error.code === '23503') {
            return res.status(400).json({ message: 'Referenced user or market does not exist.' });
        }
        console.error('Error creating article:', error);
        res.status(500).json({ message: 'Internal server error while creating article.' });
    }
});

app.get('/articles', async (req: Request, res: Response) => {
    try {
        // Join with users table to get username for article
        const result = await query(`
            SELECT
                a.post_id,
                a.user_id,
                u.username, -- Get username from users table
                a.market_id,
                m.label AS market_label, -- Get market label if market_id exists
                a.title,
                a.content,
                a.created_at
            FROM articles a
            JOIN users u ON a.user_id = u.id
            LEFT JOIN markets m ON a.market_id = m.id -- Use LEFT JOIN since market_id is nullable
            ORDER BY a.created_at DESC
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching articles:', error);
        res.status(500).json({ message: 'Internal server error while fetching articles.' });
    }
});

app.get('/articles/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid article ID.' });
    }
    try {
        const result = await query(`
            SELECT
                a.post_id,
                a.user_id,
                u.username,
                a.market_id,
                m.label AS market_label,
                a.title,
                a.content,
                a.created_at
            FROM articles a
            JOIN users u ON a.user_id = u.id
            LEFT JOIN markets m ON a.market_id = m.id
            WHERE a.post_id = $1
        `, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Article not found.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(`Error fetching article with ID ${id}:`, error);
        res.status(500).json({ message: 'Internal server error while fetching article.' });
    }
});


// --- Global Error Handling Middleware ---
app.use(((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
        console.error('Bad JSON payload:', err.message);
        return res.status(400).json({ message: 'Invalid JSON payload' });
    }
    console.error('Unhandled error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
}) as ErrorRequestHandler);

// --- Start Server ---
connectDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to start server due to database connection error:', err.message);
    process.exit(1); // Exit process if DB connection fails
});