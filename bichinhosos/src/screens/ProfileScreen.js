import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  RefreshControl
} from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { authService, reportService } from '../services/database';
import moment from 'moment';

const ProfileScreen = ({ navigation, route }) => {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bio, setBio] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [stats, setStats] = useState({
    reportsCount: 0,
    likesReceived: 0,
    commentsCount: 0
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      const userData = await authService.getUserProfile(userId);
      setUser(userData);
      setBio(userData.bio || '');
      
      const reportsData = await reportService.getUserReports(userId);
      setReports(reportsData);
      
      const statsData = await reportService.getUserStats(userId);
      setStats(statsData);
      
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
      await authService.updateUserProfile(userId, { bio });
      setIsEditingBio(false);
      Alert.alert('Sucesso', 'Biografia atualizada com sucesso!');
    } catch (error) {
      Alert.alert('Erro', error.message);
    }
  };

  // --- NOVA FUNÇÃO DE LOGOUT ---
  const handleLogout = () => {
    Alert.alert(
      "Sair",
      "Você tem certeza que deseja sair da sua conta?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        { 
          text: "Sair", 
          onPress: () => {
            // Reseta a navegação para a tela de Login
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

  const renderReport = ({ item }) => (
    <View style={styles.reportItem}>
      <View style={styles.reportHeader}>
        <Text style={styles.reportTitle}>{item.title}</Text>
        <TouchableOpacity onPress={() => deleteReport(item.id)}>
          <MaterialIcons name="delete" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.reportDate}>
        {moment(item.created_at).format('DD/MM/YYYY')}
      </Text>
      
      <Text style={styles.reportDescription}>
        {item.description.substring(0, 100)}...
      </Text>
      
      <TouchableOpacity
        style={styles.viewButton}
        onPress={() => navigation.navigate('ReportDetail', { 
          report: item, 
          userId 
        })}
      >
        <Text style={styles.viewButtonText}>Ver detalhes</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={handleRefresh}
          colors={['#27ae60']}
        />
      }
    >
      <View style={styles.profileSection}>
        <Image
          source={{ uri: user?.profile_pic || 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png' }}
          style={styles.profileImage}
        />
        
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userNickname}>@{user?.nickname}</Text>
        
        {isEditingBio ? (
          <View style={styles.bioEditContainer}>
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={setBio}
              multiline
              placeholder="Escreva algo sobre você..."
              maxLength={200}
            />
            <View style={styles.bioButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setIsEditingBio(false)}
              >
                <Text>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={updateBio}
              >
                <Text style={styles.buttonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.bioContainer}>
            <Text style={styles.bioText}>
              {bio || 'Nenhuma biografia adicionada.'}
            </Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setIsEditingBio(true)}
            >
              <MaterialIcons name="edit" size={16} color="#27ae60" />
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.reportsCount}</Text>
            <Text style={styles.statLabel}>Denúncias</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.likesReceived}</Text>
            <Text style={styles.statLabel}>Curtidas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.commentsCount}</Text>
            <Text style={styles.statLabel}>Comentários</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.reportsSection}>
        <Text style={styles.sectionTitle}>Minhas Denúncias</Text>
        
        {reports.length > 0 ? (
          <FlatList
            data={reports}
            renderItem={renderReport}
            keyExtractor={item => item.id.toString()}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <FontAwesome name="exclamation-circle" size={40} color="#ccc" />
            <Text style={styles.emptyText}>Nenhuma denúncia encontrada</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('Report', { user: user })}
            >
              <Text style={styles.createButtonText}>Criar primeira denúncia</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* --- BOTÃO DE LOGOUT ADICIONADO --- */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <MaterialIcons name="logout" size={20} color="#c0392b" />
        <Text style={styles.logoutButtonText}>Sair da Conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
    elevation: 2,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#27ae60',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  userNickname: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 15,
  },
  bioContainer: {
    width: '100%',
    padding: 15,
    backgroundColor: '#f0f2f5',
    borderRadius: 10,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bioText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  editButton: {
    marginLeft: 10,
  },
  bioEditContainer: {
    width: '100%',
    marginBottom: 20,
  },
  bioInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  bioButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: 10,
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  reportsSection: {
    backgroundColor: '#fff',
    padding: 20,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  reportItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  reportDate: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  reportDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  viewButton: {
    alignSelf: 'flex-end',
  },
  viewButtonText: {
    color: '#27ae60',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    color: '#7f8c8d',
    fontSize: 16,
    marginVertical: 15,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#27ae60',
    padding: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // --- NOVOS ESTILOS PARA LOGOUT ---
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c0392b',
    elevation: 2,
  },
  logoutButtonText: {
    color: '#c0392b',
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;
