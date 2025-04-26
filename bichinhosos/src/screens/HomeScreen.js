import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Button, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Image,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput
} from 'react-native';
import { executeSql } from '../services/database';
import { MaterialIcons } from '@expo/vector-icons';

const HomeScreen = ({ navigation, route }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'anonymous', 'mine'
  const userId = route.params?.userId;

  useEffect(() => {
    loadReports();
  }, [filter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      let query = 'SELECT * FROM reports';
      let params = [];

      // Aplicar filtros
      if (filter === 'mine' && userId) {
        query += ' WHERE userId = ?';
        params.push(userId);
      } else if (filter === 'anonymous') {
        query += ' WHERE isAnonymous = 1';
      }

      query += ' ORDER BY date DESC';

      const result = await executeSql(query, params);
      setReports(result.rows._array);
    } catch (error) {
      console.error('Erro ao carregar denúncias:', error);
      alert('Erro ao carregar denúncias');
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
      onPress={() => navigation.navigate('Report', { report: item, userId })}
    >
      <View style={styles.reportHeader}>
        <Text style={styles.reportTitle}>{item.title}</Text>
        <Text style={styles.reportDate}>
          {new Date(item.date).toLocaleDateString('pt-BR')}
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
        {item.isAnonymous ? (
          <Text style={styles.anonymousBadge}>Anônima</Text>
        ) : (
          <Text style={styles.userBadge}>Identificada</Text>
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

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar denúncias..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
      </View>

      {loading && reports.length === 0 ? (
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
              <Image 
                source={require('../../assets/empty.png')} 
                style={styles.emptyImage}
              />
              <Text style={styles.emptyText}>Nenhuma denúncia encontrada</Text>
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
            
            {userId && (
              <TouchableOpacity
                style={[styles.filterOption, filter === 'mine' && styles.filterOptionSelected]}
                onPress={() => {
                  setFilter('mine');
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.filterOptionText}>Minhas denúncias</Text>
              </TouchableOpacity>
            )}
            
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
    justifyContent: 'flex-end',
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
  emptyImage: {
    width: 150,
    height: 150,
    opacity: 0.5,
    marginBottom: 20,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
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
});

export default HomeScreen;