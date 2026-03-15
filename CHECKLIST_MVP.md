# Checklist para MVP 100% Funcional - Linka Jobi

Este documento detalha o estado atual do projeto e o que é necessário para considerá-lo "100% funcional" em um ambiente de produção real.

## 1. Infraestrutura & Banco de Dados
- [x] **Estrutura do Banco:** Tabelas criadas (`users`, `propostas`, `chat`, etc.) e relacionamentos definidos.
- [x] **Dados Iniciais:** Seeds de categorias e serviços implementados.
- [x] **Conexão:** O sistema está conectado ao Supabase via `DATABASE_URL`. O "Mock Mode" não está mais sendo usado como principal.

## 2. Integrações Externas (Status Atual)
A maioria das integrações já está configurada no arquivo `.env`:

- [x] **Banco de Dados (Supabase):** Configurado e operante (`DATABASE_URL`).
- [x] **Upload de Imagens (Cloudinary):** Configurado (`CLOUDINARY_*`). O sistema já faz upload real de arquivos.
- [x] **Inteligência Artificial (Gemini):** Configurado (`VITE_GOOGLE_API_KEY`). A melhoria de textos com IA está ativa.
- [x] **Geolocalização (BrasilAPI):** Nativo e funcional.
- [ ] **Serviço de E-mail (SMTP):** *Pendente.* As variáveis `SMTP_USER` e `SMTP_PASS` estão comentadas no `.env`. Atualmente usa Ethereal (simulado) para notificações.

## 3. Funcionalidades Core (Status Atual)

| Funcionalidade | Status | Observação |
| :--- | :--- | :--- |
| **Cadastro/Login** | ✅ Pronto | Validação de e-mail e senha hash (bcrypt). |
| **Busca de Profissionais** | ✅ Pronto | Filtro por Raio (km) e Especialidade. |
| **Criar Pedido** | ✅ Pronto | Fluxo completo com IA opcional. |
| **Chat em Tempo Real** | ✅ Pronto | Socket.io implementado no Front e Back. |
| **Contratação** | ✅ Pronto | Fluxo: Proposta -> Aceite -> Negociação -> Conclusão. |
| **Avaliações** | ✅ Pronto | Cálculo de média e contagem automático. |
| **Upload de Arquivos** | ⚠️ Parcial | Requer chaves do Cloudinary configuradas. |

## 4. Funcionalidades Simuladas (Limitações do MVP)
Estas funcionalidades existem no sistema mas operam em modo "simulado" ou simplificado, o que é comum para MVPs, mas deve ser observado:

- **Recuperação de Senha:**
  - *Atual:* Removido do MVP para simplificação.
  - *Para o Futuro:* Integrar com SendGrid, Resend ou AWS SES na próxima versão.

- **Pagamentos & Carteira:**
  - *Atual:* O saldo é virtual. Ao concluir um serviço, o valor é creditado na tabela `transactions` e no saldo do usuário, mas **nenhum dinheiro real é movimentado**.
  - *Para 100%:* Integrar com Stripe, Mercado Pago ou Pagar.me (Split de pagamento).

## 5. Próximos Passos Recomendados

1. **Teste de Fluxo Completo (Ponta a Ponta):**
   - Criar Usuário A (Cliente).
   - Criar Usuário B (Profissional).
   - A cria pedido -> B aceita -> Troca de mensagens -> A finaliza -> A avalia B.
2. **Testar Upload de Imagens:**
   - Fazer upload de avatar e imagens de portfólio para confirmar a integração com o Cloudinary.
3. **Testar IA:**
   - Criar um pedido e usar o botão "Melhorar com IA" para validar o Gemini.
4. **Deploy:** O projeto já está configurado para deploy, com banco e APIs conectadas.

---
**Conclusão:** O algoritmo "real" está implementado. O projeto é funcional para uso como MVP demonstrativo. Para virar um produto comercial, faltaria apenas a integração bancária (Gateway de Pagamento) e serviço de E-mail transacional.
