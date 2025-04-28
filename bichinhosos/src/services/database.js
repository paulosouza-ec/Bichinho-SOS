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

  getReports: async (userId = null) => {
    try {
      const params = userId ? { userId } : {};
      const response = await api.get('/reports', { params });
      return response.data.reports;
    } catch (error) {
      throw new Error(error.message || 'Erro ao buscar denúncias');
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

export const initDB = () => Promise.resolve();