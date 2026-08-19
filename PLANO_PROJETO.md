# Plano do Projeto — Plataforma de Streaming (estilo Netflix)

> Documento mestre de planejamento. Serve como referência única para todas as decisões de arquitetura, modelagem e funcionalidades. A implementação será feita **por partes**, sob comando explícito, seguindo as **Fases** descritas na Seção 8. Cada fase pode ser pedida pelo número (ex: "vamos para a Fase 3").

---

## 1. Visão Geral

Sistema de streaming por assinatura, no estilo Netflix, com dois painéis:

- **Painel Cliente**: catálogo de séries, player, acesso restrito por login/senha e por status de assinatura (paga/expirada).
- **Painel Master (Admin)**: gestão total — clientes, planos/pacotes, séries, episódios, importação de conteúdo do YouTube, financeiro.

Conteúdo é organizado em **Séries**, compostas por **Episódios**. Cada episódio pode vir de três origens:

1. **YouTube (importação em massa via playlist)** — cola a URL da playlist, o sistema lista todos os vídeos, e para cada um você escolhe: apenas **referenciar/reproduzir via YouTube** (embed) ou **baixar** o arquivo para o servidor e servir localmente.
2. **YouTube (vídeo avulso)** — adiciona um vídeo individual pela URL, mesma lógica (referenciar ou baixar).
3. **Upload local** — envia o arquivo de vídeo direto para o servidor.
4. **Panda Video** — reservado para o futuro (por hora só o "encaixe" na arquitetura, sem implementação real; hoje tudo roda via YouTube).

Assinaturas são gerenciadas via **Mercado Pago (cobrança recorrente)**. Pagamento aprovado libera acesso automaticamente; falta de pagamento ou expiração bloqueia o acesso automaticamente — sem intervenção manual.

### Do que o sistema **não** precisa (fora de escopo, mantendo simples)
- Múltiplos perfis por conta (tipo perfis do Netflix) — fica como ideia futura (Fase 14).
- Transcodificação de vídeo (múltiplas qualidades/HLS) — fica para uma fase futura opcional; MVP serve o arquivo original com suporte a range requests (permite seek no player).
- App mobile nativo — só web responsivo.
- Legendas/dublagens múltiplas — futuro opcional.

### ⚠️ Nota importante sobre conteúdo do YouTube
A funcionalidade de **baixar** vídeos de playlists de terceiros e redistribuí-los em uma plataforma paga só é legal se você **detém os direitos** do conteúdo (canal próprio, licenciamento, ou autorização expressa dos criadores). O sistema vai te dar a capacidade técnica de baixar (via `yt-dlp`) ou apenas embutir o player oficial do YouTube (embed), que é a opção mais segura juridicamente quando o conteúdo não é seu. Fica ao seu critério, por vídeo/série, qual opção usar — mas vale ter isso mapeado antes de operar em produção com conteúdo de terceiros.

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.12 + FastAPI |
| ORM / Migrations | SQLAlchemy 2.x + Alembic |
| Banco de dados | SQLite (arquivo, via volume Docker) |
| Autenticação | JWT (access + refresh token), passlib/bcrypt para hash de senha |
| Fila/Background jobs | APScheduler (jobs agendados: checar expiração, retries de download) + `BackgroundTasks` do FastAPI para downloads assíncronos. Sem Redis/Celery — mantém a stack simples, conforme pedido. |
| Extração/Download YouTube | `yt-dlp` (não depende de API Key do Google; extrai metadados de playlists e baixa vídeos) |
| Pagamento | SDK oficial `mercadopago` (Python) — Assinaturas recorrentes (Preapproval) + Webhooks |
| Frontend | React + Vite + TypeScript |
| Estilização | TailwindCSS (replicar visual dark, carrosséis, hero banner do Netflix) |
| Player de vídeo | `video.js` ou `react-player` (suporta local via `<video>` e YouTube via iframe) |
| Cliente HTTP | Axios + React Query (cache, refetch, estados de loading) |
| Roteamento | React Router |
| Containerização | Docker + docker-compose (stack final, Fase 13) |

---

## 3. Estrutura de Pastas

```
Deyvid/
├── PLANO_PROJETO.md
├── docker-compose.yml                # (Fase 13)
├── backend/
│   ├── app/
│   │   ├── main.py                   # bootstrap FastAPI
│   │   ├── core/
│   │   │   ├── config.py             # settings (env vars, pydantic-settings)
│   │   │   ├── security.py           # hash, JWT, dependências de auth
│   │   │   └── scheduler.py          # APScheduler (expiração, retries)
│   │   ├── db/
│   │   │   ├── base.py               # Base declarativa
│   │   │   └── session.py            # engine + sessionmaker
│   │   ├── models/                   # modelos SQLAlchemy (um arquivo por entidade)
│   │   ├── schemas/                  # Pydantic (request/response) por entidade
│   │   ├── api/
│   │   │   ├── deps.py               # dependências comuns (get_db, get_current_user...)
│   │   │   └── v1/
│   │   │       ├── auth.py
│   │   │       ├── clientes.py
│   │   │       ├── admin_clientes.py
│   │   │       ├── planos.py
│   │   │       ├── assinaturas.py
│   │   │       ├── series.py
│   │   │       ├── episodios.py
│   │   │       ├── importacao_youtube.py
│   │   │       ├── uploads.py
│   │   │       ├── player.py         # streaming com range requests
│   │   │       ├── catalogo.py       # home, busca, minha lista, continuar assistindo
│   │   │       ├── webhooks_mercadopago.py
│   │   │       └── dashboard.py      # métricas do painel master
│   │   ├── services/
│   │   │   ├── youtube_service.py    # yt-dlp: listar playlist, baixar vídeo
│   │   │   ├── mercadopago_service.py
│   │   │   ├── download_manager.py   # fila/status de downloads em background
│   │   │   └── media_storage.py      # organização de arquivos em /media
│   │   └── worker/
│   │       └── jobs.py               # jobs do APScheduler
│   ├── media/                        # vídeos baixados, capas, banners (volume Docker)
│   ├── alembic/
│   │   ├── versions/
│   │   └── env.py
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile                    # (Fase 13)
└── frontend/
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── api/                      # clientes axios por recurso
    │   ├── auth/                     # contexto de autenticação, rotas protegidas
    │   ├── components/
    │   │   ├── ui/                   # botões, inputs, modais, cards
    │   │   ├── catalogo/             # carrossel, hero banner, card de série
    │   │   └── player/
    │   ├── pages/
    │   │   ├── cliente/              # Login, Home, SerieDetalhes, Player, MinhaLista, Busca, Assinatura
    │   │   └── admin/                # Login, Dashboard, Clientes, Planos, Series, Episodios, ImportarPlaylist
    │   ├── layouts/                  # layout cliente (netflix-like) e layout admin
    │   ├── hooks/
    │   └── styles/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── .env.example
    └── Dockerfile                    # (Fase 13)
```

---

## 4. Modelagem de Dados (entidades principais)

- **Admin** — id, nome, email, senha_hash, criado_em
- **Cliente** — id, nome, email, senha_hash, status (`ativo` / `bloqueado`), criado_em
- **Plano** — id, nome, descricao, preco, duracao_dias, ativo, mp_plan_id (referência ao plano no Mercado Pago)
- **Assinatura** — id, cliente_id, plano_id, status (`pendente` / `ativa` / `atrasada` / `cancelada`), mp_subscription_id, data_inicio, data_expiracao, data_proximo_pagamento
- **Pagamento** — id, assinatura_id, mp_payment_id, valor, status, criado_em (log de cada cobrança recebida via webhook)
- **Categoria** — id, nome (Ação, Drama, Anime, Documentário...)
- **Serie** — id, titulo, sinopse, categoria_id, capa_url, banner_url, ano, status (`publicado`/`rascunho`), criado_em
- **Temporada** *(opcional, permite agrupar episódios; se não usar, episódio fica direto na série com número sequencial)* — id, serie_id, numero, titulo
- **Episodio** — id, serie_id, temporada_id (nullable), numero, titulo, descricao, thumbnail_url, duracao_segundos, ordem, fonte (`youtube_embed` / `youtube_baixado` / `local` / `panda`), youtube_video_id (nullable), arquivo_local_path (nullable), status_processamento (`pronto`/`baixando`/`erro`/`pendente`)
- **ImportacaoPlaylist** *(log de importações)* — id, serie_id, playlist_url, total_encontrados, total_importados, status, criado_em
- **Progresso** *(continuar assistindo)* — id, cliente_id, episodio_id, segundos_assistidos, concluido, atualizado_em
- **MinhaLista** *(favoritos)* — id, cliente_id, serie_id, criado_em

---

## 5. Funcionalidades — Painel Cliente

1. **Login/Senha** com JWT; bloqueio automático se `status = bloqueado` ou assinatura expirada.
2. **Home estilo Netflix**: banner em destaque (hero) + carrosséis horizontais por categoria ("Continue assistindo", "Adicionados recentemente", por gênero).
3. **Página da série**: capa, sinopse, lista de episódios (por temporada, se houver), botão "assistir".
4. **Player**: reproduz vídeo local (arquivo baixado, com seek via range requests) ou embed do YouTube; salva progresso automaticamente (retomar de onde parou).
5. **Busca** por título/categoria.
6. **Minha Lista** (favoritar séries).
7. **Tela de assinatura**: ver plano atual, status de pagamento, botão para assinar/renovar (redireciona ao checkout do Mercado Pago).
8. **Tela de bloqueio**: quando a assinatura expira, cliente é redirecionado a uma tela informando a pendência, com botão para regularizar.

## 6. Funcionalidades — Painel Master (Admin)

1. **Login separado** do cliente (tabela `Admin` própria).
2. **Dashboard**: total de clientes ativos/bloqueados, receita do mês, novas assinaturas, séries/episódios cadastrados.
3. **Gestão de Clientes**: listar, criar, editar, bloquear/desbloquear manualmente, ver histórico de assinatura/pagamentos.
4. **Gestão de Planos/Pacotes**: CRUD de planos (nome, preço, duração), sincronizado com Mercado Pago.
5. **Gestão de Categorias**: CRUD simples.
6. **Gestão de Séries**: CRUD (título, sinopse, capa, banner, categoria, status publicado/rascunho).
7. **Gestão de Episódios**:
   - **Importar playlist do YouTube**: colar URL → sistema lista todos os vídeos (título, thumb, duração) via `yt-dlp` → você escolhe quais importar e, por vídeo (ou em massa), se quer **baixar** para o servidor ou **apenas referenciar** (embed) → cria os episódios já na ordem da playlist.
   - **Adicionar vídeo avulso do YouTube** por URL (mesma lógica acima).
   - **Upload local**: enviar arquivo de vídeo direto.
   - Reordenar episódios (drag-and-drop) dentro da série/temporada.
   - Editar/excluir episódio.
   - **Fila de downloads**: status em tempo (real/polling) de vídeos sendo baixados (pendente/baixando/pronto/erro), com opção de tentar novamente.
8. **Configurações**: chaves de API do Mercado Pago (armazenadas via variáveis de ambiente, não editável pela UI por segurança).

---

## 7. Autenticação, Autorização e Assinaturas (fluxo)

1. Cliente se cadastra (ou é cadastrado pelo admin) e escolhe um plano.
2. Backend cria `Assinatura` com status `pendente` e gera um link de checkout do Mercado Pago (Preapproval — cobrança recorrente).
3. Cliente paga no checkout do Mercado Pago.
4. Mercado Pago chama o **webhook** (`/api/v1/webhooks/mercadopago`) → backend valida a notificação, atualiza `Assinatura.status = ativa`, define `data_expiracao`, registra `Pagamento`.
5. A cada requisição autenticada do cliente, um *dependency* do FastAPI verifica se a assinatura está ativa e não expirada; caso contrário, retorna 403 e o frontend redireciona para a tela de bloqueio.
6. Job diário (APScheduler) varre assinaturas cujo `data_expiracao` passou e não tiveram renovação confirmada, marcando como `atrasada`/bloqueando — **rede de segurança** caso algum webhook falhe.
7. Renovação automática: Mercado Pago cobra recorrentemente conforme o plano; cada novo pagamento aprovado dispara webhook que estende `data_expiracao`.

---

## 8. Roadmap de Construção (Fases)

Cada fase é um marco fechado e testável. Vamos avançar uma por vez, por comando seu.

- **Fase 0 — Setup inicial**: estrutura de pastas, `requirements.txt`, config do FastAPI, config do Vite+React+Tailwind, `.env.example`, conexão inicial com SQLite.
- **Fase 1 — Modelagem de dados**: todos os models SQLAlchemy + primeira migration Alembic (schema completo do banco).
- **Fase 2 — Autenticação**: login admin e cliente, JWT (access/refresh), hash de senha, dependências de autorização, middleware de verificação de assinatura ativa.
- **Fase 3 — Painel Master: Séries e Categorias**: CRUD completo (API + telas React).
- **Fase 4 — Episódios (manual)**: upload local de vídeo, adicionar vídeo avulso do YouTube (embed), reordenar episódios, endpoint de streaming com range requests.
- **Fase 5 — Importação de Playlist do YouTube**: extração via `yt-dlp`, tela de seleção de vídeos, importação em massa (embed).
- **Fase 6 — Download em background**: opção de baixar vídeos do YouTube para o servidor, fila/status, retries, armazenamento organizado em `/media`.
- **Fase 7 — Painel Cliente: Catálogo**: home estilo Netflix (hero banner, carrosséis por categoria), página de série, busca.
- **Fase 8 — Player do Cliente**: player unificado (local/YouTube), progresso ("continuar assistindo"), Minha Lista.
- **Fase 9 — Planos e Assinaturas (CRUD)**: gestão de planos no admin, criação de assinatura ao cliente, tela de assinatura no painel cliente.
- **Fase 10 — Integração Mercado Pago**: criação de Preapproval/checkout, webhook, atualização automática de status, bloqueio automático por expiração/inadimplência.
- **Fase 11 — Painel Master: Dashboard e Clientes**: métricas, gestão completa de clientes/assinaturas, bloqueio manual.
- **Fase 12 — Polimento visual**: tema dark, responsividade, loading/skeleton states, ajustes finos de UX.
- **Fase 13 — Dockerização**: Dockerfiles (backend/frontend), `docker-compose.yml` (stack), volumes persistentes (SQLite + media), variáveis de ambiente, pronto para deploy via Docker Stack/Swarm.
- **Fase 14 — Extras (futuro, opcional)**: múltiplos perfis por conta, integração real com Panda Video, notificações por e-mail (boas-vindas, cobrança, vencimento), avaliações/notas de séries, transcodificação/HLS.

---

## 9. Próximos Passos

Confirma esse plano (ou pede ajustes) e me diga qual fase quer que eu comece a construir — sugiro começarmos pela **Fase 0**.
