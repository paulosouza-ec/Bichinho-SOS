import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { authService } from '../services/database';

const ResetPasswordScreen = ({ route, navigation }) => {
  const { email } = route.params;
  const [step, setStep] = useState(1); // 1 para verificar código, 2 para definir senha
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Função para a Etapa 1: Verificar o código
  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      Alert.alert('Erro', 'O código deve ter 6 dígitos.');
      return;
    }
    setLoading(true);
    try {
      await authService.verifyResetCode({ email, code });
      setStep(2); // Sucesso! Avança para a próxima etapa.
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Função para a Etapa 2: Redefinir a senha
  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Erro', 'Por favor, preencha os campos de senha.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword({ email, code, newPassword });
      Alert.alert(
        'Sucesso!',
        'Sua senha foi redefinida. Por favor, faça login com sua nova senha.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStepOne = () => (
    <>
      <Text style={styles.title}>Verificar Código</Text>
      <Text style={styles.subtitle}>Um código foi enviado para {email}. Insira-o abaixo para continuar.</Text>
      
      <TextInput
        placeholder="Código de 6 dígitos"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        textAlign="center"
        style={[styles.input, styles.codeInput]}
      />
      
      <TouchableOpacity style={styles.button} onPress={handleVerifyCode} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verificar Código</Text>}
      </TouchableOpacity>
    </>
  );

  const renderStepTwo = () => (
    <>
      <Text style={styles.title}>Defina sua Nova Senha</Text>
      <Text style={styles.subtitle}>Código verificado com sucesso! Agora, crie uma nova senha.</Text>
      
      <TextInput style={styles.input} placeholder="Nova senha" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
      <TextInput style={styles.input} placeholder="Confirmar nova senha" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
      
      <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Redefinir Senha</Text>}
      </TouchableOpacity>
    </>
  );

  return (
    <View style={styles.container}>
      {step === 1 ? renderStepOne() : renderStepTwo()}
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
    marginBottom: 15,
    fontSize: 16,
  },
  codeInput: {
      fontSize: 22,
      letterSpacing: 10, // Espaçamento entre os números
  },
  button: {
    backgroundColor: '#27ae60',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ResetPasswordScreen;