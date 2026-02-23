import dotenv from 'dotenv';
import Fastify from 'fastify';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { GoogleGenAI } from "@google/genai";
import { v2 as cloudinary } from 'cloudinary';
import util from 'util';
import { pipeline } from 'stream';

dotenv.config();

const { Pool } = pg;
const pump = util.promisify(pipeline);

// --- SETUP ---
const fastify = Fastify({ logger: false });

const JWT_SECRET = process.env.JWT_SECRET || 'segredo_super_secreto_linka_jobi_2024';
const DB_CONNECTION = process.env.DATABASE_URL;
const GOOGLE_API_KEY = process.env.VITE_GOOGLE_API_KEY || process.env.API_KEY;
const PORT = process.env.PORT || 3000;

// Cloudinary Config
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

// Database
const pool = new Pool({ 
    connectionString: DB_CONNECTION,
    ssl: { rejectUnauthorized: false }
});

// AI
let aiClient = null;
if (GOOGLE_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
}

// Plugins
await fastify.register(cors, { origin: true, credentials: true });
await fastify.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } });

// Middleware Auth
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

// --- HELPER FUNCTIONS ---
function mapUserToFrontend(u) {
    if (!u) return null;
    return {
        id: u.id,
        name: u.nome,
        email: u.email,
        role: u.role,
        avatarUrl: u.avatar_url,
        location: u.localizacao,
        status: u.status,
        bio: u.bio,
        specialty: u.specialty,
        phone: u.telefone,
        coordinates: { lat: u.latitude, lng: u.longitude },
        isSubscriber: u.is_subscriber,
        rating: u.rating ? parseFloat(u.rating) : 5.0,
        reviewsCount: u.reviews_count || 0,
        experienceYears: u.xp ? Math.floor(u.xp / 100).toString() : '1'
    };
}

function mapProposalToFrontend(p) {
    return {
        id: p.id,
        contractorId: p.contratante_id,
        contractorName: p.contractor_name || 'Usuário',
        title: p.titulo,
        description: p.descricao,
        areaTag: p.area_tag,
        status: p.status,
        location: p.localizacao,
        budgetRange: p.orcamento_estimado,
        createdAt: p.data_criacao,
        contractorAvatar: p.contractor_avatar,
        professionalId: p.profissional_id,
        contractorEmail: p.contractor_email,
        contractorPhone: p.contractor_phone
    };
}

// --- ROTAS GERAIS ---

fastify.get('/api/health', async () => ({ status: 'ok', db: 'connected', mode: 'PRODUCTION_DB' }));

// ROTA CATEGORIAS (COM FALLBACK)
fastify.get('/api/categories', async (req, reply) => {
    try {
        const res = await pool.query('SELECT * FROM categories');
        if (res.rowCount === 0) throw new Error("Empty DB");
        return res.rows.map(r => ({ id: r.id, name: r.name, imageUrl: r.image_url }));
    } catch (err) {
        console.log("⚠️ DB Error on Categories, using fallback data.");
        return [
          { id: 'cat_tech', name: 'Tecnologia', imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475' },
          { id: 'cat_home', name: 'Casa & Reforma', imageUrl: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189' },
          { id: 'cat_beauty', name: 'Beleza', imageUrl: 'https://images.unsplash.com/photo-1560869713-7d0a29430803' },
          { id: 'cat_auto', name: 'Automotivo', imageUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7' }
        ];
    }
});

// ROTA SERVIÇOS (COM FALLBACK)
fastify.get('/api/services', async (req, reply) => {
    try {
        const res = await pool.query('SELECT * FROM services WHERE is_active = true');
        if (res.rowCount === 0) throw new Error("Empty DB");
        return res.rows.map(r => ({ 
            id: r.id, categoryId: r.category_id, name: r.name, 
            emoji: r.emoji, isActive: r.is_active, imageUrl: r.image_url 
        }));
    } catch (err) {
        console.log("⚠️ DB Error on Services, using fallback data.");
        return [
          { id: 'serv_dev', categoryId: 'cat_tech', name: 'Desenvolvedor Web', emoji: '💻', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085' },
          { id: 'serv_pedreiro', categoryId: 'cat_home', name: 'Pedreiro', emoji: '🧱', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5' },
          { id: 'serv_eletricista', categoryId: 'cat_home', name: 'Eletricista', emoji: '⚡', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e' },
          { id: 'serv_manicure', categoryId: 'cat_beauty', name: 'Manicure', emoji: '💅', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53' }
        ];
    }
});

// --- ROTAS AUTH & USER ---

fastify.post('/api/login', async (req, reply) => {
    const { email, senha } = req.body;
    try {
        const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = res.rows[0];
        if (!user) return reply.code(401).send({ error: 'Usuário não encontrado.' });

        const valid = await bcrypt.compare(senha, user.senha_hash);
        if (!valid) return reply.code(401).send({ error: 'Senha incorreta.' });
        if (user.status === 'BLOCKED') return reply.code(403).send({ error: 'Conta bloqueada.' });

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        
        return { token, user: mapUserToFrontend(user) };
    } catch (err) { console.error(err); reply.code(500).send({ error: 'Erro interno' }); }
});

fastify.post('/api/register', async (req, reply) => {
    const { name, email, password, role, avatarUrl, location, phone, specialty, coordinates } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        
        const res = await pool.query(
            `INSERT INTO users (nome, email, senha_hash, role, avatar_url, localizacao, telefone, specialty, latitude, longitude)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [name, email, hash, role, avatarUrl, location, phone, specialty, coordinates?.lat || -23.55, coordinates?.lng || -46.63]
        );
        const user = res.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        return { token, user: mapUserToFrontend(user) };
    } catch (err) { 
        if(err.code === '23505') return reply.code(400).send({ error: 'E-mail já existe.' });
        reply.code(500).send({ error: 'Erro no registro' }); 
    }
});

fastify.get('/api/me', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    return { user: mapUserToFrontend(res.rows[0]) };
});

fastify.put('/api/users/:id', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const { name, location, phone, bio, avatarUrl } = req.body;
    const res = await pool.query(
        `UPDATE users SET nome = COALESCE($1, nome), localizacao = COALESCE($2, localizacao), 
         telefone = COALESCE($3, telefone), bio = COALESCE($4, bio), avatar_url = COALESCE($5, avatar_url)
         WHERE id = $6 RETURNING *`,
        [name, location, phone, bio, avatarUrl, req.user.id]
    );
    return mapUserToFrontend(res.rows[0]);
});

// --- ROTA: TOP PROFISSIONAIS (COM FALLBACK) ---
fastify.get('/api/professionals/top', async (req, reply) => {
    try {
        const res = await pool.query(
            `SELECT * FROM users WHERE role = 'PROFESSIONAL' AND status = 'ACTIVE' 
             ORDER BY rating DESC, reviews_count DESC LIMIT 10`
        );
        if (res.rowCount === 0) throw new Error("Empty DB");
        return res.rows.map(mapUserToFrontend);
    } catch (err) {
        console.log("⚠️ DB Error on Top Pros, returning empty list.");
        return [];
    }
});

// --- ROTA: PERFIL PÚBLICO ---
fastify.get('/api/users/:id/public_profile', async (req, reply) => {
    const { id } = req.params;
    try {
        const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (userRes.rowCount === 0) return reply.code(404).send({ error: "User not found" });

        const portfolioRes = await pool.query('SELECT * FROM portfolio WHERE user_id = $1', [id]);
        const reviewsRes = await pool.query(
            `SELECT r.*, u.nome as reviewer_name 
             FROM avaliacoes r 
             JOIN users u ON r.avaliador_id = u.id 
             WHERE r.alvo_id = $1 ORDER BY r.criado_em DESC`, 
            [id]
        );

        return {
            user: mapUserToFrontend(userRes.rows[0]),
            portfolio: portfolioRes.rows.map(p => ({
                id: p.id, userId: p.user_id, imageUrl: p.image_url, description: p.descricao
            })),
            reviews: reviewsRes.rows.map(r => ({
                id: r.id, proposalId: r.proposta_id, reviewerId: r.avaliador_id, targetId: r.alvo_id,
                rating: r.nota, comment: r.comentario, createdAt: r.criado_em, reviewerName: r.reviewer_name
            }))
        };
    } catch (err) {
        reply.code(500).send({ error: "Erro ao buscar perfil" });
    }
});

// --- ROTAS DE PROPOSTAS (JOBS) ---

fastify.get('/api/proposals', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const { page = 1, limit = 10, contractorId, lat, lng, radius, area } = req.query;
    const offset = (page - 1) * limit;

    let query = `
        SELECT p.*, 
               u.nome as contractor_name, 
               u.avatar_url as contractor_avatar,
               u.email as contractor_email,
               u.telefone as contractor_phone
        FROM propostas p
        JOIN users u ON p.contratante_id = u.id
        WHERE 1=1
    `;
    const params = [];

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

    query += ` ORDER BY p.data_criacao DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    try {
        const res = await pool.query(query, params);
        return res.rows.map(mapProposalToFrontend);
    } catch (err) {
        console.error(err);
        return reply.code(500).send({ error: 'Erro ao buscar propostas' });
    }
});

fastify.get('/api/proposals/:id', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const { id } = req.params;
    const res = await pool.query(`
        SELECT p.*, u.nome as contractor_name, u.avatar_url as contractor_avatar 
        FROM propostas p JOIN users u ON p.contratante_id = u.id WHERE p.id = $1`, [id]);
    if(res.rowCount === 0) return reply.code(404).send({error: 'Not found'});
    return mapProposalToFrontend(res.rows[0]);
});

fastify.post('/api/proposals', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const { title, description, areaTag, location, budgetRange, targetProfessionalId, coordinates } = req.body;
    try {
        const res = await pool.query(
            `INSERT INTO propostas (contratante_id, titulo, descricao, area_tag, localizacao, orcamento_estimado, target_professional_id, latitude, longitude, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'OPEN')
             RETURNING *`,
            [req.user.id, title, description, areaTag, location, budgetRange, targetProfessionalId, coordinates?.lat, coordinates?.lng]
        );
        return mapProposalToFrontend(res.rows[0]);
    } catch (err) {
        reply.code(500).send({ error: 'Erro ao criar proposta' });
    }
});

fastify.post('/api/proposals/:id/accept', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const { id } = req.params;
    try {
        await pool.query(
            `UPDATE propostas SET status = 'NEGOTIATING', profissional_id = $1 WHERE id = $2`,
            [req.user.id, id]
        );
        
        // Verifica se já existe chat
        const existingChat = await pool.query('SELECT id FROM chat_sessions WHERE proposta_id = $1', [id]);
        let chatId;

        if (existingChat.rowCount > 0) {
            chatId = existingChat.rows[0].id;
        } else {
            const chatRes = await pool.query(
                `INSERT INTO chat_sessions (proposta_id) VALUES ($1) RETURNING id`, [id]
            );
            chatId = chatRes.rows[0].id;
            await pool.query(
                `INSERT INTO chat_messages (session_id, sender_id, texto, is_system) VALUES ($1, $2, 'Negociação iniciada', true)`,
                [chatId, 0]
            );
        }

        return { success: true, chatId };
    } catch (err) {
        reply.code(500).send({ error: 'Erro ao aceitar proposta' });
    }
});

fastify.post('/api/proposals/:id/complete', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const { id } = req.params;
    try {
        await pool.query(`UPDATE propostas SET status = 'COMPLETED', data_conclusao = NOW() WHERE id = $1`, [id]);
        
        // 1. Atualizar XP do profissional (+500 XP)
        const prop = await pool.query('SELECT profissional_id, orcamento_estimado FROM propostas WHERE id = $1', [id]);
        if(prop.rowCount > 0) {
            const proId = prop.rows[0].profissional_id;
            await pool.query('UPDATE users SET xp = xp + 500 WHERE id = $1', [proId]);
            
            // 2. Registrar Transação Financeira (Simulação de Recebimento)
            // Extrai valor numérico simples
            const valorStr = prop.rows[0].orcamento_estimado || '0';
            const valor = parseFloat(valorStr.replace(/[^0-9.]/g, '')) || 100.00;
            
            await pool.query(
                `INSERT INTO transactions (user_id, type, amount, description, status, related_proposal_id) 
                 VALUES ($1, 'INCOME', $2, 'Serviço Concluído', 'COMPLETED', $3)`,
                [proId, valor, id]
            );
        }

        return { success: true };
    } catch (err) {
        reply.code(500).send({ error: 'Erro ao finalizar' });
    }
});

// --- ROTA DE AVALIAÇÕES (POST) ---
fastify.post('/api/reviews', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const { proposalId, targetId, rating, comment } = req.body;
    try {
        await pool.query(
            `INSERT INTO avaliacoes (proposta_id, avaliador_id, alvo_id, nota, comentario) VALUES ($1, $2, $3, $4, $5)`,
            [proposalId, req.user.id, targetId, rating, comment]
        );
        // Atualiza média e contagem
        await pool.query(
            `UPDATE users SET 
                reviews_count = (SELECT COUNT(*) FROM avaliacoes WHERE alvo_id = $1),
                rating = (SELECT AVG(nota) FROM avaliacoes WHERE alvo_id = $1)
             WHERE id = $1`,
            [targetId]
        );
        return { success: true };
    } catch(err) {
        reply.code(500).send({ error: 'Erro ao enviar avaliação' });
    }
});

// --- ROTAS DE CHAT ---

fastify.get('/api/chats', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    try {
        const query = `
            SELECT cs.id as chat_id, p.id as proposal_id, p.titulo, p.status as proposal_status,
                   p.contratante_id, p.profissional_id,
                   u1.nome as c_name, u1.avatar_url as c_avatar,
                   u2.nome as p_name, u2.avatar_url as p_avatar,
                   (SELECT texto FROM chat_messages WHERE session_id = cs.id ORDER BY timestamp DESC LIMIT 1) as last_msg
            FROM chat_sessions cs
            JOIN propostas p ON cs.proposta_id = p.id
            JOIN users u1 ON p.contratante_id = u1.id
            LEFT JOIN users u2 ON p.profissional_id = u2.id
            WHERE p.contratante_id = $1 OR p.profissional_id = $1
            ORDER BY cs.criado_em DESC
        `;
        const res = await pool.query(query, [req.user.id]);
        
        const chats = await Promise.all(res.rows.map(async (row) => {
            const msgsRes = await pool.query(
                `SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY timestamp ASC`,
                [row.chat_id]
            );

            return {
                id: row.chat_id,
                proposalId: row.proposal_id,
                proposalTitle: row.titulo,
                contractorId: row.contratante_id,
                professionalId: row.profissional_id,
                proposalStatus: row.proposal_status,
                participants: [
                    { id: row.contratante_id, name: row.c_name, avatar: row.c_avatar },
                    { id: row.profissional_id, name: row.p_name || 'Profissional', avatar: row.p_avatar }
                ],
                messages: msgsRes.rows.map(m => ({
                    id: m.id,
                    senderId: m.sender_id || 0,
                    text: m.texto,
                    timestamp: new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    isSystem: m.is_system,
                    type: m.msg_type,
                    ...m.metadata
                })),
                lastMessage: row.last_msg || 'Início',
                unreadCount: 0 
            };
        }));

        return chats;
    } catch (err) {
        console.error(err);
        reply.code(500).send({ error: 'Erro ao buscar chats' });
    }
});

fastify.post('/api/messages', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const { chatId, text, type = 'text', mediaUrl, scheduleData } = req.body;
    try {
        const metadata = {};
        if (mediaUrl) metadata.mediaUrl = mediaUrl;
        if (scheduleData) metadata.scheduleData = scheduleData;

        await pool.query(
            `INSERT INTO chat_messages (session_id, sender_id, texto, msg_type, metadata) VALUES ($1, $2, $3, $4, $5)`,
            [chatId, req.user.id, text, type, JSON.stringify(metadata)]
        );
        return { success: true };
    } catch (err) {
        reply.code(500).send({ error: 'Erro ao enviar mensagem' });
    }
});

fastify.put('/api/messages/:id/status', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const { id } = req.params;
    const { status } = req.body; // 'CONFIRMED', etc.
    try {
        // Atualiza metadata JSONB. Exemplo simples:
        const res = await pool.query(`SELECT metadata FROM chat_messages WHERE id = $1`, [id]);
        const meta = res.rows[0].metadata || {};
        if (meta.scheduleData) meta.scheduleData.status = status;
        
        await pool.query(`UPDATE chat_messages SET metadata = $1 WHERE id = $2`, [JSON.stringify(meta), id]);
        return { success: true };
    } catch (err) {
        reply.code(500).send({ error: 'Erro ao atualizar status' });
    }
});

// --- ROTA: AGENDA (APPOINTMENTS) ---
fastify.get('/api/appointments', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    try {
        const userId = req.user.id;
        const query = `
            SELECT p.id as proposal_id, p.titulo, p.status, p.localizacao, p.data_criacao,
                   cs.id as chat_id,
                   u.nome as other_name, u.avatar_url as other_avatar
            FROM propostas p
            LEFT JOIN chat_sessions cs ON cs.proposta_id = p.id
            LEFT JOIN users u ON (CASE WHEN p.contratante_id = $1 THEN p.profissional_id ELSE p.contratante_id END) = u.id
            WHERE (p.contratante_id = $1 OR p.profissional_id = $1)
            AND p.status != 'OPEN'
        `;
        const res = await pool.query(query, [userId]);
        
        const appointments = res.rows.map(row => ({
            id: `job_${row.proposal_id}`,
            chatId: row.chat_id,
            title: row.titulo,
            withUser: row.other_name || 'Usuário Linka',
            avatarUrl: row.other_avatar,
            date: new Date(row.data_criacao).toISOString().split('T')[0],
            time: new Date(row.data_criacao).toLocaleTimeString().slice(0,5),
            status: row.status === 'COMPLETED' ? 'CONFIRMED' : 'PENDING',
            location: row.localizacao,
            isProposal: false
        }));
        
        return appointments;
    } catch (err) {
        console.error(err);
        return [];
    }
});

// --- ROTA: GAMIFICAÇÃO (REAL) ---
fastify.get('/api/gamification', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    try {
        const res = await pool.query('SELECT xp FROM users WHERE id = $1', [req.user.id]);
        const xp = res.rows[0].xp || 0;
        
        let level = 'Bronze';
        let nextLevel = 'Prata';
        let nextLevelXp = 1000;

        if (xp >= 1000 && xp < 2500) { level = 'Prata'; nextLevel = 'Ouro'; nextLevelXp = 2500; }
        else if (xp >= 2500 && xp < 5000) { level = 'Ouro'; nextLevel = 'Diamante'; nextLevelXp = 5000; }
        else if (xp >= 5000) { level = 'Diamante'; nextLevel = 'Lenda'; nextLevelXp = 10000; }

        const progress = Math.min(100, Math.floor((xp / nextLevelXp) * 100));

        // Busca Badges Reais
        const badgesRes = await pool.query(`
            SELECT b.*, (ub.user_id IS NOT NULL) as unlocked 
            FROM badges b 
            LEFT JOIN user_badges ub ON b.id = ub.badge_id AND ub.user_id = $1
        `, [req.user.id]);

        return {
            currentLevel: level,
            nextLevel,
            progress,
            xp,
            nextLevelXp,
            badges: badgesRes.rows.map(b => ({
                id: b.id, name: b.name, description: b.description, icon: b.icon, unlocked: b.unlocked
            })),
            benefits: ['Suporte Prioritário', 'Taxas Reduzidas']
        };
    } catch(err) {
        reply.code(500).send({error: 'Erro na gamificação'});
    }
});

// --- ROTA: NOTIFICAÇÕES (REAL) ---
fastify.get('/api/notifications', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const res = await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    return res.rows.map(n => ({
        id: n.id.toString(),
        userId: n.user_id,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.is_read,
        createdAt: n.created_at
    }));
});

fastify.put('/api/notifications/:id/read', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    return { success: true };
});

// --- ROTA: CARTEIRA (REAL) ---
fastify.get('/api/wallet', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    try {
        const transRes = await pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        
        // Calcula saldo somando INCOME/DEPOSIT e subtraindo EXPENSE/WITHDRAW
        const balance = transRes.rows.reduce((acc, t) => {
            if (t.type === 'INCOME' || t.type === 'DEPOSIT') return acc + parseFloat(t.amount);
            return acc - parseFloat(t.amount);
        }, 0);

        return {
            balance,
            transactions: transRes.rows.map(t => ({
                id: t.id.toString(),
                type: t.type,
                amount: parseFloat(t.amount),
                description: t.description,
                date: t.created_at,
                status: t.status,
                relatedProposalId: t.related_proposal_id
            }))
        };
    } catch(err) {
        reply.code(500).send({error: 'Erro na carteira'});
    }
});

// --- ROTA: ADMIN ---
fastify.get('/api/admin/stats', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    if(req.user.role !== 'ADMIN') return reply.code(403).send({error: 'Forbidden'});
    const usersCount = (await pool.query('SELECT COUNT(*) FROM users')).rows[0].count;
    const jobsCount = (await pool.query("SELECT COUNT(*) FROM propostas WHERE status = 'OPEN'")).rows[0].count;
    return { 
        totalUsers: parseInt(usersCount), 
        activeJobs: parseInt(jobsCount), 
        revenue: 12500.00, 
        onlineUsers: 42 
    };
});

fastify.get('/api/admin/users', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    if(req.user.role !== 'ADMIN') return reply.code(403).send({error: 'Forbidden'});
    const res = await pool.query('SELECT * FROM users ORDER BY id DESC LIMIT 50');
    return res.rows.map(mapUserToFrontend);
});

fastify.put('/api/admin/users/:id/status', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    if(req.user.role !== 'ADMIN') return reply.code(403).send({error: 'Forbidden'});
    const { status } = req.body;
    await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, req.params.id]);
    return { success: true };
});

// --- ROTA DE UPLOAD (CLOUDINARY) ---
fastify.post('/api/upload', async (req, reply) => {
    const data = await req.file();
    if (!process.env.CLOUDINARY_API_KEY) {
        return { url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400' };
    }
    try {
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'linka-jobi' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            data.file.pipe(uploadStream);
        });
        return { url: (uploadResult as any).secure_url };
    } catch (error) {
        reply.code(500).send({ error: 'Falha no upload' });
    }
});

// --- ROTA DE IA (GEMINI) ---
fastify.post('/api/ai/enhance', async (req, reply) => {
    if (!aiClient) return { text: req.body.text }; 
    try {
        const response = await aiClient.models.generateContent({
            model: 'gemini-2.0-flash-lite-preview-02-05',
            contents: `Melhore este texto de pedido de serviço (curto e profissional): "${req.body.text}"`
        });
        return { text: response.text.trim() };
    } catch (e) {
        return { text: req.body.text };
    }
});

// Start Server
const start = async () => {
    try {
        console.log(`🚀 Servidor Linka Jobi rodando na porta ${PORT}`);
        await pool.query('SELECT NOW()'); 
        console.log("✅ Conectado ao Banco de Dados (PostgreSQL)");
        // Inicializar tabela se não existir (Opcional, pois schema.sql cuida disso, mas bom pra garantir)
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
start();