import React, { useState } from 'react';
import { 
  View, Text, TextInput, Button, StyleSheet, 
  Alert, TouchableOpacity, Image, ActivityIndicator 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { authService } from '../services/database';
import { MaterialIcons } from '@expo/vector-icons';

// Imagem padrão (substitua pelo caminho correto)
const DEFAULT_PROFILE_IMAGE = { uri: 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png' };

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    try {
      // Solicitar permissões
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos acessar sua galeria');
        return;
      }
  
      // Abrir a galeria
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
  
      if (!result.canceled && result.assets && result.assets[0].uri) {
        setProfilePic(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem');
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !phone || !nickname) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }
  
    if (nickname.length < 3) {
      Alert.alert('Erro', 'Nickname deve ter pelo menos 3 caracteres');
      return;
    }
  
    setLoading(true);
    try {
      // Verificação do nickname
      const nicknameResponse = await authService.checkNickname(nickname);
      if (!nicknameResponse.available) {
        Alert.alert('Erro', 'Este nickname já está em uso');
        setLoading(false);
        return;
      }
  
      // Cadastro do usuário
      await authService.registerUser({
        name, 
        email, 
        password,
        phone,
        nickname,
        profile_pic: profilePic
      });
      
      Alert.alert('Sucesso', 'Cadastro realizado!', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
      
    } catch (error) {
      console.error('Erro no cadastro:', error);
      Alert.alert('Erro', error.message || 'Falha ao cadastrar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cadastro</Text>
      
      {/* Seção de foto de perfil */}
      <View style={styles.profilePicContainer}>
        <TouchableOpacity onPress={pickImage}>
          <Image 
            source={profilePic ? { uri: profilePic } : DEFAULT_PROFILE_IMAGE}
            style={styles.profilePic}
          />
        </TouchableOpacity>
        <Text style={styles.profilePicText}>
          {profilePic ? 'Alterar foto' : 'Adicionar foto (opcional)'}
        </Text>
      </View>

      {/* Campos do formulário */}
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
        maxLength={11}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Nickname*"
        value={nickname}
        onChangeText={setNickname}
        autoCapitalize="none"
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
  profilePicContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    backgroundColor: '#f0f0f0',
    resizeMode: 'cover',
  },
  profilePicPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ccc',
  },
  profilePicText: {
    marginTop: 8,
    color: '#666',
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
  nicknameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nicknameInput: {
    flex: 1,
  },
  nicknameStatus: {
    marginLeft: 10,
  },
  errorText: {
    color: '#F44336',
    marginBottom: 15,
    fontSize: 12,
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