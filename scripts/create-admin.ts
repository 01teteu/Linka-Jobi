import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

async function run() {
    console.log('Connecting to DB...');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        console.log('Connected!');
        
        const email = 'suporte@linka.com';
        const password = 'admin123';
        const hash = await bcrypt.hash(password, 10);
        
        console.log('Updating/Inserting admin user...');
        
        // Try update
        const updateRes = await client.query(
            `UPDATE users SET senha_hash = $1, role = 'ADMIN', status = 'ACTIVE' WHERE email = $2 RETURNING *`,
            [hash, email]
        );
        
        if (updateRes.rowCount > 0) {
            console.log('Admin updated:', updateRes.rows[0]);
        } else {
            // Insert
            const insertRes = await client.query(
                `INSERT INTO users (nome, email, senha_hash, role, avatar_url, localizacao, latitude, longitude, bio, status) 
                 VALUES ('Suporte Linka Jobi', $1, $2, 'ADMIN', 'https://ui-avatars.com/api/?name=Suporte+Linka&background=0D8ABC&color=fff', 'Central de Suporte', 0, 0, 'Canal oficial de atendimento.', 'ACTIVE') 
                 RETURNING *`,
                [email, hash]
            );
            console.log('Admin created:', insertRes.rows[0]);
        }
        
        client.release();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
