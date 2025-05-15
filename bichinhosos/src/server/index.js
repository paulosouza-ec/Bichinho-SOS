require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

const multer = require('multer');
const path = require('path');

// Configuração do PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: 'bichinhosos',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// Rotas de autenticação
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, nickname, profile_pic } = req.body;
    
    // Verificação final do nickname
    const nicknameCheck = await pool.query(
      'SELECT id FROM users WHERE nickname ILIKE $1',
      [nickname]
    );
    
    if (nicknameCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Nickname já em uso' });
    }

    // Verificação de email
    const emailCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }

    // Inserção no banco
    const newUser = await pool.query(
      `INSERT INTO users (name, email, password, phone, nickname, profile_pic) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, email, nickname, profile_pic`,
      [
        name, 
        email, 
        password, 
        phone, 
        nickname, 
        profile_pic || null
      ]
    );
    
    res.json({ user: newUser.rows[0] });
    
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ message: 'Erro ao registrar usuário' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );
    
    if (user.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    const userData = user.rows[0];
    userData.profile_pic = userData.profile_pic || 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png';
    
    res.json({ user: userData });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

// Rotas de denúncias
app.post('/api/reports', async (req, res) => {
  try {
    const { userId, title, description, location, isAnonymous, photo_uri } = req.body;
    
    const newReport = await pool.query(
      `INSERT INTO reports (user_id, title, description, location, is_anonymous, photo_uri)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [isAnonymous ? null : userId, title, description, location || null, isAnonymous, photo_uri || null]
    );
    
    res.json({ report: newReport.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar denúncia' });
  }
});



app.get('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const report = await pool.query(
      'SELECT * FROM reports WHERE id = $1',
      [id]
    );
    
    if (report.rows.length === 0) {
      return res.status(404).json({ message: 'Denúncia não encontrada' });
    }
    
    res.json({ report: report.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar denúncia' });
  }
});

// Rota única para todas as denúncias com filtros
app.get('/api/reports', async (req, res) => {
  try {
    const { userId, filter } = req.query;
    
    let query = `
      SELECT r.*, u.name as user_name 
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
    `;
    
    const params = [];
    let paramCount = 0;

    // Se tiver userId, filtra por usuário
    if (userId && !isNaN(userId)) {
      query += ` WHERE r.user_id = $${++paramCount}`;
      params.push(parseInt(userId));
    } 
    // Se não tiver userId, aplica filtros públicos
    else if (filter === 'anonymous') {
      query += ' WHERE r.is_anonymous = true';
    } else if (filter === 'identified') {
      query += ' WHERE r.is_anonymous = false';
    }
    
    query += ' ORDER BY r.created_at DESC';
    
    const reports = await pool.query(query, params);
    res.json({ reports: reports.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar denúncias' });
  }
});



// Rota para curtir/descurtir uma denúncia
app.post('/api/reports/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Verifica se o usuário já curtiu esta denúncia
    const existingLike = await pool.query(
      'SELECT * FROM likes WHERE report_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingLike.rows.length > 0) {
      // Remove o like
      await pool.query(
        'DELETE FROM likes WHERE id = $1',
        [existingLike.rows[0].id]
      );
      res.json({ liked: false });
    } else {
      // Adiciona o like
      await pool.query(
        'INSERT INTO likes (report_id, user_id) VALUES ($1, $2)',
        [id, userId]
      );
      res.json({ liked: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao processar like' });
  }
});

// Rota para adicionar comentário
app.post('/api/reports/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, content, parentId } = req.body;

    const newComment = await pool.query(
      `INSERT INTO comments (report_id, user_id, content, parent_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, userId, content, parentId || null]
    );

    // Busca os dados do usuário incluindo a foto
    const user = await pool.query(
      'SELECT id, name, profile_pic FROM users WHERE id = $1',
      [userId]
    );

    res.json({ 
      comment: {
        ...newComment.rows[0],
        user: user.rows[0],
        user_name: user.rows[0].name,
        user_avatar: user.rows[0].profile_pic
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao adicionar comentário' });
  }
});

// Rota para buscar comentários de uma denúncia
app.get('/api/reports/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;

    const comments = await pool.query(
      `SELECT c.*, u.name as user_name, u.profile_pic as user_avatar 
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.report_id = $1
       ORDER BY c.created_at DESC`,
      [id]
    );

    res.json({ comments: comments.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar comentários' });
  }
});

// Rota para verificar se usuário curtiu uma denúncia
app.get('/api/reports/:id/likes/check', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    const like = await pool.query(
      'SELECT * FROM likes WHERE report_id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ liked: like.rows.length > 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao verificar like' });
  }
});

// Rota para contar likes de uma denúncia
app.get('/api/reports/:id/likes/count', async (req, res) => {
  try {
    const { id } = req.params;

    const count = await pool.query(
      'SELECT COUNT(*) FROM likes WHERE report_id = $1',
      [id]
    );

    res.json({ count: parseInt(count.rows[0].count) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao contar likes' });
  }
});


//Procurar nick do usuario

app.post('/auth/check-nickname', async (req, res) => {
  try {
    const { nickname } = req.body;
    console.log('Verificando nickname:', nickname); // Log para depuração
    
    if (!nickname || nickname.length < 3) {
      return res.json({ available: false, message: 'Nickname muito curto' });
    }

    const result = await pool.query(
      'SELECT id FROM users WHERE nickname ILIKE $1', 
      [nickname]
    );
    
    res.json({ 
      available: result.rows.length === 0,
      valid: nickname.length >= 3
    });
  } catch (error) {
    console.error('Erro ao verificar nickname:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

 // Rota de edicao de comentario do user
app.put('/api/reports/:reportId/comments/:commentId', async (req, res) => {
  try {
    const { commentId, reportId } = req.params;
    const { content, userId } = req.body;

    // Verifica se o comentário pertence ao usuário
    const commentCheck = await pool.query(
      'SELECT * FROM comments WHERE id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Você não pode editar este comentário' });
    }

    const updatedComment = await pool.query(
      'UPDATE comments SET content = $1 WHERE id = $2 RETURNING *',
      [content, commentId]
    );

    res.json({ comment: updatedComment.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao editar comentário' });
  }
});

// Rota para excluir comentário
app.delete('/api/reports/:reportId/comments/:commentId', async (req, res) => {
  try {
    const { commentId, reportId } = req.params;
    const { userId } = req.body;

    // Verifica se o comentário pertence ao usuário
    const commentCheck = await pool.query(
      'SELECT * FROM comments WHERE id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Você não pode excluir este comentário' });
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir comentário' });
  }
});


app.get('/users/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await pool.query(
      'SELECT id, name, email, nickname, profile_pic, bio FROM users WHERE id = $1',
      [id]
    );
    
    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    res.json({ user: user.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar perfil' });
  }
});

// Rota para atualizar perfil do usuário
app.put('/users/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    const { bio } = req.body;
    
    const updatedUser = await pool.query(
      'UPDATE users SET bio = $1 WHERE id = $2 RETURNING id, name, email, nickname, profile_pic, bio',
      [bio, id]
    );
    
    res.json({ user: updatedUser.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
});

// Rota para obter denúncias do usuário
app.get('/users/:id/reports', async (req, res) => {
  try {
    const { id } = req.params;
    
    const reports = await pool.query(
      'SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC',
      [id]
    );
    
    res.json({ reports: reports.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar denúncias' });
  }
});

// Rota para excluir denúncia
app.delete('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    // Verifica se a denúncia pertence ao usuário
    const reportCheck = await pool.query(
      'SELECT * FROM reports WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (reportCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Você não pode excluir esta denúncia' });
    }
    
    // Primeiro exclui os comentários e likes associados
    await pool.query('DELETE FROM comments WHERE report_id = $1', [id]);
    await pool.query('DELETE FROM likes WHERE report_id = $1', [id]);
    
    // Depois exclui a denúncia
    await pool.query('DELETE FROM reports WHERE id = $1', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir denúncia' });
  }
});

// Rota para obter estatísticas do usuário
app.get('/users/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Conta denúncias do usuário
    const reportsCount = await pool.query(
      'SELECT COUNT(*) FROM reports WHERE user_id = $1',
      [id]
    );
    
    // Conta curtidas recebidas nas denúncias do usuário
    const likesReceived = await pool.query(
      `SELECT COUNT(*) FROM likes l
       JOIN reports r ON l.report_id = r.id
       WHERE r.user_id = $1`,
      [id]
    );
    
    // Conta comentários feitos pelo usuário
    const commentsCount = await pool.query(
      'SELECT COUNT(*) FROM comments WHERE user_id = $1',
      [id]
    );
    
    res.json({
      stats: {
        reportsCount: parseInt(reportsCount.rows[0].count),
        likesReceived: parseInt(likesReceived.rows[0].count),
        commentsCount: parseInt(commentsCount.rows[0].count)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar estatísticas' });
  }
});


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Pasta onde as imagens serão salvas
  },
  filename: (req, file, cb) => {
    cb(null, `report-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

// Rota para upload:
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  }
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// Servir arquivos estáticos:
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});