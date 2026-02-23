# Checklist para MVP 100% Funcional - Linka Jobi

Este documento detalha o estado atual do projeto e o que é necessário para considerá-lo "100% funcional" em um ambiente de produção real.

## 1. Infraestrutura & Banco de Dados
- [x] **Estrutura do Banco:** Tabelas criadas (`users`, `propostas`, `chat`, etc.) e relacionamentos definidos.
- [x] **Dados Iniciais:** Seeds de categorias e serviços implementados.
- [!] **Conexão:** O sistema possui um "Mock Mode" de fallback. Para produção, a variável `DATABASE_URL` **deve** estar configurada e o banco acessível.
  - *Status:* Funcional (com fallback), mas requer banco real para persistência definitiva.

## 2. Integrações Externas (Requer Configuração)
Para que todas as funcionalidades operem corretamente, as seguintes variáveis de ambiente são obrigatórias:

- [ ] **Upload de Imagens (Cloudinary):**
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
  - *Sem isso:* O sistema usa imagens de placeholder estáticas.

- [ ] **Inteligência Artificial (Gemini):**
  - `GOOGLE_API_KEY`
  - *Sem isso:* A funcionalidade "Melhorar com IA" retorna o texto original.

- [ ] **Geolocalização (BrasilAPI):**
  - *Status:* Já implementado e não requer chave de API. Funciona nativamente.

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
  - *Atual:* Gera o token mas apenas exibe no log do servidor (não envia e-mail).
  - *Para 100%:* Integrar com SendGrid, Resend ou AWS SES.

- **Pagamentos & Carteira:**
  - *Atual:* O saldo é virtual. Ao concluir um serviço, o valor é creditado na tabela `transactions` e no saldo do usuário, mas **nenhum dinheiro real é movimentado**.
  - *Para 100%:* Integrar com Stripe, Mercado Pago ou Pagar.me (Split de pagamento).

## 5. Próximos Passos Recomendados

1. **Configurar `.env`:** Preencher as chaves do Cloudinary e Google AI.
2. **Teste de Fluxo Completo:**
   - Criar Usuário A (Cliente).
   - Criar Usuário B (Profissional).
   - A cria pedido -> B aceita -> Troca de mensagens -> A finaliza -> A avalia B.
3. **Deploy:** O projeto já está configurado para deploy (Docker/Node), bastando apontar o banco de dados.

---
**Conclusão:** O algoritmo "real" está implementado. O projeto é funcional para uso como MVP demonstrativo. Para virar um produto comercial, faltaria apenas a integração bancária (Gateway de Pagamento) e serviço de E-mail transacional.
