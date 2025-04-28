import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { reportService } from '../services/database';
import { MaterialIcons } from '@expo/vector-icons';

const HomeScreen = ({ navigation, route }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' ou 'my'
  const [filter, setFilter] = useState('all'); // 'all', 'anonymous', 'identified'
  const userId = route.params?.userId;

  useEffect(() => {
    loadReports();
  }, [activeTab, filter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      
      let params = {};
      
      if (activeTab === 'my') {
        params.userId = userId;
      } else {
        params.filter = filter;
      }
      
      const reportsData = await reportService.getReports(params);
      setReports(reportsData);
      
    } catch (error) {
      console.error('Erro ao carregar denúncias:', error);
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  const handleRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  const filteredReports = reports.filter(report => {
    return (
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const renderReport = ({ item }) => (
    <TouchableOpacity 
      style={styles.reportItem}
      onPress={() => navigation.navigate('ReportDetail', { report: item, userId })}
    >
      <View style={styles.reportHeader}>
        <Text style={styles.reportTitle}>{item.title}</Text>
        <Text style={styles.reportDate}>
          {new Date(item.created_at).toLocaleDateString('pt-BR')}
        </Text>
      </View>
      
      <Text style={styles.reportDescription}>
        {item.description.substring(0, 100)}...
      </Text>
      
      {item.location && (
        <View style={styles.locationContainer}>
          <MaterialIcons name="location-on" size={16} color="#666" />
          <Text style={styles.reportLocation}>{item.location}</Text>
        </View>
      )}
      
      <View style={styles.reportFooter}>
        {item.is_anonymous ? (
          <Text style={styles.anonymousBadge}>Anônima</Text>
        ) : (
          <Text style={styles.userBadge}>Identificada</Text>
        )}
        {activeTab === 'all' && !item.is_anonymous && item.user_name && (
          <Text style={styles.authorText}>Por: {item.user_name}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bichinho SOS</Text>
        <TouchableOpacity onPress={() => setFilterModalVisible(true)}>
          <MaterialIcons name="filter-list" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Abas */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>Todas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'my' && styles.activeTab]}
          onPress={() => setActiveTab('my')}
        >
          <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>Minhas</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar denúncias..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
      </View>

      {loading && filteredReports.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          renderItem={renderReport}
          keyExtractor={item => item.id.toString()}
          style={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#FF6B6B']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {activeTab === 'all' 
                  ? 'Nenhuma denúncia encontrada' 
                  : 'Você ainda não fez nenhuma denúncia'}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('Report', { userId })}
      >
        <MaterialIcons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Modal de Filtros */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtrar Denúncias</Text>
            
            <TouchableOpacity
              style={[styles.filterOption, filter === 'all' && styles.filterOptionSelected]}
              onPress={() => {
                setFilter('all');
                setFilterModalVisible(false);
              }}
            >
              <Text style={styles.filterOptionText}>Todas as denúncias</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterOption, filter === 'anonymous' && styles.filterOptionSelected]}
              onPress={() => {
                setFilter('anonymous');
                setFilterModalVisible(false);
              }}
            >
              <Text style={styles.filterOptionText}>Denúncias anônimas</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterOption, filter === 'identified' && styles.filterOptionSelected]}
              onPress={() => {
                setFilter('identified');
                setFilterModalVisible(false);
              }}
            >
              <Text style={styles.filterOptionText}>Denúncias identificadas</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: 40,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FF6B6B',
  },
  tabText: {
    color: '#666',
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#fff',
  },
  searchContainer: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    height: 45,
    paddingLeft: 10,
  },
  searchIcon: {
    marginLeft: 10,
  },
  list: {
    flex: 1,
  },
  reportItem: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reportTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  reportDate: {
    color: '#666',
    fontSize: 12,
  },
  reportDescription: {
    color: '#555',
    marginBottom: 10,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reportLocation: {
    color: '#666',
    fontSize: 12,
    marginLeft: 5,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  anonymousBadge: {
    backgroundColor: '#f0f0f0',
    color: '#666',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontSize: 12,
  },
  userBadge: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontSize: 12,
  },
  authorText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#FF6B6B',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  filterOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterOptionSelected: {
    backgroundColor: '#f5f5f5',
  },
  filterOptionText: {
    fontSize: 16,
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#FF6B6B',
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FF6B6B',
  },
  tabText: {
    color: '#666',
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#fff',
  },
  authorText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },


});

export default HomeScreen;