require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configuração do PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: 'bichinhosos',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

//Configs cloudnary
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configura o Multer para usar a memória, pois vamos fazer o upload via stream
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // Limite de 20MB para os arquivos
  },
});

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rota de Registro ATUALIZADA E ADAPTADA
app.post('/auth/register', async (req, res) => {
  try {
    const { user_type, email } = req.body;

    // 1. Checagem de e-mail (comum a ambos os tipos de usuário)
    const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }

    // 2. Lógica de cadastro para Órgãos/ONGs
    if (user_type === 'agency') {
      const { organization_name, cnpj, address, password, phone, profile_pic } = req.body;

      // Checagem de CNPJ
      const cnpjCheck = await pool.query('SELECT id FROM users WHERE cnpj = $1', [cnpj]);
      if (cnpjCheck.rows.length > 0) {
        return res.status(400).json({ message: 'CNPJ já cadastrado' });
      }

      // Inserção no banco de dados (note os novos campos)
      // O nome da organização também é salvo na coluna 'name' para consistência
      const newUser = await pool.query(
        `INSERT INTO users (name, email, password, phone, profile_pic, user_type, organization_name, cnpj, address) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING id, name, email, profile_pic, user_type`,
        [organization_name, email, password, phone, profile_pic || null, 'agency', organization_name, cnpj, address]
      );
      
      return res.status(201).json({ user: newUser.rows[0] });

    // 3. Lógica de cadastro para Cidadão (lógica original)
    } else {
      const { name, password, phone, nickname, profile_pic } = req.body;
      
      // Checagem de apelido
      const nicknameCheck = await pool.query('SELECT id FROM users WHERE nickname ILIKE $1', [nickname]);
      if (nicknameCheck.rows.length > 0) {
        return res.status(400).json({ message: 'Apelido já em uso' });
      }

      // Inserção no banco de dados para usuário comum
      const newUser = await pool.query(
        `INSERT INTO users (name, email, password, phone, nickname, profile_pic, user_type) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id, name, email, nickname, profile_pic, user_type`,
        [name, email, password, phone, nickname, profile_pic || null, 'common']
      );
      
      return res.status(201).json({ user: newUser.rows[0] });
    }
    
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ message: 'Erro ao registrar usuário' });
  }
});


// Rota de Login Atualizada
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

// Rota para buscar denúncias (agora inclui o status)
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

    if (userId && !isNaN(userId)) {
      query += ` WHERE r.user_id = $${++paramCount}`;
      params.push(parseInt(userId));
    } else if (filter === 'anonymous') {
      query += ' WHERE r.is_anonymous = true';
    } else if (filter === 'identified') {
      query += ' WHERE r.is_anonymous = false';
    }
    
    query += ' ORDER BY r.created_at DESC';
    
    const reports = await pool.query(query, params);
    res.json({ reports: reports.rows });
  } catch (error) {
    console.error('Erro ao buscar denúncias:', error);
    res.status(500).json({ message: 'Erro ao buscar denúncias' });
  }
});

// NOVA ROTA: Para órgãos atualizarem o status de uma denúncia
app.put('/api/reports/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, agencyId } = req.body;

    const validStatuses = ['pending', 'seen', 'in_progress', 'resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Status inválido' });
    }

    const agencyCheck = await pool.query('SELECT user_type FROM users WHERE id = $1', [agencyId]);
    if (agencyCheck.rows.length === 0 || agencyCheck.rows[0].user_type !== 'agency') {
      return res.status(403).json({ message: 'Ação não permitida para este usuário' });
    }

    const updatedReport = await pool.query(
      'UPDATE reports SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (updatedReport.rows.length === 0) {
      return res.status(404).json({ message: 'Denúncia não encontrada' });
    }

    res.json({ report: updatedReport.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ message: 'Erro ao atualizar status da denúncia' });
  }
});

// Rota para criar denúncia
app.post('/api/reports', async (req, res) => {
  try {
    const { userId, title, description, location, isAnonymous, media_url, media_type } = req.body;
    
    const newReport = await pool.query(
      `INSERT INTO reports (user_id, title, description, location, is_anonymous, photo_uri, media_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [isAnonymous ? null : userId, title, description, location || null, isAnonymous, media_url || null, media_type || null]
    );
    
    res.status(201).json({ report: newReport.rows[0] });
  } catch (error) {
    console.error('Erro ao criar denúncia:', error);
    res.status(500).json({ message: 'Erro ao criar denúncia' });
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

// Rota para curtir/descurtir uma denúncia
app.post('/api/reports/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const existingLike = await pool.query(
      'SELECT * FROM likes WHERE report_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingLike.rows.length > 0) {
      await pool.query(
        'DELETE FROM likes WHERE id = $1',
        [existingLike.rows[0].id]
      );
      res.json({ liked: false });
    } else {
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

    const user = await pool.query(
      'SELECT id, name, profile_pic FROM users WHERE id = $1',
      [userId]
    );

    res.status(201).json({ 
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

// Rota para verificar apelido
app.post('/auth/check-nickname', async (req, res) => {
  try {
    const { nickname } = req.body;
    
    if (!nickname || nickname.length < 3) {
      return res.json({ available: false, message: 'Apelido muito curto' });
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
    console.error('Erro ao verificar apelido:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Rota de edição de comentário
app.put('/api/reports/:reportId/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content, userId } = req.body;

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
    const { commentId } = req.params;
    const { userId } = req.body;

    const commentCheck = await pool.query(
      'SELECT * FROM comments WHERE id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Você não pode excluir este comentário' });
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);
    res.json({ success: true, message: 'Comentário excluído com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir comentário' });
  }
});

// Rota para buscar perfil
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

// Rota para atualizar perfil
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
    
    const reportCheck = await pool.query(
      'SELECT * FROM reports WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (reportCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Você não pode excluir esta denúncia' });
    }
    
    await pool.query('DELETE FROM comments WHERE report_id = $1', [id]);
    await pool.query('DELETE FROM likes WHERE report_id = $1', [id]);
    await pool.query('DELETE FROM reports WHERE id = $1', [id]);
    
    res.json({ success: true, message: 'Denúncia excluída com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir denúncia' });
  }
});

// Rota para obter estatísticas do usuário
app.get('/users/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    const reportsCount = await pool.query(
      'SELECT COUNT(*) FROM reports WHERE user_id = $1',
      [id]
    );
    
    const likesReceived = await pool.query(
      `SELECT COUNT(*) FROM likes l
       JOIN reports r ON l.report_id = r.id
       WHERE r.user_id = $1`,
      [id]
    );
    
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

// Configuração do Multer para upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `report-${Date.now()}${path.extname(file.originalname)}`);
  }
});



// Rota para upload
app.post('/api/upload', upload.single('media'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
  }

  // Função que envia o buffer do arquivo para o Cloudinary
  const uploadStream = (buffer, options) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(options, (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }).end(buffer);
    });
  };

  const options = {
    folder: 'bichinho-sos',
    resource_type: 'auto',
  };

  // Executa o upload e retorna a URL
  uploadStream(req.file.buffer, options)
    .then(result => {
      res.status(200).json({
        media_url: result.secure_url, // Usar a URL segura é a melhor prática
        media_type: result.resource_type,
      });
    })
    .catch(err => {
      console.error('Erro no upload para o Cloudinary:', err);
      res.status(500).json({ message: 'Erro ao enviar mídia.' });
    });
});


// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});