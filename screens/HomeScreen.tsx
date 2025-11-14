import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRecur } from '../shared/stores/recur';
import { FamilyMember } from '../shared/types/database';

export default function HomeScreen({ navigation }: any) {
  const { familyMembers, memberClassCounts, fetchAllFamilyMembers, deleteFamilyMember, loading } = useRecur();
  const [menuVisibleForMember, setMenuVisibleForMember] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await fetchAllFamilyMembers();
  };

  const onRefresh = async () => {
    await loadData();
  };

  const getMemberClassCount = (member: FamilyMember) => {
    return memberClassCounts[member.id] || 0;
  };

  const handleEditMember = (member: FamilyMember) => {
    navigation.navigate('AddFamilyMember', { member });
  };

  const handleDeleteMember = (member: FamilyMember) => {
    Alert.alert(
      'Delete Family Member',
      `Are you sure you want to delete ${member.name}? This will also delete all their class subscriptions, attendance records, and payment history.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteFamilyMember(member.id);
            if (success) {
              Alert.alert('Success', `${member.name} has been deleted.`);
            } else {
              Alert.alert('Error', 'Failed to delete family member. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderMemberCard = ({ item }: { item: FamilyMember }) => {
    const classCount = getMemberClassCount(item);
    const isMenuVisible = menuVisibleForMember === item.id;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.memberCard,
          pressed && styles.memberCardPressed,
        ]}
        onPress={() => navigation.navigate('FamilyMemberDetail', { memberId: item.id })}
      >
        <View style={styles.memberCardContent}>
          <View style={styles.memberInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.avatar}</Text>
            </View>
            <View style={styles.memberDetails}>
              <Text style={styles.memberName}>{item.name}</Text>
              <Text style={styles.memberRelation}>{item.relation}</Text>
            </View>
          </View>
          <View style={styles.memberStats}>
            <Text style={styles.classCount}>{classCount} class{classCount !== 1 ? 'es' : ''}</Text>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setMenuVisibleForMember(item.id)}
            >
              <Text style={styles.menuDots}>⋮</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          transparent
          visible={isMenuVisible}
          animationType="fade"
          onRequestClose={() => setMenuVisibleForMember(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setMenuVisibleForMember(null)}
          >
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisibleForMember(null);
                  handleEditMember(item);
                }}
              >
                <Text style={styles.menuItemText}>Edit</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisibleForMember(null);
                  handleDeleteMember(item);
                }}
              >
                <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </Pressable>
    );
  };

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Recur</Text>
        <Text style={styles.subtitle}>Track your recurring classes</Text>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddFamilyMember')}
      >
        <Text style={styles.addButtonText}>+ Add Family Member</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Family Members</Text>
    </>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No family members yet</Text>
      <Text style={styles.emptySubtext}>Add your first member to get started</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={familyMembers}
        renderItem={renderMemberCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
  addButton: {
    marginHorizontal: 20,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  memberCardPressed: {
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
    transform: [{ scale: 0.98 }],
  },
  memberCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 28,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  memberRelation: {
    fontSize: 14,
    color: '#6B7280',
  },
  memberStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  classCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  chevron: {
    fontSize: 24,
    color: '#D1D5DB',
  },
  menuButton: {
    padding: 8,
    marginLeft: 8,
  },
  menuDots: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  menuItemTextDanger: {
    color: '#DC2626',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  emptyState: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
});
