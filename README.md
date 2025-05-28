# Chatbot

## Sessões do README

```json
1 - O que você precisa saber antes de rodar o projeto?
2 - Como rodar o Projeto
3 - Documentação
```

## O que você precisa saber antes de rodar o projeto?

```json
1 - Antes de iniciar o setup, é necessário que o Docker esteja em execução.
2 - Variáveis de ambiente necessárias já estão sendo disponibilizadas (`.env.example`) pois é um projeto de teste.
3 - Versão do Node suportada: 22.12.0
```

## Como rodar o projeto

## 1. Faça o clone do repositório

```json
git clone <URL_DO_REPOSITORIO>
```

## 2. Entre na pasta `chatbot` e rode o setup

```json
cd chatbot
crie um arquivo .env na raiz do projeto e copie o conteúdo de .env.example para .env
npm run setup
```

Obs: Utilize esse comando somente na primeira vez que for rodar a aplicação. Esse comando irá instalar todas as dependencias, subir o banco, rodar as migrations e subir a aplicação.

## 3. Rode o projeto:

Caso precise rodar o projeto novamente, é só rodar o comando abaixo:

```json
npm run start:dev
```

## 4. Testes

```json
npm run test
```

## 5. Deploy Railway

- Endereço da aplicação rodando na Railway `https://chatbot-production-4f85.up.railway.app`
- Endereço para conversar com o Agente: `ws://chatbot-production-4f85.up.railway.app`

## Documentação

## Endpoints REST

### 📦 Auth

#### 🔐 Login

`POST /api/v1/auth/login`

Autentica um usuário e retorna um token JWT.

**Body:**

```json
{
  "email": "usuario@example.com",
  "password": "senha123"
}
```

**Response:**

```json
{
  "token": "jwt-token-aqui",
  "expiresIn": 3600
}
```

---

### 👤 Usuário

Base path: `/api/v1/user`

#### 📌 Criar usuário

`POST /api/v1/user`

**Body:**

```json
{
  "email": "usuario@example.com",
  "password": "senha123"
}
```

**Response:**

```json
{
  "id": "uuid-gerado",
  "email": "usuario@example.com",
  "systemPrompt": null
}
```

---

#### 🔐 Listar todos os usuários

`GET /api/v1/user`

**Headers:**

```http
Authorization: Bearer <token>
```

**Response:**

```json
[
  {
    "id": "uuid",
    "email": "usuario@example.com",
    "systemPrompt": null
  }
]
```

---

#### 🔐 Buscar usuário por ID

`GET /api/v1/user/:id`

**Headers:**

```http
Authorization: Bearer <token>
```

**Response:**

```json
{
  "id": "uuid",
  "email": "usuario@example.com",
  "systemPrompt": null
}
```

---

#### 🔐 Buscar chats do usuário

`GET /api/v1/user/:id/chats`

**Headers:**

```http
Authorization: Bearer <token>
```

**Response:**

```json
[
  {
    "id": "chat-uuid",
    "question": "Qual é a capital do Brasil?",
    "response": "A capital do Brasil é Brasília.",
    "timestamp": "2024-05-01T00:00:00Z",
    "userId": "uuid"
  }
]
```

---

#### 🔐 Atualizar usuário

`PATCH /api/v1/user/:id`

**Headers:**

```http
Authorization: Bearer <token>
```

**Body:**

```json
{
  "email": "novo-email@example.com",
  "password": "novasenha123",
  "systemPrompt": "Você é um assistente amigável e educado."
}
```

**Response:**

```json
{
  "id": "uuid",
  "email": "novo-email@example.com",
  "systemPrompt": "Você é um assistente amigável e educado."
}
```

---

#### 🔐 Deletar usuário

`DELETE /api/v1/user/:id`

**Headers:**

```http
Authorization: Bearer <token>
```

**Response:**

```http
204 No Content
```

---

### 🧠 WebSocket (Perguntas via IA)

**Endpoint local:** `ws://localhost:3000`
**Endpoint produção (Railway):** `ws://chatbot-production-4f85.up.railway.app`

Autenticação: deve ser feita via header `Authorization: Bearer <token>`

**Mensagem para perguntar algo:**

```json
{
  "event": "ask",
  "data": {
    "question": "Qual a capital do estado do espirito santo?"
  }
}
```

**Respostas esperadas:**

```json
{
  "event": "stream",
  "data": {
    "userId": "uuid",
    "token": "Vitória",
    "timestamp": 1716243239800
  }
}
```

Finalização do stream:

```json
{
  "event": "done"
}
```

---

### ❤️ Health Check

`GET /api/v1/health`

**Response:**

```json
{
  "status": "ok",
  "info": {
    "prisma": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "prisma": {
      "status": "up"
    }
  }
}
```

---

### 📊 Métricas Prometheus

- Métrica registrada:

  - `chat_requests_total`: Número total de perguntas feitas ao agente de IA.

A métrica é incrementada automaticamente toda vez que uma pergunta é feita via WebSocket.

---

## 🔐 Autenticação

- A maioria das rotas (exceto criação de usuário e login) requerem token JWT.
- Use o header `Authorization: Bearer <token>` para autenticar requisições.
