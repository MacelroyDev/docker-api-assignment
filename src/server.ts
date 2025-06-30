import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { query, connectDb } from './db';

// -- DOCKER COMMANDS --
// A personal reference for the docker commands

// To run:
// docker-compose up --build -d

// To see what is running:
// docker ps

// To stop:
// docker-compose down


// Get the configs from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());


app.get('/', (req: Request, res: Response) => {
    res.send('Student API is running!');
});

// POST Function, and basic error/common data issue checks
app.post('/student', async (req: Request, res: Response) => {
    const { studentID, studentName, course, presentDate } = req.body;

    // Check if required fields are present
    if (!studentID || !studentName || !course || !presentDate) {
        return res.status(400).json({ message: 'Missing required fields. Please provide studentID, studentName, course, and presentDate.' });
    }

    try {
        // Check if student already exists
        const existingStudent = await query('SELECT * FROM students WHERE studentID = $1', [studentID]);
        if (existingStudent.rows.length > 0) {
            return res.status(409).json({ message: 'student already exists' });
        }

        console.log(`Attempting to create student: ${studentID}`);
        // Insert new student record into the database
        const result = await query(
            'INSERT INTO students (studentID, studentName, course, presentDate) VALUES ($1, $2, $3, $4) RETURNING *',
            [studentID, studentName, course, presentDate]
        );

        // Send success response
        res.status(201).json({
            message: 'student created successfully',
            student: result.rows[0] // Return the created student data
        });

    } catch (error) {
        // Catch block for database errors
        if ((error as any).code === '23505') { // PostgreSQL unique violation error code for unique constraint violation
            return res.status(409).json({ message: 'student already exists' });
        }
        console.error('Error creating student record:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT Function for updating student records
app.put('/student/:studentID', async (req: Request, res: Response) => {
    const { studentID } = req.params; // Get studentID from URL parameters
    const { studentName, course, presentDate } = req.body; // Get update data from body

    // Check if at least one field to update is provided
    if (!studentName && !course && !presentDate) {
        return res.status(400).json({ message: 'No fields provided for update. Please provide studentName, course, or presentDate.' });
    }

    try {
        // Build the SET clause dynamically for the UPDATE query
        const updates: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (studentName !== undefined) {
            updates.push(`studentName = $${paramIndex++}`);
            params.push(studentName);
        }
        if (course !== undefined) {
            updates.push(`course = $${paramIndex++}`);
            params.push(course);
        }
        if (presentDate !== undefined) {
            updates.push(`presentDate = $${paramIndex++}`);
            params.push(presentDate);
        }

        // Add the studentID to the parameters for the WHERE clause
        params.push(studentID);

        const updateQuery = `
            UPDATE students
            SET ${updates.join(', ')}
            WHERE studentID = $${paramIndex}
            RETURNING *;
        `;

        console.log(`Attempting to update student: ${studentID}`);
        const result = await query(updateQuery, params);

        if (result.rows.length === 0) {
            // No student found with the given studentID
            return res.status(404).json({ message: 'Student not found.' });
        }

        // Student updated successfully
        res.status(200).json({
            message: 'Student updated successfully',
            student: result.rows[0] // Return the updated student data
        });

    } catch (error) {
        console.error('Error updating student record:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Other global error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
        console.error('Bad JSON payload:', err.message);
        return res.status(400).json({ message: 'Invalid JSON payload' });
    }
    console.error('Unhandled error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
});


// Start the server and connect to DB before starting
connectDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error("Failed to start server due to database connection error:", err);
    process.exit(1);
});