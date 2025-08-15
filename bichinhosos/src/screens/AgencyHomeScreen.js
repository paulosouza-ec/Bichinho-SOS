import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { reportService } from '../services/database';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const statusMap = {
  pending: { text: 'Pendente', color: '#f39c12' },
  seen: { text: 'Visualizado', color: '#3498db' },
  in_progress: { text: 'Em Andamento', color: '#9b59b6' },
  resolved: { text: 'Resolvido', color: '#2ecc71' },
};

const AgencyHomeScreen = ({ navigation, route }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = route.params;

  const loadReports = async () => {
    try {
      !refreshing && setLoading(true);
      const reportsData = await reportService.getReports({}); // Busca todas as denúncias
      setReports(reportsData);
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

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
      <View style={styles.reportFooter}>
          <Text style={styles.authorText}>
              {item.is_anonymous ? 'Denúncia Anônima' : `Por: ${item.user_name || 'Usuário'}`}
          </Text>
          <Text style={styles.reportDate}>
              {new Date(item.created_at).toLocaleDateString('pt-BR')}
          </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Painel de Denúncias</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile', { userId: user.id })}>
          <MaterialIcons name="account-circle" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#27ae60" style={{ marginTop: 20 }}/>
      ) : (
        <FlatList
          data={reports}
          renderItem={renderReport}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#27ae60']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhuma denúncia encontrada</Text>
            </View>
          }
        />
      )}
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
    reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
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
    reportDescription: { fontSize: 14, color: '#444', marginVertical: 6, lineHeight: 20 },
    reportFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 8,
    },
    authorText: {
        fontSize: 12,
        fontStyle: 'italic',
        color: '#888',
    },
    reportDate: { 
        fontSize: 12, 
        color: '#7f8c8d', 
    },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginTop: 50 },
    emptyText: { color: '#888', fontSize: 16, textAlign: 'center' },
});

export default AgencyHomeScreen;
