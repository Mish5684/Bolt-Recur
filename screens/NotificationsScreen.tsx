import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../shared/api/supabase';
import { useAuthStore } from '../shared/stores/auth';
import { InAppNotification } from '../shared/types/database';
import {
  validateAndUpdateNotifications,
  markAllAsRead,
  dismissNotification,
} from '../shared/utils/notificationValidation';
import { formatDistanceToNow } from 'date-fns';

interface GroupedNotifications {
  category: string;
  data: InAppNotification[];
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('in_app_notifications')
        .select('*')
        .eq('user_id', user.id)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const validatedNotifications = await validateAndUpdateNotifications(
        data || []
      );
      setNotifications(validatedNotifications);

      await markAllAsRead(user.id);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleDismiss = async (notificationId: string) => {
    try {
      await dismissNotification(notificationId);
      setNotifications((prev) =>
        prev.filter((n) => n.id !== notificationId)
      );
    } catch (error) {
      console.error('Error dismissing notification:', error);
      Alert.alert('Error', 'Failed to dismiss notification');
    }
  };

  const handleNavigate = (notification: InAppNotification) => {
    const deepLink = notification.deep_link;
    if (!deepLink) return;

    const link = deepLink.replace('recur://', '');

    if (link === 'home') {
      navigation.navigate('Home' as never);
    } else if (link === 'analytics') {
      navigation.navigate('Analytics' as never);
    } else if (link === 'add-family-member') {
      navigation.navigate('AddFamilyMember' as never);
    } else if (link === 'add-class') {
      navigation.navigate('AddClass' as never);
    } else if (link.startsWith('class/')) {
      const parts = link.split('/');
      const classId = parts[1];

      if (parts[2] === 'edit') {
        navigation.navigate('EditClass' as never, { classId } as never);
      } else if (parts[2] === 'record-payment') {
        navigation.navigate('RecordPayment' as never, { classId } as never);
      } else {
        navigation.navigate('ClassDetail' as never, { classId } as never);
      }
    } else if (link === 'notifications') {
      return;
    }
  };

  const groupNotifications = (): GroupedNotifications[] => {
    const groups: GroupedNotifications[] = [];

    const actionable = notifications.filter(
      (n) => !n.action_completed_at && n.priority === 'high'
    );
    const upcoming = notifications.filter(
      (n) =>
        !n.action_completed_at &&
        (n.notification_type === 'pre_class_reminder' ||
          n.notification_type === 'post_class_reminder')
    );
    const getStarted = notifications.filter(
      (n) =>
        !n.action_completed_at &&
        (n.agent_name === 'onboarding' ||
          n.agent_name === 'never_tried' ||
          n.agent_name === 'gather_more_info')
    );
    const other = notifications.filter(
      (n) =>
        !n.action_completed_at &&
        !actionable.includes(n) &&
        !upcoming.includes(n) &&
        !getStarted.includes(n)
    );
    const completed = notifications.filter((n) => n.action_completed_at);

    if (actionable.length > 0) {
      groups.push({ category: 'Action Needed', data: actionable });
    }
    if (upcoming.length > 0) {
      groups.push({ category: 'Upcoming Classes', data: upcoming });
    }
    if (getStarted.length > 0) {
      groups.push({ category: 'Get Started', data: getStarted });
    }
    if (other.length > 0) {
      groups.push({ category: 'Other', data: other });
    }
    if (completed.length > 0) {
      groups.push({ category: 'Completed', data: completed });
    }

    return groups;
  };

  const getAgentColor = (agentName: string): string => {
    switch (agentName) {
      case 'alert':
        return '#FF6B6B';
      case 'engage':
        return '#4ECDC4';
      case 'onboarding':
        return '#45B7D1';
      case 'gather_more_info':
        return '#FFA07A';
      case 'never_tried':
        return '#95A5A6';
      default:
        return '#7F8C8D';
    }
  };

  const getAgentIcon = (agentName: string): string => {
    switch (agentName) {
      case 'alert':
        return '🔔';
      case 'engage':
        return '✨';
      case 'onboarding':
        return '🚀';
      case 'gather_more_info':
        return '📋';
      case 'never_tried':
        return '💡';
      default:
        return '📬';
    }
  };

  const renderNotificationCard = (notification: InAppNotification) => {
    const isCompleted = !!notification.action_completed_at;
    const agentColor = getAgentColor(notification.agent_name);
    const agentIcon = getAgentIcon(notification.agent_name);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { borderLeftColor: agentColor },
          isCompleted && styles.completedCard,
        ]}
        onPress={() => !isCompleted && handleNavigate(notification)}
        disabled={isCompleted}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.agentIcon}>{agentIcon}</Text>
            <View>
              <Text
                style={[
                  styles.title,
                  isCompleted && styles.completedText,
                ]}
              >
                {notification.title}
              </Text>
              <Text style={styles.timestamp}>
                {formatDistanceToNow(new Date(notification.created_at), {
                  addSuffix: true,
                })}
              </Text>
            </View>
          </View>
          {!isCompleted && (
            <TouchableOpacity
              onPress={() => handleDismiss(notification.id)}
              style={styles.dismissButton}
            >
              <Text style={styles.dismissText}>✕</Text>
            </TouchableOpacity>
          )}
          {isCompleted && <Text style={styles.completedIcon}>✓</Text>}
        </View>

        <Text style={[styles.body, isCompleted && styles.completedText]}>
          {notification.body}
        </Text>

        {notification.priority === 'high' && !isCompleted && (
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityText}>Action Required</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = (category: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{category}</Text>
    </View>
  );

  const renderGroup = ({ item }: { item: GroupedNotifications }) => (
    <View>
      {renderSectionHeader(item.category)}
      {item.data.map((notification) => (
        <View key={notification.id}>
          {renderNotificationCard(notification)}
        </View>
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🎉</Text>
      <Text style={styles.emptyTitle}>All caught up!</Text>
      <Text style={styles.emptyBody}>
        You have no pending notifications. Keep up the great work!
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  const groupedNotifications = groupNotifications();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {groupedNotifications.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={groupedNotifications}
          renderItem={renderGroup}
          keyExtractor={(item) => item.category}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
  },
  listContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C757D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  completedCard: {
    opacity: 0.6,
    backgroundColor: '#F8F9FA',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#6C757D',
  },
  body: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    marginTop: 4,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#ADB5BD',
  },
  dismissButton: {
    padding: 4,
  },
  dismissText: {
    fontSize: 20,
    color: '#ADB5BD',
  },
  completedIcon: {
    fontSize: 20,
    color: '#28A745',
  },
  priorityBadge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    marginTop: 40,
  },
});
