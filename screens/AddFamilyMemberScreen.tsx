import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRecur } from '../shared/stores/recur';

const AVATARS = [
  { emoji: '👦', label: 'Boy Kid' },
  { emoji: '👧', label: 'Girl Kid' },
  { emoji: '👦🏻', label: 'Teen Boy' },
  { emoji: '👧🏻', label: 'Teen Girl' },
  { emoji: '👨', label: 'Man' },
  { emoji: '👩', label: 'Woman' },
  { emoji: '👴', label: 'Old Man' },
  { emoji: '👵', label: 'Old Woman' },
];

const RELATIONS = ['Self', 'Partner', 'Son', 'Daughter', 'Father', 'Mother', 'Friend'];

export default function AddFamilyMemberScreen({ navigation, route }: any) {
  const member = route?.params?.member;
  const isEditMode = !!member;

  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].emoji);
  const [showRelationPicker, setShowRelationPicker] = useState(false);
  const { addFamilyMember, updateFamilyMember, loading } = useRecur();

  useEffect(() => {
    if (member) {
      setName(member.name);
      setRelation(member.relation);
      setSelectedAvatar(member.avatar);
    }
  }, [member]);

  const handleSave = async () => {
    if (!name.trim() || !relation.trim()) return;

    let success = false;

    if (isEditMode) {
      success = await updateFamilyMember(member.id, {
        name: name.trim(),
        avatar: selectedAvatar,
        relation: relation.trim(),
      });
    } else {
      const memberId = await addFamilyMember({
        name: name.trim(),
        avatar: selectedAvatar,
        relation: relation.trim(),
      });
      success = !!memberId;
    }

    if (success) {
      navigation.goBack();
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Text style={styles.backText}>‹ {isEditMode ? 'Edit' : 'Add'} Family Member</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Text style={styles.label}>Choose Avatar</Text>
          <View style={styles.avatarGrid}>
            {AVATARS.map((avatar) => (
              <TouchableOpacity
                key={avatar.emoji}
                style={[
                  styles.avatarButton,
                  selectedAvatar === avatar.emoji && styles.avatarButtonSelected,
                ]}
                onPress={() => setSelectedAvatar(avatar.emoji)}
              >
                <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter name"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            editable={!loading}
          />

          <Text style={styles.label}>Relation</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowRelationPicker(!showRelationPicker)}
            disabled={loading}
          >
            <Text style={[styles.pickerButtonText, !relation && styles.pickerPlaceholder]}>
              {relation || 'Select relation'}
            </Text>
            <Text style={styles.pickerChevron}>{showRelationPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showRelationPicker && (
            <View style={styles.pickerDropdown}>
              {RELATIONS.map((rel) => (
                <TouchableOpacity
                  key={rel}
                  style={styles.pickerOption}
                  onPress={() => {
                    setRelation(rel);
                    setShowRelationPicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    relation === rel && styles.pickerOptionSelected
                  ]}>
                    {rel}
                  </Text>
                  {relation === rel && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading || !name.trim() || !relation.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>{isEditMode ? 'Update Member' : 'Add Member'}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    marginTop: 24,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  avatarButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarButtonSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#2563EB',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    backgroundColor: '#6B7280',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#1F2937',
  },
  pickerPlaceholder: {
    color: '#9CA3AF',
  },
  pickerChevron: {
    fontSize: 12,
    color: '#6B7280',
  },
  pickerDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#1F2937',
  },
  pickerOptionSelected: {
    fontWeight: '600',
    color: '#2563EB',
  },
  checkmark: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
});
