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
  Platform,
  Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reportService } from '../services/database';
import api from '../services/api';

const { width } = Dimensions.get('window');

const ReportScreen = ({ navigation, route }) => {
  const { user, reportToEdit } = route.params;
  const insets = useSafeAreaInsets();
  const isEditMode = !!reportToEdit;

  const [title, setTitle] = useState(reportToEdit?.title || '');
  const [description, setDescription] = useState(reportToEdit?.description || '');
  const [location, setLocation] = useState(reportToEdit?.location || '');
  const [isAnonymous, setIsAnonymous] = useState(reportToEdit?.is_anonymous || false);
  
  const [media, setMedia] = useState(null);
  const [mediaUrl, setMediaUrl] = useState(reportToEdit?.photo_uri || null);
  const [mediaType, setMediaType] = useState(reportToEdit?.media_type || null);
  
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickMedia = async () => {
    if (isEditMode) {
      Alert.alert('Aviso', 'A edição de fotos ou vídeos não é permitida no momento.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Acesse sua galeria para adicionar mídias.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      videoMaxDuration: 15,
    });

    if (!result.canceled) {
      setMedia(result.assets[0]);
      handleUpload(result.assets[0]);
    }
  };

  const handleUpload = async (mediaAsset) => {
    setUploading(true);
    const formData = new FormData();
    const uriParts = mediaAsset.uri.split('.');
    const fileType = uriParts[uriParts.length - 1];

    formData.append('media', {
      uri: mediaAsset.uri,
      name: `upload.${fileType}`,
      type: `${mediaAsset.type}/${fileType}`,
    });

    try {
      const response = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMediaUrl(response.data.media_url);
      setMediaType(response.data.media_type);
    } catch (error) {
      console.error("Erro no upload: ", error);
      Alert.alert('Erro de Upload', 'Não foi possível enviar sua mídia.');
      setMedia(null);
    } finally {
      setUploading(false);
    }
  };

  const submitReport = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Atenção', 'Título e descrição são obrigatórios.');
      return;
    }
    if (uploading) {
      Alert.alert('Aguarde', 'Por favor, espere o upload da mídia terminar.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        const reportData = {
          title: title.trim(),
          description: description.trim(),
          location: location.trim() || null,
        };
        const updatedReport = await reportService.updateReport(reportToEdit.id, reportData, user.id);
        Alert.alert('Sucesso', 'Denúncia atualizada!', [
          { text: 'OK', onPress: () => navigation.navigate('ReportDetail', { report: updatedReport, user }) }
        ]);
      } else {
        const reportData = {
          userId: isAnonymous ? null : user.id,
          title: title.trim(),
          description: description.trim(),
          location: location.trim() || null,
          isAnonymous,
          media_url: mediaUrl,
          media_type: mediaType,
        };
        await reportService.createReport(reportData);
        Alert.alert('Sucesso', 'Denúncia registrada!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Erro ao processar denúncia:', error);
      Alert.alert('Erro', error.message || 'Falha ao processar denúncia.');
    } finally {
      setSubmitting(false);
    }
  };

  const previewUri = media?.uri || mediaUrl;

  const renderMediaPlaceholder = () => (
    <TouchableOpacity 
      style={[styles.mediaPicker, isEditMode && styles.disabledButton]} 
      onPress={pickMedia} 
      disabled={isEditMode}
    >
      <View style={styles.mediaPickerContent}>
        <MaterialIcons name="add-photo-alternate" size={48} color="#95a5a6" />
        <Text style={styles.mediaPickerText}>Toque para adicionar foto ou vídeo</Text>
        {isEditMode && <Text style={styles.mediaPickerSubText}>(Edição de mídia indisponível)</Text>}
      </View>
    </TouchableOpacity>
  );

  const renderMediaPreview = () => (
    <View style={styles.mediaPreviewContainer}>
      {mediaType === 'image' ? (
        <Image source={{ uri: previewUri }} style={styles.previewImage} />
      ) : (
        <Video
          source={{ uri: previewUri }}
          rate={1.0} volume={1.0} isMuted={true} resizeMode="cover"
          shouldPlay isLooping style={styles.previewImage}
        />
      )}
      {uploading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.overlayText}>Enviando...</Text>
        </View>
      )}
       {!isEditMode && !uploading && (
         <TouchableOpacity style={styles.changeMediaButton} onPress={pickMedia}>
            <MaterialIcons name="edit" size={20} color="#fff" />
         </TouchableOpacity>
       )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* --- CABEÇALHO --- */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            {/* Ícone trocado para 'arrow-back' como teste de segurança */}
            <MaterialIcons name="arrow-back" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? 'Editar Denúncia' : 'Nova Denúncia'}</Text>
        <View style={{width: 40}} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
          
          {previewUri ? renderMediaPreview() : renderMediaPlaceholder()}

          <View style={styles.formSection}>
            <View style={styles.inputContainer}>
              <MaterialIcons name="title" size={22} color="#888" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Título da denúncia*" value={title} onChangeText={setTitle} placeholderTextColor="#888" />
            </View>
            <View style={styles.inputContainer}>
              <MaterialIcons name="description" size={22} color="#888" style={styles.inputIcon} />
              <TextInput style={[styles.input, { height: 120, textAlignVertical: 'top' }]} placeholder="Descreva o ocorrido*" value={description} onChangeText={setDescription} multiline placeholderTextColor="#888" />
            </View>
            <View style={styles.inputContainer}>
              <MaterialIcons name="location-on" size={22} color="#888" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Localização (opcional)" value={location} onChangeText={setLocation} placeholderTextColor="#888" />
            </View>
          </View>
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Enviar como anônimo?</Text>
            <Switch 
                value={isAnonymous} 
                onValueChange={setIsAnonymous} 
                disabled={isEditMode}
                trackColor={{ false: "#dcdde1", true: "#a5d6a7" }}
                thumbColor={isAnonymous ? "#27ae60" : "#f4f3f4"}
                ios_backgroundColor="#dcdde1"
            />
          </View>
          
          {/* MUDANÇA AQUI: Lógica de texto reescrita para ser mais explícita */}
          {isAnonymous ? (
            <Text style={styles.anonymousDisclaimer}>Sua identidade será totalmente preservada.</Text>
          ) : (
            <Text style={styles.anonymousDisclaimer}>Seu nome de usuário será exibido na denúncia.</Text>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

       {/* --- BOTÃO DE AÇÃO --- */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity 
            style={[styles.submitButton, (submitting || uploading) && styles.disabledButton]} 
            onPress={submitReport} 
            disabled={submitting || uploading}
        >
          {submitting 
            ? <ActivityIndicator color="#fff" /> 
            : <Text style={styles.submitButtonText}>{isEditMode ? 'SALVAR ALTERAÇÕES' : 'ENVIAR DENÚNCIA'}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    backgroundColor: '#fff',
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: { padding: 5 },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  contentContainer: { 
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100 
  },
  mediaPicker: {
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dcdde1',
    borderStyle: 'dashed',
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
  mediaPickerContent: {
    alignItems: 'center',
  },
  mediaPickerText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500'
  },
  mediaPickerSubText: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
  },
  mediaPreviewContainer: {
    height: 220,
    borderRadius: 12,
    marginBottom: 25,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    marginTop: 10,
    fontWeight: 'bold',
  },
  changeMediaButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 20,
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 5,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    //alignItems: 'center',
    backgroundColor: '#f0f2f5',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  inputIcon: {
    marginRight: 10,
    marginTop: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
    paddingVertical: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  anonymousDisclaimer: {
    fontSize: 13,
    color: '#7f8c8d',
    paddingHorizontal: 10,
    marginTop: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  submitButton: {
    backgroundColor: '#27ae60',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 55,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#a5d6a7',
    opacity: 0.8,
  },
});

export default ReportScreen;