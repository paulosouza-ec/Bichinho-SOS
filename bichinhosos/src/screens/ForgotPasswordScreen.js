
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { authService } from '../services/database';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Por favor, insira seu e-mail.');
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      Alert.alert(
        'Verifique seu E-mail',
        'Se uma conta com este e-mail existir, um código de redefinição foi enviado.',
        [{ text: 'OK', onPress: () => navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() }) }]
      );
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Redefinir Senha</Text>
      <Text style={styles.subtitle}>
        Insira o e-mail associado à sua conta e enviaremos um código de 6 dígitos para redefinir sua senha.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="seu@email.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.button} onPress={handleSendCode} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enviar Código</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Voltar para o Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: '#f8f9fa',
    },
    title: {
      fontSize: 26,
      fontWeight: 'bold',
      color: '#2c3e50',
      textAlign: 'center',
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: '#7f8c8d',
      textAlign: 'center',
      marginBottom: 30,
    },
    input: {
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#dfe6e9',
      borderRadius: 10,
      padding: 15,
      marginBottom: 20,
      fontSize: 16,
    },
    button: {
      backgroundColor: '#27ae60',
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
    },
    buttonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    backText: {
      marginTop: 20,
      textAlign: 'center',
      color: '#3498db',
      fontSize: 16,
    },
  });

export default ForgotPasswordScreen;