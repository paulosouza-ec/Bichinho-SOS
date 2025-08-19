import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  RefreshControl
} from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { authService, reportService, mediaService } from '../services/database';
import moment from 'moment';

const ProfileScreen = ({ navigation, route }) => {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bio, setBio] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState({ reportsCount: 0, likesReceived: 0, commentsCount: 0 });
  const [activeTab, setActiveTab] = useState('activity');

  React.useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      !refreshing && setLoading(true);
      
      const [userData, reportsData, statsData, achievementsData] = await Promise.all([
        authService.getUserProfile(userId),
        reportService.getUserReports(userId),
        reportService.getUserStats(userId),
        reportService.getUserAchievements(userId)
      ]);
      
      setUser(userData);
      setBio(userData.bio || '');
      setReports(reportsData);
      setStats(statsData);
      setAchievements(achievementsData);
      
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadProfileData();
  };

  const deleteReport = async (reportId) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir esta denúncia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          onPress: async () => {
            try {
              await reportService.deleteReport(reportId, userId);
              setReports(reports.filter(r => r.id !== reportId));
              setStats(prev => ({
                ...prev,
                reportsCount: prev.reportsCount - 1
              }));
            } catch (error) {
              Alert.alert('Erro', error.message);
            }
          }
        }
      ]
    );
  };

  const updateBio = async () => {
    try {
      const updatedUser = await authService.updateUserProfile(userId, { bio });
      setUser(prevUser => ({ ...prevUser, ...updatedUser }));
      setIsEditingBio(false);
      Alert.alert('Sucesso', 'Biografia atualizada com sucesso!');
    } catch (error) {
      Alert.alert('Erro', error.message);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Sair",
      "Você tem certeza que deseja sair da sua conta?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sair", 
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
          style: 'destructive'
        }
      ]
    );
  };

  const handleUpdateProfilePicture = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permissão necessária', 'É preciso permitir o acesso à galeria para alterar a foto.');
      return;
    }
    
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    
    if (pickerResult.canceled) return;
    
    try {
      setIsUploading(true);
      const file = pickerResult.assets[0];
      
      // CORREÇÃO: Adiciona o tipo de arquivo explicitamente
      file.type = `image/${file.uri.split('.').pop()}`;
      
      const uploadResponse = await mediaService.uploadMedia(file);
      const updatedUser = await authService.updateUserProfile(userId, { 
        profile_pic: uploadResponse.media_url 
      });
      
      setUser(prevUser => ({ ...prevUser, ...updatedUser }));
      Alert.alert('Sucesso', 'Foto de perfil atualizada!');
    } catch (error) {
      console.error('Erro no upload:', error);
      Alert.alert('Erro no Upload', error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.profileSection}>
      <TouchableOpacity onPress={handleUpdateProfilePicture} disabled={isUploading}>
        <Image
          key={user?.profile_pic} 
          source={{ uri: user?.profile_pic || 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png' }}
          style={styles.profileImage}
        />
        {isUploading ? (
          <ActivityIndicator style={styles.uploadingIndicator} size="large" color="#fff" />
        ) : (
          <View style={styles.editImageIcon}><MaterialIcons name="camera-alt" size={24} color="#fff" /></View>
        )}
      </TouchableOpacity>
      <Text style={styles.userName}>{user?.name}</Text>
      <Text style={styles.userNickname}>@{user?.nickname}</Text>
    </View>
  );

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity 
        style={[styles.tabItem, activeTab === 'activity' && styles.activeTab]} 
        onPress={() => setActiveTab('activity')}>
        <MaterialIcons name="list-alt" size={24} color={activeTab === 'activity' ? '#27ae60' : '#7f8c8d'} />
        <Text style={[styles.tabLabel, activeTab === 'activity' && styles.activeTabLabel]}>Atividade</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tabItem, activeTab === 'achievements' && styles.activeTab]} 
        onPress={() => setActiveTab('achievements')}>
        <FontAwesome name="trophy" size={24} color={activeTab === 'achievements' ? '#27ae60' : '#7f8c8d'} />
        <Text style={[styles.tabLabel, activeTab === 'achievements' && styles.activeTabLabel]}>Conquistas</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tabItem, activeTab === 'info' && styles.activeTab]} 
        onPress={() => setActiveTab('info')}>
        <MaterialIcons name="person" size={24} color={activeTab === 'info' ? '#27ae60' : '#7f8c8d'} />
        <Text style={[styles.tabLabel, activeTab === 'info' && styles.activeTabLabel]}>Informações</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTabContent = () => {
    if (activeTab === 'activity') {
      return (
        <View style={styles.contentSection}>
          {reports.length > 0 ? reports.map(item => (
            <View key={item.id} style={styles.reportItem}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportTitle}>{item.title}</Text>
                <TouchableOpacity onPress={() => deleteReport(item.id)}>
                  <MaterialIcons name="delete" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
              <Text style={styles.reportDate}>{moment(item.created_at).format('DD/MM/YYYY')}</Text>
              <Text style={styles.reportDescription}>{item.description.substring(0, 100)}...</Text>
              <TouchableOpacity style={styles.viewButton} onPress={() => navigation.navigate('ReportDetail', { report: item, user: user })}>
                <Text style={styles.viewButtonText}>Ver detalhes</Text>
              </TouchableOpacity>
            </View>
          )) : (
            <View style={styles.emptyContainer}>
              <FontAwesome name="exclamation-circle" size={40} color="#ccc" />
              <Text style={styles.emptyText}>Nenhuma denúncia encontrada</Text>
              <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('Report', { user: user })}>
                <Text style={styles.createButtonText}>Criar primeira denúncia</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }
    if (activeTab === 'achievements') {
      return (
        <View style={styles.achievementsContainer}>
          {achievements.map(item => (
            <View key={item.id} style={[styles.badge, !item.earned && styles.badgeLocked]}>
              <MaterialIcons name={item.icon} size={32} color={item.earned ? '#27ae60' : '#a0a0a0'} />
              <Text style={styles.badgeName}>{item.name}</Text>
              <Text style={styles.badgeDescription}>{item.description}</Text>
            </View>
          ))}
        </View>
      );
    }
    if (activeTab === 'info') {
      return (
        <View style={styles.contentSection}>
          {isEditingBio ? (
            <View style={styles.bioEditContainer}>
              <TextInput style={styles.bioInput} value={bio} onChangeText={setBio} multiline placeholder="Escreva algo sobre você..." maxLength={200} />
              <View style={styles.bioButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => { setIsEditingBio(false); setBio(user?.bio || ''); }}>
                  <Text>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={updateBio}><Text style={styles.buttonText}>Salvar</Text></TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.bioContainer}>
              <Text style={styles.bioText}>{user?.bio || 'Nenhuma biografia adicionada.'}</Text>
              <TouchableOpacity style={styles.editButton} onPress={() => setIsEditingBio(true)}>
                <MaterialIcons name="edit" size={16} color="#27ae60" />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}><Text style={styles.statNumber}>{stats.reportsCount}</Text><Text style={styles.statLabel}>Denúncias</Text></View>
            <View style={styles.statItem}><Text style={styles.statNumber}>{stats.likesReceived}</Text><Text style={styles.statLabel}>Curtidas</Text></View>
            <View style={styles.statItem}><Text style={styles.statNumber}>{stats.commentsCount}</Text><Text style={styles.statLabel}>Comentários</Text></View>
          </View>
        </View>
      );
    }
  };

  if (loading && !user) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#27ae60" /></View>;
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#27ae60']} />}
    >
      {renderHeader()}
      {renderTabBar()}
      {renderTabContent()}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <MaterialIcons name="logout" size={20} color="#c0392b" />
        <Text style={styles.logoutButtonText}>Sair da Conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    profileSection: { alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
    profileImage: { width: 120, height: 120, borderRadius: 60, marginBottom: 15, borderWidth: 3, borderColor: '#27ae60', backgroundColor: '#e0e0e0' },
    editImageIcon: { position: 'absolute', bottom: 15, right: 5, backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: 8, borderRadius: 20 },
    uploadingIndicator: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 60, marginBottom: 15 },
    userName: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50' },
    userNickname: { fontSize: 16, color: '#7f8c8d' },
    tabBar: { flexDirection: 'row', backgroundColor: '#fff', elevation: 2 },
    tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: '#27ae60' },
    tabLabel: { fontSize: 12, color: '#7f8c8d', marginTop: 4 },
    activeTabLabel: { color: '#27ae60', fontWeight: 'bold' },
    contentSection: { padding: 20, backgroundColor: '#f8f9fa' },
    achievementsContainer: { padding: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    badge: { width: '48%', backgroundColor: '#fff', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 15, elevation: 1 },
    badgeLocked: { backgroundColor: '#f9f9f9', opacity: 0.7 },
    badgeName: { fontWeight: 'bold', marginTop: 8, fontSize: 14, color: '#333' },
    badgeDescription: { fontSize: 12, color: '#777', textAlign: 'center', marginTop: 4 },
    bioContainer: { width: '100%', padding: 15, backgroundColor: '#fff', borderRadius: 10, marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    bioText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
    editButton: { marginLeft: 10 },
    bioEditContainer: { width: '100%', marginBottom: 20 },
    bioInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 15, backgroundColor: '#fff', minHeight: 100, textAlignVertical: 'top', marginBottom: 10 },
    bioButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
    cancelButton: { padding: 10, marginRight: 10 },
    saveButton: { backgroundColor: '#27ae60', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 5 },
    buttonText: { color: '#fff', fontWeight: 'bold' },
    statsContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', paddingVertical: 15, backgroundColor: '#fff', borderRadius: 10 },
    statItem: { alignItems: 'center' },
    statNumber: { fontSize: 20, fontWeight: 'bold', color: '#27ae60' },
    statLabel: { fontSize: 14, color: '#7f8c8d' },
    reportItem: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 1 },
    reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    reportTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', flex: 1 },
    reportDate: { fontSize: 12, color: '#7f8c8d', marginBottom: 8 },
    reportDescription: { fontSize: 14, color: '#555' },
    viewButton: { alignSelf: 'flex-end', marginTop: 10 },
    viewButtonText: { color: '#27ae60', fontWeight: 'bold' },
    emptyContainer: { alignItems: 'center', padding: 30 },
    emptyText: { color: '#7f8c8d', fontSize: 16, marginVertical: 15, textAlign: 'center' },
    createButton: { backgroundColor: '#27ae60', padding: 12, borderRadius: 8 },
    createButtonText: { color: '#fff', fontWeight: 'bold' },
    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', marginHorizontal: 20, marginTop: 10, marginBottom: 40, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#c0392b', elevation: 2 },
    logoutButtonText: { color: '#c0392b', marginLeft: 10, fontSize: 16, fontWeight: 'bold' },
});

export default ProfileScreen;