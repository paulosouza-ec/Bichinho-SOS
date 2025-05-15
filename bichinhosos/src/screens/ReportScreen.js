import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Alert, 
  Switch, 
  TouchableOpacity, 
  Image,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { reportService } from '../services/database';

const ReportScreen = ({ navigation, route }) => {
  const { userId } = route.params;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos acessar suas fotos para adicionar imagens à denúncia');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const submitReport = async () => {
    if (!title.trim()) {
      Alert.alert('Atenção', 'Informe um título para a denúncia');
      return;
    }

    if (!description.trim() || description.length < 10) {
      Alert.alert('Atenção', 'Descrição precisa ter pelo menos 10 caracteres');
      return;
    }

    setLoading(true);
    try {
      const reportData = {
        userId: isAnonymous ? null : userId,
        title: title.trim(),
        description: description.trim(),
        location: location.trim() || null,
        isAnonymous,
        photo: photoUri
      };

      await reportService.createReport(reportData);

      Alert.alert('Sucesso', 'Denúncia registrada!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Erro ao criar denúncia:', error);
      Alert.alert('Erro', error.message || 'Falha ao registrar denúncia. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView 
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { flexGrow: 1 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Nova Denúncia</Text>

        <TextInput
          style={styles.input}
          placeholder="Título da denúncia*"
          value={title}
          onChangeText={setTitle}
          maxLength={60}
        />

        <TextInput
          style={[styles.input, { height: 120 }]}
          placeholder="Descreva o ocorrido em detalhes*"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={500}
        />

        <TextInput
          style={styles.input}
          placeholder="Localização (rua, bairro, cidade)"
          value={location}
          onChangeText={setLocation}
        />

        <View style={styles.switchContainer}>
          <Text style={{ fontSize: 16 }}>Enviar como anônimo?</Text>
          <Switch
            value={isAnonymous}
            onValueChange={setIsAnonymous}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isAnonymous ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity 
          style={styles.photoButton}
          onPress={pickImage}
        >
          <Text style={styles.photoButtonText}>
            {photoUri ? 'Alterar Foto' : 'Adicionar Foto'}
          </Text>
        </TouchableOpacity>

        {photoUri && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: photoUri }} 
              style={styles.imagePreview} 
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, loading && { opacity: 0.7 }]}
          onPress={submitReport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>ENVIAR DENÚNCIA</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 60, // aumentei para garantir espaço para o botão
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  photoButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  photoButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20, // garante visibilidade final
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
  },
  imageContainer: {
    marginBottom: 15,
    position: 'relative',
  },
});

export default ReportScreen;
