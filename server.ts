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
import { DEFAULT_CATEGORIES, DEFAULT_SERVICES } from './constants';

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'segredo_super_secreto_linka_jobi_2024';
const DB_CONNECTION = process.env.DATABASE_URL;
const GOOGLE_API_KEY = process.env.VITE_GOOGLE_API_KEY || process.env.API_KEY;

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const { Pool } = pg;
const pool = new Pool({ 
    connectionString: DB_CONNECTION,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
});

let isDbConnected = false;

pool.on('error', (err: any) => { console.error('Unexpected error on idle client', err); });
process.on('uncaughtException', (err) => { console.error('UNCAUGHT EXCEPTION:', err); });
process.on('unhandledRejection', (reason) => { console.error('UNHANDLED REJECTION:', reason); });

let aiClient: any = null;
if (GOOGLE_API_KEY) { aiClient = new GoogleGenAI({ apiKey: GOOGLE_API_KEY }); }

app.use(cors());
app.use(express.json());
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

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
            req.user = decoded;
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
        experienceYears: u.xp ? Math.floor(u.xp / 100).toString() : '1'
    };
}

function mapProposalToFrontend(p: any) {
    return {
        id: p.id, contractorId: p.contratante_id, contractorName: p.contractor_name || 'Usuário',
        title: p.titulo, description: p.descricao, areaTag: p.area_tag, status: p.status,
        location: p.localizacao, budgetRange: p.orcamento_estimado, createdAt: p.data_criacao,
        contractorAvatar: p.contractor_avatar, professionalId: p.profissional_id,
        contractorEmail: p.contractor_email, contractorPhone: p.contractor_phone
    };
}

// ✅ CEP → Coordenadas via BrasilAPI
async function getCoordinatesFromCep(cep: string) {
    try {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return null;
        const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
        if (!response.ok) return null;
        const data: any = await response.json();
        if (data.location?.coordinates?.latitude) {
            return {
                lat: parseFloat(data.location.coordinates.latitude),
                lng: parseFloat(data.location.coordinates.longitude),
                cidade: `${data.city}, ${data.state}`
            };
        }
        return null;
    } catch (e) { return null; }
}

app.use((req: any, _res: any, next: any) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- ROTAS ---

app.get('/api/health', async (_req, res) => {
    try {
        if (isDbConnected) { const c = await pool.connect(); c.release(); res.json({ status: 'ok', db: 'connected', mode: 'PRODUCTION_DB' }); }
        else { res.json({ status: 'ok', db: 'disconnected', mode: 'MOCK_MODE' }); }
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

// ✅ Login com validação
app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    if (!email.includes('@')) return res.status(400).json({ error: 'E-mail inválido.' });
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        const user = result.rows[0];
        if (!user) return res.status(401).json({ error: 'Usuário não encontrado.' });
        const valid = await bcrypt.compare(senha, user.senha_hash);
        if (!valid) return res.status(401).json({ error: 'Senha incorreta.' });
        if (user.status === 'BLOCKED') return res.status(403).json({ error: 'Conta bloqueada.' });
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ token, user: mapUserToFrontend(user) });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// ✅ Register com validação + CEP
app.post('/api/register', async (req, res) => {
    const { name, email, password, role, avatarUrl, location, phone, specialty, coordinates, cep } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'Campos obrigatórios: nome, email, senha, papel.' });
    if (!['CONTRACTOR', 'PROFESSIONAL'].includes(role)) return res.status(400).json({ error: 'Papel inválido.' });
    if (!email.includes('@')) return res.status(400).json({ error: 'E-mail inválido.' });
    if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres.' });
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
        const result = await pool.query(
            `INSERT INTO users (nome, email, senha_hash, role, avatar_url, localizacao, telefone, specialty, latitude, longitude)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [name, email.toLowerCase().trim(), hash, role, avatarUrl, resolvedLocation, phone, specialty, lat, lng]
        );
        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ token, user: mapUserToFrontend(user) });
    } catch (err: any) {
        if (err.code === '23505') return res.status(400).json({ error: 'E-mail já existe.' });
        res.status(500).json({ error: 'Erro no registro' });
    }
});

app.get('/api/me', authenticate, async (req: any, res) => {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    return res.json({ user: mapUserToFrontend(result.rows[0]) });
});

// ✅ CORRIGIDO: Atualiza specialty + CEP + permissão
app.put('/api/users/:id', authenticate, async (req: any, res) => {
    const { name, location, phone, bio, avatarUrl, specialty, coordinates, cep } = req.body;
    if (req.user.id !== parseInt(req.params.id) && req.user.role !== 'ADMIN') {
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
        const result = await pool.query(
            `UPDATE users SET 
                nome = COALESCE($1, nome), localizacao = COALESCE($2, localizacao),
                telefone = COALESCE($3, telefone), bio = COALESCE($4, bio),
                avatar_url = COALESCE($5, avatar_url), specialty = COALESCE($6, specialty),
                latitude = COALESCE($7, latitude), longitude = COALESCE($8, longitude)
             WHERE id = $9 RETURNING *`,
            [name, resolvedLocation, phone, bio, avatarUrl, specialty, lat, lng, req.params.id]
        );
        return res.json(mapUserToFrontend(result.rows[0]));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao atualizar perfil' }); }
});

// ✅ Recuperação de senha
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail é obrigatório.' });
    try {
        const result = await pool.query('SELECT id, email FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        if (result.rowCount === 0) return res.json({ success: true, message: 'Se o e-mail existir, você receberá as instruções.' });
        const user = result.rows[0];
        const resetToken = jwt.sign({ id: user.id, type: 'password_reset' }, JWT_SECRET, { expiresIn: '1h' });
        console.log(`🔑 Token de recuperação para ${user.email}: ${resetToken}`);
        // TODO: integrar Resend.com ou SendGrid para envio real de e-mail
        return res.json({ success: true, message: 'Se o e-mail existir, você receberá as instruções.' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// ✅ Redefinir senha com token
app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres.' });
    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        if (decoded.type !== 'password_reset') return res.status(400).json({ error: 'Token inválido.' });
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);
        await pool.query('UPDATE users SET senha_hash = $1 WHERE id = $2', [hash, decoded.id]);
        return res.json({ success: true, message: 'Senha atualizada com sucesso!' });
    } catch { return res.status(400).json({ error: 'Token inválido ou expirado.' }); }
});

app.get('/api/professionals/top', async (_req, res) => {
    const fallback = [
        { id: 901, name: 'Marcos Dev', email: 'marcos@linka.com', role: 'PROFESSIONAL', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d', specialty: 'Desenvolvedor Web', rating: 5.0, reviewsCount: 89, location: 'Vila Madalena', coordinates: { lat: -23.5489, lng: -46.6860 } },
        { id: 902, name: 'Ana Tech', email: 'ana@linka.com', role: 'PROFESSIONAL', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb', specialty: 'Suporte Técnico', rating: 4.8, reviewsCount: 210, location: 'Pinheiros', coordinates: { lat: -23.5663, lng: -46.6924 } }
    ];
    if (!isDbConnected) return res.json(fallback);
    try {
        const result = await pool.query(`SELECT * FROM users WHERE role = 'PROFESSIONAL' AND status = 'ACTIVE' ORDER BY rating DESC, reviews_count DESC LIMIT 10`);
        if (result.rowCount === 0) return res.json([]);
        return res.json(result.rows.map(mapUserToFrontend));
    } catch { return res.json(fallback); }
});

// ✅ Busca por especialidade e raio geográfico
app.get('/api/professionals/search', async (req, res) => {
    const { specialty, lat, lng, radius = 50 } = req.query;
    try {
        let query = `SELECT * FROM users WHERE role = 'PROFESSIONAL' AND status = 'ACTIVE'`;
        const params: any[] = [];
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
    if (id === '901' || id === '902') {
        const mock: any = {
            '901': { id: 901, nome: 'Marcos Dev', email: 'marcos@linka.com', role: 'PROFESSIONAL', avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d', specialty: 'Desenvolvedor Web', rating: 5.0, reviews_count: 89, localizacao: 'Vila Madalena', latitude: -23.5489, longitude: -46.6860, bio: 'Desenvolvedor Full Stack com 10 anos de experiência.', xp: 5000 },
            '902': { id: 902, nome: 'Ana Tech', email: 'ana@linka.com', role: 'PROFESSIONAL', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb', specialty: 'Suporte Técnico', rating: 4.8, reviews_count: 210, localizacao: 'Pinheiros', latitude: -23.5663, longitude: -46.6924, bio: 'Especialista em hardware e redes.', xp: 3000 }
        };
        return res.json({ user: mapUserToFrontend(mock[id]), portfolio: [], reviews: [] });
    }
    try {
        const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (userRes.rowCount === 0) return res.status(404).json({ error: "User not found" });
        const portfolioRes = await pool.query('SELECT * FROM portfolio WHERE user_id = $1', [id]);
        const reviewsRes = await pool.query(`SELECT r.*, u.nome as reviewer_name FROM avaliacoes r JOIN users u ON r.avaliador_id = u.id WHERE r.alvo_id = $1 ORDER BY r.criado_em DESC`, [id]);
        return res.json({
            user: mapUserToFrontend(userRes.rows[0]),
            portfolio: portfolioRes.rows.map((p: any) => ({ id: p.id, userId: p.user_id, imageUrl: p.image_url, description: p.descricao })),
            reviews: reviewsRes.rows.map((r: any) => ({ id: r.id, proposalId: r.proposta_id, reviewerId: r.avaliador_id, targetId: r.alvo_id, rating: r.nota, comment: r.comentario, createdAt: r.criado_em, reviewerName: r.reviewer_name }))
        });
    } catch { res.status(500).json({ error: "Erro ao buscar perfil" }); }
});

app.get('/api/proposals', authenticate, async (req: any, res) => {
    const { page = 1, limit = 10, contractorId, area } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let query = `SELECT p.*, u.nome as contractor_name, u.avatar_url as contractor_avatar, u.email as contractor_email, u.telefone as contractor_phone FROM propostas p JOIN users u ON p.contratante_id = u.id WHERE 1=1`;
    const params: any[] = [];
    if (contractorId) { params.push(contractorId); query += ` AND p.contratante_id = $${params.length}`; }
    else { query += ` AND p.status = 'OPEN'`; }
    if (area) { params.push(`%${area}%`); query += ` AND p.area_tag ILIKE $${params.length}`; }
    query += ` ORDER BY p.data_criacao DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    try {
        const result = await pool.query(query, params);
        return res.json(result.rows.map(mapProposalToFrontend));
    } catch (err) { console.error(err); return res.status(500).json({ error: 'Erro ao buscar propostas' }); }
});

app.get('/api/proposals/:id', authenticate, async (req, res) => {
    const result = await pool.query(`SELECT p.*, u.nome as contractor_name, u.avatar_url as contractor_avatar FROM propostas p JOIN users u ON p.contratante_id = u.id WHERE p.id = $1`, [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(mapProposalToFrontend(result.rows[0]));
});

app.post('/api/proposals', authenticate, async (req: any, res) => {
    const { title, description, areaTag, location, budgetRange, targetProfessionalId, coordinates } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Título e descrição são obrigatórios.' });
    try {
        const result = await pool.query(
            `INSERT INTO propostas (contratante_id, titulo, descricao, area_tag, localizacao, orcamento_estimado, target_professional_id, latitude, longitude, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'OPEN') RETURNING *`,
            [req.user.id, title, description, areaTag, location, budgetRange, targetProfessionalId, coordinates?.lat, coordinates?.lng]
        );
        return res.json(mapProposalToFrontend(result.rows[0]));
    } catch (err: any) { console.error(err); res.status(500).json({ error: 'Erro ao criar proposta', details: err.message }); }
});

app.post('/api/proposals/:id/accept', authenticate, async (req: any, res) => {
    const { id } = req.params;
    try {
        await pool.query(`UPDATE propostas SET status = 'NEGOTIATING', profissional_id = $1 WHERE id = $2`, [req.user.id, id]);
        const existing = await pool.query('SELECT id FROM chat_sessions WHERE proposta_id = $1', [id]);
        let chatId;
        if ((existing.rowCount || 0) > 0) { chatId = existing.rows[0].id; }
        else {
            const chatRes = await pool.query(`INSERT INTO chat_sessions (proposta_id) VALUES ($1) RETURNING id`, [id]);
            chatId = chatRes.rows[0].id;
            await pool.query(`INSERT INTO chat_messages (session_id, sender_id, texto, is_system) VALUES ($1, $2, 'Negociação iniciada', true)`, [chatId, 0]);
        }
        return res.json({ success: true, chatId });
    } catch { res.status(500).json({ error: 'Erro ao aceitar proposta' }); }
});

app.post('/api/proposals/:id/complete', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(`UPDATE propostas SET status = 'COMPLETED', data_conclusao = NOW() WHERE id = $1`, [id]);
        const prop = await pool.query('SELECT profissional_id, orcamento_estimado FROM propostas WHERE id = $1', [id]);
        if ((prop.rowCount || 0) > 0) {
            const proId = prop.rows[0].profissional_id;
            await pool.query('UPDATE users SET xp = xp + 500 WHERE id = $1', [proId]);
            const valor = parseFloat((prop.rows[0].orcamento_estimado || '0').replace(/[^0-9.]/g, '')) || 100.00;
            await pool.query(`INSERT INTO transactions (user_id, type, amount, description, status, related_proposal_id) VALUES ($1, 'INCOME', $2, 'Serviço Concluído', 'COMPLETED', $3)`, [proId, valor, id]);
        }
        return res.json({ success: true });
    } catch { res.status(500).json({ error: 'Erro ao finalizar' }); }
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
        const result = await pool.query(`
            SELECT cs.id as chat_id, p.id as proposal_id, p.titulo, p.status as proposal_status,
                   p.contratante_id, p.profissional_id, u1.nome as c_name, u1.avatar_url as c_avatar,
                   u2.nome as p_name, u2.avatar_url as p_avatar,
                   (SELECT texto FROM chat_messages WHERE session_id = cs.id ORDER BY timestamp DESC LIMIT 1) as last_msg
            FROM chat_sessions cs JOIN propostas p ON cs.proposta_id = p.id
            JOIN users u1 ON p.contratante_id = u1.id LEFT JOIN users u2 ON p.profissional_id = u2.id
            WHERE p.contratante_id = $1 OR p.profissional_id = $1 ORDER BY cs.criado_em DESC`, [req.user.id]);
        const chats = await Promise.all(result.rows.map(async (row: any) => {
            const msgsRes = await pool.query(`SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY timestamp ASC`, [row.chat_id]);
            return {
                id: row.chat_id, proposalId: row.proposal_id, proposalTitle: row.titulo,
                contractorId: row.contratante_id, professionalId: row.profissional_id, proposalStatus: row.proposal_status,
                participants: [{ id: row.contratante_id, name: row.c_name, avatar: row.c_avatar }, { id: row.profissional_id, name: row.p_name || 'Profissional', avatar: row.p_avatar }],
                messages: msgsRes.rows.map((m: any) => ({ id: m.id, senderId: m.sender_id || 0, text: m.texto, timestamp: new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), isSystem: m.is_system, type: m.msg_type, ...m.metadata })),
                lastMessage: row.last_msg || 'Início', unreadCount: 0
            };
        }));
        return res.json(chats);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao buscar chats' }); }
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
            io.to(`chat_${chatId}`).emit('new_message', { id: newMsg.id, senderId: newMsg.sender_id, text: newMsg.texto, timestamp: new Date(newMsg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), isSystem: newMsg.is_system, type: newMsg.msg_type, ...newMsg.metadata });
            const cp = await pool.query(`SELECT p.contratante_id, p.profissional_id FROM chat_sessions cs JOIN propostas p ON cs.proposta_id = p.id WHERE cs.id = $1`, [chatId]);
            if ((cp.rowCount || 0) > 0) {
                const { contratante_id, profissional_id } = cp.rows[0];
                const receiverId = req.user.id === contratante_id ? profissional_id : contratante_id;
                if (receiverId) io.to(`user_${receiverId}`).emit('notification', { type: 'MESSAGE', title: 'Nova Mensagem', message: 'Você recebeu uma mensagem em um chat.', chatId });
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
        return res.json(result.rows.map((row: any) => ({ id: `job_${row.proposal_id}`, chatId: row.chat_id, title: row.titulo, withUser: row.other_name || 'Usuário Linka', avatarUrl: row.other_avatar, date: new Date(row.data_criacao).toISOString().split('T')[0], time: new Date(row.data_criacao).toLocaleTimeString().slice(0,5), status: row.status === 'COMPLETED' ? 'CONFIRMED' : 'PENDING', location: row.localizacao, isProposal: false })));
    } catch (err) { console.error(err); return res.json([]); }
});

app.get('/api/gamification', authenticate, async (req: any, res) => {
    try {
        const result = await pool.query('SELECT xp FROM users WHERE id = $1', [req.user.id]);
        const xp = result.rows[0].xp || 0;
        let level = 'Bronze', nextLevel = 'Prata', nextLevelXp = 1000;
        if (xp >= 1000 && xp < 2500) { level = 'Prata'; nextLevel = 'Ouro'; nextLevelXp = 2500; }
        else if (xp >= 2500 && xp < 5000) { level = 'Ouro'; nextLevel = 'Diamante'; nextLevelXp = 5000; }
        else if (xp >= 5000) { level = 'Diamante'; nextLevel = 'Lenda'; nextLevelXp = 10000; }
        const progress = Math.min(100, Math.floor((xp / nextLevelXp) * 100));
        const badgesRes = await pool.query(`SELECT b.*, (ub.user_id IS NOT NULL) as unlocked FROM badges b LEFT JOIN user_badges ub ON b.id = ub.badge_id AND ub.user_id = $1`, [req.user.id]);
        return res.json({ currentLevel: level, nextLevel, progress, xp, nextLevelXp, badges: badgesRes.rows.map((b: any) => ({ id: b.id, name: b.name, description: b.description, icon: b.icon, unlocked: b.unlocked })), benefits: ['Suporte Prioritário', 'Taxas Reduzidas'] });
    } catch { res.status(500).json({ error: 'Erro na gamificação' }); }
});

app.get('/api/notifications', authenticate, async (req: any, res) => {
    const result = await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    return res.json(result.rows.map((n: any) => ({ id: n.id.toString(), userId: n.user_id, type: n.type, title: n.title, message: n.message, read: n.is_read, createdAt: n.created_at })));
});

app.put('/api/notifications/:id/read', authenticate, async (req: any, res) => {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    return res.json({ success: true });
});

app.get('/api/wallet', authenticate, async (req: any, res) => {
    try {
        const transRes = await pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        const balance = transRes.rows.reduce((acc: number, t: any) => (t.type === 'INCOME' || t.type === 'DEPOSIT') ? acc + parseFloat(t.amount) : acc - parseFloat(t.amount), 0);
        return res.json({ balance, transactions: transRes.rows.map((t: any) => ({ id: t.id.toString(), type: t.type, amount: parseFloat(t.amount), description: t.description, date: t.created_at, status: t.status, relatedProposalId: t.related_proposal_id })) });
    } catch { res.status(500).json({ error: 'Erro na carteira' }); }
});

app.get('/api/admin/stats', authenticate, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const usersCount = (await pool.query('SELECT COUNT(*) FROM users')).rows[0].count;
    const jobsCount = (await pool.query("SELECT COUNT(*) FROM propostas WHERE status = 'OPEN'")).rows[0].count;
    return res.json({ totalUsers: parseInt(usersCount), activeJobs: parseInt(jobsCount), revenue: 12500.00, onlineUsers: 42 });
});

app.get('/api/admin/users', authenticate, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const result = await pool.query('SELECT * FROM users ORDER BY id DESC LIMIT 50');
    return res.json(result.rows.map(mapUserToFrontend));
});

app.put('/api/admin/users/:id/status', authenticate, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { status } = req.body;
    if (!['ACTIVE', 'PENDING', 'BLOCKED'].includes(status)) return res.status(400).json({ error: 'Status inválido.' });
    await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, req.params.id]);
    return res.json({ success: true });
});

app.post('/api/upload', upload.single('file'), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!process.env.CLOUDINARY_API_KEY) return res.json({ url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400' });
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

// --- DATABASE INIT ---
async function initDB() {
    try {
        const client = await pool.connect();
        console.log('✅ Database connected successfully');
        isDbConnected = true;
        try {
            await client.query('BEGIN');
            await client.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, nome VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, senha_hash VARCHAR(255) NOT NULL, role VARCHAR(50) NOT NULL DEFAULT 'CONTRACTOR', avatar_url TEXT, localizacao VARCHAR(255), telefone VARCHAR(50), bio TEXT, specialty TEXT, latitude DECIMAL(10,8), longitude DECIMAL(11,8), xp INTEGER DEFAULT 0, rating DECIMAL(3,2) DEFAULT 5.00, reviews_count INTEGER DEFAULT 0, status VARCHAR(50) DEFAULT 'ACTIVE', is_subscriber BOOLEAN DEFAULT FALSE, is_verified BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
            await client.query(`CREATE TABLE IF NOT EXISTS categories (id VARCHAR(50) PRIMARY KEY, name VARCHAR(100) NOT NULL, image_url TEXT);`);
            await client.query(`CREATE TABLE IF NOT EXISTS services (id VARCHAR(50) PRIMARY KEY, category_id VARCHAR(50) REFERENCES categories(id), name VARCHAR(100) NOT NULL, emoji VARCHAR(10), image_url TEXT, is_active BOOLEAN DEFAULT TRUE);`);
            await client.query(`CREATE TABLE IF NOT EXISTS propostas (id SERIAL PRIMARY KEY, contratante_id INTEGER REFERENCES users(id), profissional_id INTEGER REFERENCES users(id), titulo VARCHAR(255) NOT NULL, descricao TEXT, area_tag VARCHAR(100), localizacao VARCHAR(255), orcamento_estimado VARCHAR(100), target_professional_id INTEGER REFERENCES users(id), latitude DECIMAL(10,8), longitude DECIMAL(11,8), status VARCHAR(50) DEFAULT 'OPEN', data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP, data_conclusao TIMESTAMP, accepted_count INTEGER DEFAULT 0);`);
            await client.query(`CREATE TABLE IF NOT EXISTS chat_sessions (id SERIAL PRIMARY KEY, proposta_id INTEGER REFERENCES propostas(id), criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
            await client.query(`CREATE TABLE IF NOT EXISTS chat_messages (id SERIAL PRIMARY KEY, session_id INTEGER REFERENCES chat_sessions(id), sender_id INTEGER, texto TEXT, msg_type VARCHAR(50) DEFAULT 'text', metadata JSONB, is_system BOOLEAN DEFAULT FALSE, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
            await client.query(`CREATE TABLE IF NOT EXISTS avaliacoes (id SERIAL PRIMARY KEY, proposta_id INTEGER REFERENCES propostas(id), avaliador_id INTEGER REFERENCES users(id), alvo_id INTEGER REFERENCES users(id), nota INTEGER CHECK (nota >= 1 AND nota <= 5), comentario TEXT, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
            await client.query(`CREATE TABLE IF NOT EXISTS transactions (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), type VARCHAR(50) NOT NULL, amount DECIMAL(10,2) NOT NULL, description VARCHAR(255), status VARCHAR(50) DEFAULT 'COMPLETED', related_proposal_id INTEGER REFERENCES propostas(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
            await client.query(`CREATE TABLE IF NOT EXISTS portfolio (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), image_url TEXT NOT NULL, descricao TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
            await client.query(`CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), type VARCHAR(50) NOT NULL, title VARCHAR(255) NOT NULL, message TEXT, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
            await client.query(`CREATE TABLE IF NOT EXISTS badges (id VARCHAR(50) PRIMARY KEY, name VARCHAR(100) NOT NULL, description TEXT, icon VARCHAR(50));`);
            await client.query(`CREATE TABLE IF NOT EXISTS user_badges (user_id INTEGER REFERENCES users(id), badge_id VARCHAR(50) REFERENCES badges(id), unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, badge_id));`);

            await client.query(`INSERT INTO users (id, nome, email, senha_hash, role, avatar_url, specialty, rating, reviews_count, localizacao, latitude, longitude, xp, status) VALUES (901,'Marcos Dev','marcos@linka.com','$2a$10$abcdefghijklmnopqrstuv','PROFESSIONAL','https://images.unsplash.com/photo-1506794778202-cad84cf45f1d','Desenvolvedor Web',5.0,89,'Vila Madalena',-23.5489,-46.6860,5000,'ACTIVE'),(902,'Ana Tech','ana@linka.com','$2a$10$abcdefghijklmnopqrstuv','PROFESSIONAL','https://images.unsplash.com/photo-1534528741775-53994a69daeb','Suporte Técnico',4.8,210,'Pinheiros',-23.5663,-46.6924,3000,'ACTIVE'),(903,'Jane Demo','jane@linka.com','$2a$10$abcdefghijklmnopqrstuv','CONTRACTOR','https://i.pravatar.cc/150?u=jane',NULL,5.0,0,'São Paulo',-23.55,-46.63,0,'ACTIVE'),(904,'João Demo','joao@linka.com','$2a$10$abcdefghijklmnopqrstuv','PROFESSIONAL','https://i.pravatar.cc/150?u=joao','Eletricista',4.9,15,'São Paulo',-23.55,-46.63,1000,'ACTIVE') ON CONFLICT (id) DO NOTHING;`);

            await client.query(`INSERT INTO badges (id, name, description, icon) VALUES ('badge_early_adopter','Pioneiro','Um dos primeiros usuários do Linka Jobi.','Rocket'),('badge_verified','Verificado','Documentação aprovada.','ShieldCheck'),('badge_first_job','Primeiro Job','Concluiu o primeiro serviço.','Award'),('badge_top_rated','5 Estrelas','Recebeu 10 avaliações máximas.','Star') ON CONFLICT (id) DO NOTHING;`);

            await client.query(`INSERT INTO categories (id, name, image_url) VALUES ('cat_tech','Tecnologia','https://images.unsplash.com/photo-1518770660439-4636190af475'),('cat_home','Casa & Reforma','https://images.unsplash.com/photo-1581244277943-fe4a9c777189'),('cat_health','Saúde & Bem-estar','https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b'),('cat_education','Educação','https://images.unsplash.com/photo-1503676260728-1c00da094a0b'),('cat_events','Eventos & Lazer','https://images.unsplash.com/photo-1511795409834-ef04bbd61622'),('cat_business','Negócios','https://images.unsplash.com/photo-1454165804606-c3d57bc86b40'),('cat_beauty','Beleza','https://images.unsplash.com/photo-1560869713-7d0a29430803'),('cat_auto','Automotivo','https://images.unsplash.com/photo-1492144534655-ae79c964c9d7'),('cat_creative','Economia Criativa','https://images.unsplash.com/photo-1452860606245-08befc0ff44b'),('cat_community','Serviços Comunitários','https://images.unsplash.com/photo-1559027615-cd4628902d4a'),('cat_sustain','Sustentabilidade','https://images.unsplash.com/photo-1542601906990-b4d3fb778b09') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, image_url=EXCLUDED.image_url;`);

            await client.query(`INSERT INTO services (id, category_id, name, emoji, image_url) VALUES ('serv_dev','cat_tech','Desenvolvedor Web/App','💻','https://images.unsplash.com/photo-1498050108023-c5249f4df085'),('serv_support','cat_tech','Suporte Técnico','🛠️','https://images.unsplash.com/photo-1515378791036-0648a3ef77b2'),('serv_design','cat_tech','Designer Gráfico','🎨','https://images.unsplash.com/photo-1626785774573-4b799314346d'),('serv_video','cat_tech','Editor de Vídeo','🎬','https://images.unsplash.com/photo-1574717436423-a75a6802577b'),('serv_marketing','cat_tech','Gestor de Tráfego','📈','https://images.unsplash.com/photo-1460925895917-afdab827c52f'),('serv_network','cat_tech','Redes de Computadores','🌐','https://images.unsplash.com/photo-1544197150-b99a580bb7a8'),('serv_security','cat_tech','Segurança Digital','🔒','https://images.unsplash.com/photo-1563013544-824ae1b704d3'),('serv_pedreiro','cat_home','Pedreiro','🧱','https://images.unsplash.com/photo-1541888946425-d81bb19240f5'),('serv_eletricista','cat_home','Eletricista','⚡','https://images.unsplash.com/photo-1621905251189-08b45d6a269e'),('serv_encanador','cat_home','Encanador','🔧','https://images.unsplash.com/photo-1607472586893-edb57bdc0e39'),('serv_marido','cat_home','Marido de Aluguel','🔨','https://images.unsplash.com/photo-1581141849291-1125c7b692b5'),('serv_diarista','cat_home','Diarista','🧹','https://images.unsplash.com/photo-1527515663462-113180287041'),('serv_garden','cat_home','Jardinagem','🌿','https://images.unsplash.com/photo-1416879595882-3373a0480b5b'),('serv_furniture','cat_home','Montador de Móveis','🪑','https://images.unsplash.com/photo-1595428774223-ef52624120d2'),('serv_personal','cat_health','Personal Trainer','💪','https://images.unsplash.com/photo-1517836357463-d25dfeac3438'),('serv_psy','cat_health','Psicólogo','🧠','https://images.unsplash.com/photo-1576091160399-112ba8d25d1d'),('serv_nutrition','cat_health','Nutricionista','🥗','https://images.unsplash.com/photo-1490645935967-10de6ba17061'),('serv_yoga','cat_health','Instrutor de Yoga','🧘','https://images.unsplash.com/photo-1544367563-12123d8965cd'),('serv_care','cat_health','Cuidador de Idosos','👵','https://images.unsplash.com/photo-1576765608535-5f04d1e3f289'),('serv_english','cat_education','Professor de Inglês','🇺🇸','https://images.unsplash.com/photo-1546410531-bb4caa6b424d'),('serv_math','cat_education','Reforço Escolar','📚','https://images.unsplash.com/photo-1434030216411-0b793f4b4173'),('serv_music','cat_education','Aulas de Música','🎵','https://images.unsplash.com/photo-1514320291940-7cea59dc6a00'),('serv_photo','cat_events','Fotógrafo','📸','https://images.unsplash.com/photo-1516035069371-29a1b244cc32'),('serv_dj','cat_events','DJ e Som','🎧','https://images.unsplash.com/photo-1516280440614-6697288d5d38'),('serv_buffet','cat_events','Buffet / Churrasqueiro','🍖','https://images.unsplash.com/photo-1555244162-803834f70033'),('serv_account','cat_business','Contabilidade','📊','https://images.unsplash.com/photo-1554224155-6726b3ff858f'),('serv_legal','cat_business','Advogado','⚖️','https://images.unsplash.com/photo-1589829085413-56de8ae18c73'),('serv_trans','cat_business','Tradutor','🗣️','https://images.unsplash.com/photo-1455390582262-044cdead277a'),('serv_makeup','cat_beauty','Maquiadora','💄','https://images.unsplash.com/photo-1487412947132-232a8408a360'),('serv_hair','cat_beauty','Cabeleireiro(a)','💇','https://images.unsplash.com/photo-1560869713-7d0a29430803'),('serv_manicure','cat_beauty','Manicure/Pedicure','💅','https://images.unsplash.com/photo-1632345031435-8727f6897d53'),('serv_barber','cat_beauty','Barbeiro','💈','https://images.unsplash.com/photo-1503951914875-befbb6491842'),('serv_mech','cat_auto','Mecânico','🔧','https://images.unsplash.com/photo-1487754180477-9b832f22595b'),('serv_wash','cat_auto','Lavagem Ecológica','🚿','https://images.unsplash.com/photo-1520340356584-7c994887e9f0'),('serv_repair_small','cat_auto','Pequenos Reparos','🔨','https://images.unsplash.com/photo-1625047509168-a7026f36de04'),('serv_crafts','cat_creative','Artesanato Personalizado','🧶','https://images.unsplash.com/photo-1452860606245-08befc0ff44b'),('serv_sewing','cat_creative','Costura e Reparos','🧵','https://images.unsplash.com/photo-1556740738-b6a63e27c4df'),('serv_painting_art','cat_creative','Pintura Artística','🖌️','https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b'),('serv_pet','cat_community','Passeador de Cães','🐕','https://images.unsplash.com/photo-1583511655857-d19b40a7a54e'),('serv_delivery','cat_community','Entregas Locais','📦','https://images.unsplash.com/photo-1616401784845-180882ba9ba8'),('serv_cooking','cat_community','Cozinheira(o) a Domicílio','🍳','https://images.unsplash.com/photo-1556910103-1c02745a30bf'),('serv_solar','cat_sustain','Manutenção Solar','☀️','https://images.unsplash.com/photo-1509391366360-2e959784a276'),('serv_recycle','cat_sustain','Coleta Seletiva','♻️','https://images.unsplash.com/photo-1532996122724-e3c354a0b15b'),('serv_repair_elect','cat_sustain','Reparo Eletrodomésticos','🔌','https://images.unsplash.com/photo-1581092921461-eab62e97a782') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, emoji=EXCLUDED.emoji, image_url=EXCLUDED.image_url, category_id=EXCLUDED.category_id;`);

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
            const io = new Server(httpServer, { cors: { origin: "*", methods: ["GET", "POST"] } });
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