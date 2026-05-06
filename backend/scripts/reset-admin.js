const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const resetAdmin = async () => {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        console.log('Connected to database...');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        // Update existing admin
        const [updateResult] = await connection.execute(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, 'admin@sniper.com']
        );

        if (updateResult.affectedRows > 0) {
            console.log('Successfully reset password for admin@sniper.com to admin123');
        } else {
            // If doesn't exist, create it
            const [insertResult] = await connection.execute(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['Main Admin', 'admin@sniper.com', hashedPassword, 'admin']
            );
            console.log('Successfully created admin@sniper.com with admin123');
        }

        // Create a new fresh admin for the user
        const userHashedPassword = await bcrypt.hash('sniper2025', salt);
        const [userResult] = await connection.execute(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE password = ?',
            ['User Admin', 'user@sniper.com', userHashedPassword, 'admin', userHashedPassword]
        );
        console.log('Successfully created/updated user@sniper.com with password sniper2025');

    } catch (error) {
        console.error('Error resetting admin:', error);
    } finally {
        if (connection) await connection.end();
    }
};

resetAdmin();
