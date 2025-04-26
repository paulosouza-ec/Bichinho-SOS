import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Definição de chaves com prefixo único
const DB_KEYS = {
  USERS: '@BichinhoSOS:users',
  REPORTS: '@BichinhoSOS:reports'
};

// 2. Função auxiliar para tratamento seguro de JSON
const safeJsonParse = (data) => {
  try {
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Erro ao fazer parse do JSON:', error);
    return null;
  }
};

// 3. Inicialização do banco de dados
export const initDB = async () => {
  try {
    // Verifica e inicializa usuários
    let users = await AsyncStorage.getItem(DB_KEYS.USERS);
    if (!users) {
      await AsyncStorage.setItem(DB_KEYS.USERS, JSON.stringify([]));
      console.log('Banco de usuários inicializado');
    }

    // Verifica e inicializa denúncias
    let reports = await AsyncStorage.getItem(DB_KEYS.REPORTS);
    if (!reports) {
      await AsyncStorage.setItem(DB_KEYS.REPORTS, JSON.stringify([]));
      console.log('Banco de denúncias inicializado');
    }
  } catch (error) {
    console.error('Falha crítica ao inicializar DB:', error);
    throw new Error('Não foi possível inicializar o banco de dados');
  }
};

// 4. Serviço de autenticação
export const authService = {
  registerUser: async (userData) => {
    try {
      const users = safeJsonParse(await AsyncStorage.getItem(DB_KEYS.USERS)) || [];
      
      // Verifica se o usuário já existe
      const userExists = users.some(user => 
        user.email.toLowerCase() === userData.email.toLowerCase()
      );
      
      if (userExists) {
        throw new Error('Este e-mail já está cadastrado');
      }

      // Cria novo usuário com ID único
      const newUser = { 
        ...userData, 
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };

      await AsyncStorage.setItem(
        DB_KEYS.USERS,
        JSON.stringify([...users, newUser])
      );
      
      return newUser;
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      throw error;
    }
  },

  loginUser: async (email, password) => {
    try {
      const users = safeJsonParse(await AsyncStorage.getItem(DB_KEYS.USERS)) || [];
      const user = users.find(u => 
        u.email.toLowerCase() === email.toLowerCase() && 
        u.password === password
      );
      
      if (!user) {
        throw new Error('E-mail ou senha incorretos');
      }
      
      return user;
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      throw error;
    }
  }
};

// 5. Serviço de denúncias
export const reportService = {
  createReport: async (reportData) => {
    try {
      const reports = safeJsonParse(await AsyncStorage.getItem(DB_KEYS.REPORTS)) || [];
      
      const newReport = { 
        ...reportData,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await AsyncStorage.setItem(
        DB_KEYS.REPORTS,
        JSON.stringify([...reports, newReport])
      );
      
      return newReport;
    } catch (error) {
      console.error('Erro ao criar denúncia:', error);
      throw error;
    }
  },

  getReports: async (userId = null) => {
    try {
      const reports = safeJsonParse(await AsyncStorage.getItem(DB_KEYS.REPORTS)) || [];
      
      if (userId) {
        return reports.filter(r => 
          !r.isAnonymous && r.userId === userId
        ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
      
      return reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('Erro ao buscar denúncias:', error);
      throw error;
    }
  },

  // Novo método para buscar uma denúncia específica
  getReportById: async (reportId) => {
    try {
      const reports = safeJsonParse(await AsyncStorage.getItem(DB_KEYS.REPORTS)) || [];
      return reports.find(r => r.id === reportId);
    } catch (error) {
      console.error('Erro ao buscar denúncia:', error);
      throw error;
    }
  }
};