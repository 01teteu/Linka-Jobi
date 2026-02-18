import dotenv from 'dotenv';
import Fastify from 'fastify';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { GoogleGenAI } from "@google/genai";
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

const { Pool } = pg;

// Logger: false para limpar o terminal e usarmos nossos próprios logs
const fastify = Fastify({ logger: false });

const JWT_SECRET = process.env.JWT_SECRET || 'segredo_super_secreto_linka_jobi_2024';
const DB_CONNECTION = process.env.DATABASE_URL;
const GOOGLE_API_KEY = process.env.VITE_GOOGLE_API_KEY || process.env.API_KEY;
const PORT = process.env.PORT || 3000;

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

// Configuração do PostgreSQL
const pool = new Pool({ 
    connectionString: DB_CONNECTION,
    ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
    console.error('⚠️  Erro inesperado no cliente do banco:', err);
});

// Registrar Plugins
await fastify.register(cors, { 
    origin: true, 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

await fastify.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } });

// Inicializa Gemini
let aiClient = null;
if (GOOGLE_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
}

// Middleware de Autenticação
fastify.decorate("authenticate", async function (request, reply) {
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader) throw new Error('No token provided');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        request.user = decoded;
    } catch (err) {
        reply.code(401).send({ error: "Sessão expirada." });
    }
});

// --- Rotas ---

fastify.get('/api/health', async (request, reply) => {
    try {
        await pool.query('SELECT 1');
        return { status: 'ok', db: 'connected', mode: 'REAL_DB' };
    } catch (err) {
        return { status: 'error', db: 'disconnected', error: err.message };
    }
});

// Rota de Login
fastify.post('/api/login', async (request, reply) => {
    const { email, senha } = request.body;
    
    try {
        const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = res.rows[0];

        if (!user) return reply.code(401).send({ error: 'E-mail não encontrado.' });

        const valid = await bcrypt.compare(senha, user.senha_hash);
        if (!valid) return reply.code(401).send({ error: 'Senha incorreta.' });

        // Verifica status
        if (user.status === 'BLOCKED') return reply.code(403).send({ error: 'Conta bloqueada.' });

        // Gera Token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Adapta formato para o frontend
        const userFrontend = {
            id: user.id,
            name: user.nome,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatar_url,
            location: user.localizacao,
            status: user.status,
            bio: user.bio,
            specialty: user.specialty,
            phone: user.telefone,
            coordinates: { lat: user.latitude, lng: user.longitude },
            isSubscriber: user.is_subscriber
        };

        return { token, user: userFrontend };

    } catch (err) {
        console.error(err);
        return reply.code(500).send({ error: 'Erro no login' });
    }
});

// Rota de Registro
fastify.post('/api/register', async (request, reply) => {
    const { name, email, password, role, avatarUrl, location, phone, specialty, coordinates } = request.body;

    try {
        // Hash da senha
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const res = await pool.query(
            `INSERT INTO users (nome, email, senha_hash, role, avatar_url, localizacao, telefone, specialty, latitude, longitude)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [
                name, 
                email, 
                hash, 
                role, 
                avatarUrl || `https://ui-avatars.com/api/?name=${name}`, 
                location, 
                phone, 
                specialty,
                coordinates?.lat || -23.550520,
                coordinates?.lng || -46.633308
            ]
        );

        const newUser = res.rows[0];
        
        // Auto-login após registro
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return { 
            token, 
            user: {
                id: newUser.id,
                name: newUser.nome,
                email: newUser.email,
                role: newUser.role,
                avatarUrl: newUser.avatar_url,
                location: newUser.localizacao,
                status: newUser.status,
                phone: newUser.telefone
            } 
        };

    } catch (err) {
        if (err.code === '23505') {
            return reply.code(400).send({ error: 'E-mail já cadastrado.' });
        }
        console.error(err);
        return reply.code(500).send({ error: 'Erro ao criar conta.' });
    }
});

// Rota: Me (Dados do Usuário Atual)
fastify.get('/api/me', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
        const res = await pool.query('SELECT * FROM users WHERE id = $1', [request.user.id]);
        const user = res.rows[0];
        if (!user) return reply.code(404).send({ error: 'Usuário não encontrado' });

        return {
            user: {
                id: user.id,
                name: user.nome,
                email: user.email,
                role: user.role,
                avatarUrl: user.avatar_url,
                location: user.localizacao,
                status: user.status,
                bio: user.bio,
                specialty: user.specialty,
                phone: user.telefone,
                coordinates: { lat: user.latitude, lng: user.longitude },
                isSubscriber: user.is_subscriber
            }
        };
    } catch (err) {
        return reply.code(500).send({ error: 'Erro ao buscar perfil' });
    }
});

// ... (Outras rotas simplificadas para o exemplo, em produção incluiríamos todas)

// Rota: Upload (Simulado ou Cloudinary)
fastify.post('/api/upload', async (req, reply) => {
    const data = await req.file();
    // Em produção real, enviaria para Cloudinary aqui.
    // Retornamos uma URL fake para não quebrar se não tiver chaves configuradas.
    return { url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400' };
});


const start = async () => {
    try { 
        console.log("------------------------------------------------");
        console.log(`🚀 Servidor iniciando na porta ${PORT}`);
        console.log("------------------------------------------------");
        
        // Tenta conexão inicial
        try {
            await pool.query('SELECT NOW()');
            const dbHost = DB_CONNECTION.split('@')[1].split(':')[0];
            console.log(`✅ CONEXÃO COM SUPABASE ESTABELECIDA COM SUCESSO!`);
            console.log(`   Host: ${dbHost}`);
        } catch (dbErr) {
            console.warn("⚠️  AVISO: Não foi possível conectar ao banco de dados.");
            console.warn("    Verifique se a senha no .env está correta.");
            console.warn("    Erro: " + dbErr.message);
        }

        await fastify.listen({ port: PORT, host: '0.0.0.0' }); 
        console.log("✅ API Pronta para receber requisições.");
    } 
    catch (err) { 
        console.error(err);
        process.exit(1); 
    }
};
start();