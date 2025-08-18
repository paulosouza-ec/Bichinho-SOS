import React, { useState, useCallback, useEffect } from 'react';
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
  ScrollView
} from 'react-native';
import { reportService } from '../services/database';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
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

// Componente para os cards de estatísticas
const StatCard = ({ icon, title, value, color }) => (
  <View style={styles.statCard}>
    <FontAwesome5 name={icon} size={24} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
  </View>
);

const AgencyHomeScreen = ({ navigation, route }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = route.params;

  // States para filtros
  const [stats, setStats] = useState({ pending: 0, inProgress: 0, resolved: 0 });
  const [activeStatusFilter, setActiveStatusFilter] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    try {
      !refreshing && setLoading(true);
      // Busca tanto as denúncias quanto as estatísticas em paralelo
      const [reportsData, statsData] = await Promise.all([
        reportService.getReports({ status: activeStatusFilter, searchTerm }),
        reportService.getAgencyStats()
      ]);
      setReports(reportsData);
      setStats(statsData);
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeStatusFilter, searchTerm, refreshing]);

  useEffect(() => {
    loadData();
  }, [activeStatusFilter]); // Recarrega quando o filtro de status muda

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };
  
  const handleSearch = () => {
    loadData();
  };

  const renderReport = ({ item }) => {
    let thumbnailUrl = item.photo_uri;
    if (item.media_type === 'video' && item.photo_uri) {
      const parts = item.photo_uri.split('.');
      parts.pop();
      thumbnailUrl = parts.join('.') + '.jpg';
    }

    return (
      <TouchableOpacity
        style={styles.reportItem}
        onPress={() => navigation.navigate('ReportDetail', { report: item, user: user })}
      >
        {item.photo_uri && (
          <View style={styles.mediaPreview}>
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.previewImage}
            />
            {item.media_type === 'video' && (
              <View style={styles.playIconContainer}>
                <MaterialIcons name="play-circle-outline" size={48} color="rgba(255, 255, 255, 0.85)" />
              </View>
            )}
          </View>
        )}
        <View style={styles.reportContent}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle} numberOfLines={2}>{item.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusMap[item.status]?.color || '#7f8c8d' }]}>
              <Text style={styles.statusBadgeText}>{statusMap[item.status]?.text || 'N/A'}</Text>
            </View>
          </View>
          <Text style={styles.reportDescription} numberOfLines={3}>
            {item.description}
          </Text>
          <View style={styles.reportFooter}>
            <Text style={styles.authorText}>
              <MaterialIcons name="person" size={12} color="#888" /> {item.is_anonymous ? 'Anônimo' : (item.user_name || 'Usuário')}
            </Text>
            <Text style={styles.reportDate}>
              <MaterialIcons name="today" size={12} color="#888" /> {moment(item.created_at).format('DD/MM/YY')}
            </Text>
            <Text style={styles.reportDate}>
              <MaterialIcons name="comment" size={12} color="#888" /> {item.comments_count || 0}
            </Text>
            <Text style={styles.reportDate}>
              <MaterialIcons name="favorite" size={12} color="#888" /> {item.likes_count || 0}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  const ListHeader = () => (
    <>
      {/* Seção de Estatísticas */}
      <View style={styles.statsContainer}>
        <StatCard icon="exclamation-circle" title="Pendentes" value={stats.pending} color="#f39c12" />
        <StatCard icon="tasks" title="Em Andamento" value={stats.inProgress} color="#9b59b6" />
        <StatCard icon="check-circle" title="Resolvidas" value={stats.resolved} color="#2ecc71" />
      </View>

      {/* Seção de Filtros */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterTitle}>Filtros</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity 
            style={[styles.filterButton, !activeStatusFilter && styles.filterButtonActive]}
            onPress={() => setActiveStatusFilter(null)}
          >
            <Text style={[styles.filterButtonText, !activeStatusFilter && styles.filterTextActive]}>Todos</Text>
          </TouchableOpacity>
          {Object.keys(statusMap).map(key => (
            <TouchableOpacity 
              key={key}
              style={[styles.filterButton, activeStatusFilter === key && styles.filterButtonActive]}
              onPress={() => setActiveStatusFilter(key)}
            >
              <Text style={[styles.filterButtonText, activeStatusFilter === key && styles.filterTextActive]}>{statusMap[key].text}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Barra de Busca */}
      <View style={styles.searchContainer}>
        <TextInput 
          style={styles.searchInput}
          placeholder="Buscar por palavra-chave..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
            <MaterialIcons name="search" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Painel de Denúncias</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile', { userId: user.id })}>
          <MaterialIcons name="account-circle" size={30} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#27ae60" style={{ marginTop: 50 }}/>
      ) : (
        <FlatList
          data={reports}
          renderItem={renderReport}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 15 }}
          ListHeaderComponent={ListHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#27ae60']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhuma denúncia encontrada para os filtros selecionados.</Text>
            </View>
          }
        />
      )}
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
      borderBottomLeftRadius: 15,
      borderBottomRightRadius: 15,
    },
    headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 15,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginHorizontal: 5,
        elevation: 2,
    },
    statValue: {
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 5,
    },
    statTitle: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    filterContainer: {
        marginTop: 10,
        marginBottom: 15,
    },
    filterTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 10,
    },
    filterButton: {
      backgroundColor: '#fff',
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 10,
      borderWidth: 1,
      borderColor: '#e0e0e0',
    },
    filterButtonActive: {
      backgroundColor: '#2c3e50',
      borderColor: '#2c3e50',
    },
    filterButtonText: {
      color: '#333',
      fontWeight: '500',
    },
    filterTextActive: {
      color: '#fff',
    },
    searchContainer: {
      flexDirection: 'row',
      marginBottom: 20,
    },
    searchInput: {
      flex: 1,
      backgroundColor: '#fff',
      borderRadius: 10,
      paddingHorizontal: 15,
      height: 50,
      elevation: 2,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
    },
    searchButton: {
      width: 50,
      height: 50,
      backgroundColor: '#27ae60',
      justifyContent: 'center',
      alignItems: 'center',
      borderTopRightRadius: 10,
      borderBottomRightRadius: 10,
      elevation: 2,
    },
    reportItem: {
      backgroundColor: '#fff',
      marginBottom: 15,
      borderRadius: 12,
      elevation: 2,
      overflow: 'hidden',
    },
    mediaPreview: {
      width: '100%',
      height: 200,
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
    },
    reportContent: {
      padding: 15,
    },
    reportHeader: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'flex-start', 
      marginBottom: 8 
    },
    reportTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', flex: 1, marginRight: 10 },
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
    reportDescription: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 12 },
    reportFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 10,
    },
    authorText: {
        fontSize: 12,
        color: '#888',
        flex: 1,
    },
    reportDate: { 
        fontSize: 12, 
        color: '#888',
        marginLeft: 10,
    },
    emptyContainer: { alignItems: 'center', marginTop: 50, padding: 20 },
    emptyText: { color: '#666', fontSize: 16, textAlign: 'center' },
});

export default AgencyHomeScreen;