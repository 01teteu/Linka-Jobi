-- ============================================
-- SCHEMA COMPLETO - Linka Jobi
-- Substitui o schema.sql anterior
-- ============================================

-- LIMPEZA COMPLETA (Ordem correta para evitar erros de Foreign Key)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS portfolio CASCADE;
DROP TABLE IF EXISTS avaliacoes CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS propostas CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. TABELAS DE CATÁLOGO
CREATE TABLE categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    image_url TEXT
);

CREATE TABLE services (
    id VARCHAR(50) PRIMARY KEY,
    category_id VARCHAR(50) REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    emoji VARCHAR(10),
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. USUÁRIOS
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('CONTRACTOR', 'PROFESSIONAL', 'ADMIN')),
    avatar_url TEXT,
    telefone VARCHAR(20),
    documento VARCHAR(20),
    localizacao VARCHAR(100) DEFAULT 'São Paulo, SP',
    latitude FLOAT DEFAULT -23.550520,
    longitude FLOAT DEFAULT -46.633308,
    bio TEXT,
    specialty TEXT,
    meios_pagamento TEXT,
    rating DECIMAL(3,1) DEFAULT 5.0,
    reviews_count INT DEFAULT 0,
    xp INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'BLOCKED')),
    is_subscriber BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. PROPOSTAS (JOBS)
CREATE TABLE propostas (
    id SERIAL PRIMARY KEY,
    contratante_id INT REFERENCES users(id) ON DELETE CASCADE,
    profissional_id INT REFERENCES users(id),
    target_professional_id INT REFERENCES users(id),
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT NOT NULL,
    area_tag VARCHAR(100),
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'NEGOTIATING', 'COMPLETED')),
    localizacao VARCHAR(100),
    orcamento_estimado VARCHAR(100),
    latitude FLOAT,
    longitude FLOAT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_conclusao TIMESTAMP,
    accepted_count INT DEFAULT 0
);

-- 4. AVALIAÇÕES
CREATE TABLE avaliacoes (
    id SERIAL PRIMARY KEY,
    proposta_id INT REFERENCES propostas(id) ON DELETE CASCADE,
    avaliador_id INT REFERENCES users(id),
    alvo_id INT REFERENCES users(id),
    nota INT CHECK (nota >= 1 AND nota <= 5),
    comentario TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. CHAT
CREATE TABLE chat_sessions (
    id SERIAL PRIMARY KEY,
    proposta_id INT REFERENCES propostas(id) ON DELETE CASCADE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_id INT REFERENCES users(id),
    texto TEXT,
    msg_type VARCHAR(20) DEFAULT 'text',
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_system BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE
);

-- 6. PORTFOLIO
CREATE TABLE portfolio (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    descricao TEXT
);

-- 7. NOTIFICAÇÕES
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action_link TEXT
);

-- 8. GAMIFICAÇÃO
CREATE TABLE badges (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50)
);

CREATE TABLE user_badges (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    badge_id VARCHAR(50) REFERENCES badges(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, badge_id)
);

-- 9. CARTEIRA
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'WITHDRAW', 'DEPOSIT')),
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'COMPLETED',
    related_proposal_id INT REFERENCES propostas(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_propostas_status ON propostas(status);
CREATE INDEX idx_propostas_geo ON propostas(latitude, longitude);
CREATE INDEX idx_chat_msgs_session ON chat_messages(session_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);

-- ============================================
-- SEED: CATEGORIAS
-- ============================================
INSERT INTO categories (id, name, image_url) VALUES
('cat_tech',        'Tecnologia',            'https://images.unsplash.com/photo-1518770660439-4636190af475'),
('cat_home',        'Casa & Reforma',         'https://images.unsplash.com/photo-1581244277943-fe4a9c777189'),
('cat_beauty',      'Beleza',                'https://images.unsplash.com/photo-1560869713-7d0a29430803'),
('cat_auto',        'Automotivo',            'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7'),
('cat_health',      'Saúde & Bem-estar',     'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b'),
('cat_education',   'Educação',              'https://images.unsplash.com/photo-1503676260728-1c00da094a0b'),
('cat_events',      'Eventos & Lazer',       'https://images.unsplash.com/photo-1492684223066-81342ee5ff30'),
('cat_business',    'Negócios',              'https://images.unsplash.com/photo-1507679799987-c73779587ccf'),
('cat_creative',    'Economia Criativa',     'https://images.unsplash.com/photo-1513364776144-60967b0f800f'),
('cat_sustain',     'Sustentabilidade',      'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d'),
('cat_community',   'Serviços Comunitários', 'https://images.unsplash.com/photo-1559027615-cd4628902d4a');

-- ============================================
-- SEED: SERVIÇOS - Tecnologia
-- ============================================
INSERT INTO services (id, category_id, name, emoji, image_url) VALUES
('serv_dev_web',    'cat_tech', 'Desenvolvedor Web/App',   '💻', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085'),
('serv_suporte',    'cat_tech', 'Suporte Técnico',         '🖥️', 'https://images.unsplash.com/photo-1588702547923-7093a6c3ba33'),
('serv_design',     'cat_tech', 'Designer Gráfico',        '🎨', 'https://images.unsplash.com/photo-1561070791-2526d30994b5'),
('serv_video',      'cat_tech', 'Editor de Vídeo',         '🎬', 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d'),
('serv_trafego',    'cat_tech', 'Gestor de Tráfego',       '📊', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f'),
('serv_redes',      'cat_tech', 'Redes de Computadores',   '🌐', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8'),
('serv_segdigital', 'cat_tech', 'Segurança Digital',       '🔒', 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b');

-- ============================================
-- SEED: SERVIÇOS - Casa & Reforma
-- ============================================
INSERT INTO services (id, category_id, name, emoji, image_url) VALUES
('serv_pedreiro',   'cat_home', 'Pedreiro',            '🧱', 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5'),
('serv_eletricista','cat_home', 'Eletricista',         '⚡', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e'),
('serv_encanador',  'cat_home', 'Encanador',           '🔧', 'https://images.unsplash.com/photo-1585771724684-38269d6639fd'),
('serv_marido',     'cat_home', 'Marido de Aluguel',   '🔨', 'https://images.unsplash.com/photo-1504148455328-c376907d081c'),
('serv_diarista',   'cat_home', 'Diarista',            '🧹', 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac'),
('serv_jardinagem', 'cat_home', 'Jardinagem',          '🌿', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b'),
('serv_moveis',     'cat_home', 'Montador de Móveis',  '🪑', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc');

-- ============================================
-- SEED: SERVIÇOS - Beleza
-- ============================================
INSERT INTO services (id, category_id, name, emoji, image_url) VALUES
('serv_maquiadora', 'cat_beauty', 'Maquiadora',         '💄', 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2'),
('serv_cabelereiro','cat_beauty', 'Cabeleireiro(a)',     '✂️', 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f'),
('serv_manicure',   'cat_beauty', 'Manicure/Pedicure',  '💅', 'https://images.unsplash.com/photo-1632345031435-8727f6897d53'),
('serv_barbeiro',   'cat_beauty', 'Barbeiro',            '🪒', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1');

-- ============================================
-- SEED: SERVIÇOS - Automotivo
-- ============================================
INSERT INTO services (id, category_id, name, emoji, image_url) VALUES
('serv_mecanico',   'cat_auto', 'Mecânico',            '🔩', 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f'),
('serv_lavagem',    'cat_auto', 'Lavagem Ecológica',   '🚗', 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f'),
('serv_rep_auto',   'cat_auto', 'Pequenos Reparos',    '🛠️', 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3');

-- ============================================
-- SEED: SERVIÇOS - Saúde & Bem-estar
-- ============================================
INSERT INTO services (id, category_id, name, emoji, image_url) VALUES
('serv_personal',   'cat_health', 'Personal Trainer',      '🏋️', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b'),
('serv_psicologo',  'cat_health', 'Psicólogo',             '🧠', 'https://images.unsplash.com/photo-1573497620053-ea5300f94f21'),
('serv_nutri',      'cat_health', 'Nutricionista',         '🥗', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061'),
('serv_yoga',       'cat_health', 'Instrutor de Yoga',     '🧘', 'https://images.unsplash.com/photo-1545389336-cf090694435e'),
('serv_idosos',     'cat_health', 'Cuidador de Idosos',    '🤝', 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca');

-- ============================================
-- SEED: SERVIÇOS - Educação
-- ============================================
INSERT INTO services (id, category_id, name, emoji, image_url) VALUES
('serv_ingles',     'cat_education', 'Professor de Inglês', '🗣️', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b'),
('serv_reforco',    'cat_education', 'Reforço Escolar',     '📚', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173'),
('serv_musica',     'cat_education', 'Aulas de Música',     '🎸', 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1');

-- ============================================
-- SEED: SERVIÇOS - Eventos & Lazer
-- ============================================
INSERT INTO services (id, category_id, name, emoji, image_url) VALUES
('serv_fotografo',  'cat_events', 'Fotógrafo',             '📷', 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd'),
('serv_dj',         'cat_events', 'DJ e Som',              '🎧', 'https://images.unsplash.com/photo-1571266028243-d220c6a7c578'),
('serv_buffet',     'cat_events', 'Buffet / Churrasqueiro','🍖', 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd');

-- ============================================
-- SEED: SERVIÇOS - Negócios
-- ============================================
INSERT INTO services (id, category_id, name, emoji, image_url) VALUES
('serv_contador',   'cat_business', 'Contabilidade', '📒', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f'),
('serv_advogado',   'cat_business', 'Advogado',      '⚖️', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f'),
('serv_tradutor',   'cat_business', 'Tradutor',      '🌍', 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8');

-- ============================================
-- SEED: SERVIÇOS - Economia Criativa
-- ============================================
INSERT INTO services (id, category_id, name, emoji, image_url) VALUES
('serv_artesanato', 'cat_creative', 'Artesanato Personalizado', '🎭', 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b'),
('serv_costura',    'cat_creative', 'Costura e Reparos',        '🧵', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64'),
('serv_pintura',    'cat_creative', 'Pintura Artística',        '🖌️', 'https://images.unsplash.com/photo-1513364776144-60967b0f800f');

-- ============================================
-- SEED: SERVIÇOS - Sustentabilidade
-- ============================================
INSERT INTO services (id, category_id, name, emoji, image_url) VALUES
('serv_solar',      'cat_sustain', 'Manutenção Solar',        '☀️', 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d'),
('serv_coleta',     'cat_sustain', 'Coleta Seletiva',         '♻️', 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b'),
('serv_rep_eletro', 'cat_sustain', 'Reparo Eletrodomésticos', '🔌', 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789');

-- ============================================
-- SEED: SERVIÇOS - Serviços Comunitários
-- ============================================
INSERT INTO services (id, category_id, name, emoji, image_url) VALUES
('serv_passeador',  'cat_community', 'Passeador de Cães',        '🐕', 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b'),
('serv_entrega',    'cat_community', 'Entregas Locais',           '📦', 'https://images.unsplash.com/photo-1568393691622-c7ba131d1b16'),
('serv_cozinheira', 'cat_community', 'Cozinheira(o) a Domicílio','👨‍🍳', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136');

-- ============================================
-- SEED: BADGES
-- ============================================
INSERT INTO badges (id, name, description, icon) VALUES
('badge_early_adopter', 'Pioneiro',     'Um dos primeiros usuários do Linka Jobi.', 'Rocket'),
('badge_verified',      'Verificado',   'Documentação aprovada e identidade confirmada.', 'ShieldCheck'),
('badge_first_job',     'Primeiro Job', 'Concluiu o primeiro serviço com sucesso.', 'Award'),
('badge_top_rated',     '5 Estrelas',   'Recebeu 10 avaliações com nota máxima.', 'Star');

-- ============================================
-- SEED: ADMIN (Senha: 123456)
-- ============================================
INSERT INTO users (nome, email, senha_hash, role, avatar_url, bio, specialty, meios_pagamento, is_subscriber, is_verified, latitude, longitude, xp) VALUES 
('Comandante Jobi', 'admin@linka.com', '$2a$10$yFdCeNO8KsDMq0GDk3VGUul2NRYktWL8BvJy2sqMscrjMyBkz6pVe', 'ADMIN', 'https://ui-avatars.com/api/?name=Admin&background=101828&color=fff', 'Admin do sistema', null, null, true, true, -23.5505, -46.6333, 9999);

INSERT INTO user_badges (user_id, badge_id) VALUES (1, 'badge_early_adopter');