import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { authService } from '../services/database';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !phone) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    // Validação básica de telefone (pode ajustar conforme necessidade)
    if (phone.length < 11) {
      Alert.alert('Erro', 'Telefone deve ter pelo menos 11 dígitos');
      return;
    }

    // Validação básica de email
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      Alert.alert('Erro', 'Email inválido');
      return;
    }

    setLoading(true);
    try {
      await authService.registerUser({ 
        name, 
        email, 
        password,
        phone 
      });
      Alert.alert('Sucesso', 'Cadastro realizado!', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cadastro</Text>
      <TextInput
        style={styles.input}
        placeholder="Nome completo*"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email*"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Senha*"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Telefone* (com DDD)"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={15} // Espaço para DDD + número + possíveis caracteres especiais
      />
      <View style={styles.buttonContainer}>
        <Button 
          title={loading ? "Cadastrando..." : "Cadastrar"} 
          onPress={handleRegister} 
          disabled={loading}
          color="#FF6B6B"
        />
      </View>
      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Já tem uma conta?</Text>
        <Button
          title="Faça login"
          onPress={() => navigation.navigate('Login')}
          color="#4CAF50"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    marginTop: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  loginContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    marginBottom: 10,
    color: '#666',
  },
});

export default RegisterScreen;