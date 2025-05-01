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
  FlatList
} from 'react-native';
import { MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons';
import { reportService } from '../services/database';
import moment from 'moment'; 


const ReportDetailScreen = ({ route, navigation }) => {
  const { report, userId } = route.params;
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [replyingTo, setReplyingTo] = useState(null);
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carrega likes
      const isLiked = await reportService.checkUserLike(report.id, userId);
      const count = await reportService.getLikesCount(report.id);
      
      setLiked(isLiked);
      setLikesCount(count);
      
      // Carrega comentários
      const commentsData = await reportService.getComments(report.id);
      setComments(commentsData);
      
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      const result = await reportService.likeReport(report.id, userId);
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
      const comment = await reportService.addComment(
        report.id, 
        userId, 
        newComment,
        replyingTo?.id
      );
      
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setCommentLoading(false);
    }
  };

  const renderComment = ({ item }) => (
    <View style={[
      styles.commentContainer,
      item.parent_id && styles.replyComment
    ]}>
      <View style={styles.commentHeader}>
        {/* Adiciona a imagem do perfil */}
        <Image 
          source={{ uri: item.user_avatar || 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png' }} 
          style={styles.userAvatar}
        />
        <View style={styles.commentAuthorContainer}>
          <Text style={styles.commentAuthor}>{item.user_name}</Text>
          <Text style={styles.commentDate}>
            {moment(item.created_at).fromNow()}
          </Text>
        </View>
      </View>
      
      <Text style={styles.commentText}>{item.content}</Text>
      
      <TouchableOpacity 
        style={styles.replyButton}
        onPress={() => setReplyingTo(item)}
      >
        <Text style={styles.replyButtonText}>Responder</Text>
      </TouchableOpacity>
      
      {/* Respostas */}
      {comments.filter(c => c.parent_id === item.id).map(reply => (
        <View key={reply.id} style={styles.replyContainer}>
          {renderComment({ item: reply })}
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FF6B6B" />
          </TouchableOpacity>
          <Text style={styles.title}>Detalhes da Denúncia</Text>
          <View style={{ width: 24 }} />
        </View>
        
        {/* Conteúdo da denúncia */}
        <View style={styles.reportContainer}>
          <Text style={styles.reportTitle}>{report.title}</Text>
          
          <Text style={styles.reportDate}>
            {moment(report.created_at).format('DD/MM/YYYY [às] HH:mm')}
          </Text>
          
          {report.location && (
            <View style={styles.locationContainer}>
              <MaterialIcons name="location-on" size={16} color="#666" />
              <Text style={styles.reportLocation}>{report.location}</Text>
            </View>
          )}
          
          <Text style={styles.reportDescription}>{report.description}</Text>
          
          {report.photo_uri && (
            <Image 
              source={{ uri: report.photo_uri }} 
              style={styles.reportImage}
              resizeMode="cover"
            />
          )}
          
          {/* Likes */}
          <View style={styles.likesContainer}>
            <TouchableOpacity 
              style={styles.likeButton}
              onPress={handleLike}
            >
              <FontAwesome 
                name={liked ? "heart" : "heart-o"} 
                size={24} 
                color={liked ? "#FF6B6B" : "#666"} 
              />
            </TouchableOpacity>
            <Text style={styles.likesCount}>{likesCount} curtidas</Text>
          </View>
        </View>
        
        {/* Seção de comentários */}
        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>Comentários ({comments.length})</Text>
          
          {replyingTo && (
            <View style={styles.replyingToContainer}>
              <Text style={styles.replyingToText}>
                Respondendo a {replyingTo.user_name}
              </Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <MaterialIcons name="close" size={16} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Input de comentário */}
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
          
          {/* Lista de comentários */}
          {comments.length > 0 ? (
            <FlatList
              data={comments.filter(c => !c.parent_id)}
              renderItem={renderComment}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noCommentsText}>
              Nenhum comentário ainda. Seja o primeiro a comentar!
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  reportContainer: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  reportDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  reportDescription: {
    fontSize: 14,
    color: '#555',
    marginVertical: 15,
    lineHeight: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reportLocation: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  reportImage: {
    width: '100%',
    height: 200,
    borderRadius: 5,
    marginVertical: 10,
  },
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  likeButton: {
    marginRight: 10,
  },
  likesCount: {
    fontSize: 14,
    color: '#666',
  },
  commentsSection: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    backgroundColor: '#f9f9f9',
  },
  commentButton: {
    marginLeft: 10,
    backgroundColor: '#FF6B6B',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCommentsText: {
    textAlign: 'center',
    color: '#888',
    marginVertical: 20,
  },
  commentContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  replyComment: {
    backgroundColor: '#f0f0f0',
    marginLeft: 15,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  commentAuthor: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  commentDate: {
    fontSize: 12,
    color: '#666',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  replyButton: {
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  replyButtonText: {
    color: '#FF6B6B',
    fontSize: 12,
  },
  replyContainer: {
    marginTop: 5,
    borderLeftWidth: 2,
    borderLeftColor: '#ddd',
    paddingLeft: 5,
  },
  replyingToContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 5,
    marginBottom: 10,
  },
  replyingToText: {
    fontSize: 12,
    color: '#666',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },

  commentAuthorContainer: {
    flex: 1,
  },

});

export default ReportDetailScreen;