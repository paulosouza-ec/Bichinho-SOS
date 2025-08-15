import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { authService } from '../services/database';

const DEFAULT_PROFILE_IMAGE = { uri: 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png' };

const RegisterScreen = ({ navigation }) => {
  // Estados comuns
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState('common'); // 'common' ou 'agency'

  // Estados para usuário 'common'
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');

  // Estados para usuário 'agency'
  const [organizationName, setOrganizationName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [address, setAddress] = useState('');


  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria para selecionar uma foto.');
        return;
      }

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
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  const handleRegister = async () => {
    // Validação de campos comuns
    if (!email || !password || !phone) {
        Alert.alert('Erro', 'Por favor, preencha os campos de email, senha e telefone.');
        return;
    }

    setLoading(true);

    try {
        let registrationData;

        // Monta o payload de acordo com o tipo de usuário
        if (userType === 'common') {
            if (!name || !nickname) {
                Alert.alert('Erro', 'Por favor, preencha seu nome completo e apelido.');
                setLoading(false);
                return;
            }
            if (nickname.length < 3) {
                Alert.alert('Erro', 'O apelido deve ter pelo menos 3 caracteres.');
                setLoading(false);
                return;
            }
            
            const nicknameResponse = await authService.checkNickname(nickname);
            if (!nicknameResponse.available) {
                Alert.alert('Erro', 'Este apelido já está em uso. Por favor, escolha outro.');
                setLoading(false);
                return;
            }

            registrationData = {
                name,
                nickname,
                email,
                password,
                phone,
                profile_pic: profilePic,
                user_type: 'common',
            };
        } else { // agency
            if (!organizationName || !cnpj || !address) {
                Alert.alert('Erro', 'Por favor, preencha o nome da organização, CNPJ e endereço.');
                setLoading(false);
                return;
            }
            
            registrationData = {
                organization_name: organizationName,
                cnpj,
                address,
                email,
                password,
                phone,
                profile_pic: profilePic,
                user_type: 'agency',
            };
        }

        await authService.registerUser(registrationData);
      
        Alert.alert('Sucesso', 'Cadastro realizado com sucesso!', [
            { text: 'OK', onPress: () => navigation.navigate('Login') }
        ]);
      
    } catch (error) {
        console.error('Erro no cadastro:', error);
        Alert.alert('Erro', error.message || 'Falha ao cadastrar usuário.');
    } finally {
        setLoading(false);
    }
  };

  // Componente para renderizar os campos de acordo com o userType
  const renderFormFields = () => {
    if (userType === 'common') {
      return (
        <>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Nome completo</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Digite seu nome completo"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Apelido</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Escolha um nome de usuário"
                placeholderTextColor="#999"
                value={nickname}
                onChangeText={setNickname}
                autoCapitalize="none"
              />
            </View>
          </View>
        </>
      );
    } else { // agency
      return (
        <>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Nome da Organização/ONG</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nome oficial da entidade"
                placeholderTextColor="#999"
                value={organizationName}
                onChangeText={setOrganizationName}
              />
            </View>
          </View>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>CNPJ</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="XX.XXX.XXX/XXXX-XX"
                placeholderTextColor="#999"
                value={cnpj}
                onChangeText={setCnpj}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Endereço</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Endereço completo da sede"
                placeholderTextColor="#999"
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>
        </>
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image
            source={require('../assets/pawprint.png')}
            style={styles.logo}
          />
          <Text style={styles.appTitle}>Bichinho-SOS</Text>
          <Text style={styles.appSubtitle}>Protegendo os animais juntos</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>Crie sua conta</Text>
          
          <View style={styles.userTypeContainer}>
            <Text style={styles.inputLabel}>Eu sou:</Text>
            <View style={styles.userTypeButtons}>
              <TouchableOpacity
                style={[styles.userTypeButton, userType === 'common' && styles.userTypeButtonActive]}
                onPress={() => setUserType('common')}
              >
                <Text style={[styles.userTypeButtonText, userType === 'common' && styles.userTypeButtonTextActive]}>
                  Cidadão
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.userTypeButton, userType === 'agency' && styles.userTypeButtonActive]}
                onPress={() => setUserType('agency')}
              >
                <Text style={[styles.userTypeButtonText, userType === 'agency' && styles.userTypeButtonTextActive]}>
                  Órgão/ONG
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.profilePicContainer}>
            <TouchableOpacity onPress={pickImage}>
              <Image
                source={profilePic ? { uri: profilePic } : DEFAULT_PROFILE_IMAGE}
                style={styles.profilePic}
              />
              <View style={styles.cameraIcon}>
                <MaterialIcons name="camera-alt" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.profilePicText}>
              {profilePic ? 'Alterar foto' : 'Adicionar foto (opcional)'}
            </Text>
          </View>

          {/* CAMPOS RENDERIZADOS CONDICIONALMENTE */}
          {renderFormFields()}

          {/* CAMPOS COMUNS */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Senha</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowPassword(!showPassword)}
              >
                <FontAwesome 
                  name={showPassword ? 'eye-slash' : 'eye'} 
                  size={20} 
                  color="#999" 
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Telefone</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="(00) 00000-0000"
                placeholderTextColor="#999"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>Cadastrar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Já tem uma conta? Faça login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 15,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  formContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 25,
    padding: 25,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  userTypeContainer: {
    marginBottom: 20,
  },
  userTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  userTypeButtonActive: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  userTypeButtonText: {
    color: '#2c3e50',
    fontWeight: '600',
  },
  userTypeButtonTextActive: {
    color: '#fff',
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
    borderColor: '#dfe6e9',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#27ae60',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicText: {
    marginTop: 8,
    color: '#7f8c8d',
    fontSize: 14,
  },
  inputWrapper: {
    marginBottom: 15,
  },
  inputLabel: {
    color: '#2c3e50',
    marginBottom: 8,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
  },
  input: {
    flex: 1,
    height: 50,
    color: '#2c3e50',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
  },
  registerButton: {
    backgroundColor: '#27ae60',
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#dfe6e9',
  },
  dividerText: {
    width: 40,
    textAlign: 'center',
    color: '#7f8c8d',
    fontSize: 14,
  },
  loginButton: {
    borderWidth: 1,
    borderColor: '#27ae60',
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#27ae60',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RegisterScreen;