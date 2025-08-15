import React, { useState, useEffect, useCallback } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

const statusMap = {
  pending: { text: 'Pendente', color: '#f39c12' },
  seen: { text: 'Visualizado', color: '#3498db' },
  in_progress: { text: 'Em Andamento', color: '#9b59b6' },
  resolved: { text: 'Resolvido', color: '#2ecc71' },
};

const HomeScreen = ({ navigation, route }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [filter, setFilter] = useState('all');
  const { user } = route.params;
  const insets = useSafeAreaInsets();

  const loadReports = async () => {
    try {
      setLoading(true);
      const params = activeTab === 'my' ? { userId: user.id } : { filter };
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
  
  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [activeTab, filter])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  const filteredReports = reports.filter(report =>
    (report.title && report.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (report.description && report.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderReport = ({ item }) => (
    <TouchableOpacity
      style={styles.reportItem}
      onPress={() => navigation.navigate('ReportDetail', { report: item, user: user })}
    >
      <View style={styles.reportHeader}>
        <Text style={styles.reportTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusMap[item.status]?.color || '#7f8c8d' }]}>
          <Text style={styles.statusBadgeText}>{statusMap[item.status]?.text || 'Desconhecido'}</Text>
        </View>
      </View>

      <Text style={styles.reportDescription}>
        {item.description.substring(0, 100)}...
      </Text>

      {item.location && (
        <View style={styles.locationContainer}>
          <MaterialIcons name="location-on" size={16} color="#7f8c8d" />
          <Text style={styles.reportLocation}>{item.location}</Text>
        </View>
      )}

      <View style={styles.reportFooter}>
        <Text style={[styles.badge, item.is_anonymous ? styles.anonymous : styles.identified]}>
          {item.is_anonymous ? 'Anônima' : 'Identificada'}
        </Text>
        <Text style={styles.reportDate}>{new Date(item.created_at).toLocaleDateString('pt-BR')}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BichinhoSOS</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => setFilterModalVisible(true)}>
            <MaterialIcons name="filter-list" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile', { userId: user.id })}
            style={{ marginLeft: 15 }}
          >
            <MaterialIcons name="account-circle" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {['all', 'my'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'all' ? 'Todas' : 'Minhas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar denúncias..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <MaterialIcons name="search" size={22} color="#999" />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#27ae60" />
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          renderItem={renderReport}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#27ae60']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {activeTab === 'all' ? 'Nenhuma denúncia encontrada' : 'Você ainda não fez denúncias'}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.addButton, { bottom: 20 + insets.bottom }]}
        onPress={() => navigation.navigate('Report', { userId: user.id })}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtrar Denúncias</Text>
            {['all', 'anonymous', 'identified'].map(option => (
              <TouchableOpacity
                key={option}
                style={[styles.filterOption, filter === option && styles.filterOptionSelected]}
                onPress={() => {
                  setFilter(option);
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.filterOptionText}>
                  {option === 'all'
                    ? 'Todas as denúncias'
                    : option === 'anonymous'
                    ? 'Denúncias anônimas'
                    : 'Denúncias identificadas'}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.closeButton} onPress={() => setFilterModalVisible(false)}>
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    backgroundColor: '#27ae60',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerIcons: { flexDirection: 'row' },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 15,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
  },
  tabButton: { flex: 1, padding: 12, alignItems: 'center' },
  tabText: { color: '#2c3e50', fontWeight: '500' },
  activeTab: { backgroundColor: '#27ae60', borderRadius: 10 },
  activeTabText: { color: '#fff', fontWeight: 'bold' },
  searchContainer: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderRadius: 10,
    margin: 20,
    borderWidth: 1,
    borderColor: '#dcdcdc',
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: '#333',
  },
  reportItem: {
    backgroundColor: '#fff',
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' },
  reportTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', flex: 1, marginRight: 10 },
  reportDate: { fontSize: 12, color: '#7f8c8d' },
  reportDescription: { fontSize: 14, color: '#444', marginVertical: 6 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  reportLocation: { marginLeft: 5, fontSize: 13, color: '#7f8c8d' },
  reportFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  anonymous: { backgroundColor: '#f0f0f0', color: '#888' },
  identified: { backgroundColor: '#e9fbe9', color: '#27ae60' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addButton: {
    position: 'absolute',
    right: 25,
    bottom: 30,
    backgroundColor: '#27ae60',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginTop: 50 },
  emptyText: { color: '#888', fontSize: 16, textAlign: 'center' },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 12,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 15,
  },
  filterOption: { paddingVertical: 12, borderRadius: 8, paddingHorizontal: 10 },
  filterOptionSelected: { backgroundColor: '#e9fbe9' },
  filterOptionText: { fontSize: 16, color: '#2c3e50', textAlign: 'center' },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#27ae60',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: { color: '#fff', fontWeight: 'bold' },
});

export default HomeScreen;
