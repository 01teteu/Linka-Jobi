
-- LIMPEZA COMPLETA (Ordem correta para evitar erros de Foreign Key)
DROP TABLE IF EXISTS portfolio CASCADE;
DROP TABLE IF EXISTS avaliacoes CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS propostas CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. TABELAS DE CATÁLOGO (Serviços Oferecidos)
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
-- Adicionado 'meios_pagamento' para informar como o profissional aceita receber (já que não há carteira no app)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('CONTRACTOR', 'PROFESSIONAL', 'ADMIN')),
    avatar_url TEXT,
    telefone VARCHAR(20),
    localizacao VARCHAR(100) DEFAULT 'São Paulo, SP',
    latitude FLOAT DEFAULT -23.550520, 
    longitude FLOAT DEFAULT -46.633308,
    bio TEXT,
    specialty TEXT, -- Ex: "Eletricista, Encanador"
    meios_pagamento TEXT, -- Ex: "Pix, Dinheiro, Cartão de Crédito"
    rating DECIMAL(3,1) DEFAULT 5.0,
    reviews_count INT DEFAULT 0,
    xp INT DEFAULT 0, -- Gamificação (nível)
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'BLOCKED')),
    is_subscriber BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. PROPOSTAS (JOBS)
-- Sem lógica de retenção de valor. O status COMPLETED indica que o serviço foi feito e acertado fora do app.
CREATE TABLE propostas (
    id SERIAL PRIMARY KEY,
    contratante_id INT REFERENCES users(id) ON DELETE CASCADE,
    profissional_id INT REFERENCES users(id), -- Preenchido quando aceito
    target_professional_id INT REFERENCES users(id), -- Se for um convite direto
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT NOT NULL,
    area_tag VARCHAR(100),
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'NEGOTIATING', 'COMPLETED')),
    localizacao VARCHAR(100),
    orcamento_estimado VARCHAR(100), -- Texto livre, pois é combinado (ex: "R$ 100 - 200")
    latitude FLOAT, 
    longitude FLOAT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_conclusao TIMESTAMP,
    accepted_count INT DEFAULT 0
);

-- 4. AVALIAÇÕES (Reputação)
CREATE TABLE avaliacoes (
    id SERIAL PRIMARY KEY,
    proposta_id INT REFERENCES propostas(id) ON DELETE CASCADE,
    avaliador_id INT REFERENCES users(id),
    alvo_id INT REFERENCES users(id),
    nota INT CHECK (nota >= 1 AND nota <= 5),
    comentario TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. CHAT (Negociação)
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
    msg_type VARCHAR(20) DEFAULT 'text', -- text, image, schedule
    metadata JSONB, -- Para guardar URLs de imagens ou dados de agendamento
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

-- INDEXES (Para performance no Supabase)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_propostas_status ON propostas(status);
CREATE INDEX idx_propostas_geo ON propostas(latitude, longitude);
CREATE INDEX idx_chat_msgs_session ON chat_messages(session_id);

-- 7. SEED DATA (Dados Iniciais Obrigatórios)
INSERT INTO categories (id, name, image_url) VALUES 
('cat_tech', 'Tecnologia', 'https://images.unsplash.com/photo-1518770660439-4636190af475'),
('cat_home', 'Casa & Reforma', 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189'),
('cat_beauty', 'Beleza', 'https://images.unsplash.com/photo-1560869713-7d0a29430803'),
('cat_auto', 'Automotivo', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7');

INSERT INTO services (id, category_id, name, emoji, image_url) VALUES 
('serv_dev', 'cat_tech', 'Desenvolvedor Web', '💻', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085'),
('serv_pedreiro', 'cat_home', 'Pedreiro', '🧱', 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5'),
('serv_eletricista', 'cat_home', 'Eletricista', '⚡', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e'),
('serv_manicure', 'cat_beauty', 'Manicure', '💅', 'https://images.unsplash.com/photo-1632345031435-8727f6897d53');

-- Usuários de Teste (Senhas Hashadas para '123456' usando bcrypt padrão)
INSERT INTO users (nome, email, senha_hash, role, avatar_url, bio, specialty, meios_pagamento, is_subscriber, latitude, longitude) VALUES 
('Comandante Jobi', 'admin@linka.com', '$2a$10$7v.H5X.R.G7D3v9X.X.X.X', 'ADMIN', 'https://ui-avatars.com/api/?name=Admin&background=101828&color=fff', 'Admin do sistema', null, null, true, -23.5505, -46.6333),
('Jane Doe', 'jane@linka.com', '$2a$10$7v.H5X.R.G7D3v9X.X.X.X', 'CONTRACTOR', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'Gosto de resolver tudo rápido.', null, null, false, -23.5616, -46.6559),
('João Silva', 'joao@linka.com', '$2a$10$7v.H5X.R.G7D3v9X.X.X.X', 'PROFESSIONAL', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'Especialista em reparos gerais.', 'Pedreiro, Eletricista', 'Pix, Dinheiro', false, -23.5505, -46.6333),
('Marcos Dev', 'marcos@linka.com', '$2a$10$7v.H5X.R.G7D3v9X.X.X.X', 'PROFESSIONAL', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', 'Desenvolvedor Full Stack.', 'Desenvolvedor Web', 'Pix', true, -23.5489, -46.6860);

-- Portfolio Demo
INSERT INTO portfolio (user_id, image_url, descricao) VALUES
(4, 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400', 'Sistema Web'),
(3, 'https://images.unsplash.com/photo-1581141849291-1125c7b692b5?w=400', 'Instalação Elétrica Residencial');

-- Proposta Demo (Concluída)
INSERT INTO propostas (contratante_id, profissional_id, titulo, descricao, area_tag, status, orcamento_estimado, latitude, longitude) VALUES
(2, 4, 'Site Pessoal', 'Criar site', 'Desenvolvedor Web', 'COMPLETED', 'R$ 2000', -23.5616, -46.6559);

-- Avaliação Demo
INSERT INTO avaliacoes (proposta_id, avaliador_id, alvo_id, nota, comentario) VALUES
(1, 2, 4, 5, 'Excelente trabalho, código muito limpo!');
