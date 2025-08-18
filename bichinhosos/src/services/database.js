import api from './api';

export const mediaService = {
  uploadMedia: async (file) => {
    try {
      const formData = new FormData();
      formData.append('media', {
        uri: file.uri,
        type: `image/${file.uri.split('.').pop()}`, // ex: 'image/jpeg'
        name: `profile-${Date.now()}.${file.uri.split('.').pop()}`,
      });

      // ALTERAÇÃO FEITA: O objeto 'headers' foi removido daqui.
      // A biblioteca 'api' (Axios) irá adicionar o 'Content-Type' com o 'boundary' correto automaticamente
      // ao detectar um objeto FormData.
      const response = await api.post('/api/upload', formData);

      return response.data; // Retorna { media_url, media_type }
    } catch (error) {
      console.error('Erro no upload:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Erro ao enviar mídia');
    }
  },
};



export const authService = {
  registerUser: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data.user;
    } catch (error) {
      console.error('Erro no registro:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Erro ao registrar usuário');
    }
  },

  loginUser: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data.user;
    } catch (error) {
      console.error('Erro no login:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Credenciais inválidas');
    }
  },

  forgotPassword: async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao solicitar redefinição');
    }
  },


  resetPassword: async ({ email, code, newPassword }) => {
    try {
      const response = await api.post('/auth/reset-password', { email, code, newPassword });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao redefinir senha');
    }
  },

  verifyResetCode: async ({ email, code }) => {
    try {
      const response = await api.post('/auth/verify-reset-code', { email, code });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao verificar código');
    }
  },

  checkNickname: async (nickname) => {
    try {
      const response = await api.post('/auth/check-nickname', { nickname });
      return response.data;
    } catch (error) {
      console.error('Erro ao verificar apelido:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Erro ao verificar apelido');
    }
  },

  getUserProfile: async (userId) => {
    try {
      const response = await api.get(`/users/${userId}/profile`);
      return response.data.user;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao carregar perfil');
    }
  },

  updateUserProfile: async (userId, profileData) => {
    try {
      const response = await api.put(`/users/${userId}/profile`, profileData);
      return response.data.user;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao atualizar perfil');
    }
  },
};

export const reportService = {
  createReport: async (reportData) => {
    try {
      const response = await api.post('/api/reports', reportData);
      return response.data.report;
    } catch (error) {
      throw new Error(error.message || 'Erro ao criar denúncia');
    }
  },

  // --- FUNÇÃO ADICIONADA: PARA ATUALIZAR UMA DENÚNCIA ---
  updateReport: async (reportId, reportData, userId) => {
    try {
      // Inclui o userId no corpo da requisição para verificação de autoria no backend
      const payload = { ...reportData, userId };
      const response = await api.put(`/api/reports/${reportId}`, payload);
      return response.data.report;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao atualizar denúncia');
    }
  },

  getReports: async ({ userId, filter, status, searchTerm } = {}) => {
    try {
      const params = {};
      if (userId) params.userId = userId; // Adicionado para o filtro "Minhas"
      if (filter) params.filter = filter;
      if (status) params.status = status;
      if (searchTerm) params.searchTerm = searchTerm;
      
      const response = await api.get('/api/reports', { params });
      return response.data.reports;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar denúncias');
    }
  },

  getPopularReports: async () => {
    try {
      const response = await api.get('/api/reports/popular');
      return response.data.reports;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar denúncias populares');
    }
  },

  getAgencyStats: async () => {
    try {
      const response = await api.get('/api/reports/stats/agency');
      return response.data.stats;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar estatísticas');
    }
  },

  getAgencyNotes: async (reportId) => {
    try {
      const response = await api.get(`/api/reports/${reportId}/agency-notes`);
      return response.data.notes;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar notas');
    }
  },
  
  // --- NOVO: Função para adicionar uma nota interna ---
  addAgencyNote: async (reportId, userId, content) => {
    try {
      const response = await api.post(`/api/reports/${reportId}/agency-notes`, { userId, content });
      return response.data.note;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao adicionar nota');
    }
  },


  getReportById: async (id) => {
    try {
      const response = await api.get(`/api/reports/${id}`);
      return response.data.report;
    } catch (error) {
      throw new Error(error.message || 'Erro ao buscar denúncia');
    }
  },

  likeReport: async (reportId, userId) => {
    try {
      const response = await api.post(`/api/reports/${reportId}/like`, { userId });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao curtir denúncia');
    }
  },
  
  addComment: async (reportId, userId, content, parentId) => {
    try {
      const response = await api.post(`/api/reports/${reportId}/comments`, {
        userId,
        content,
        parentId
      });
      return response.data.comment;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao adicionar comentário');
    }
  },
  
  getComments: async (reportId) => {
    try {
      const response = await api.get(`/api/reports/${reportId}/comments`);
      return response.data.comments;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar comentários');
    }
  },
  
  checkUserLike: async (reportId, userId) => {
    try {
      const response = await api.get(`/api/reports/${reportId}/likes/check`, {
        params: { userId }
      });
      return response.data.liked;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao verificar like');
    }
  },
  
  getLikesCount: async (reportId) => {
    try {
      const response = await api.get(`/api/reports/${reportId}/likes/count`);
      return response.data.count;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao contar likes');
    }
  },

  editComment: async (reportId, commentId, userId, content) => {
    try {
      const response = await api.put(`/api/reports/${reportId}/comments/${commentId}`, {
        content,
        userId
      });
      return response.data.comment;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao editar comentário');
    }
  },
  
  deleteComment: async (reportId, commentId, userId) => {
    try {
      const response = await api.delete(`/api/reports/${reportId}/comments/${commentId}`, {
        data: { userId }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao excluir comentário');
    }
  },

  getUserReports: async (userId) => {
    try {
      const response = await api.get(`/users/${userId}/reports`);
      return response.data.reports;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar denúncias do usuário');
    }
  },

  deleteReport: async (reportId, userId) => {
    try {
      const response = await api.delete(`/api/reports/${reportId}`, {
        data: { userId }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao excluir denúncia');
    }
  },

  getUserStats: async (userId) => {
    try {
      const response = await api.get(`/users/${userId}/stats`);
      return response.data.stats;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar estatísticas');
    }
  },

  getUserAchievements: async (userId) => {
    try {
      const response = await api.get(`/users/${userId}/achievements`);
      return response.data.achievements;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar conquistas');
    }
  },


  updateReportStatus: async (reportId, status, agencyId) => {
    try {
      // --- ALTERADO: O nome da variável 'agencyId' foi mantido para consistência, mas representa o 'userId' do agente
      const response = await api.put(`/api/reports/${reportId}/status`, { status, agencyId });
      return response.data.report;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao atualizar status');
    }
  },
};