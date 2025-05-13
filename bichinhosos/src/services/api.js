import axios from 'axios';

// Configuração base da API
const api = axios.create({
  baseURL: 'http://172.22.67.186:3000',
});

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      return Promise.reject(error.response.data);
    }
    return Promise.reject({ message: 'Erro de conexão com o servidor' });
  }
);

export default api;