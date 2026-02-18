
import dotenv from 'dotenv';
import Fastify from 'fastify';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';

dotenv.config();

const { Pool } = pg;
const fastify = Fastify({ logger: true });

const JWT_SECRET = process.env.JWT_SECRET || 'segredo_super_secreto_linka_jobi_2024';
const DB_CONNECTION = process.env.DATABASE_URL;
const PORT = process.env.PORT || 3000;

const pool = new Pool({ 
    connectionString: DB_CONNECTION,
    ssl: { rejectUnauthorized: false }
});

await fastify.register(cors, { origin: true, credentials: true });
await fastify.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

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

const formatUser = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        name: row.nome,
        email: row.email,
        role: row.role,
        avatarUrl: row.avatar_url,
        location: row.localizacao,
        coordinates: { lat: row.latitude || -23.55, lng: row.longitude || -46.63 },
        phone: row.telefone,
        bio: row.bio,
        specialty: row.specialty,
        rating: row.rating ? parseFloat(row.rating) : 5.0,
        reviewsCount: row.reviews_count || 0,
        status: row.status || 'ACTIVE',
        isSubscriber: row.is_subscriber
    };
};

const formatProposal = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        contractorId: row.contratante_id,
        contractorName: row.contractor_name || 'Usuário',
        contractorAvatar: row.contractor_avatar,
        title: row.titulo,
        description: row.descricao,
        areaTag: row.area_tag,
        status: row.status,
        location: row.localizacao,
        coordinates: { lat: row.latitude, lng: row.longitude },
        budgetRange: row.orcamento_estimado,
        createdAt: row.data_criacao,
        acceptedByCount: row.accepted_count || 0,
        distanceKm: row.distance_km ? parseFloat(row.distance_km).toFixed(1) : null
    };
};

// --- AUTH ROUTES ---

fastify.post('/api/register', async (request, reply) => {
    try {
        const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
        const { name, email, password, role, phone, location, specialty, avatarUrl } = body;

        const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) return reply.code(400).send({ error: 'E-mail já cadastrado.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Simulação de coordenadas para novos usuários (SP Centro com pequena variação randômica)
        const lat = -23.5505 + (Math.random() * 0.05 - 0.025);
        const lng = -46.6333 + (Math.random() * 0.05 - 0.025);

        const res = await pool.query(
            `INSERT INTO users (nome, email, senha_hash, role, telefone, localizacao, latitude, longitude, specialty, avatar_url, bio)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [name, email, hashedPassword, role, phone, location, lat, lng, specialty, avatarUrl || `https://ui-avatars.com/api/?name=${name}`, 'Novo no Linka Jobi']
        );

        const newUser = res.rows[0];
        const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

        return reply.send({ user: formatUser(newUser), token });
    } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ error: 'Erro ao criar conta.' });
    }
});

fastify.post('/api/login', async (request, reply) => {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    const { email, senha } = body;
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (res.rows.length === 0) return reply.code(400).send({ error: 'E-mail não encontrado.' });
    
    const user = res.rows[0];
    if (user.status === 'BLOCKED') return reply.code(403).send({ error: 'Sua conta está suspensa.' });

    const validPassword = await bcrypt.compare(senha, user.senha_hash);
    if (!validPassword) return reply.code(401).send({ error: 'Senha incorreta.' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    return reply.send({ user: formatUser(user), token });
});

fastify.post('/api/forgot-password', async (request, reply) => {
    return reply.send({ success: true, message: 'Se o e-mail existir, enviamos um link.' });
});

// --- UPLOAD ROUTE ---
fastify.post('/api/upload', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.code(400).send({ error: "Nenhum arquivo enviado" });
    const buffer = await data.toBuffer();
    const base64 = buffer.toString('base64');
    const mimeType = data.mimetype;
    return reply.send({ url: `data:${mimeType};base64,${base64}` });
});

// --- USER ROUTES ---

fastify.get('/api/me', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [request.user.id]);
    if (res.rows.length === 0) return reply.code(404).send({ error: "Usuário não encontrado" });
    return reply.send({ user: formatUser(res.rows[0]) });
});

fastify.put('/api/users/:id', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const userId = parseInt(request.params.id);
    if (request.user.id !== userId && request.user.role !== 'ADMIN') return reply.code(403).send({ error: "Acesso negado" });

    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    const { name, location, phone, bio, avatarUrl } = body;
    
    const res = await pool.query(
        `UPDATE users SET 
         nome = COALESCE($1, nome),
         localizacao = COALESCE($2, localizacao),
         telefone = COALESCE($3, telefone),
         bio = COALESCE($4, bio),
         avatar_url = COALESCE($5, avatar_url)
         WHERE id = $6 RETURNING *`,
        [name, location, phone, bio, avatarUrl, userId]
    );

    return reply.send(formatUser(res.rows[0]));
});

fastify.get('/api/users/:id/public_profile', async (req, reply) => {
    const userId = parseInt(req.params.id);
    try {
        const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return reply.code(404).send({ error: "Profissional não encontrado" });
        const user = formatUser(userRes.rows[0]);
        const portRes = await pool.query('SELECT * FROM portfolio WHERE user_id = $1 ORDER BY id DESC', [userId]);
        const portfolio = portRes.rows.map(p => ({ id: p.id, imageUrl: p.image_url, description: p.descricao }));
        const reviewsRes = await pool.query(`SELECT a.id, a.nota as rating, a.comentario as comment, a.criado_em as "createdAt", u.nome as "reviewerName" FROM avaliacoes a JOIN users u ON a.avaliador_id = u.id WHERE a.alvo_id = $1 ORDER BY a.criado_em DESC LIMIT 10`, [userId]);
        return reply.send({ user, portfolio, reviews: reviewsRes.rows });
    } catch (err) {
        return reply.code(500).send({ error: "Erro ao buscar perfil" });
    }
});

// --- PROPOSAL ROUTES ---

fastify.get('/api/proposals', async (req, reply) => {
    // Parâmetros de Filtro: Area, Latitude, Longitude, Radius (km), ContractorId
    const { page = 1, limit = 10, area, lat, lng, radius, contractorId } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    
    let querySelect = `
        SELECT p.*, u.nome as contractor_name, u.avatar_url as contractor_avatar 
    `;
    
    // Cálculo de Distância (Haversine) se lat/lng fornecidos
    if (lat && lng) {
        querySelect += `, 
        (6371 * acos(
            cos(radians($${params.length + 1})) * cos(radians(p.latitude)) * 
            cos(radians(p.longitude) - radians($${params.length + 2})) + 
            sin(radians($${params.length + 1})) * sin(radians(p.latitude))
        )) AS distance_km`;
        params.push(lat, lng);
    } else {
        querySelect += `, NULL as distance_km`;
    }

    let queryFrom = `
        FROM propostas p
        JOIN users u ON p.contratante_id = u.id
        WHERE p.status = 'OPEN'
    `;

    // Filtro por Área
    if (area) {
        queryFrom += ` AND p.area_tag = $${params.length + 1}`;
        params.push(area);
    }

    // Filtro por Contractor ID (Para "Meus Pedidos")
    if (contractorId) {
        queryFrom += ` AND p.contratante_id = $${params.length + 1}`;
        params.push(contractorId);
    }

    // Filtro por Raio (Distance < Radius)
    if (lat && lng && radius && radius !== 'Infinity') {
        const r = parseFloat(radius);
        queryFrom += ` AND (6371 * acos(
            cos(radians($1)) * cos(radians(p.latitude)) * 
            cos(radians(p.longitude) - radians($2)) + 
            sin(radians($1)) * sin(radians(p.latitude))
        )) < $${params.length + 1}`;
        params.push(r);
    }
    
    let queryOrder = ` ORDER BY p.data_criacao DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    
    // Se tiver geolocalização, ordena por proximidade primeiro (se não estiver filtrando por contratante)
    if (lat && lng && !contractorId) {
        queryOrder = ` ORDER BY distance_km ASC, p.data_criacao DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    }

    params.push(limit, offset);

    try {
        const fullQuery = querySelect + queryFrom + queryOrder;
        const res = await pool.query(fullQuery, params);
        return reply.send(res.rows.map(formatProposal));
    } catch (err) {
        fastify.log.error(err);
        return reply.send([]);
    }
});

fastify.post('/api/proposals', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    if (req.user.role !== 'CONTRACTOR' && req.user.role !== 'ADMIN') {
        return reply.code(403).send({ error: "Apenas contratantes podem criar pedidos." });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { title, description, areaTag, budgetRange, location, targetProfessionalId, coordinates } = body;
    
    // Usa coordenadas enviadas ou fallback
    const lat = coordinates?.lat || -23.5505;
    const lng = coordinates?.lng || -46.6333;

    try {
        const res = await pool.query(
            `INSERT INTO propostas 
            (contratante_id, titulo, descricao, area_tag, orcamento_estimado, localizacao, latitude, longitude, target_professional_id, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'OPEN')
            RETURNING *`,
            [req.user.id, title, description, areaTag, budgetRange, location, lat, lng, targetProfessionalId]
        );

        const row = res.rows[0];
        const userRes = await pool.query('SELECT nome, avatar_url FROM users WHERE id = $1', [req.user.id]);
        const user = userRes.rows[0];
        row.contractor_name = user.nome;
        row.contractor_avatar = user.avatar_url;

        return reply.send(formatProposal(row));
    } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ error: "Erro ao criar proposta" });
    }
});

fastify.post('/api/proposals/:id/accept', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    if (req.user.role !== 'PROFESSIONAL') return reply.code(403).send({ error: "Apenas profissionais podem aceitar jobs." });

    const proposalId = req.params.id;
    const professionalId = req.user.id;

    try {
        await pool.query('BEGIN');
        const propRes = await pool.query(
            `UPDATE propostas SET status = 'NEGOTIATING', profissional_id = $1 WHERE id = $2 AND status = 'OPEN' RETURNING *`,
            [professionalId, proposalId]
        );

        if (propRes.rows.length === 0) {
            await pool.query('ROLLBACK');
            return reply.code(400).send({ error: "Proposta não disponível." });
        }
        
        const chatRes = await pool.query(`INSERT INTO chat_sessions (proposta_id) VALUES ($1) RETURNING id`, [proposalId]);
        const chatId = chatRes.rows[0].id;
        await pool.query(`INSERT INTO chat_messages (session_id, sender_id, texto, is_system) VALUES ($1, $2, 'Job Aceito! Negociem os detalhes aqui.', TRUE)`, [chatId, professionalId]);

        await pool.query('COMMIT');
        return reply.send({ success: true, chatId });
    } catch (err) {
        await pool.query('ROLLBACK');
        return reply.code(500).send({ error: "Erro ao aceitar job." });
    }
});

fastify.post('/api/proposals/:id/complete', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const proposalId = req.params.id;
    try {
        const check = await pool.query('SELECT contratante_id FROM propostas WHERE id = $1', [proposalId]);
        if (check.rows.length === 0 || check.rows[0].contratante_id !== req.user.id) {
            return reply.code(403).send({ error: "Acesso negado." });
        }
        await pool.query("UPDATE propostas SET status = 'COMPLETED' WHERE id = $1", [proposalId]);
        return reply.send({ success: true });
    } catch (err) {
        return reply.code(500).send({ error: "Erro ao finalizar." });
    }
});

// --- ADMIN & DATA ROUTES ---

fastify.get('/api/admin/stats', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    if (req.user.role !== 'ADMIN') return reply.code(403).send({ error: "Acesso negado." });
    const users = await pool.query('SELECT COUNT(*) FROM users');
    const jobs = await pool.query('SELECT COUNT(*) FROM propostas');
    const blocked = await pool.query("SELECT COUNT(*) FROM users WHERE status = 'BLOCKED'");
    return reply.send({
        totalUsers: parseInt(users.rows[0].count),
        activeJobs: parseInt(jobs.rows[0].count),
        revenue: 14500.00,
        reportsPending: parseInt(blocked.rows[0].count),
        onlineUsers: 42,
        loggedInUsers: parseInt(users.rows[0].count)
    });
});

fastify.get('/api/admin/users', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    if (req.user.role !== 'ADMIN') return reply.code(403).send({ error: "Acesso negado." });
    const res = await pool.query('SELECT * FROM users ORDER BY data_criacao DESC');
    return reply.send(res.rows.map(formatUser));
});

fastify.put('/api/admin/users/:id/status', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    if (req.user.role !== 'ADMIN') return reply.code(403).send({ error: "Acesso negado." });
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    await pool.query('UPDATE users SET status = $1 WHERE id = $2', [body.status, req.params.id]);
    return reply.send({ success: true });
});

fastify.post('/api/reviews', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { proposalId, targetId, rating, comment } = body;
    await pool.query(
        'INSERT INTO avaliacoes (proposta_id, avaliador_id, alvo_id, nota, comentario) VALUES ($1, $2, $3, $4, $5)',
        [proposalId, req.user.id, targetId, rating, comment]
    );
    await pool.query(`
        UPDATE users SET 
        rating = (SELECT AVG(nota) FROM avaliacoes WHERE alvo_id = $1),
        reviews_count = (SELECT COUNT(*) FROM avaliacoes WHERE alvo_id = $1)
        WHERE id = $1`, [targetId]
    );
    return reply.send({ success: true });
});

fastify.get('/api/chats', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    let query, params;
    if (req.user.role === 'ADMIN') {
        query = `SELECT cs.id, cs.proposta_id, p.titulo, p.status as p_status, uc.nome as c_nome, uc.avatar_url as c_avatar, uc.id as c_id, up.nome as p_nome, up.avatar_url as p_avatar, up.id as p_id FROM chat_sessions cs JOIN propostas p ON cs.proposta_id = p.id JOIN users uc ON p.contratante_id = uc.id LEFT JOIN users up ON p.profissional_id = up.id ORDER BY cs.criado_em DESC`;
        params = [];
    } else {
        query = `SELECT cs.id, cs.proposta_id, p.titulo, p.status as p_status, uc.nome as c_nome, uc.avatar_url as c_avatar, uc.id as c_id, up.nome as p_nome, up.avatar_url as p_avatar, up.id as p_id FROM chat_sessions cs JOIN propostas p ON cs.proposta_id = p.id JOIN users uc ON p.contratante_id = uc.id LEFT JOIN users up ON p.profissional_id = up.id WHERE p.contratante_id = $1 OR p.profissional_id = $1 ORDER BY cs.criado_em DESC`;
        params = [req.user.id];
    }
    const res = await pool.query(query, params);
    const chats = await Promise.all(res.rows.map(async s => {
        const msgs = await pool.query(`SELECT id, sender_id as "senderId", texto as text, msg_type as type, metadata, to_char(timestamp, 'HH24:MI') as timestamp, is_system as "isSystem" FROM chat_messages WHERE session_id = $1 ORDER BY id ASC`, [s.id]);
        const other = req.user.id === s.c_id 
            ? { id: s.p_id, name: s.p_nome || 'Aguardando...', avatar: s.p_avatar } 
            : { id: s.c_id, name: s.c_nome, avatar: s.c_avatar };
        return {
            id: s.id,
            proposalId: s.proposta_id,
            proposalTitle: s.titulo,
            proposalStatus: s.p_status,
            contractorId: s.c_id,
            professionalId: s.p_id,
            participants: [{id: req.user.id, name: 'Eu', avatar: ''}, other],
            messages: msgs.rows,
            lastMessage: msgs.rows[msgs.rows.length-1]?.text || 'Conversa iniciada',
            unreadCount: 0
        };
    }));
    return reply.send(chats);
});

fastify.post('/api/messages', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { chatId, text, type, mediaUrl, scheduleData } = body;
    await pool.query(
        'INSERT INTO chat_messages (session_id, sender_id, texto, msg_type, metadata) VALUES ($1, $2, $3, $4, $5)',
        [chatId, req.user.id, text, type, JSON.stringify({ mediaUrl, scheduleData })]
    );
    return reply.send({ success: true });
});

fastify.get('/api/categories', async (req, reply) => {
    try {
        const res = await pool.query('SELECT * FROM categories');
        return reply.send(res.rows.map(c => ({ id: c.id, name: c.name, imageUrl: c.image_url })));
    } catch(e) { return reply.send([]); }
});

fastify.get('/api/services', async (req, reply) => {
    try {
        const res = await pool.query('SELECT * FROM services WHERE is_active = TRUE');
        return reply.send(res.rows.map(s => ({ id: s.id, name: s.name, categoryId: s.category_id, emoji: s.emoji, isActive: s.is_active, imageUrl: s.image_url })));
    } catch(e) { return reply.send([]); }
});

fastify.get('/api/professionals/top', async (req, reply) => {
    try {
        const res = await pool.query("SELECT * FROM users WHERE role = 'PROFESSIONAL' AND status = 'ACTIVE' ORDER BY rating DESC LIMIT 6");
        return reply.send(res.rows.map(formatUser));
    } catch(e) { return reply.send([]); }
});

fastify.get('/api/appointments', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    // Inclui OPEN status se for o contratante (para aparecer na agenda como pendente)
    const query = `
        SELECT p.id, p.titulo, p.localizacao, p.data_criacao,
               u.nome as other_name, u.avatar_url as other_avatar,
               cs.id as chat_id, p.status
        FROM propostas p
        LEFT JOIN chat_sessions cs ON cs.proposta_id = p.id
        LEFT JOIN users u ON (CASE WHEN p.contratante_id = $1 THEN p.profissional_id ELSE p.contratante_id END) = u.id
        WHERE (p.contratante_id = $1 OR p.profissional_id = $1)
        AND (
            p.status IN ('NEGOTIATING', 'COMPLETED') 
            OR (p.status = 'OPEN' AND p.contratante_id = $1)
        )
    `;
    try {
        const res = await pool.query(query, [req.user.id]);
        return reply.send(res.rows.map(r => ({
            id: `job_${r.id}`,
            chatId: r.chat_id,
            title: r.titulo,
            withUser: r.other_name || 'Aguardando Profissional',
            avatarUrl: r.other_avatar || 'https://ui-avatars.com/api/?name=A&background=f3f4f6&color=6b7280',
            date: new Date(r.data_criacao).toISOString().split('T')[0],
            time: new Date(r.data_criacao).toLocaleTimeString().slice(0,5),
            status: r.status === 'OPEN' ? 'PENDING' : 'CONFIRMED',
            location: r.localizacao,
            isProposal: r.status === 'OPEN'
        })));
    } catch(e) { return reply.send([]); }
});

const start = async () => {
    try { await fastify.listen({ port: PORT, host: '0.0.0.0' }); } 
    catch (err) { fastify.log.error(err); process.exit(1); }
};
start();
