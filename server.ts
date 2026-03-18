import express from 'express';
import { createServer as createViteServer } from 'vite';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenAI } from "@google/genai";
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createServer } from 'http';
import nodemailer from 'nodemailer';
import { DEFAULT_CATEGORIES, DEFAULT_SERVICES } from './constants';

dotenv.config();

const app = express();
app.set('trust proxy', 1); // Trust first proxy for rate limiting
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'segredo_super_secreto_linka_jobi_2024';
const DB_CONNECTION = process.env.DATABASE_URL;
const GOOGLE_API_KEY = process.env.API_KEY || process.env.VITE_GOOGLE_API_KEY;

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const { Pool } = pg;
const pool = new Pool({ 
    connectionString: DB_CONNECTION,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    keepAlive: true
});

// --- EMAIL SERVICE ---
let transporter: nodemailer.Transporter;
let io: Server;

const initEmail = async () => {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    const setupEthereal = async () => {
        try {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
            console.log('📧 Ethereal Email initialized');
            console.log('📧 Preview URL: https://ethereal.email/messages');
        } catch (err) {
            console.error('❌ Failed to create Ethereal account', err);
        }
    };

    if (user && pass) {
        try {
            const tempTransporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: { user, pass }
            });
            await tempTransporter.verify();
            transporter = tempTransporter;
            console.log(`📧 SMTP Email initialized (Gmail 465) for ${user}`);
        } catch (err) {
            console.error(`❌ SMTP Email verification failed for ${user}. Falling back to Ethereal. Error:`, err);
            await setupEthereal();
        }
    } else {
        // Fallback to Ethereal for development
        await setupEthereal();
    }
};

initEmail();

const sendEmail = async (to: string, subject: string, html: string) => {
    if (!transporter) {
        console.log(`📧 [MOCK EMAIL] To: ${to} | Subject: ${subject}`);
        return;
    }
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || `"Linka Jobi" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        });
        console.log(`📧 Email sent: ${info.messageId}`);
    } catch (err) {
        console.error('❌ Error sending email:', err);
    }
};

// --- NOTIFICATION HELPER ---
const createNotification = async (userId: number, type: string, title: string, message: string, data?: any) => {
    try {
        let userEmail = '';
        let userName = '';

        // 1. Save to Database/Memory
        if (isDbConnected) {
            await pool.query(
                'INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4)',
                [userId, type, title, message]
            );
            const userRes = await pool.query('SELECT email, nome FROM users WHERE id = $1', [userId]);
            if (userRes.rows[0]) {
                userEmail = userRes.rows[0].email;
                userName = userRes.rows[0].nome;
            }
        } else {
            const user = MEMORY_USERS.find(u => u.id === userId);
            if (user) {
                userEmail = user.email;
                userName = user.nome;
            }
        }

        // 2. Emit via Socket.io
        io.to(`user_${userId}`).emit('notification', { type, title, message, ...data });

        // 3. Send Email if user found
        if (userEmail) {
            const emailHtml = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                    <h2 style="color: #10b981;">${title}</h2>
                    <p>Olá, ${userName.split(' ')[0]}!</p>
                    <p>${message}</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666;">Você está recebendo esta notificação porque possui uma conta no Linka Jobi.</p>
                </div>
            `;
            await sendEmail(userEmail, `Linka Jobi: ${title}`, emailHtml);
        }
    } catch (err) {
        console.error('❌ Error creating notification:', err);
    }
};

let isDbConnected = false;

// --- RATE LIMITER ---
const loginAttempts = new Map<string, { count: number, lastAttempt: number }>();

const rateLimiter = (req: any, res: any, next: any) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const max = 20; // limit each IP to 20 requests per windowMs

    const record = loginAttempts.get(ip) || { count: 0, lastAttempt: now };

    if (now - record.lastAttempt > windowMs) {
        record.count = 0;
        record.lastAttempt = now;
    }

    record.count++;
    loginAttempts.set(ip, record);

    if (record.count > max) {
        return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em 15 minutos.' });
    }

    next();
};

pool.on('error', (err: any) => {
    if (err.code === 'ECONNRESET') {
        console.warn('⚠️ Connection to database was reset (idle client). This is normal if the database restarts or closes idle connections.');
    } else {
        console.error('❌ Unexpected error on idle client', err);
    }
});
process.on('uncaughtException', (err) => { console.error('UNCAUGHT EXCEPTION:', err); });
process.on('unhandledRejection', (reason) => { console.error('UNHANDLED REJECTION:', reason); });

let aiClient: any = null;
if (GOOGLE_API_KEY) { aiClient = new GoogleGenAI({ apiKey: GOOGLE_API_KEY }); }

app.use(cors());
app.use(express.json());
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });


// --- IN-MEMORY FALLBACK (MOCK DB) ---
const MEMORY_USERS: any[] = [];
const MEMORY_PROPOSALS: any[] = [];

let memoryIdCounter = 1;

// Auth Middleware
const authenticate = async (req: any, res: any, next: any) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) throw new Error('No token provided');
        const token = authHeader.split(' ')[1];
        const decoded: any = jwt.verify(token, JWT_SECRET);
        
        if (isDbConnected) {
            const userCheck = await pool.query('SELECT id, role, status FROM users WHERE id = $1', [decoded.id]);
            if (userCheck.rowCount === 0) throw new Error('User deleted');
            if (userCheck.rows[0].status === 'BLOCKED') throw new Error('User blocked');
            req.user = { ...decoded, role: userCheck.rows[0].role };
        } else {
            // Check memory users
            const user = MEMORY_USERS.find(u => u.id === decoded.id);
            if (!user) throw new Error('User not found in memory');
            if (user.status === 'BLOCKED') throw new Error('User blocked');
            req.user = { ...decoded, role: user.role };
        }
        next();
    } catch (err) {
        res.status(401).json({ error: "Sessão expirada." });
    }
};

function mapUserToFrontend(u: any) {
    if (!u) return null;
    return {
        id: u.id, name: u.nome, email: u.email, role: u.role,
        avatarUrl: u.avatar_url, location: u.localizacao, status: u.status,
        bio: u.bio, specialty: u.specialty, phone: u.telefone,
        coordinates: { lat: u.latitude, lng: u.longitude },
        isSubscriber: u.is_subscriber,
        rating: u.rating ? parseFloat(u.rating) : 5.0,
        reviewsCount: u.reviews_count || 0,
        experienceYears: u.xp ? Math.floor(u.xp / 100).toString() : '1',
        portfolio: u.portfolio || [],
        services: u.services || []
    };
}

function mapProposalToFrontend(p: any) {
    return {
        id: p.id, contractorId: p.contratante_id, contractorName: p.contractor_name || 'Usuário',
        title: p.titulo, description: p.descricao, areaTag: p.area_tag, status: p.status,
        location: p.localizacao, budgetRange: p.orcamento_estimado, createdAt: p.data_criacao,
        contractorAvatar: p.contractor_avatar, professionalId: p.profissional_id,
        contractorEmail: p.contractor_email, contractorPhone: p.contractor_phone,
        acceptedByCount: p.accepted_count || 0,
        contractorRating: p.contractor_rating ? parseFloat(p.contractor_rating) : 5.0,
        contractorReviewsCount: p.contractor_reviews_count || 0
    };
}

// ✅ CEP → Coordenadas via BrasilAPI
async function getCoordinatesFromCep(cep: string) {
    try {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return null;
        
        // Tenta v2 primeiro (com coordenadas)
        const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
        
        if (response.ok) {
            const data: any = await response.json();
            return {
                lat: data.location?.coordinates?.latitude ? parseFloat(data.location.coordinates.latitude) : null,
                lng: data.location?.coordinates?.longitude ? parseFloat(data.location.coordinates.longitude) : null,
                city: data.city,
                state: data.state,
                cidade: `${data.city}, ${data.state}`
            };
        }

        // Fallback para v1 se v2 falhar (apenas endereço)
        const responseV1 = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
        if (responseV1.ok) {
            const dataV1: any = await responseV1.json();
            return {
                lat: null,
                lng: null,
                city: dataV1.city,
                state: dataV1.state,
                cidade: `${dataV1.city}, ${dataV1.state}`
            };
        }

        return null;
    } catch (e) { 
        console.error('Erro ao buscar CEP:', e);
        return null; 
    }
}

app.use((req: any, _res: any, next: any) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- ROTAS ---

app.get('/api/health', async (_req, res) => {
    try {
        if (isDbConnected) { 
            // Test connection
            const c = await pool.connect(); 
            c.release(); 
            res.json({ status: 'ok', db: 'connected', mode: 'PRODUCTION_DB' }); 
        } else { 
            res.json({ status: 'ok', db: 'disconnected', mode: 'MOCK_MODE', usersInMemory: MEMORY_USERS.length }); 
        }
    } catch (err: any) { res.status(500).json({ status: 'error', error: err.message }); }
});

// ✅ CEP lookup
app.get('/api/cep/:cep', async (req, res) => {
    const coords = await getCoordinatesFromCep(req.params.cep);
    if (!coords) return res.status(404).json({ error: 'CEP não encontrado ou sem coordenadas.' });
    return res.json(coords);
});

app.get('/api/categories', async (_req, res) => {
    if (!isDbConnected) return res.json(DEFAULT_CATEGORIES);
    try {
        const result = await pool.query('SELECT * FROM categories ORDER BY name');
        if (result.rowCount === 0) throw new Error("Empty");
        res.json(result.rows.map((r: any) => ({ id: r.id, name: r.name, imageUrl: r.image_url })));
    } catch { res.json(DEFAULT_CATEGORIES); }
});

app.get('/api/services', async (_req, res) => {
    if (!isDbConnected) return res.json(DEFAULT_SERVICES);
    try {
        const result = await pool.query('SELECT * FROM services WHERE is_active = true');
        if (result.rowCount === 0) throw new Error("Empty");
        res.json(result.rows.map((r: any) => ({ id: r.id, categoryId: r.category_id, name: r.name, emoji: r.emoji, isActive: r.is_active, imageUrl: r.image_url })));
    } catch { res.json(DEFAULT_SERVICES); }
});

// ✅ Debug Route to Force Create Admin
app.get('/api/debug/create-admin', async (_req, res) => {
    try {
        const email = 'suporte@linka.com';
        const password = 'admin123';
        const hash = await bcrypt.hash(password, 10);
        
        if (isDbConnected) {
            // Try to update first
            const updateRes = await pool.query(
                `UPDATE users SET senha_hash = $1, role = 'ADMIN' WHERE email = $2 RETURNING *`,
                [hash, email]
            );
            
            if ((updateRes.rowCount || 0) > 0) {
                return res.json({ message: 'Admin updated in DB', user: updateRes.rows[0] });
            } else {
                // Insert if not exists
                const insertRes = await pool.query(
                    `INSERT INTO users (nome, email, senha_hash, role, avatar_url, localizacao, latitude, longitude, bio, status) 
                     VALUES ('Suporte Linka Jobi', $1, $2, 'ADMIN', 'https://ui-avatars.com/api/?name=Suporte+Linka&background=0D8ABC&color=fff', 'Central de Suporte', 0, 0, 'Canal oficial de atendimento.', 'ACTIVE') 
                     RETURNING *`,
                    [email, hash]
                );
                return res.json({ message: 'Admin created in DB', user: insertRes.rows[0] });
            }
        } else {
            const existing = MEMORY_USERS.find(u => u.email === email);
            if (existing) {
                existing.senha_hash = hash;
                existing.role = 'ADMIN';
                return res.json({ message: 'Admin updated in Memory', user: existing });
            } else {
                const newUser = {
                    id: 999,
                    nome: 'Suporte Linka Jobi',
                    email,
                    senha_hash: hash,
                    role: 'ADMIN',
                    avatar_url: 'https://ui-avatars.com/api/?name=Suporte+Linka&background=0D8ABC&color=fff',
                    localizacao: 'Central de Suporte',
                    latitude: 0,
                    longitude: 0,
                    bio: 'Canal oficial de atendimento.',
                    status: 'ACTIVE'
                };
                MEMORY_USERS.push(newUser);
                return res.json({ message: 'Admin created in Memory', user: newUser });
            }
        }
    } catch (e: any) {
        console.error(e);
        return res.status(500).json({ error: e.message });
    }
});

// ✅ Login com validação (Híbrido DB/Memória)
app.post('/api/login', rateLimiter, async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    
    try {
        let user;
        
        // Allow 'admin' username alias
        const normalizedEmail = email.toLowerCase().trim();
        const isSupportLogin = normalizedEmail === 'suporte@linka.com' || normalizedEmail === 'admin';
        
        if (isDbConnected) {
            let queryEmail = normalizedEmail;
            if (normalizedEmail === 'admin') queryEmail = 'suporte@linka.com';
            
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [queryEmail]);
            user = result.rows[0];

            // Special handling for Support Admin
            if (isSupportLogin) {
                if (!user) {
                    console.log('Creating Admin User on login attempt...');
                    const hash = await bcrypt.hash('admin123', 10);
                    const newUser = await pool.query(
                        `INSERT INTO users (nome, email, senha_hash, role, avatar_url, localizacao, latitude, longitude, bio) 
                         VALUES ('Suporte Linka Jobi', 'suporte@linka.com', $1, 'ADMIN', 'https://ui-avatars.com/api/?name=Suporte+Linka&background=0D8ABC&color=fff', 'Central de Suporte', 0, 0, 'Canal oficial de atendimento.') 
                         RETURNING *`,
                        [hash]
                    );
                    user = newUser.rows[0];
                }
            }
        } else {
            console.log('Login via Memory DB');
            user = MEMORY_USERS.find(u => u.email === email.toLowerCase().trim());
            
            // Special handling for Support Admin (Memory)
            if (email.toLowerCase().trim() === 'suporte@linka.com') {
                 if (!user) {
                     const hash = await bcrypt.hash('admin123', 10);
                     const newAdmin = {
                        id: 999,
                        nome: 'Suporte Linka Jobi',
                        email: 'suporte@linka.com',
                        senha_hash: hash,
                        role: 'ADMIN',
                        avatar_url: 'https://ui-avatars.com/api/?name=Suporte+Linka&background=0D8ABC&color=fff',
                        localizacao: 'Central de Suporte',
                        latitude: 0,
                        longitude: 0,
                        bio: 'Canal oficial de atendimento.',
                        status: 'ACTIVE'
                     };
                     MEMORY_USERS.push(newAdmin);
                     user = newAdmin;
                 }
            }
        }

        if (!user) {
            return res.status(401).json({ 
                error: 'E-mail ou senha incorretos.',
                debug: {
                    emailReceived: email,
                    dbConnected: isDbConnected,
                    triedToCreate: email.toLowerCase().trim() === 'suporte@linka.com'
                }
            });
        }
        
        const valid = await bcrypt.compare(senha, user.senha_hash);
        if (!valid) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
        
        if (user.status === 'BLOCKED') return res.status(403).json({ error: 'Conta bloqueada.' });
        
        // Fetch portfolio and services if DB connected
        if (isDbConnected) {
            const portfolioRes = await pool.query('SELECT * FROM portfolio WHERE user_id = $1', [user.id]);
            user.portfolio = portfolioRes.rows.map((p: any) => ({ id: p.id, userId: p.user_id, imageUrl: p.image_url, description: p.descricao }));
            
            const servicesRes = await pool.query('SELECT * FROM user_services WHERE user_id = $1', [user.id]);
            user.services = servicesRes.rows.map((s: any) => ({ id: s.id.toString(), title: s.title, description: s.description, price: s.price, priceUnit: s.price_unit }));
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ token, user: mapUserToFrontend(user) });
    } catch (err) { 
        console.error('Login Error:', err); 
        res.status(500).json({ error: 'Erro interno no login' }); 
    }
});

// ✅ Register com validação + CEP (Híbrido DB/Memória)
app.post('/api/register', rateLimiter, async (req, res) => {
    const { name, email, password, role, avatarUrl, location, phone, specialty, coordinates, cep } = req.body;
    const finalAvatarUrl = avatarUrl || null;
    
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'Campos obrigatórios: nome, email, senha, papel.' });
    if (!['CONTRACTOR', 'PROFESSIONAL'].includes(role)) return res.status(400).json({ error: 'Papel inválido.' });
    
    // Stronger Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'E-mail inválido.' });

    // Stronger Password Validation
    if (password.length < 8) return res.status(400).json({ error: 'Senha deve ter ao menos 8 caracteres.' });
    if (!/[A-Z]/.test(password)) return res.status(400).json({ error: 'Senha deve conter ao menos uma letra maiúscula.' });
    if (!/[0-9]/.test(password)) return res.status(400).json({ error: 'Senha deve conter ao menos um número.' });
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return res.status(400).json({ error: 'Senha deve conter ao menos um caractere especial.' });

    try {
        let lat = coordinates?.lat || -23.55;
        let lng = coordinates?.lng || -46.63;
        let resolvedLocation = location || 'São Paulo, SP';
        
        if (cep) {
            const coords = await getCoordinatesFromCep(cep);
            if (coords) { lat = coords.lat; lng = coords.lng; resolvedLocation = coords.cidade || resolvedLocation; }
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const normalizedEmail = email.toLowerCase().trim();

        let user;

        if (isDbConnected) {
            const result = await pool.query(
                `INSERT INTO users (nome, email, senha_hash, role, avatar_url, localizacao, telefone, specialty, latitude, longitude)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
                [name, normalizedEmail, hash, role, finalAvatarUrl, resolvedLocation, phone, specialty, lat, lng]
            );
            user = result.rows[0];
        } else {
            console.log('Register via Memory DB');
            if (MEMORY_USERS.find(u => u.email === normalizedEmail)) {
                return res.status(400).json({ error: 'E-mail já existe (Memória).' });
            }
            
            user = {
                id: memoryIdCounter++,
                nome: name,
                email: normalizedEmail,
                senha_hash: hash,
                role,
                avatar_url: finalAvatarUrl,
                localizacao: resolvedLocation,
                telefone: phone,
                specialty,
                latitude: lat,
                longitude: lng,
                status: 'ACTIVE',
                is_subscriber: false,
                rating: 5.0,
                reviews_count: 0,
                xp: 0,
                bio: '',
                services: []
            };
            MEMORY_USERS.push(user);
        }

        // Initialize empty portfolio and services for response
        user.portfolio = [];
        user.services = [];

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        
        // Send Welcome Email
        const welcomeHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Bem-vindo ao Linka Jobi! 🎉</h2>
                <p>Olá, ${user.nome.split(' ')[0]}!</p>
                <p>Estamos muito felizes em ter você conosco. Sua conta foi criada com sucesso.</p>
                <p>Agora você pode explorar os melhores profissionais ou oferecer seus serviços.</p>
                <a href="${process.env.APP_URL || 'http://localhost:3000'}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Acessar Plataforma</a>
            </div>
        `;
        sendEmail(user.email, 'Bem-vindo ao Linka Jobi!', welcomeHtml).catch(console.error);

        return res.json({ token, user: mapUserToFrontend(user) });

    } catch (err: any) {
        const errMsg = err.message || String(err);
        if (err.code === '23505' || err.code === 23505 || errMsg.includes('users_email_key') || errMsg.includes('duplicate key')) {
            return res.status(409).json({ error: 'E-mail já cadastrado.' });
        }
        console.error('Register Error:', err);
        res.status(500).json({ error: 'Erro no registro' });
    }
});

app.get('/api/me', authenticate, async (req: any, res) => {
    try {
        let user;
        if (isDbConnected) {
            const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
            user = result.rows[0];
            if (user) {
                const portfolioRes = await pool.query('SELECT * FROM portfolio WHERE user_id = $1', [user.id]);
                user.portfolio = portfolioRes.rows.map((p: any) => ({ id: p.id, userId: p.user_id, imageUrl: p.image_url, description: p.descricao }));
                
                const servicesRes = await pool.query('SELECT * FROM user_services WHERE user_id = $1', [user.id]);
                user.services = servicesRes.rows.map((s: any) => ({ id: s.id.toString(), title: s.title, description: s.description, price: s.price, priceUnit: s.price_unit }));
            }
        } else {
            user = MEMORY_USERS.find(u => u.id === req.user.id);
        }
        
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
        return res.json({ user: mapUserToFrontend(user) });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
});

app.put('/api/users/:id/password', authenticate, async (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    const targetId = parseInt(req.params.id);

    if (req.user.id !== targetId) {
        return res.status(403).json({ error: 'Sem permissão para alterar a senha deste perfil.' });
    }

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias.' });
    }

    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
        return res.status(400).json({ error: 'A nova senha não atende aos requisitos de segurança.' });
    }

    try {
        if (isDbConnected) {
            const userCheck = await pool.query('SELECT senha_hash FROM users WHERE id = $1', [targetId]);
            if (userCheck.rowCount === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });

            const valid = await bcrypt.compare(currentPassword, userCheck.rows[0].senha_hash);
            if (!valid) return res.status(401).json({ error: 'Senha atual incorreta.' });

            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(newPassword, salt);

            await pool.query('UPDATE users SET senha_hash = $1 WHERE id = $2', [hash, targetId]);
            return res.json({ message: 'Senha alterada com sucesso.' });
        } else {
            const user = MEMORY_USERS.find(u => u.id === targetId);
            if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

            const valid = await bcrypt.compare(currentPassword, user.senha_hash);
            if (!valid) return res.status(401).json({ error: 'Senha atual incorreta.' });

            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(newPassword, salt);
            user.senha_hash = hash;
            return res.json({ message: 'Senha alterada com sucesso.' });
        }
    } catch (err) {
        console.error('Change Password Error:', err);
        res.status(500).json({ error: 'Erro ao alterar a senha.' });
    }
});

// ✅ CORRIGIDO: Atualiza specialty + CEP + permissão + PORTFOLIO + SERVICES (Híbrido)
app.put('/api/users/:id', authenticate, async (req: any, res) => {
    const { name, location, phone, bio, avatarUrl, specialty, coordinates, cep, portfolio, services } = req.body;
    
    // Convert params.id to number for comparison
    const targetId = parseInt(req.params.id);
    
    if (req.user.id !== targetId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Sem permissão para editar este perfil.' });
    }

    try {
        let lat = coordinates?.lat || null;
        let lng = coordinates?.lng || null;
        let resolvedLocation = location || null;
        
        if (cep) {
            const coords = await getCoordinatesFromCep(cep);
            if (coords) { lat = coords.lat; lng = coords.lng; resolvedLocation = coords.cidade || resolvedLocation; }
        }

        let user;

        if (isDbConnected) {
            const result = await pool.query(
                `UPDATE users SET 
                    nome = COALESCE($1, nome), localizacao = COALESCE($2, localizacao),
                    telefone = COALESCE($3, telefone), bio = COALESCE($4, bio),
                    avatar_url = COALESCE($5, avatar_url), specialty = COALESCE($6, specialty),
                    latitude = COALESCE($7, latitude), longitude = COALESCE($8, longitude)
                 WHERE id = $9 RETURNING *`,
                [name, resolvedLocation, phone, bio, avatarUrl, specialty, lat, lng, targetId]
            );
            user = result.rows[0];

            // Update Portfolio if provided
            if (portfolio && Array.isArray(portfolio)) {
                await pool.query('DELETE FROM portfolio WHERE user_id = $1', [targetId]);
                for (const item of portfolio) {
                    await pool.query('INSERT INTO portfolio (user_id, image_url, descricao) VALUES ($1, $2, $3)', [targetId, item.imageUrl, item.description || '']);
                }
                const portfolioRes = await pool.query('SELECT * FROM portfolio WHERE user_id = $1', [targetId]);
                user.portfolio = portfolioRes.rows.map((p: any) => ({ id: p.id, userId: p.user_id, imageUrl: p.image_url, description: p.descricao }));
            } else {
                 // Fetch existing if not updating
                 const portfolioRes = await pool.query('SELECT * FROM portfolio WHERE user_id = $1', [targetId]);
                 user.portfolio = portfolioRes.rows.map((p: any) => ({ id: p.id, userId: p.user_id, imageUrl: p.image_url, description: p.descricao }));
            }

            // Update Services if provided
            if (services && Array.isArray(services)) {
                await pool.query('DELETE FROM user_services WHERE user_id = $1', [targetId]);
                for (const item of services) {
                    await pool.query('INSERT INTO user_services (user_id, title, description, price, price_unit) VALUES ($1, $2, $3, $4, $5)', [targetId, item.title, item.description, item.price, item.priceUnit]);
                }
                const servicesRes = await pool.query('SELECT * FROM user_services WHERE user_id = $1', [targetId]);
                user.services = servicesRes.rows.map((s: any) => ({ id: s.id.toString(), title: s.title, description: s.description, price: s.price, priceUnit: s.price_unit }));
            } else {
                const servicesRes = await pool.query('SELECT * FROM user_services WHERE user_id = $1', [targetId]);
                user.services = servicesRes.rows.map((s: any) => ({ id: s.id.toString(), title: s.title, description: s.description, price: s.price, priceUnit: s.price_unit }));
            }

        } else {
            const index = MEMORY_USERS.findIndex(u => u.id === targetId);
            if (index === -1) return res.status(404).json({ error: 'Usuário não encontrado' });
            
            const u = MEMORY_USERS[index];
            // Update fields if provided
            if (name) u.nome = name;
            if (resolvedLocation) u.localizacao = resolvedLocation;
            if (phone) u.telefone = phone;
            if (bio) u.bio = bio;
            if (avatarUrl) u.avatar_url = avatarUrl;
            if (specialty) u.specialty = specialty;
            if (lat) u.latitude = lat;
            if (lng) u.longitude = lng;
            if (portfolio) u.portfolio = portfolio; // Update portfolio in memory
            if (services) u.services = services; // Update services in memory
            
            user = u;
        }

        return res.json(mapUserToFrontend(user));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao atualizar perfil' }); }
});



app.get('/api/favorites', authenticate, async (req: any, res) => {
    try {
        const result = await pool.query(`
            SELECT u.*, 
                   (SELECT json_agg(json_build_object('id', p.id, 'imageUrl', p.image_url)) FROM portfolio p WHERE p.user_id = u.id) as portfolio
            FROM users u 
            JOIN user_favorites uf ON u.id = uf.professional_id 
            WHERE uf.user_id = $1`, 
            [req.user.id]
        );
        return res.json(result.rows.map(mapUserToFrontend));
    } catch { res.status(500).json({ error: 'Erro ao buscar favoritos' }); }
});

app.post('/api/favorites', authenticate, async (req: any, res) => {
    const { professionalId } = req.body;
    try {
        const check = await pool.query('SELECT * FROM user_favorites WHERE user_id = $1 AND professional_id = $2', [req.user.id, professionalId]);
        if (check.rowCount && check.rowCount > 0) {
            await pool.query('DELETE FROM user_favorites WHERE user_id = $1 AND professional_id = $2', [req.user.id, professionalId]);
            return res.json({ favorited: false });
        } else {
            await pool.query('INSERT INTO user_favorites (user_id, professional_id) VALUES ($1, $2)', [req.user.id, professionalId]);
            return res.json({ favorited: true });
        }
    } catch { res.status(500).json({ error: 'Erro ao atualizar favorito' }); }
});

// --- DENÚNCIAS E BLOQUEIOS ---

app.post('/api/reports', authenticate, async (req: any, res) => {
    const { reportedId, reason, description } = req.body;
    if (!reportedId || !reason) return res.status(400).json({ error: 'ID do usuário e motivo são obrigatórios.' });
    
    try {
        await pool.query(
            `INSERT INTO reports (reporter_id, reported_id, reason, description) VALUES ($1, $2, $3, $4)`,
            [req.user.id, reportedId, reason, description || '']
        );
        return res.json({ success: true, message: 'Denúncia enviada com sucesso.' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao enviar denúncia.' }); }
});

app.post('/api/users/:id/block', authenticate, async (req: any, res) => {
    const blockedId = parseInt(req.params.id);
    if (req.user.id === blockedId) return res.status(400).json({ error: 'Você não pode bloquear a si mesmo.' });

    try {
        await pool.query(
            `INSERT INTO blocked_users (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [req.user.id, blockedId]
        );
        return res.json({ success: true, message: 'Usuário bloqueado.' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao bloquear usuário.' }); }
});

app.delete('/api/users/:id/block', authenticate, async (req: any, res) => {
    const blockedId = parseInt(req.params.id);
    try {
        await pool.query(
            `DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2`,
            [req.user.id, blockedId]
        );
        return res.json({ success: true, message: 'Usuário desbloqueado.' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao desbloquear usuário.' }); }
});

app.get('/api/users/blocked', authenticate, async (req: any, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.nome, u.avatar_url FROM users u 
             JOIN blocked_users b ON u.id = b.blocked_id 
             WHERE b.blocker_id = $1`,
            [req.user.id]
        );
        return res.json(result.rows);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao buscar usuários bloqueados.' }); }
});

// ✅ Contato com Suporte (Conta Única)
app.post('/api/support/contact', authenticate, async (req: any, res) => {
    try {
        let supportId;
        const supportEmail = 'suporte@linka.com';
        
        if (isDbConnected) {
            // 1. Find or Create Specific Support User
            const supportRes = await pool.query("SELECT id FROM users WHERE email = $1", [supportEmail]);
            
            if ((supportRes.rowCount || 0) > 0) {
                supportId = supportRes.rows[0].id;
            } else {
                const hash = await bcrypt.hash('admin123', 10);
                const newSupport = await pool.query(
                    `INSERT INTO users (nome, email, senha_hash, role, avatar_url, localizacao, latitude, longitude, bio) 
                     VALUES ('Suporte Linka Jobi', $1, $2, 'ADMIN', 'https://ui-avatars.com/api/?name=Suporte+Linka&background=0D8ABC&color=fff', 'Central de Suporte', 0, 0, 'Canal oficial de atendimento.') 
                     RETURNING id`,
                    [supportEmail, hash]
                );
                supportId = newSupport.rows[0].id;
            }

            // 2. Check/Create Proposal (Hidden from normal flow, just for DB consistency)
            const existingProposal = await pool.query(
                `SELECT id FROM propostas WHERE contratante_id = $1 AND target_professional_id = $2 AND titulo = 'Suporte Técnico'`,
                [req.user.id, supportId]
            );

            let proposalId;
            if ((existingProposal.rowCount || 0) > 0) {
                proposalId = existingProposal.rows[0].id;
            } else {
                const newProp = await pool.query(
                    `INSERT INTO propostas (contratante_id, titulo, descricao, area_tag, localizacao, orcamento_estimado, target_professional_id, status, latitude, longitude)
                     VALUES ($1, 'Suporte Técnico', 'Atendimento ao Usuário', 'Suporte', 'Online', '0', $2, 'IN_PROGRESS', 0, 0)
                     RETURNING id`,
                    [req.user.id, supportId]
                );
                proposalId = newProp.rows[0].id;
            }

            // 3. Check/Create Chat Session
            const chatRes = await pool.query(
                `SELECT id FROM chat_sessions WHERE proposta_id = $1 AND professional_id = $2`,
                [proposalId, supportId]
            );

            let chatId;
            if ((chatRes.rowCount || 0) > 0) {
                chatId = chatRes.rows[0].id;
            } else {
                const newChat = await pool.query(
                    `INSERT INTO chat_sessions (proposta_id, professional_id) VALUES ($1, $2) RETURNING id`,
                    [proposalId, supportId]
                );
                chatId = newChat.rows[0].id;

                // Send Welcome Message from Support
                await pool.query(
                    `INSERT INTO chat_messages (session_id, sender_id, texto, msg_type) VALUES ($1, $2, 'Olá! Bem-vindo ao suporte do Linka Jobi. Como podemos ajudar você hoje?', 'text')`,
                    [chatId, supportId]
                );
            }
            
            return res.json({ chatId });

        } else {
            // Memory Fallback
            // ... (existing memory fallback logic is fine for dev, but let's ensure ID 999 is used)
            return res.json({ chatId: 1001 });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao contatar suporte.' });
    }
});

// ✅ Admin: Listar denúncias
app.get('/api/admin/reports', authenticate, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    
    if (isDbConnected) {
        try {
            const result = await pool.query(`
                SELECT r.*, u1.nome as reporter_name, u2.nome as reported_name 
                FROM reports r 
                JOIN users u1 ON r.reporter_id = u1.id 
                JOIN users u2 ON r.reported_id = u2.id 
                ORDER BY r.created_at DESC
            `);
            return res.json(result.rows);
        } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao buscar denúncias.' }); }
    } else {
        return res.json([]);
    }
});

app.get('/api/professionals/top', async (_req, res) => {
    if (!isDbConnected) return res.json([]);
    
    try {
        const result = await pool.query(`SELECT * FROM users WHERE role = 'PROFESSIONAL' AND status = 'ACTIVE' ORDER BY rating DESC, reviews_count DESC LIMIT 10`);
        if (result.rowCount === 0) return res.json([]);
        return res.json(result.rows.map(mapUserToFrontend));
    } catch { return res.json([]); }
});

// ✅ Busca por especialidade e raio geográfico
app.get('/api/professionals/search', async (req: any, res) => {
    const { specialty, lat, lng, radius = 50 } = req.query;
    try {
        let query = `SELECT * FROM users WHERE role = 'PROFESSIONAL' AND status = 'ACTIVE'`;
        const params: any[] = [];
        
        // If user is logged in (we can check header manually since middleware isn't here)
        const authHeader = req.headers.authorization;
        if (authHeader && isDbConnected) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded: any = jwt.verify(token, JWT_SECRET);
                const userId = decoded.id;
                
                query += ` AND id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = $${params.length + 1})`;
                query += ` AND id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = $${params.length + 1})`;
                params.push(userId);
            } catch (e) { /* ignore invalid token */ }
        }

        if (specialty) { params.push(`%${specialty}%`); query += ` AND specialty ILIKE $${params.length}`; }
        if (lat && lng) {
            params.push(parseFloat(lat as string), parseFloat(lng as string), parseFloat(radius as string));
            query += ` AND (6371 * acos(cos(radians($${params.length-2})) * cos(radians(latitude)) * cos(radians(longitude) - radians($${params.length-1})) + sin(radians($${params.length-2})) * sin(radians(latitude)))) <= $${params.length}`;
        }
        query += ` ORDER BY rating DESC LIMIT 20`;
        const result = await pool.query(query, params);
        return res.json(result.rows.map(mapUserToFrontend));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Erro na busca' }); }
});

app.get('/api/users/:id/public_profile', async (req, res) => {
    const { id } = req.params;
    try {
        const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (userRes.rowCount === 0) return res.status(404).json({ error: "User not found" });
        const portfolioRes = await pool.query('SELECT * FROM portfolio WHERE user_id = $1', [id]);
        const reviewsRes = await pool.query(`SELECT r.*, u.nome as reviewer_name FROM avaliacoes r JOIN users u ON r.avaliador_id = u.id WHERE r.alvo_id = $1 ORDER BY r.criado_em DESC`, [id]);
        const servicesRes = await pool.query('SELECT * FROM user_services WHERE user_id = $1', [id]);

        return res.json({
            user: mapUserToFrontend(userRes.rows[0]),
            portfolio: portfolioRes.rows.map((p: any) => ({ id: p.id, userId: p.user_id, imageUrl: p.image_url, description: p.descricao })),
            reviews: reviewsRes.rows.map((r: any) => ({ id: r.id, proposalId: r.proposta_id, reviewerId: r.avaliador_id, targetId: r.alvo_id, rating: r.nota, comment: r.comentario, createdAt: r.criado_em, reviewerName: r.reviewer_name })),
            services: servicesRes.rows.map((s: any) => ({ id: s.id.toString(), title: s.title, description: s.description, price: s.price, priceUnit: s.price_unit }))
        });
    } catch { res.status(500).json({ error: "Erro ao buscar perfil" }); }
});

app.get('/api/proposals', authenticate, async (req: any, res) => {
    const { page = 1, limit = 10, contractorId, area, lat, lng, radius } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    if (!isDbConnected) {
        return res.json([]);
    }

    // Base query
    let query = `
        SELECT p.*, u.nome as contractor_name, u.avatar_url as contractor_avatar, 
               u.email as contractor_email, u.telefone as contractor_phone, 
               u.rating as contractor_rating, u.reviews_count as contractor_reviews_count 
        FROM propostas p 
        JOIN users u ON p.contratante_id = u.id 
        WHERE 1=1
    `;
    
    const params: any[] = [];
    
    // Filter blocked users (both ways)
    if (isDbConnected) {
        query += ` AND u.id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = $${params.length + 1})`;
        query += ` AND u.id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = $${params.length + 1})`;
        params.push(req.user.id);
    }

    if (contractorId) { 
        params.push(contractorId); 
        query += ` AND p.contratante_id = $${params.length}`; 
    } else { 
        query += ` AND p.status = 'OPEN'`; 
    }
    
    if (area) { 
        params.push(`%${area}%`); 
        query += ` AND p.area_tag ILIKE $${params.length}`; 
    }

    if (lat && lng && radius) {
        params.push(parseFloat(String(lat)), parseFloat(String(lng)), parseFloat(String(radius)));
        // $1=lat, $2=lng, $3=radius (relative to push)
        // params.length is now N.
        // lat is at N-2 (index N-3). Placeholder $N-2.
        const pLat = params.length - 2;
        const pLng = params.length - 1;
        const pRad = params.length;
        query += ` AND (6371 * acos(cos(radians($${pLat})) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($${pLng})) + sin(radians($${pLat})) * sin(radians(p.latitude)))) <= $${pRad}`;
    }
    
    query += ` ORDER BY p.data_criacao DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    try {
        const result = await pool.query(query, params);
        return res.json(result.rows.map(mapProposalToFrontend));
    } catch (err) { console.error(err); return res.status(500).json({ error: 'Erro ao buscar propostas' }); }
});

app.get('/api/proposals/:id', authenticate, async (req, res) => {
    if (!isDbConnected) {
        const p = MEMORY_PROPOSALS.find(p => p.id === Number(req.params.id));
        if (!p) return res.status(404).json({ error: 'Not found' });
        return res.json(mapProposalToFrontend(p));
    }
    const result = await pool.query(`SELECT p.*, u.nome as contractor_name, u.avatar_url as contractor_avatar, u.rating as contractor_rating, u.reviews_count as contractor_reviews_count FROM propostas p JOIN users u ON p.contratante_id = u.id WHERE p.id = $1`, [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(mapProposalToFrontend(result.rows[0]));
});

app.post('/api/proposals', authenticate, async (req: any, res) => {
    const { title, description, areaTag, location, budgetRange, targetProfessionalId, coordinates } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Título e descrição são obrigatórios.' });
    
    if (!isDbConnected) {
        const newProposal = {
            id: memoryIdCounter++,
            contratante_id: req.user.id,
            titulo: title,
            descricao: description,
            area_tag: areaTag,
            localizacao: location,
            orcamento_estimado: budgetRange,
            target_professional_id: targetProfessionalId,
            latitude: coordinates?.lat,
            longitude: coordinates?.lng,
            status: 'OPEN',
            data_criacao: new Date().toISOString(),
            accepted_count: 0,
            contractor_name: req.user.nome,
            contractor_avatar: req.user.avatar_url,
            contractor_rating: req.user.rating,
            contractor_reviews_count: req.user.reviews_count
        };
        MEMORY_PROPOSALS.push(newProposal);
        return res.json(mapProposalToFrontend(newProposal));
    }

    try {
        const result = await pool.query(
            `INSERT INTO propostas (contratante_id, titulo, descricao, area_tag, localizacao, orcamento_estimado, target_professional_id, latitude, longitude, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'OPEN') RETURNING *`,
            [req.user.id, title, description, areaTag, location, budgetRange, targetProfessionalId, coordinates?.lat, coordinates?.lng]
        );
        
        const newProposal = result.rows[0];
        
        // Notify Contractor (Confirmation)
        const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Proposta Criada! 🚀</h2>
                <p>Sua proposta "<strong>${title}</strong>" foi publicada com sucesso.</p>
                <p>Em breve, profissionais qualificados entrarão em contato.</p>
            </div>
        `;
        sendEmail(req.user.email, 'Proposta Publicada - Linka Jobi', emailHtml).catch(console.error);

        const io = req.app.get('io');
        if (io) {
            // Notify specific professional if targeted
            if (targetProfessionalId) {
                createNotification(targetProfessionalId, 'NEW_PROPOSAL', 'Nova Proposta Direta', `Você recebeu uma proposta direta: ${title}`, { proposalId: newProposal.id });
            } else {
                // Notify professionals with matching specialty
                // Simple matching: check if specialty contains the areaTag
                const pros = await pool.query(`SELECT id FROM users WHERE role = 'PROFESSIONAL' AND specialty ILIKE $1`, [`%${areaTag}%`]);
                pros.rows.forEach((pro: any) => {
                    if (pro.id !== req.user.id) { // Don't notify self if testing
                        createNotification(pro.id, 'NEW_PROPOSAL', 'Nova Oportunidade', `Nova proposta na sua área: ${title}`, { proposalId: newProposal.id });
                    }
                });
            }
        }

        return res.json(mapProposalToFrontend(newProposal));
    } catch (err: any) { console.error(err); res.status(500).json({ error: 'Erro ao criar proposta', details: err.message }); }
});

app.post('/api/proposals/:id/hire', authenticate, async (req: any, res) => {
    const { id } = req.params;
    const { professionalId } = req.body;

    if (!professionalId) return res.status(400).json({ error: 'Professional ID required' });

    if (!isDbConnected) {
        const p = MEMORY_PROPOSALS.find(p => p.id === Number(id));
        if (!p) return res.status(404).json({ error: 'Proposta não encontrada' });
        if (p.contratante_id !== req.user.id) return res.status(403).json({ error: 'Apenas o contratante pode contratar.' });
        if (p.status !== 'OPEN' && p.status !== 'NEGOTIATING') return res.status(400).json({ error: 'Proposta não está mais disponível.' });

        p.status = 'IN_PROGRESS';
        p.profissional_id = professionalId;
        return res.json({ success: true, message: 'Profissional contratado com sucesso!' });
    }

    try {
        // 1. Verify if proposal is still available
        const propCheck = await pool.query('SELECT status, contratante_id FROM propostas WHERE id = $1', [id]);
        if (propCheck.rowCount === 0) return res.status(404).json({ error: 'Proposta não encontrada' });
        
        const proposal = propCheck.rows[0];
        if (proposal.contratante_id !== req.user.id) return res.status(403).json({ error: 'Apenas o contratante pode contratar.' });
        if (proposal.status !== 'OPEN' && proposal.status !== 'NEGOTIATING') return res.status(400).json({ error: 'Proposta não está mais disponível.' });

        // 2. Update Proposal to IN_PROGRESS and set professional_id
        await pool.query(`UPDATE propostas SET status = 'IN_PROGRESS', profissional_id = $1 WHERE id = $2`, [professionalId, id]);

        // 3. Notify everyone
        const io = req.app.get('io');
        if (io) {
            // Notify the hired professional
            createNotification(professionalId, 'SUCCESS', 'Você foi contratado!', 'O cliente aceitou sua proposta. O trabalho pode começar.', { proposalId: id });

            // Notify other professionals involved in chats for this proposal
            const otherChats = await pool.query('SELECT professional_id FROM chat_sessions WHERE proposta_id = $1 AND professional_id != $2', [id, professionalId]);
            otherChats.rows.forEach((row: any) => {
                createNotification(row.professional_id, 'SYSTEM', 'Proposta Encerrada', 'O cliente contratou outro profissional para este serviço.', { proposalId: id });
            });

            // Emit update to all chat rooms for this proposal to update UI
            const allChats = await pool.query('SELECT id FROM chat_sessions WHERE proposta_id = $1', [id]);
            allChats.rows.forEach((row: any) => {
                io.to(`chat_${row.id}`).emit('proposal_update', { status: 'IN_PROGRESS', hiredProfessionalId: professionalId });
            });
        }

        return res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao contratar profissional' }); }
});

app.post('/api/proposals/:id/cancel', authenticate, async (req: any, res) => {
    const { id } = req.params;
    
    if (!isDbConnected) {
        const index = MEMORY_PROPOSALS.findIndex(p => p.id === Number(id));
        if (index === -1) return res.status(404).json({ error: 'Proposta não encontrada' });
        if (MEMORY_PROPOSALS[index].contractorId !== req.user.id) return res.status(403).json({ error: 'Apenas o contratante pode cancelar' });
        MEMORY_PROPOSALS.splice(index, 1);
        return res.json({ success: true });
    }

    try {
        const result = await pool.query('SELECT contratante_id FROM propostas WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Proposta não encontrada' });
        if (result.rows[0].contratante_id !== req.user.id) return res.status(403).json({ error: 'Apenas o contratante pode cancelar' });

        // Delete related chat messages
        await pool.query('DELETE FROM chat_messages WHERE session_id IN (SELECT id FROM chat_sessions WHERE proposta_id = $1)', [id]);
        // Delete related chat sessions
        await pool.query('DELETE FROM chat_sessions WHERE proposta_id = $1', [id]);
        // Delete related transactions
        await pool.query('DELETE FROM transactions WHERE related_proposal_id = $1', [id]);
        // Delete related reviews
        await pool.query('DELETE FROM avaliacoes WHERE proposta_id = $1', [id]);
        
        // Finally, delete the proposal
        await pool.query('DELETE FROM propostas WHERE id = $1', [id]);
        
        // Notify participants if needed
        const io = req.app.get('io');
        if (io) {
            io.emit('proposal_updated', { id: Number(id), status: 'DELETED' });
        }
        
        return res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao cancelar proposta' });
    }
});

app.post('/api/proposals/:id/accept', authenticate, async (req: any, res) => {
    const { id } = req.params;
    
    if (!isDbConnected) {
        const p = MEMORY_PROPOSALS.find(p => p.id === Number(id));
        if (!p) return res.status(404).json({ error: 'Proposta não encontrada' });
        
        p.accepted_count = (p.accepted_count || 0) + 1;
        return res.json({ success: true, chatId: 999 });
    }

    try {
        // Check if chat already exists for this pro
        const existing = await pool.query('SELECT id FROM chat_sessions WHERE proposta_id = $1 AND professional_id = $2', [id, req.user.id]);
        let chatId;
        if ((existing.rowCount || 0) > 0) { 
            chatId = existing.rows[0].id; 
        } else {
            // Create chat session linked to this professional
            const chatRes = await pool.query(`INSERT INTO chat_sessions (proposta_id, professional_id) VALUES ($1, $2) RETURNING id`, [id, req.user.id]);
            chatId = chatRes.rows[0].id;
            await pool.query(`INSERT INTO chat_messages (session_id, sender_id, texto, is_system) VALUES ($1, NULL, 'Tenho interesse neste serviço. Podemos conversar?', true)`, [chatId]);
            
            // Increment accepted count but DO NOT change status to NEGOTIATING yet
            await pool.query('UPDATE propostas SET accepted_count = accepted_count + 1 WHERE id = $1', [id]);
        }
        return res.json({ success: true, chatId });
    } catch { res.status(500).json({ error: 'Erro ao aceitar proposta' }); }
});


app.post('/api/proposals/:id/complete', authenticate, async (req: any, res) => {
    const { id } = req.params;
    const { professionalId } = req.body;

    if (!isDbConnected) {
        return res.json({ success: true });
    }

    try {
        const propCheck = await pool.query('SELECT status, contratante_id, profissional_id, orcamento_estimado, titulo FROM propostas WHERE id = $1', [id]);
        if (propCheck.rowCount === 0) return res.status(404).json({ error: 'Proposta não encontrada' });
        
        const proposal = propCheck.rows[0];
        if (proposal.contratante_id !== req.user.id) return res.status(403).json({ error: 'Apenas o contratante pode finalizar.' });
        
        // Allow completing if IN_PROGRESS
        if (proposal.status !== 'IN_PROGRESS') return res.status(400).json({ error: 'Proposta não está em andamento.' });

        const targetProId = professionalId || proposal.profissional_id;
        if (!targetProId) return res.status(400).json({ error: 'Profissional não identificado.' });

        // Finalize
        await pool.query(`UPDATE propostas SET status = 'COMPLETED', data_conclusao = NOW() WHERE id = $1`, [id]);
        
        // Award XP
        await pool.query('UPDATE users SET xp = xp + 500 WHERE id = $1', [targetProId]);
        
        // Create Transaction
        const valor = parseFloat((proposal.orcamento_estimado || '0').replace(/[^0-9.]/g, '')) || 100.00;
        await pool.query(`INSERT INTO transactions (user_id, amount, type, description, status) VALUES ($1, $2, 'INCOME', $3, 'COMPLETED')`, [targetProId, valor, `Pagamento por: ${proposal.titulo}`]);

        // Notify
        const io = req.app.get('io');
        if (io) {
            createNotification(targetProId, 'SUCCESS', 'Trabalho Concluído!', `O cliente finalizou o trabalho "${proposal.titulo}". Pagamento liberado.`, { proposalId: id });
            
            // Update chat status
            const chatRes = await pool.query('SELECT id FROM chat_sessions WHERE proposta_id = $1 AND professional_id = $2', [id, targetProId]);
            if ((chatRes.rowCount || 0) > 0) {
                const chatId = chatRes.rows[0].id;
                io.to(`chat_${chatId}`).emit('proposal_update', { status: 'COMPLETED', proposalId: id });
                
                // System message
                const sysMsg = 'Trabalho concluído pelo cliente.';
                const msgRes = await pool.query(`INSERT INTO chat_messages (session_id, sender_id, texto, is_system) VALUES ($1, NULL, $2, true) RETURNING id, timestamp`, [chatId, sysMsg]);
                const newMsg = msgRes.rows[0];
                
                io.to(`chat_${chatId}`).emit('new_message', { 
                    id: newMsg.id, 
                    senderId: 0, 
                    text: sysMsg, 
                    timestamp: new Date(newMsg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), 
                    isSystem: true, 
                    type: 'text' 
                });
            }
        }

        return res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao finalizar trabalho' }); }
});
            


app.post('/api/reviews', authenticate, async (req: any, res) => {
    const { proposalId, targetId, rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Nota deve ser entre 1 e 5.' });
    try {
        await pool.query(`INSERT INTO avaliacoes (proposta_id, avaliador_id, alvo_id, nota, comentario) VALUES ($1, $2, $3, $4, $5)`, [proposalId, req.user.id, targetId, rating, comment]);
        await pool.query(`UPDATE users SET reviews_count = (SELECT COUNT(*) FROM avaliacoes WHERE alvo_id = $1), rating = (SELECT AVG(nota) FROM avaliacoes WHERE alvo_id = $1) WHERE id = $1`, [targetId]);
        return res.json({ success: true });
    } catch { res.status(500).json({ error: 'Erro ao enviar avaliação' }); }
});

app.get('/api/chats', authenticate, async (req: any, res) => {
    try {
        if (!isDbConnected) {
             return res.json([]);
        }

        // Filter out chats where the other participant is blocked or has blocked me
        let query = `
            SELECT cs.id as chat_id, p.id as proposal_id, p.titulo, p.descricao, p.orcamento_estimado, p.status as proposal_status, p.profissional_id as hired_professional_id,
                   p.contratante_id, cs.professional_id, cs.negotiation, u1.nome as c_name, u1.avatar_url as c_avatar, u1.email as c_email,
                   u2.nome as p_name, u2.avatar_url as p_avatar, u2.email as p_email,
                   (SELECT texto FROM chat_messages WHERE session_id = cs.id ORDER BY timestamp DESC LIMIT 1) as last_msg
            FROM chat_sessions cs JOIN propostas p ON cs.proposta_id = p.id
            JOIN users u1 ON p.contratante_id = u1.id 
            LEFT JOIN users u2 ON cs.professional_id = u2.id
            WHERE (p.contratante_id = $1 OR cs.professional_id = $1)
        `;
        
        const params: any[] = [req.user.id];

        // Exclude if Contractor is blocked (when I am Pro) OR Pro is blocked (when I am Contractor)
        // Logic: If I am Contractor ($1), check if Pro (u2.id) is blocked.
        // If I am Pro ($1), check if Contractor (u1.id) is blocked.
        // Simplified: Exclude if ANY participant is in my block list or I am in theirs, EXCEPT myself.
        
        // Actually, simpler to just filter out if the OTHER person is blocked.
        // But SQL is easier if we just say:
        // AND u1.id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = $1) ...
        // AND u2.id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = $1) ...
        // Note: One of them is ME, so I need to be careful not to filter myself if I blocked someone else.
        // But blocked_users(blocker_id=$1) returns people I blocked. I am not in that list (cannot block self).
        
        query += ` AND u1.id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = $1)`;
        query += ` AND u1.id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = $1)`;
        
        // u2 can be null? (LEFT JOIN). If null, no block check needed.
        query += ` AND (u2.id IS NULL OR (u2.id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = $1) AND u2.id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = $1)))`;

        query += ` ORDER BY cs.criado_em DESC`;

        const result = await pool.query(query, params);
        const chats = await Promise.all(result.rows.map(async (row: any) => {
            const msgsRes = await pool.query(`SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY timestamp ASC`, [row.chat_id]);
            const isSupport = row.p_email === 'suporte@linka.com' || row.c_email === 'suporte@linka.com';
            return {
                id: row.chat_id, proposalId: row.proposal_id, proposalTitle: row.titulo,
                proposalDescription: row.descricao, proposalBudget: row.orcamento_estimado,
                contractorId: row.contratante_id, professionalId: row.professional_id, proposalStatus: row.proposal_status,
                hiredProfessionalId: row.hired_professional_id,
                negotiation: row.negotiation,
                participants: [{ id: row.contratante_id, name: row.c_name, avatar: row.c_avatar }, { id: row.professional_id, name: row.p_name || 'Profissional', avatar: row.p_avatar }],
                messages: msgsRes.rows.map((m: any) => ({ id: m.id, senderId: m.sender_id || 0, text: m.texto, timestamp: new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), isSystem: m.is_system, type: m.msg_type, ...m.metadata })),
                lastMessage: row.last_msg || 'Início', unreadCount: 0,
                isSupport: isSupport
            };
        }));
        return res.json(chats);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao buscar chats' }); }
});

app.post('/api/chats/:id/negotiate', authenticate, async (req: any, res) => {
    const { id } = req.params;
    const { price } = req.body;
    try {
        const negotiation = { proposedPrice: price, proposedBy: req.user.id, status: 'pending' };
        await pool.query('UPDATE chat_sessions SET negotiation = $1 WHERE id = $2', [JSON.stringify(negotiation), id]);
        
        // Notify other user via socket
        const io = req.app.get('io');
        if (io) {
            io.to(`chat_${id}`).emit('proposal_update', { chatId: id });
            
            // Add system message
            const sysMsg = `${req.user.nome} propôs um novo valor: R$ ${price}`;
            const msgRes = await pool.query(`INSERT INTO chat_messages (session_id, sender_id, texto, is_system) VALUES ($1, NULL, $2, true) RETURNING id, timestamp`, [id, sysMsg]);
            const newMsg = msgRes.rows[0];
            io.to(`chat_${id}`).emit('new_message', { 
                id: newMsg.id, senderId: 0, text: sysMsg, 
                timestamp: new Date(newMsg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), 
                isSystem: true, type: 'text' 
            });
        }
        return res.json({ success: true, negotiation });
    } catch (err) { res.status(500).json({ error: 'Erro ao propor valor' }); }
});

app.post('/api/chats/:id/negotiate/accept', authenticate, async (req: any, res) => {
    const { id } = req.params;
    try {
        const chatRes = await pool.query('SELECT negotiation, proposta_id FROM chat_sessions WHERE id = $1', [id]);
        if (chatRes.rowCount === 0) return res.status(404).json({ error: 'Chat não encontrado' });
        
        const neg = chatRes.rows[0].negotiation;
        if (!neg || neg.status !== 'pending' || String(neg.proposedBy) === String(req.user.id)) {
            return res.status(400).json({ error: 'Não é possível aceitar esta proposta' });
        }
        
        neg.status = 'accepted';
        await pool.query('UPDATE chat_sessions SET negotiation = $1 WHERE id = $2', [JSON.stringify(neg), id]);
        
        // Update proposal budget to agreed price
        await pool.query('UPDATE propostas SET orcamento_estimado = $1 WHERE id = $2', [neg.proposedPrice.toString(), chatRes.rows[0].proposta_id]);
        
        const io = req.app.get('io');
        if (io) {
            io.to(`chat_${id}`).emit('proposal_update', { chatId: id });
            
            const sysMsg = `${req.user.nome} aceitou o valor de R$ ${neg.proposedPrice}. Valor fechado!`;
            const msgRes = await pool.query(`INSERT INTO chat_messages (session_id, sender_id, texto, is_system) VALUES ($1, NULL, $2, true) RETURNING id, timestamp`, [id, sysMsg]);
            const newMsg = msgRes.rows[0];
            io.to(`chat_${id}`).emit('new_message', { 
                id: newMsg.id, senderId: 0, text: sysMsg, 
                timestamp: new Date(newMsg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), 
                isSystem: true, type: 'text' 
            });
        }
        return res.json({ success: true, negotiation: neg });
    } catch (err) { res.status(500).json({ error: 'Erro ao aceitar valor' }); }
});

app.post('/api/chats/:id/negotiate/reject', authenticate, async (req: any, res) => {
    const { id } = req.params;
    try {
        const chatRes = await pool.query('SELECT negotiation FROM chat_sessions WHERE id = $1', [id]);
        if (chatRes.rowCount === 0) return res.status(404).json({ error: 'Chat não encontrado' });
        
        const neg = chatRes.rows[0].negotiation;
        if (!neg || neg.status !== 'pending') {
            return res.status(400).json({ error: 'Não há proposta pendente' });
        }
        
        neg.status = 'rejected';
        await pool.query('UPDATE chat_sessions SET negotiation = $1 WHERE id = $2', [JSON.stringify(neg), id]);
        
        const io = req.app.get('io');
        if (io) {
            io.to(`chat_${id}`).emit('proposal_update', { chatId: id });
            
            const sysMsg = `${req.user.nome} recusou o valor proposto.`;
            const msgRes = await pool.query(`INSERT INTO chat_messages (session_id, sender_id, texto, is_system) VALUES ($1, NULL, $2, true) RETURNING id, timestamp`, [id, sysMsg]);
            const newMsg = msgRes.rows[0];
            io.to(`chat_${id}`).emit('new_message', { 
                id: newMsg.id, senderId: 0, text: sysMsg, 
                timestamp: new Date(newMsg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), 
                isSystem: true, type: 'text' 
            });
        }
        return res.json({ success: true, negotiation: neg });
    } catch (err) { res.status(500).json({ error: 'Erro ao recusar valor' }); }
});

app.post('/api/messages', authenticate, async (req: any, res) => {
    const { chatId, text, type = 'text', mediaUrl, scheduleData } = req.body;
    try {
        const metadata: any = {};
        if (mediaUrl) metadata.mediaUrl = mediaUrl;
        if (scheduleData) metadata.scheduleData = scheduleData;
        const resMsg = await pool.query(`INSERT INTO chat_messages (session_id, sender_id, texto, msg_type, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING *`, [chatId, req.user.id, text, type, JSON.stringify(metadata)]);
        const newMsg = resMsg.rows[0];
        const io = req.app.get('io');
        if (io) {
            io.to(`chat_${chatId}`).emit('new_message', { id: newMsg.id, senderId: newMsg.sender_id || 0, text: newMsg.texto, timestamp: new Date(newMsg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), isSystem: newMsg.is_system, type: newMsg.msg_type, ...newMsg.metadata });
            // Correctly fetch professional_id from chat_sessions, not propostas
            const cp = await pool.query(`SELECT p.contratante_id, cs.professional_id FROM chat_sessions cs JOIN propostas p ON cs.proposta_id = p.id WHERE cs.id = $1`, [chatId]);
            if ((cp.rowCount || 0) > 0) {
                const { contratante_id, professional_id } = cp.rows[0];
                const receiverId = req.user.id === contratante_id ? professional_id : contratante_id;
                if (receiverId) {
                    createNotification(receiverId, 'MESSAGE', 'Nova Mensagem', `Nova mensagem de ${req.user.nome || 'Usuário'}`, { chatId });
                }
            }
        }
        return res.json({ success: true });
    } catch { res.status(500).json({ error: 'Erro ao enviar mensagem' }); }
});

app.put('/api/messages/:id/status', authenticate, async (req, res) => {
    try {
        const result = await pool.query(`SELECT metadata FROM chat_messages WHERE id = $1`, [req.params.id]);
        const meta = result.rows[0].metadata || {};
        if (meta.scheduleData) meta.scheduleData.status = req.body.status;
        await pool.query(`UPDATE chat_messages SET metadata = $1 WHERE id = $2`, [JSON.stringify(meta), req.params.id]);
        return res.json({ success: true });
    } catch { res.status(500).json({ error: 'Erro ao atualizar status' }); }
});

app.get('/api/appointments', authenticate, async (req: any, res) => {
    try {
        const result = await pool.query(`
            SELECT p.id as proposal_id, p.titulo, p.status, p.localizacao, p.data_criacao, cs.id as chat_id, u.nome as other_name, u.avatar_url as other_avatar
            FROM propostas p LEFT JOIN chat_sessions cs ON cs.proposta_id = p.id
            LEFT JOIN users u ON (CASE WHEN p.contratante_id = $1 THEN p.profissional_id ELSE p.contratante_id END) = u.id
            WHERE (p.contratante_id = $1 OR p.profissional_id = $1) AND p.status != 'OPEN'`, [req.user.id]);
        return res.json(result.rows.map((row: any) => ({ id: `job_${row.proposal_id}`, chatId: row.chat_id, title: row.titulo, withUser: row.other_name || 'Usuário Linka', avatarUrl: row.other_avatar, date: new Date(row.data_criacao).toISOString().split('T')[0], time: new Date(row.data_criacao).toLocaleTimeString().slice(0,5), timestamp: row.data_criacao, status: row.status === 'COMPLETED' ? 'CONFIRMED' : 'PENDING', location: row.localizacao, isProposal: false })));
    } catch (err) { console.error(err); return res.json([]); }
});

// --- CONSTANTES DE GAMIFICAÇÃO ---
const DEFAULT_BADGES = [
    { id: '1', name: 'Primeiros Passos', description: 'Completou o cadastro', icon: '🚀' },
    { id: '2', name: 'Primeiro Serviço', description: 'Realizou o primeiro serviço', icon: '✅' },
    { id: '3', name: 'Bem Avaliado', description: 'Recebeu 5 estrelas', icon: '⭐' },
    { id: '4', name: 'Flash', description: 'Respondeu em menos de 1h', icon: '⚡' },
    { id: '5', name: 'Verificado', description: 'Documentação aprovada', icon: '🛡️' },
    { id: '6', name: 'Mestre', description: 'Atingiu nível Ouro', icon: '👑' }
];

// Helper para calcular nível com base em XP e Avaliação
function calculateLevel(xp: number, rating: number = 5.0) {
    let level = 'Bronze';
    let nextLevel = 'Prata';
    let nextLevelXp = 1000;
    let capReason = null;

    // Base Level by XP
    if (xp >= 1000 && xp < 2500) { level = 'Prata'; nextLevel = 'Ouro'; nextLevelXp = 2500; }
    else if (xp >= 2500 && xp < 5000) { level = 'Ouro'; nextLevel = 'Diamante'; nextLevelXp = 5000; }
    else if (xp >= 5000 && xp < 10000) { level = 'Diamante'; nextLevel = 'Lenda'; nextLevelXp = 10000; }
    else if (xp >= 10000) { level = 'Lenda'; nextLevel = 'Max'; nextLevelXp = 10000; }

    // Rating Constraints (Interferência da Avaliação)
    // Se a avaliação for baixa, o nível é limitado
    if (rating < 3.0 && (level === 'Prata' || level === 'Ouro' || level === 'Diamante' || level === 'Lenda')) {
        level = 'Bronze';
        capReason = 'Sua avaliação está abaixo de 3.0. Melhore sua nota para subir de nível.';
    } else if (rating < 4.0 && (level === 'Ouro' || level === 'Diamante' || level === 'Lenda')) {
        level = 'Prata';
        capReason = 'Sua avaliação está abaixo de 4.0. Melhore sua nota para alcançar Ouro ou superior.';
    } else if (rating < 4.5 && (level === 'Diamante' || level === 'Lenda')) {
        level = 'Ouro';
        capReason = 'Sua avaliação está abaixo de 4.5. Melhore sua nota para alcançar Diamante.';
    } else if (rating < 4.8 && level === 'Lenda') {
        level = 'Diamante';
        capReason = 'Sua avaliação está abaixo de 4.8. Melhore sua nota para alcançar o nível Lenda.';
    }
    
    const progress = Math.min(100, Math.floor((xp / nextLevelXp) * 100));
    return { level, nextLevel, nextLevelXp, progress, capReason };
}

app.get('/api/gamification', authenticate, async (req: any, res) => {
    try {
        let xp = 0;
        let rating = 5.0;
        let unlockedBadges: string[] = [];

        if (!isDbConnected) {
            return res.json({
                level: 1,
                nextLevel: 2,
                progress: 0,
                xp: 0,
                nextLevelXp: 100,
                badges: [],
                benefits: [],
                capReason: null
            });
        }

        const result = await pool.query('SELECT xp, rating FROM users WHERE id = $1', [req.user.id]);
        xp = result.rows[0]?.xp || 0;
        rating = parseFloat(result.rows[0]?.rating || 5.0);
        const badgesRes = await pool.query(`SELECT badge_id FROM user_badges WHERE user_id = $1`, [req.user.id]);
        unlockedBadges = badgesRes.rows.map((r: any) => r.badge_id);

        const { level, nextLevel, nextLevelXp, progress, capReason } = calculateLevel(xp, rating);
        
        // Merge default badges with unlocked status
        let badgesList = [];
        const allBadges = await pool.query('SELECT * FROM badges');
        badgesList = allBadges.rows.map((b: any) => ({
            id: b.id, name: b.name, description: b.description, icon: b.icon,
            unlocked: unlockedBadges.includes(b.id)
        }));

        return res.json({ 
            currentLevel: level, 
            nextLevel, 
            progress, 
            xp, 
            nextLevelXp, 
            badges: badgesList, 
            benefits: ['Suporte Prioritário', 'Taxas Reduzidas', 'Destaque nas Buscas'],
            capReason // Send warning to frontend if level is capped
        });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: 'Erro na gamificação' }); 
    }
});

app.get('/api/notifications', authenticate, async (req: any, res) => {
    if (!isDbConnected) {
        return res.json([
            { id: '1', userId: req.user.id, type: 'SYSTEM', title: 'Bem-vindo', message: 'Bem-vindo ao Linka Jobi (Modo Offline)!', read: false, createdAt: new Date().toISOString() }
        ]);
    }
    try {
        const result = await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        return res.json(result.rows.map((n: any) => ({ id: n.id.toString(), userId: n.user_id, type: n.type, title: n.title, message: n.message, read: n.is_read, createdAt: n.created_at })));
    } catch { return res.json([]); }
});

app.put('/api/notifications/:id/read', authenticate, async (req: any, res) => {
    if (!isDbConnected) return res.json({ success: true });
    try {
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        return res.json({ success: true });
    } catch { return res.status(500).json({ error: 'Erro' }); }
});

app.get('/api/wallet', authenticate, async (req: any, res) => {
    if (!isDbConnected) {
        return res.json({ balance: 0, transactions: [] });
    }
    try {
        const transRes = await pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        const balance = transRes.rows.reduce((acc: number, t: any) => (t.type === 'INCOME' || t.type === 'DEPOSIT') ? acc + parseFloat(t.amount) : acc - parseFloat(t.amount), 0);
        return res.json({ balance, transactions: transRes.rows.map((t: any) => ({ id: t.id.toString(), type: t.type, amount: parseFloat(t.amount), description: t.description, date: t.created_at, status: t.status, relatedProposalId: t.related_proposal_id })) });
    } catch { res.status(500).json({ error: 'Erro na carteira' }); }
});

app.get('/api/admin/stats', authenticate, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    
    if (isDbConnected) {
        try {
            const usersCount = (await pool.query('SELECT COUNT(*) FROM users')).rows[0].count;
            const jobsCount = (await pool.query("SELECT COUNT(*) FROM propostas WHERE status = 'OPEN'")).rows[0].count;
            return res.json({ totalUsers: parseInt(usersCount), activeJobs: parseInt(jobsCount), revenue: 0, onlineUsers: 0 });
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: 'Database error' });
        }
    } else {
        return res.json({ totalUsers: 0, activeJobs: 0, revenue: 0, onlineUsers: 0 });
    }
});

app.get('/api/admin/users', authenticate, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    
    if (isDbConnected) {
        try {
            const result = await pool.query('SELECT * FROM users ORDER BY id DESC LIMIT 50');
            return res.json(result.rows.map(mapUserToFrontend));
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: 'Database error' });
        }
    } else {
        return res.json([]);
    }
});

app.put('/api/admin/users/:id/status', authenticate, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { status } = req.body;
    if (!['ACTIVE', 'PENDING', 'BLOCKED'].includes(status)) return res.status(400).json({ error: 'Status inválido.' });
    await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, req.params.id]);
    return res.json({ success: true });
});

// Admin Categories CRUD
app.post('/api/admin/categories', authenticate, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { id, name, imageUrl } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'ID e Nome são obrigatórios' });
    try {
        await pool.query('INSERT INTO categories (id, name, image_url) VALUES ($1, $2, $3)', [id, name, imageUrl || null]);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: 'Erro ao criar categoria: ' + e.message });
    }
});

app.put('/api/admin/categories/:id', authenticate, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { name, imageUrl } = req.body;
    try {
        await pool.query('UPDATE categories SET name = $1, image_url = $2 WHERE id = $3', [name, imageUrl || null, req.params.id]);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: 'Erro ao atualizar categoria: ' + e.message });
    }
});

app.delete('/api/admin/categories/:id', authenticate, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    try {
        const check = await pool.query('SELECT COUNT(*) FROM services WHERE category_id = $1', [req.params.id]);
        if (parseInt(check.rows[0].count) > 0) {
            return res.status(400).json({ error: 'Não é possível excluir uma categoria que possui serviços vinculados.' });
        }
        await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: 'Erro ao excluir categoria: ' + e.message });
    }
});

// Admin Services CRUD
app.post('/api/admin/services', authenticate, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { id, categoryId, name, emoji, imageUrl, isActive } = req.body;
    if (!id || !categoryId || !name) return res.status(400).json({ error: 'ID, Categoria e Nome são obrigatórios' });
    try {
        await pool.query('INSERT INTO services (id, category_id, name, emoji, image_url, is_active) VALUES ($1, $2, $3, $4, $5, $6)', [id, categoryId, name, emoji || null, imageUrl || null, isActive !== false]);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: 'Erro ao criar serviço: ' + e.message });
    }
});

app.put('/api/admin/services/:id', authenticate, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { categoryId, name, emoji, imageUrl, isActive } = req.body;
    try {
        await pool.query('UPDATE services SET category_id = $1, name = $2, emoji = $3, image_url = $4, is_active = $5 WHERE id = $6', [categoryId, name, emoji || null, imageUrl || null, isActive !== false, req.params.id]);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: 'Erro ao atualizar serviço: ' + e.message });
    }
});

app.delete('/api/admin/services/:id', authenticate, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    try {
        await pool.query('DELETE FROM services WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: 'Erro ao excluir serviço: ' + e.message });
    }
});

app.post('/api/upload', upload.single('file'), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    if (!process.env.CLOUDINARY_API_KEY) {
        return res.status(500).json({ error: 'Cloudinary não configurado. Upload indisponível.' });
    }

    try {
        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({ folder: 'linka-jobi' }, (error, result) => { if (error) reject(error); else resolve(result); });
            stream.end(req.file.buffer);
        });
        return res.json({ url: (uploadResult as any).secure_url });
    } catch { res.status(500).json({ error: 'Falha no upload' }); }
});

app.post('/api/ai/enhance', async (req, res) => {
    if (!aiClient) return res.json({ text: req.body.text });
    try {
        const response = await aiClient.models.generateContent({ model: 'gemini-2.0-flash-lite-preview-02-05', contents: `Melhore este texto de pedido de serviço (curto e profissional): "${req.body.text}"` });
        return res.json({ text: (response.text || '').trim() });
    } catch { return res.json({ text: req.body.text }); }
});

// ✅ Increment Profile Views
app.post('/api/users/:id/view', async (req, res) => {
    try {
        if (isDbConnected) {
            await pool.query('UPDATE users SET views = COALESCE(views, 0) + 1 WHERE id = $1', [req.params.id]);
        }
        res.json({ success: true });
    } catch (e) {
        console.error("Error incrementing views:", e);
        res.status(500).json({ error: 'Failed to increment views' });
    }
});

// ✅ Professional Stats
app.get('/api/professional/stats', authenticate, async (req: any, res) => {
    if (req.user.role !== 'PROFESSIONAL') return res.status(403).json({ error: 'Apenas profissionais têm acesso a este painel.' });

    try {
        if (isDbConnected) {
            // 1. Earnings Month
            const earningsMonthRes = await pool.query(`
                SELECT COALESCE(SUM(amount), 0) as total 
                FROM transactions 
                WHERE user_id = $1 AND type = 'INCOME' 
                AND created_at >= date_trunc('month', CURRENT_DATE)
            `, [req.user.id]);
            const totalEarningsMonth = parseFloat(earningsMonthRes.rows[0].total);

            // 2. Earnings Today
            const earningsTodayRes = await pool.query(`
                SELECT COALESCE(SUM(amount), 0) as total 
                FROM transactions 
                WHERE user_id = $1 AND type = 'INCOME' 
                AND created_at >= CURRENT_DATE
            `, [req.user.id]);
            const totalEarningsToday = parseFloat(earningsTodayRes.rows[0].total);

            // 3. Completed Jobs Month
            const jobsMonthRes = await pool.query(`
                SELECT COUNT(*) as count 
                FROM propostas 
                WHERE profissional_id = $1 AND status = 'COMPLETED' 
                AND data_conclusao >= date_trunc('month', CURRENT_DATE)
            `, [req.user.id]);
            const completedJobsMonth = parseInt(jobsMonthRes.rows[0].count);

            // 4. Profile Views
            const viewsRes = await pool.query('SELECT views FROM users WHERE id = $1', [req.user.id]);
            const profileViews = viewsRes.rows[0]?.views || 0;

            // 5. Chart Data (Last 7 Days)
            // We need to generate a list of last 7 days and join with data to ensure we have all days even with 0 values
            const chartRes = await pool.query(`
                WITH days AS (
                    SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::date AS date
                )
                SELECT 
                    to_char(d.date, 'Dy') as day,
                    COALESCE(SUM(t.amount), 0) as value,
                    COUNT(t.id) as jobs
                FROM days d
                LEFT JOIN transactions t ON date_trunc('day', t.created_at) = d.date 
                    AND t.user_id = $1 
                    AND t.type = 'INCOME'
                GROUP BY d.date
                ORDER BY d.date
            `, [req.user.id]);
            
            // Map Portuguese days if needed, or just use English from Postgres (Mon, Tue...)
            // Let's assume frontend handles it or we map it here. 
            // Postgres 'Dy' returns Mon, Tue, Wed... 
            const dayMap: any = { 'Sun': 'Dom', 'Mon': 'Seg', 'Tue': 'Ter', 'Wed': 'Qua', 'Thu': 'Qui', 'Fri': 'Sex', 'Sat': 'Sáb' };
            const chartData = chartRes.rows.map((r: any) => ({
                day: dayMap[r.day] || r.day,
                value: parseFloat(r.value),
                jobs: parseInt(r.jobs)
            }));

            // 6. Recent Reviews
            const reviewsRes = await pool.query(`
                SELECT r.*, u.nome as reviewer_name 
                FROM avaliacoes r 
                JOIN users u ON r.avaliador_id = u.id 
                WHERE r.alvo_id = $1 
                ORDER BY r.criado_em DESC LIMIT 5
            `, [req.user.id]);
            
            const recentReviews = reviewsRes.rows.map((r: any) => ({
                id: r.id,
                proposalId: r.proposta_id,
                reviewerId: r.avaliador_id,
                targetId: r.alvo_id,
                reviewerName: r.reviewer_name,
                rating: r.nota,
                comment: r.comentario,
                createdAt: r.criado_em
            }));

            return res.json({
                totalEarningsMonth,
                totalEarningsToday,
                completedJobsMonth,
                profileViews,
                chartData,
                recentReviews
            });

        } else {
            return res.json({
                totalEarningsMonth: 0,
                totalEarningsToday: 0,
                completedJobsMonth: 0,
                profileViews: 0,
                chartData: [],
                recentReviews: []
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// --- DATABASE INIT ---

async function initDB() {
    try {
        if (!DB_CONNECTION) {
            console.warn('⚠️ DATABASE_URL not found in environment variables.');
        } else {
            console.log('ℹ️ Found DATABASE_URL, attempting connection...');
        }

        const client = await pool.connect();
        console.log('✅ Database connected successfully');
        isDbConnected = true;
        
        // Generate valid hash for '123456'
        const validHash = bcrypt.hashSync('123456', 10);

        try {
            await client.query('BEGIN');
            await client.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, nome VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, senha_hash VARCHAR(255) NOT NULL, role VARCHAR(50) NOT NULL DEFAULT 'CONTRACTOR', avatar_url TEXT, localizacao VARCHAR(255), telefone VARCHAR(50), bio TEXT, specialty TEXT, latitude DECIMAL(10,8), longitude DECIMAL(11,8), xp INTEGER DEFAULT 0, rating DECIMAL(3,2) DEFAULT 5.00, reviews_count INTEGER DEFAULT 0, status VARCHAR(50) DEFAULT 'ACTIVE', is_subscriber BOOLEAN DEFAULT FALSE, is_verified BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
            await client.query(`CREATE TABLE IF NOT EXISTS categories (id VARCHAR(50) PRIMARY KEY, name VARCHAR(100) NOT NULL, image_url TEXT);`);
            await client.query(`CREATE TABLE IF NOT EXISTS services (id VARCHAR(50) PRIMARY KEY, category_id VARCHAR(50) REFERENCES categories(id), name VARCHAR(100) NOT NULL, emoji VARCHAR(10), image_url TEXT, is_active BOOLEAN DEFAULT TRUE);`);
            await client.query(`CREATE TABLE IF NOT EXISTS propostas (id SERIAL PRIMARY KEY, contratante_id INTEGER REFERENCES users(id), profissional_id INTEGER REFERENCES users(id), titulo VARCHAR(255) NOT NULL, descricao TEXT, area_tag VARCHAR(100), localizacao VARCHAR(255), orcamento_estimado VARCHAR(100), target_professional_id INTEGER REFERENCES users(id), latitude DECIMAL(10,8), longitude DECIMAL(11,8), status VARCHAR(50) DEFAULT 'OPEN', data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP, data_conclusao TIMESTAMP, accepted_count INTEGER DEFAULT 0);`);
            await client.query(`CREATE TABLE IF NOT EXISTS chat_sessions (id SERIAL PRIMARY KEY, proposta_id INTEGER REFERENCES propostas(id), professional_id INTEGER REFERENCES users(id), negotiation JSONB, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
            // Migration: Ensure professional_id and negotiation exist for existing tables
            try {
                await client.query(`ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS professional_id INTEGER REFERENCES users(id);`);
                await client.query(`ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS negotiation JSONB;`);
            } catch (e) { console.log('Migration note: chat_sessions columns check', e); }

            try {
                await client.query(`ALTER TABLE propostas ADD COLUMN IF NOT EXISTS accepted_count INTEGER DEFAULT 0;`);
            } catch (e) { console.log('Migration note: accepted_count column check', e); }

            // Migration: Update propostas status check constraint to allow IN_PROGRESS
            try {
                await client.query(`ALTER TABLE propostas DROP CONSTRAINT IF EXISTS propostas_status_check;`);
                await client.query(`ALTER TABLE propostas ADD CONSTRAINT propostas_status_check CHECK (status IN ('OPEN', 'NEGOTIATING', 'IN_PROGRESS', 'COMPLETED'));`);
            } catch (e) { console.log('Migration note: propostas status constraint update failed', e); }

            // Migration: Add views column to users
            try {
                await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;`);
            } catch (e) { console.log('Migration note: views column check', e); }

            // Migration: Add reset password columns
            try {
                await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);`);
                await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP;`);
            } catch (e) { console.log('Migration note: reset password columns check', e); }

            await client.query(`CREATE TABLE IF NOT EXISTS chat_messages (id SERIAL PRIMARY KEY, session_id INTEGER REFERENCES chat_sessions(id), sender_id INTEGER, texto TEXT, msg_type VARCHAR(50) DEFAULT 'text', metadata JSONB, is_system BOOLEAN DEFAULT FALSE, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
            await client.query(`CREATE TABLE IF NOT EXISTS avaliacoes (id SERIAL PRIMARY KEY, proposta_id INTEGER REFERENCES propostas(id), avaliador_id INTEGER REFERENCES users(id), alvo_id INTEGER REFERENCES users(id), nota INTEGER CHECK (nota >= 1 AND nota <= 5), comentario TEXT, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
            await client.query(`CREATE TABLE IF NOT EXISTS transactions (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), type VARCHAR(50) NOT NULL, amount DECIMAL(10,2) NOT NULL, description VARCHAR(255), status VARCHAR(50) DEFAULT 'COMPLETED', related_proposal_id INTEGER REFERENCES propostas(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
            await client.query(`CREATE TABLE IF NOT EXISTS portfolio (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), image_url TEXT NOT NULL, descricao TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
            await client.query(`CREATE TABLE IF NOT EXISTS user_services (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), title VARCHAR(255) NOT NULL, description TEXT, price VARCHAR(50), price_unit VARCHAR(20), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
            await client.query(`CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), type VARCHAR(50) NOT NULL, title VARCHAR(255) NOT NULL, message TEXT, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
            await client.query(`CREATE TABLE IF NOT EXISTS badges (id VARCHAR(50) PRIMARY KEY, name VARCHAR(100) NOT NULL, description TEXT, icon VARCHAR(50));`);
            await client.query(`CREATE TABLE IF NOT EXISTS user_badges (user_id INTEGER REFERENCES users(id), badge_id VARCHAR(50) REFERENCES badges(id), unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, badge_id));`);
            await client.query(`CREATE TABLE IF NOT EXISTS user_favorites (user_id INTEGER REFERENCES users(id), professional_id INTEGER REFERENCES users(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, professional_id));`);
            await client.query(`CREATE TABLE IF NOT EXISTS reports (id SERIAL PRIMARY KEY, reporter_id INTEGER REFERENCES users(id), reported_id INTEGER REFERENCES users(id), reason TEXT, description TEXT, status VARCHAR(50) DEFAULT 'OPEN', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
            await client.query(`CREATE TABLE IF NOT EXISTS blocked_users (blocker_id INTEGER REFERENCES users(id), blocked_id INTEGER REFERENCES users(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (blocker_id, blocked_id));`);

            // Clear catalog tables to prevent duplicates (since we are re-seeding)
            await client.query('DELETE FROM services');
            await client.query('DELETE FROM categories');
            await client.query('DELETE FROM badges');

            // Ensure Admin User
            const adminHash = await bcrypt.hash('admin123', 10);
            await client.query(`
                INSERT INTO users (nome, email, senha_hash, role, avatar_url, localizacao, latitude, longitude, bio) 
                VALUES ('Suporte Linka Jobi', 'suporte@linka.com', $1, 'ADMIN', 'https://ui-avatars.com/api/?name=Suporte+Linka&background=0D8ABC&color=fff', 'Central de Suporte', 0, 0, 'Canal oficial de atendimento.')
                ON CONFLICT (email) DO NOTHING;
            `, [adminHash]);

            await client.query(`INSERT INTO badges (id, name, description, icon) VALUES ('badge_early_adopter','Pioneiro','Um dos primeiros usuários do Linka Jobi.','Rocket'),('badge_verified','Verificado','Documentação aprovada.','ShieldCheck'),('badge_first_job','Primeiro Job','Concluiu o primeiro serviço.','Award'),('badge_top_rated','5 Estrelas','Recebeu 10 avaliações máximas.','Star') ON CONFLICT (id) DO NOTHING;`);

            await client.query(`INSERT INTO categories (id, name, image_url) VALUES ('cat_tech','Tecnologia','https://images.unsplash.com/photo-1518770660439-4636190af475'),('cat_home','Casa & Reforma','https://images.unsplash.com/photo-1581244277943-fe4a9c777189'),('cat_health','Saúde & Bem-estar','https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b'),('cat_education','Educação','https://images.unsplash.com/photo-1503676260728-1c00da094a0b'),('cat_events','Eventos & Lazer','https://images.unsplash.com/photo-1511795409834-ef04bbd61622'),('cat_business','Negócios','https://images.unsplash.com/photo-1454165804606-c3d57bc86b40'),('cat_beauty','Beleza','https://images.unsplash.com/photo-1560869713-7d0a29430803'),('cat_auto','Automotivo','https://images.unsplash.com/photo-1492144534655-ae79c964c9d7'),('cat_creative','Economia Criativa','https://images.unsplash.com/photo-1452860606245-08befc0ff44b'),('cat_community','Serviços Comunitários','https://images.unsplash.com/photo-1559027615-cd4628902d4a'),('cat_sustain','Sustentabilidade','https://images.unsplash.com/photo-1542601906990-b4d3fb778b09') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, image_url=EXCLUDED.image_url;`);

            await client.query(`INSERT INTO services (id, category_id, name, emoji, image_url) VALUES 
                ('serv_dev','cat_tech','Desenvolvedor Web/App','💻','https://images.unsplash.com/photo-1498050108023-c5249f4df085'),
                ('serv_support','cat_tech','Suporte Técnico','🛠️','https://images.unsplash.com/photo-1515378791036-0648a3ef77b2'),
                ('serv_design','cat_tech','Designer Gráfico','🎨','https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=400&auto=format&fit=crop'),
                ('serv_video','cat_tech','Editor de Vídeo','🎬','https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=400&auto=format&fit=crop'),
                ('serv_marketing','cat_tech','Gestor de Tráfego','📈','https://images.unsplash.com/photo-1460925895917-afdab827c52f'),
                ('serv_network','cat_tech','Redes de Computadores','🌐','https://images.unsplash.com/photo-1544197150-b99a580bb7a8'),
                ('serv_security','cat_tech','Segurança Digital','🔒','https://images.unsplash.com/photo-1563013544-824ae1b704d3'),
                ('serv_pedreiro','cat_home','Pedreiro','🧱','https://images.unsplash.com/photo-1541888946425-d81bb19240f5'),
                ('serv_eletricista','cat_home','Eletricista','⚡','https://images.unsplash.com/photo-1621905251189-08b45d6a269e'),
                ('serv_encanador','cat_home','Encanador','🔧','https://images.unsplash.com/photo-1607472586893-edb57bdc0e39'),
                ('serv_marido','cat_home','Marido de Aluguel','🔨','https://images.unsplash.com/photo-1581141849291-1125c7b692b5'),
                ('serv_diarista','cat_home','Diarista','🧹','https://images.unsplash.com/photo-1527515663462-113180287041?q=80&w=400&auto=format&fit=crop'),
                ('serv_garden','cat_home','Jardinagem','🌿','https://images.unsplash.com/photo-1416879595882-3373a0480b5b'),
                ('serv_furniture','cat_home','Montador de Móveis','🪑','https://images.unsplash.com/photo-1595428774223-ef52624120d2'),
                ('serv_personal','cat_health','Personal Trainer','💪','https://images.unsplash.com/photo-1517836357463-d25dfeac3438'),
                ('serv_psy','cat_health','Psicólogo','🧠','https://images.unsplash.com/photo-1576091160399-112ba8d25d1d'),
                ('serv_nutrition','cat_health','Nutricionista','🥗','https://images.unsplash.com/photo-1490645935967-10de6ba17061'),
                ('serv_yoga','cat_health','Instrutor de Yoga','🧘','https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=400&auto=format&fit=crop'),
                ('serv_care','cat_health','Cuidador de Idosos','👵','https://images.unsplash.com/photo-1576765608535-5f04d1e3f289'),
                ('serv_english','cat_education','Professor de Inglês','🇺🇸','https://images.unsplash.com/photo-1546410531-bb4caa6b424d'),
                ('serv_math','cat_education','Reforço Escolar','📚','https://images.unsplash.com/photo-1434030216411-0b793f4b4173'),
                ('serv_music','cat_education','Aulas de Música','🎵','https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=400&auto=format&fit=crop'),
                ('serv_photo','cat_events','Fotógrafo','📸','https://images.unsplash.com/photo-1516035069371-29a1b244cc32'),
                ('serv_dj','cat_events','DJ e Som','🎧','https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&auto=format&fit=crop'),
                ('serv_buffet','cat_events','Buffet / Churrasqueiro','🍖','https://images.unsplash.com/photo-1555244162-803834f70033'),
                ('serv_account','cat_business','Contabilidade','📊','https://images.unsplash.com/photo-1554224155-6726b3ff858f'),
                ('serv_legal','cat_business','Advogado','⚖️','https://images.unsplash.com/photo-1589829085413-56de8ae18c73'),
                ('serv_trans','cat_business','Tradutor','🗣️','https://images.unsplash.com/photo-1455390582262-044cdead277a'),
                ('serv_makeup','cat_beauty','Maquiadora','💄','https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=400&auto=format&fit=crop'),
                ('serv_hair','cat_beauty','Cabeleireiro(a)','💇','https://images.unsplash.com/photo-1560869713-7d0a29430803'),
                ('serv_manicure','cat_beauty','Manicure/Pedicure','💅','https://images.unsplash.com/photo-1632345031435-8727f6897d53'),
                ('serv_barber','cat_beauty','Barbeiro','💈','https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=400&auto=format&fit=crop'),
                ('serv_mech','cat_auto','Mecânico','🔧','https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=400&auto=format&fit=crop'),
                ('serv_wash','cat_auto','Lavagem Ecológica','🚿','https://images.unsplash.com/photo-1601362840469-51e4d8d58785?q=80&w=400&auto=format&fit=crop'),
                ('serv_repair_small','cat_auto','Pequenos Reparos','🔨','https://images.unsplash.com/photo-1625047509168-a7026f36de04'),
                ('serv_crafts','cat_creative','Artesanato Personalizado','🧶','https://images.unsplash.com/photo-1452860606245-08befc0ff44b'),
                ('serv_sewing','cat_creative','Costura e Reparos','🧵','https://images.unsplash.com/photo-1556740738-b6a63e27c4df'),
                ('serv_painting_art','cat_creative','Pintura Artística','🖌️','https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b'),
                ('serv_pet','cat_community','Passeador de Cães','🐕','https://images.unsplash.com/photo-1583511655857-d19b40a7a54e'),
                ('serv_delivery','cat_community','Entregas Locais','📦','https://images.unsplash.com/photo-1616401784845-180882ba9ba8'),
                ('serv_cooking','cat_community','Cozinheira(o) a Domicílio','🍳','https://images.unsplash.com/photo-1556909212-d5b604d0c90d?q=80&w=400&auto=format&fit=crop'),
                ('serv_solar','cat_sustain','Manutenção Solar','☀️','https://images.unsplash.com/photo-1509391366360-2e959784a276'),
                ('serv_recycle','cat_sustain','Coleta Seletiva','♻️','https://images.unsplash.com/photo-1532996122724-e3c354a0b15b'),
                ('serv_repair_elect','cat_sustain','Reparo Eletrodomésticos','🔌','https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400&auto=format&fit=crop') 
                ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, emoji=EXCLUDED.emoji, image_url=EXCLUDED.image_url, category_id=EXCLUDED.category_id;`);

            await client.query('COMMIT');
            console.log('✅ Database initialized successfully');
        } catch (e) {
            await client.query('ROLLBACK');
            console.error('❌ Failed to initialize database:', e);
        } finally { client.release(); }
    } catch (err: any) {
        console.error('❌ Failed to connect to database:', err.message);
        console.log('⚠️ Server running in MOCK MODE');
        isDbConnected = false;
    }
}


async function startServer() {
    await initDB();
    try {
        const httpServer = createServer(app);
        if (process.env.NODE_ENV !== 'production') {
            const vite = await createViteServer({ server: { middlewareMode: true, hmr: { server: httpServer, clientPort: 443 } }, appType: 'spa' });
            app.use(vite.middlewares);
        }
        try {
            io = new Server(httpServer, { cors: { origin: "*", methods: ["GET", "POST"] } });
            io.use((socket, next) => {
                const token = socket.handshake.auth.token;
                if (!token) return next(new Error("Authentication error"));
                try { const decoded = jwt.verify(token, JWT_SECRET); socket.data.user = decoded; next(); }
                catch { next(new Error("Authentication error")); }
            });
            io.on('connection', (socket) => {
                const userId = socket.data.user?.id;
                if (userId) { console.log(`User connected: ${userId}`); socket.join(`user_${userId}`); }
                socket.on('join_chat', (chatId) => socket.join(`chat_${chatId}`));
                socket.on('leave_chat', (chatId) => socket.leave(`chat_${chatId}`));
                socket.on('disconnect', () => console.log(`User disconnected: ${userId}`));
            });
            app.set('io', io);
        } catch (socketErr) { console.error("❌ Failed to initialize Socket.io:", socketErr); }

        httpServer.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Servidor Linka Jobi rodando na porta ${PORT}`);
        });
    } catch (err) { console.error("❌ CRITICAL SERVER ERROR:", err); }
}

startServer();