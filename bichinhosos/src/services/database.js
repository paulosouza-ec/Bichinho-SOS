import api from './api';

export const authService = {
  registerUser: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data.user;
    } catch (error) {
      throw new Error(error.message || 'Erro ao registrar usuário');
    }
  },

  loginUser: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data.user;
    } catch (error) {
      throw new Error(error.message || 'Credenciais inválidas');
    }
  },
};

export const reportService = {
  createReport: async (reportData) => {
    try {
      const response = await api.post('/reports', reportData);
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
      
      const response = await api.get('/reports', { params });
      return response.data.reports;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar denúncias');
    }
  },

  getReportById: async (id) => {
    try {
      const response = await api.get(`/reports/${id}`);
      return response.data.report;
    } catch (error) {
      throw new Error(error.message || 'Erro ao buscar denúncia');
    }
  },

};


function validateUserId(userId) {
  if (!userId) throw new Error('ID do usuário não fornecido');
  if (isNaN(Number(userId))) throw new Error('ID do usuário deve ser numérico');
  return true;
}

export const initDB = () => Promise.resolve();