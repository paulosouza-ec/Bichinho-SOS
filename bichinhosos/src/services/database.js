import api from './api';

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

  checkNickname: async (nickname) => {
    try {
      const response = await api.post('/auth/check-nickname', { nickname });
      return response.data;
    } catch (error) {
      console.error('Erro ao verificar nickname:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Erro ao verificar nickname');
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
      const response = await api.post('/api/reports', reportData); // Corrigido para /api/reports
      return response.data.report;
    } catch (error) {
      throw new Error(error.message || 'Erro ao criar denúncia');
    }
  },

  getReports: async ({ userId, filter } = {}) => {
    try {
      const params = {};
      if (userId) params.userId = userId;
      if (filter) params.filter = filter;
      
      const response = await api.get('api/reports', { params });
      return response.data.reports;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar denúncias');
    }
  },

  getReportById: async (id) => {
    try {
      const response = await api.get(`api/reports/${id}`);
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
    throw new Error(error.response?.data?.message || 'Erro ao buscar denúncias');
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




};


function validateUserId(userId) {
  if (!userId) throw new Error('ID do usuário não fornecido');
  if (isNaN(Number(userId))) throw new Error('ID do usuário deve ser numérico');
  return true;
};














export const initDB = () => Promise.resolve();