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
import { Video } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { reportService } from '../services/database';
import api from '../services/api';

const ReportScreen = ({ navigation, route }) => {
  const { user, reportToEdit } = route.params; // Recebe a denúncia para editar (se houver)

  // --- LÓGICA DE EDIÇÃO ADICIONADA ---
  const isEditMode = !!reportToEdit; // Verifica se está em modo de edição

  const [title, setTitle] = useState(reportToEdit?.title || '');
  const [description, setDescription] = useState(reportToEdit?.description || '');
  const [location, setLocation] = useState(reportToEdit?.location || '');
  const [isAnonymous, setIsAnonymous] = useState(reportToEdit?.is_anonymous || false);
  
  // A edição de mídia é complexa. Nesta versão, vamos focar na edição dos textos.
  // A mídia existente será exibida, mas não poderá ser alterada no modo de edição.
  const [media, setMedia] = useState(null);
  const [mediaUrl, setMediaUrl] = useState(reportToEdit?.photo_uri || null);
  const [mediaType, setMediaType] = useState(reportToEdit?.media_type || null);
  
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickMedia = async () => {
    // Desabilitar seleção de mídia no modo de edição para simplificar
    if (isEditMode) {
      Alert.alert('Aviso', 'A edição de fotos ou vídeos não é permitida no momento.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria para adicionar mídias.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
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
      Alert.alert('Erro de Upload', 'Não foi possível enviar sua mídia. Tente novamente.');
      setMedia(null);
    } finally {
      setUploading(false);
    }
  };

  // --- FUNÇÃO DE SUBMISSÃO ATUALIZADA ---
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
        // Lógica de ATUALIZAÇÃO
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
        // Lógica de CRIAÇÃO (original)
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

  // Define a URI da mídia para pré-visualização, priorizando a mídia local selecionada
  const previewUri = media?.uri || mediaUrl;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{isEditMode ? 'Editar Denúncia' : 'Nova Denúncia'}</Text>

        <TextInput style={styles.input} placeholder="Título da denúncia*" value={title} onChangeText={setTitle} />
        <TextInput style={[styles.input, { height: 120 }]} placeholder="Descreva o ocorrido*" value={description} onChangeText={setDescription} multiline />
        <TextInput style={styles.input} placeholder="Localização (opcional)" value={location} onChangeText={setLocation} />

        <View style={styles.switchContainer}>
          <Text style={{ fontSize: 16 }}>Enviar como anônimo?</Text>
          <Switch value={isAnonymous} onValueChange={setIsAnonymous} disabled={isEditMode} />
        </View>

        <TouchableOpacity 
            style={[styles.mediaButton, isEditMode && styles.disabledButton]} 
            onPress={pickMedia}
            disabled={isEditMode}
        >
          <MaterialIcons name="perm-media" size={20} color="#fff" />
          <Text style={styles.mediaButtonText}>{mediaUrl ? 'Alterar Mídia' : 'Adicionar Foto/Vídeo'}</Text>
        </TouchableOpacity>

        {uploading && <ActivityIndicator size="large" color="#27ae60" style={{ marginVertical: 10 }} />}

        {previewUri && !uploading && (
          <View style={styles.mediaPreview}>
            {mediaType === 'image' ? (
              <Image source={{ uri: previewUri }} style={styles.previewImage} />
            ) : (
              <Video
                source={{ uri: previewUri }}
                rate={1.0} volume={1.0} isMuted={false} resizeMode="cover"
                shouldPlay isLooping style={styles.previewVideo} useNativeControls
              />
            )}
          </View>
        )}

        <TouchableOpacity style={[styles.submitButton, (submitting || uploading) && { opacity: 0.7 }]} onPress={submitReport} disabled={submitting || uploading}>
          {submitting 
            ? <ActivityIndicator color="#fff" /> 
            : <Text style={styles.submitButtonText}>{isEditMode ? 'SALVAR ALTERAÇÕES' : 'ENVIAR DENÚNCIA'}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  contentContainer: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 15, marginBottom: 15, fontSize: 16 },
  switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: 15, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  mediaButton: { backgroundColor: '#27ae60', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 15, flexDirection: 'row', justifyContent: 'center' },
  mediaButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  submitButton: { backgroundColor: '#FF6B6B', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  mediaPreview: { width: '100%', height: 200, borderRadius: 8, marginBottom: 15, backgroundColor: '#e0e0e0' },
  previewImage: { width: '100%', height: '100%', borderRadius: 8 },
  previewVideo: { width: '100%', height: '100%', borderRadius: 8 },
  disabledButton: { backgroundColor: '#a5d6a7' }, // Estilo para botão desabilitado
});

export default ReportScreen;