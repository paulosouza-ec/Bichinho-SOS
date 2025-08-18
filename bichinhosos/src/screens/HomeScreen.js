import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  ScrollView // Importar ScrollView
} from 'react-native';
import { reportService } from '../services/database';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import moment from 'moment';
import 'moment/locale/pt-br';

moment.locale('pt-br');

const statusMap = {
  pending: { text: 'Pendente', color: '#f39c12' },
  seen: { text: 'Visualizado', color: '#3498db' },
  in_progress: { text: 'Em Andamento', color: '#9b59b6' },
  resolved: { text: 'Resolvido', color: '#2ecc71' },
};

const HomeScreen = ({ navigation, route }) => {
  const [reports, setReports] = useState([]);
  const [popularReports, setPopularReports] = useState([]); // NOVO: Para o carrossel
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false); // NOVO: Controla a visibilidade da busca
  const [searchQuery, setSearchQuery] = useState('');
  
  // NOVO: Sistema de filtros unificado
  const [activeFilter, setActiveFilter] = useState({ type: 'all', value: null }); 
  
  const { user } = route.params;
  const insets = useSafeAreaInsets();

  const loadReports = useCallback(async () => {
    try {
      !refreshing && setLoading(true);

      const params = {};
      switch (activeFilter.type) {
        case 'my':
          params.userId = user.id;
          break;
        case 'anonymous':
          params.filter = 'anonymous';
          break;
        case 'resolved':
          params.status = 'resolved';
          break;
      }
      if (searchQuery) {
        params.searchTerm = searchQuery;
      }

      // Busca as denúncias e os populares em paralelo
      const [reportsData, popularData] = await Promise.all([
        reportService.getReports(params),
        reportService.getPopularReports() // Busca os populares
      ]);
      
      setReports(reportsData);
      setPopularReports(popularData);

    } catch (error) {
      console.error('Erro ao carregar denúncias:', error);
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, refreshing, searchQuery]); // Adicionado searchQuery como dependência
  
  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [activeFilter]) // Recarrega quando o filtro muda
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  // Componente para o card de denúncia (usado nos dois carrosséis)
  const ReportCard = ({ item, isHorizontal }) => {
    let thumbnailUrl = item.photo_uri;
    if (item.media_type === 'video' && item.photo_uri) {
      const parts = item.photo_uri.split('.');
      parts.pop();
      thumbnailUrl = parts.join('.') + '.jpg';
    }

    return (
      <TouchableOpacity
        style={[styles.reportItem, isHorizontal && styles.horizontalReportItem]}
        onPress={() => navigation.navigate('ReportDetail', { report: item, user: user })}
      >
        {thumbnailUrl && (
          <View style={styles.mediaPreview}>
            <Image source={{ uri: thumbnailUrl }} style={styles.previewImage} />
            {item.media_type === 'video' && (
              <View style={styles.playIconContainer}><MaterialIcons name="play-circle-outline" size={48} color="#fff" /></View>
            )}
          </View>
        )}
        <View style={styles.reportContent}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle} numberOfLines={2}>{item.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusMap[item.status]?.color || '#7f8c8d' }]}>
              <Text style={styles.statusBadgeText}>{statusMap[item.status]?.text}</Text>
            </View>
          </View>
          <Text style={styles.reportDescription} numberOfLines={2}>{item.description}</Text>
          <View style={styles.reportFooter}>
            <Text style={styles.reportAuthor}>{item.is_anonymous ? 'Anônimo' : item.user_name || 'Usuário'}</Text>
            <View style={styles.reportStats}>
              <MaterialIcons name="comment" size={14} color="#7f8c8d" /><Text style={styles.statText}>{item.comments_count || 0}</Text>
              <MaterialIcons name="favorite" size={14} color="#7f8c8d" style={{ marginLeft: 8 }} /><Text style={styles.statText}>{item.likes_count || 0}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Componente para os chips de filtro
  const FilterChips = () => {
    const filters = [
      { label: 'Todas', type: 'all' },
      { label: 'Minhas', type: 'my' },
      { label: 'Anônimas', type: 'anonymous' },
      { label: 'Resolvidas', type: 'resolved' },
    ];
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {filters.map(filter => (
          <TouchableOpacity
            key={filter.type}
            style={[styles.filterChip, activeFilter.type === filter.type && styles.activeFilterChip]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[styles.filterChipText, activeFilter.type === filter.type && styles.activeFilterChipText]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* --- CABEÇALHO REDESENHADO --- */}
      <View style={styles.header}>
        {searchVisible ? (
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por título ou descrição..."
            placeholderTextColor="#ccc"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={loadReports}
            autoFocus
          />
        ) : (
          <Text style={styles.headerTitle}>BichinhoSOS</Text>
        )}
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => setSearchVisible(!searchVisible)}>
            <MaterialIcons name={searchVisible ? "close" : "search"} size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile', { userId: user.id })}
            style={{ marginLeft: 15 }}
          >
            <MaterialIcons name="account-circle" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#27ae60" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#27ae60']} />}
        >
          {/* --- CARROSSEL DE POPULARES --- */}
          {popularReports.length > 0 && !searchQuery && (
            <View>
              <Text style={styles.sectionTitle}>Populares na Comunidade</Text>
              <FlatList
                horizontal
                data={popularReports}
                renderItem={({ item }) => <ReportCard item={item} isHorizontal />}
                keyExtractor={item => item.id.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}
              />
            </View>
          )}

          {/* --- FILTROS INTELIGENTES --- */}
          {!searchQuery && <FilterChips />}

          {/* --- LISTA PRINCIPAL --- */}
          <Text style={styles.sectionTitle}>
            {searchQuery ? `Resultados para "${searchQuery}"` : 'Denúncias Recentes'}
          </Text>
          {reports.length > 0 ? (
            <View style={{ paddingHorizontal: 20 }}>
              {reports.map(item => <ReportCard key={item.id} item={item} isHorizontal={false} />)}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhuma denúncia encontrada.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.addButton, { bottom: 20 + insets.bottom }]}
        onPress={() => navigation.navigate('Report', { user: user })}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
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
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fff',
    paddingBottom: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 15,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    marginBottom: 10,
  },
  filterChip: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeFilterChip: {
    backgroundColor: '#2c3e50',
    borderColor: '#2c3e50',
  },
  filterChipText: { color: '#333', fontWeight: '500' },
  activeFilterChipText: { color: '#fff' },
  reportItem: {
    backgroundColor: '#fff',
    marginBottom: 15,
    borderRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  horizontalReportItem: {
    width: 280, // Largura do card horizontal
    marginRight: 15,
  },
  mediaPreview: {
    width: '100%',
    height: 150,
    backgroundColor: '#e0e0e0',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  playIconContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  reportContent: { padding: 12 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  reportTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  statusBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  reportDescription: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 10 },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
    marginTop: 4,
  },
  reportAuthor: { fontSize: 12, color: '#7f8c8d', fontStyle: 'italic' },
  reportStats: { flexDirection: 'row', alignItems: 'center' },
  statText: { fontSize: 12, color: '#7f8c8d', marginLeft: 4 },
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
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#888', fontSize: 16, textAlign: 'center' },
});

export default HomeScreen;