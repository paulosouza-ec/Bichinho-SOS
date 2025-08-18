import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
  Share,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons';
import { reportService } from '../services/database';
import moment from 'moment'; 
import 'moment/locale/pt-br';
import { Video } from 'expo-av';

moment.locale('pt-br');

const statusMap = {
  pending: { text: 'Pendente', color: '#f39c12' },
  seen: { text: 'Visualizado', color: '#3498db' },
  in_progress: { text: 'Em Andamento', color: '#9b59b6' },
  resolved: { text: 'Resolvido', color: '#2ecc71' },
};

const ReportDetailScreen = ({ route, navigation }) => {
  const { report: initialReport, user } = route.params;
  const [report, setReport] = useState(initialReport);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [replyingTo, setReplyingTo] = useState(null);
  const [commentLoading, setCommentLoading] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  
  // States para notas internas da agência
  const [agencyNotes, setAgencyNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [report.id]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (route.params?.updatedReport) {
        setReport(route.params.updatedReport);
      }
    });
    return unsubscribe;
  }, [navigation, route.params?.updatedReport]);

  const loadData = async () => {
    try {
      setLoading(true);
      const promises = [
        reportService.checkUserLike(report.id, user.id),
        reportService.getLikesCount(report.id),
        reportService.getComments(report.id)
      ];
      if (user.user_type === 'agency') {
        promises.push(reportService.getAgencyNotes(report.id));
      }

      const [isLiked, count, commentsData, notesData] = await Promise.all(promises);
      
      setLiked(isLiked);
      setLikesCount(count);
      setComments(commentsData);
      if (notesData) {
        setAgencyNotes(notesData);
      }
      
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      const result = await reportService.likeReport(report.id, user.id);
      setLiked(result.liked);
      setLikesCount(prev => result.liked ? prev + 1 : prev - 1);
    } catch (error) {
      Alert.alert('Erro', error.message);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      setCommentLoading(true);
      const comment = await reportService.addComment(report.id, user.id, newComment, replyingTo?.id);
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleEditComment = async (comment) => {
    try {
      const updatedComment = await reportService.editComment(report.id, comment.id, user.id, editCommentText);
      setComments(prev => prev.map(c => c.id === comment.id ? { ...c, content: updatedComment.content } : c));
      setEditingComment(null);
      setEditCommentText('');
    } catch (error) {
      Alert.alert('Erro', error.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await reportService.deleteComment(report.id, commentId, user.id);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error) {
      Alert.alert('Erro', error.message);
    }
  };

  const handleChangeStatus = async (newStatus) => {
    if (newStatus === report.status) return;
    try {
      const updatedReport = await reportService.updateReportStatus(report.id, newStatus, user.id);
      setReport(updatedReport);
      Alert.alert('Sucesso', 'Status da denúncia atualizado!');
    } catch (error) {
      Alert.alert('Erro', error.message);
    }
  };

  const handleNavigateToEdit = () => {
    navigation.navigate('Report', { user, reportToEdit: report });
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      setNoteLoading(true);
      const note = await reportService.addAgencyNote(report.id, user.id, newNote);
      setAgencyNotes(prev => [note, ...prev]);
      setNewNote('');
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setNoteLoading(false);
    }
  };

  const renderComment = ({ item }) => (
    <View style={[styles.commentContainer, item.parent_id && styles.replyComment]}>
      <View style={styles.commentHeader}>
        <Image 
          source={{ uri: item.user_avatar || 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png' }} 
          style={styles.userAvatar}
        />
        <View style={styles.commentAuthorContainer}>
          <Text style={styles.commentAuthor}>{item.user_name}</Text>
          <Text style={styles.commentDate}>{moment(item.created_at).fromNow()}</Text>
        </View>
        
        {item.user_id === user.id && !editingComment && (
          <View style={styles.commentActions}>
            <TouchableOpacity onPress={() => {
              setEditingComment(item.id);
              setEditCommentText(item.content);
            }}>
              <MaterialIcons name="edit" size={18} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => 
              Alert.alert(
                'Excluir comentário',
                'Tem certeza que deseja excluir este comentário?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Excluir', onPress: () => handleDeleteComment(item.id), style: 'destructive' }
                ]
              )
            }>
              <MaterialIcons name="delete" size={18} color="#FF6B6B" style={{ marginLeft: 15 }}/>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {editingComment === item.id ? (
        <View style={styles.editContainer}>
          <TextInput
            style={styles.editInput}
            value={editCommentText}
            onChangeText={setEditCommentText}
            multiline
          />
          <View style={styles.editButtons}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setEditingComment(null)}
            >
              <Text style={styles.buttonTextSecondary}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={() => handleEditComment(item)}
            >
              <Text style={styles.buttonTextPrimary}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text style={styles.commentText}>{item.content}</Text>
      )}
      
      <TouchableOpacity 
        style={styles.replyButton}
        onPress={() => setReplyingTo(item)}
      >
        <Text style={styles.replyButtonText}>Responder</Text>
      </TouchableOpacity>
      
      {comments.filter(c => c.parent_id === item.id).map(reply => (
        <View key={reply.id} style={styles.replyContainer}>
          {renderComment({ item: reply })}
        </View>
      ))}
    </View>
  );

  const renderAgencyNote = ({ item }) => (
    <View style={styles.noteContainer}>
      <View style={styles.commentHeader}>
         <Image 
          source={{ uri: item.user_avatar || 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png' }} 
          style={styles.userAvatar}
        />
        <View style={styles.commentAuthorContainer}>
          <Text style={styles.commentAuthor}>{item.user_name} (Agente)</Text>
          <Text style={styles.commentDate}>{moment(item.created_at).fromNow()}</Text>
        </View>
      </View>
      <Text style={styles.commentText}>{item.content}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
    >
      <FlatList
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="#2c3e50" />
              </TouchableOpacity>
              <Text style={styles.title}>Detalhes da Denúncia</Text>
              
              {user && user.id === report.user_id ? (
                <TouchableOpacity onPress={handleNavigateToEdit}>
                  <MaterialIcons name="edit" size={24} color="#2c3e50" />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 24 }} />
              )}
            </View>
            
            <View style={styles.reportContainer}>
              <View style={styles.statusSection}>
                <Text style={styles.statusLabel}>Status:</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusMap[report.status]?.color || '#7f8c8d' }]}>
                  <Text style={styles.statusBadgeText}>{statusMap[report.status]?.text || 'Desconhecido'}</Text>
                </View>
              </View>

              <Text style={styles.reportTitle}>{report.title}</Text>
              <Text style={styles.reportDate}>{moment(report.created_at).format('DD/MM/YYYY [às] HH:mm')}</Text>
              
              {report.location && (
                <View style={styles.locationContainer}>
                  <MaterialIcons name="location-on" size={16} color="#666" />
                  <Text style={styles.reportLocation}>{report.location}</Text>
                </View>
              )}
              
              <Text style={styles.reportDescription}>{report.description}</Text>
              
              {report.photo_uri && (
                <View style={styles.mediaContainer}>
                  {report.media_type === 'video' ? (
                    <Video
                      source={{ uri: report.photo_uri }}
                      rate={1.0}
                      volume={1.0}
                      isMuted={false}
                      resizeMode="contain"
                      useNativeControls
                      style={styles.media}
                    />
                  ) : (
                    <Image 
                      source={{ uri: report.photo_uri }} 
                      style={styles.media}
                      resizeMode="cover"
                    />
                  )}
                </View>
              )}
              
              <View style={styles.likesContainer}>
                <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
                  <FontAwesome name={liked ? "heart" : "heart-o"} size={24} color={liked ? "#FF6B6B" : "#666"} />
                </TouchableOpacity>
                <Text style={styles.likesCount}>{likesCount} curtidas</Text>
              </View>
            </View>
            
            {user.user_type === 'agency' && (
              <View style={styles.agencySection}>
                <Text style={styles.sectionTitle}>Gerenciar Status</Text>
                <View style={styles.statusSelector}>
                  {Object.keys(statusMap).map((key) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.statusOption,
                        { backgroundColor: report.status === key ? statusMap[key].color : '#f0f0f0' },
                      ]}
                      onPress={() => handleChangeStatus(key)}
                    >
                      <Text style={[styles.statusOptionText, { color: report.status === key ? '#fff' : '#555'}]}>
                        {statusMap[key].text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Log de Atividades (Interno)</Text>
                <View style={styles.commentInputContainer}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Adicionar nota interna..."
                    value={newNote}
                    onChangeText={setNewNote}
                    multiline
                  />
                  <TouchableOpacity 
                    style={styles.commentButton}
                    onPress={handleAddNote}
                    disabled={noteLoading}
                  >
                    {noteLoading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="add" size={20} color="#fff" />}
                  </TouchableOpacity>
                </View>

                {agencyNotes.map(note => renderAgencyNote({ item: note }))}

              </View>
            )}
            
            <View style={styles.commentsSection}>
              <Text style={styles.sectionTitle}>Comentários ({comments.length})</Text>
              
              {replyingTo && (
                <View style={styles.replyingToContainer}>
                  <Text style={styles.replyingToText}>Respondendo a {replyingTo.user_name}</Text>
                  <TouchableOpacity onPress={() => setReplyingTo(null)}>
                    <MaterialIcons name="close" size={16} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              )}
              
              <View style={styles.commentInputContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Adicione um comentário..."
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                />
                <TouchableOpacity 
                  style={styles.commentButton}
                  onPress={handleAddComment}
                  disabled={commentLoading}
                >
                  {commentLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialIcons name="send" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        }
        data={comments.filter(c => !c.parent_id)}
        renderItem={renderComment}
        keyExtractor={item => item.id.toString()}
        ListEmptyComponent={
          <Text style={styles.noCommentsText}>
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  reportContainer: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 10,
    padding: 15,
    elevation: 2,
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statusLabel: { fontSize: 16, fontWeight: 'bold', marginRight: 10 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  statusBadgeText: { color: '#fff', fontWeight: 'bold' },
  reportTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5, color: '#333' },
  reportDate: { fontSize: 12, color: '#666', marginBottom: 10 },
  reportDescription: { fontSize: 15, color: '#555', marginVertical: 15, lineHeight: 22 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  reportLocation: { fontSize: 13, color: '#666', marginLeft: 5 },
  mediaContainer: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginVertical: 10,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  likesContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#eee' },
  likeButton: { marginRight: 10 },
  likesCount: { fontSize: 14, color: '#666' },
  agencySection: { 
    backgroundColor: '#fff', 
    marginHorizontal: 15, 
    marginBottom: 15, 
    borderRadius: 10, 
    padding: 15, 
    elevation: 2 
  },
  statusSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusOptionText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  noteContainer: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  commentsSection: { marginHorizontal: 15, padding: 15, backgroundColor: '#fff', borderRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  commentInputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  commentInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100, backgroundColor: '#f9f9f9' },
  commentButton: { marginLeft: 10, backgroundColor: '#27ae60', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  noCommentsText: { textAlign: 'center', color: '#888', marginVertical: 20 },
  commentContainer: { backgroundColor: '#f9f9f9', borderRadius: 10, padding: 10, marginBottom: 10 },
  replyComment: { backgroundColor: '#f0f0f0', marginLeft: 15 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  commentAuthorContainer: { flex: 1 },
  commentAuthor: { fontWeight: 'bold', fontSize: 14 },
  commentDate: { fontSize: 12, color: '#666' },
  commentText: { fontSize: 14, color: '#333', marginBottom: 5 },
  replyButton: { alignSelf: 'flex-start', marginTop: 5 },
  replyButtonText: { color: '#27ae60', fontSize: 12, fontWeight: 'bold' },
  replyContainer: { marginTop: 5, borderLeftWidth: 2, borderLeftColor: '#ddd', paddingLeft: 5 },
  replyingToContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0f0f0', padding: 8, borderRadius: 5, marginBottom: 10 },
  replyingToText: { fontSize: 12, color: '#666' },
  userAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  commentActions: { flexDirection: 'row', marginLeft: 'auto' },
  editContainer: { marginTop: 10 },
  editInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, backgroundColor: '#fff', minHeight: 80 },
  editButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cancelButton: { padding: 8, marginRight: 10 },
  saveButton: { backgroundColor: '#27ae60', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 5 },
  buttonTextPrimary: { color: '#fff', fontWeight: 'bold' },
  buttonTextSecondary: { color: '#666' },
});

export default ReportDetailScreen;