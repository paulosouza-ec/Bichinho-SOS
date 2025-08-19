import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SectionList,
  KeyboardAvoidingView,
  Platform,
  Share
} from 'react-native';
import { MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons';
import { reportService } from '../services/database';
import moment from 'moment';
import 'moment/locale/pt-br';
import { Video } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

moment.locale('pt-br');

const statusMap = {
  pending: { text: 'Pendente', color: '#f39c12' },
  seen: { text: 'Visualizado', color: '#3498db' },
  in_progress: { text: 'Em Andamento', color: '#9b59b6' },
  resolved: { text: 'Resolvido', color: '#2ecc71' },
};

// Componente base para evitar repetição de código
const BaseComment = ({ item, user, onReply, onEdit, onDelete, editingComment, editCommentText, setEditCommentText, handleEditComment, children }) => (
  <>
    <Image
      source={{ uri: item.user_avatar || 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png' }}
      style={styles.authorAvatar}
    />
    <View style={styles.commentContent}>
      <View style={styles.commentHeader}>
        <Text style={styles.authorName}>{item.user_name}</Text>
        <Text style={styles.commentDate}>{moment(item.created_at).fromNow()}</Text>
      </View>
      
      {editingComment === item.id ? (
          <View>
              <TextInput
                  style={styles.editInput}
                  value={editCommentText}
                  onChangeText={setEditCommentText}
                  multiline autoFocus
              />
              <View style={styles.editButtons}>
                  <TouchableOpacity onPress={() => onEdit(null)}>
                      <Text style={styles.editButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleEditComment}>
                      <Text style={[styles.editButtonText, { color: '#27ae60' }]}>Salvar</Text>
                  </TouchableOpacity>
              </View>
          </View>
      ) : (
          <Text style={styles.commentText}>{item.content}</Text>
      )}
      
      {editingComment !== item.id && (
          <View style={styles.commentFooter}>
              <TouchableOpacity onPress={onReply}>
                  <Text style={styles.footerActionText}>Responder</Text>
              </TouchableOpacity>
              {item.user_id === user.id && (
                  <>
                      <Text style={styles.footerSeparator}>·</Text>
                      <TouchableOpacity onPress={() => onEdit(item)}>
                          <Text style={styles.footerActionText}>Editar</Text>
                      </TouchableOpacity>
                      <Text style={styles.footerSeparator}>·</Text>
                      <TouchableOpacity onPress={() => onDelete(item.id)}>
                          <Text style={[styles.footerActionText, { color: '#e74c3c' }]}>Excluir</Text>
                      </TouchableOpacity>
                  </>
              )}
          </View>
      )}
      {children}
    </View>
  </>
);


const ReportDetailScreen = ({ route, navigation }) => {
  const { report: initialReport, user } = route.params;
  const insets = useSafeAreaInsets();
  
  // States
  const [report, setReport] = useState(initialReport);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialReport.likes_count || 0);
  const [replyingTo, setReplyingTo] = useState(null);
  const [commentLoading, setCommentLoading] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [expandedComments, setExpandedComments] = useState([]);

  const commentSections = useMemo(() => {
    const rootComments = [];
    const repliesMap = new Map();

    comments.forEach(comment => {
      if (comment.parent_id) {
        if (!repliesMap.has(comment.parent_id)) {
          repliesMap.set(comment.parent_id, []);
        }
        repliesMap.get(comment.parent_id).push(comment);
      } else {
        rootComments.push(comment);
      }
    });
    
    rootComments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return rootComments.map(root => {
        const replies = (repliesMap.get(root.id) || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        return {
            rootComment: root,
            data: expandedComments.includes(root.id) ? replies : [],
        };
    });
  }, [comments, expandedComments]);

  const toggleReplies = (commentId) => {
    setExpandedComments(current =>
      current.includes(commentId)
        ? current.filter(id => id !== commentId)
        : [...current, commentId]
    );
  };

  useEffect(() => {
    loadData();
  }, [report.id]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (route.params?.updatedReport) setReport(route.params.updatedReport);
    });
    return unsubscribe;
  }, [navigation, route.params?.updatedReport]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [isLiked, count, commentsData] = await Promise.all([
        reportService.checkUserLike(report.id, user.id),
        reportService.getLikesCount(report.id),
        reportService.getComments(report.id),
      ]);
      setLiked(isLiked);
      setLikesCount(count);
      setComments(commentsData || []);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setCommentLoading(true);
    try {
      const parentId = replyingTo ? (replyingTo.parent_id || replyingTo.id) : null;
      const newCommentData = await reportService.addComment(report.id, user.id, newComment, parentId);
      if (parentId && !expandedComments.includes(parentId)) {
        toggleReplies(parentId);
      }
      setComments(prev => [...prev, newCommentData]);
      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleEditComment = async () => {
    if (!editCommentText.trim() || !editingComment) return;
    try {
      const updated = await reportService.editComment(report.id, editingComment, user.id, editCommentText);
      setComments(prev => prev.map(c => c.id === editingComment ? { ...c, content: updated.content } : c));
      setEditingComment(null);
      setEditCommentText('');
    } catch (error) {
      Alert.alert('Erro', error.message);
    }
  };
  
  const confirmDeleteComment = (commentId) => {
    Alert.alert('Excluir Comentário', 'Tem certeza?', [
      { text: 'Cancelar' },
      { text: 'Excluir', style: 'destructive', onPress: () => handleDeleteComment(commentId) },
    ]);
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await reportService.deleteComment(report.id, commentId, user.id);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error) {
      Alert.alert('Erro', error.message);
    }
  };

  const handleLike = async () => {
    try {
      const result = await reportService.likeReport(report.id, user.id);
      setLiked(result.liked);
      setLikesCount(prev => (result.liked ? prev + 1 : prev - 1));
    } catch (error) {
      Alert.alert('Erro', error.message);
    }
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `Confira esta denúncia: ${report.title}\n\n${report.description}`,
      });
    } catch (error) {
      Alert.alert(error.message);
    }
  };

  const handleEdit = (comment) => {
    if (comment === null) {
      // Cancelar edição
      setEditingComment(null);
      setEditCommentText('');
    } else {
      // Iniciar edição
      setEditingComment(comment.id);
      setEditCommentText(comment.content);
    }
  };

  // --- COMPONENTES DE RENDERIZAÇÃO ---

  const renderRootComment = ({ section }) => {
    const { rootComment } = section;
    const replyCount = comments.filter(c => c.parent_id === rootComment.id).length;
    const isExpanded = expandedComments.includes(rootComment.id);

    return (
        <View style={styles.commentContainer}>
            <BaseComment
                item={rootComment}
                user={user}
                onReply={() => setReplyingTo(rootComment)}
                onEdit={handleEdit}
                onDelete={confirmDeleteComment}
                editingComment={editingComment}
                editCommentText={editCommentText}
                setEditCommentText={setEditCommentText}
                handleEditComment={handleEditComment}
            >
              {/* O botão de ver respostas agora é filho do BaseComment para garantir o alinhamento */}
              {replyCount > 0 && (
                  <TouchableOpacity style={styles.repliesToggle} onPress={() => toggleReplies(rootComment.id)}>
                      <View style={styles.replyLine} />
                      <Text style={styles.repliesToggleText}>
                          {isExpanded ? 'Ocultar respostas' : `Ver as ${replyCount} respostas`}
                      </Text>
                  </TouchableOpacity>
              )}
            </BaseComment>
        </View>
    );
  };
  
  const renderReply = ({ item }) => (
    <View style={[styles.commentContainer, { marginLeft: 30 }]}>
      <BaseComment
        item={item}
        user={user}
        onReply={() => setReplyingTo(item)}
        onEdit={handleEdit}
        onDelete={confirmDeleteComment}
        editingComment={editingComment}
        editCommentText={editCommentText}
        setEditCommentText={setEditCommentText}
        handleEditComment={handleEditComment}
      />
    </View>
  );
  
  // CORRIGIDO: O conteúdo do card foi restaurado aqui
  const renderListHeader = () => (
    <>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image
            source={{ uri: report.user_avatar || 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png' }}
            style={styles.authorAvatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.authorName}>{report.is_anonymous ? 'Anônimo' : report.user_name || 'Usuário'}</Text>
            <Text style={styles.reportDate}>{moment(report.created_at).format('DD [de] MMMM, YYYY [às] HH:mm')}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusMap[report.status]?.color || '#7f8c8d' }]}>
            <Text style={styles.statusBadgeText}>{statusMap[report.status]?.text}</Text>
          </View>
        </View>
        <Text style={styles.reportTitle}>{report.title}</Text>
        {report.location && (
          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={16} color="#7f8c8d" />
            <Text style={styles.infoText}>{report.location}</Text>
          </View>
        )}
        <Text style={styles.reportDescription}>{report.description}</Text>
        {report.photo_uri && (
          <View style={styles.mediaContainer}>
            {report.media_type === 'video' ? (
              <Video source={{ uri: report.photo_uri }} rate={1.0} volume={1.0} isMuted={false} resizeMode="contain" useNativeControls style={styles.media} />
            ) : (
              <Image source={{ uri: report.photo_uri }} style={styles.media} resizeMode="cover" />
            )}
          </View>
        )}
        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.footerButton} onPress={handleLike}>
            <FontAwesome name={liked ? "heart" : "heart-o"} size={22} color={liked ? "#e74c3c" : "#7f8c8d"} />
            <Text style={styles.footerButtonText}>{likesCount}</Text>
          </TouchableOpacity>
          <View style={styles.footerButton}>
            <MaterialIcons name="comment" size={22} color="#7f8c8d" />
            <Text style={styles.footerButtonText}>{comments.length}</Text>
          </View>
          <TouchableOpacity style={styles.footerButton} onPress={onShare}>
            <MaterialIcons name="share" size={22} color="#7f8c8d" />
            <Text style={styles.footerButtonText}>Compartilhar</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[styles.sectionTitle, { marginHorizontal: 20, marginTop: 10 }]}>Comentários</Text>
    </>
  );

  if (loading) {
    return <ActivityIndicator size="large" color="#27ae60" style={{ flex: 1, backgroundColor: '#f8f9fa' }} />;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={26} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes</Text>
        <TouchableOpacity 
            onPress={() => navigation.navigate('Report', { user, reportToEdit: report })} 
            style={styles.headerButton}
        >
            <MaterialIcons name="edit" size={24} color="#2c3e50" />
        </TouchableOpacity>
      </View>
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <SectionList
          sections={commentSections}
          keyExtractor={(item) => item.id.toString()}
          renderSectionHeader={renderRootComment}
          renderItem={renderReply}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>Seja o primeiro a comentar!</Text></View>}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
        
        <View style={[styles.commentInputBar, { paddingBottom: insets.bottom || 10 }]}>
          {replyingTo && (
            <View style={styles.replyingToContainer}>
              <Text style={styles.replyingToText}>Respondendo a {replyingTo.user_name}</Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <MaterialIcons name="close" size={18} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Adicione um comentário..."
              placeholderTextColor="#888"
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleAddComment} disabled={commentLoading}>
              {commentLoading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="send" size={22} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50' },
  headerButton: { padding: 5, width: 34, alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  authorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  reportDate: { fontSize: 12, color: '#7f8c8d' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 10 },
  statusBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  reportTitle: { fontSize: 18, fontWeight: 'bold', color: '#34495e', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoText: { fontSize: 14, color: '#7f8c8d', marginLeft: 8, flex: 1 },
  reportDescription: { fontSize: 15, color: '#555', lineHeight: 22, marginBottom: 15 },
  mediaContainer: { width: '100%', height: 220, borderRadius: 12, marginVertical: 10, backgroundColor: '#e0e0e0', overflow: 'hidden' },
  media: { width: '100%', height: '100%' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10, marginTop: 5 },
  footerButton: { flexDirection: 'row', alignItems: 'center' },
  footerButtonText: { marginLeft: 6, fontSize: 13, color: '#7f8c8d', fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', paddingHorizontal: 20, marginBottom: 10 },
  commentContainer: { flexDirection: 'row', padding: 10, },
  commentContent: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  commentDate: { fontSize: 12, color: '#7f8c8d' },
  commentText: { marginTop: 4, fontSize: 14, color: '#34495e', lineHeight: 20 },
  commentFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  footerActionText: { fontSize: 12, fontWeight: 'bold', color: '#7f8c8d' },
  footerSeparator: { marginHorizontal: 8, color: '#ccc' },
  repliesToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
  replyLine: { height: 1, width: 25, backgroundColor: '#ccc', marginRight: 10 },
  repliesToggleText: { fontSize: 13, color: '#7f8c8d', fontWeight: '500' },
  editInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, backgroundColor: '#f8f9fa', fontSize: 14, marginTop: 5 },
  editButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  editButtonText: { fontSize: 13, fontWeight: 'bold', marginLeft: 15, color: '#7f8c8d' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#888', fontSize: 16 },
  commentInputBar: { backgroundColor: '#fff', paddingTop: 10, paddingHorizontal: 15, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  commentInputContainer: { flexDirection: 'row', alignItems: 'center' },
  commentInput: { flex: 1, backgroundColor: '#f0f2f5', borderRadius: 22, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontSize: 15, maxHeight: 100, color: '#333' },
  sendButton: { marginLeft: 10, backgroundColor: '#27ae60', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  replyingToContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e9f5f8', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginBottom: 8 },
  replyingToText: { fontSize: 13, color: '#3498db' },
});

export default ReportDetailScreen;