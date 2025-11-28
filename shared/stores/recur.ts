import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { FamilyMember, Payment, ClassAttendance, Class, ClassSubscription, ClassWithDetails } from '../types/database';
import { createOptimisticAddition, createOptimisticDeletion, createOptimisticUpdate } from '../utils/optimisticHelpers';

interface CostPerClass {
  classId: string;
  className: string;
  totalPaid: number;
  totalClassesPurchased: number;
  costPerClass: number;
  classesAttended: number;
  currency: string;
}

interface RecurStore {
  classes: ClassWithDetails[];
  familyMembers: FamilyMember[];
  payments: Payment[];
  attendance: ClassAttendance[];
  subscriptions: ClassSubscription[];
  memberClassCounts: { [memberId: string]: number };
  loading: boolean;
  error: string | null;
  hasFamilyMembers: boolean;
  fetchClasses: () => Promise<void>;
  fetchAllFamilyMembers: () => Promise<void>;
  fetchAllAttendance: () => Promise<ClassAttendance[]>;
  fetchAllPayments: () => Promise<Payment[]>;
  fetchFamilyMemberSubscriptions: (memberId: string) => Promise<ClassSubscription[]>;
  fetchFamilyMemberClasses: (memberId: string) => Promise<ClassWithDetails[]>;
  fetchMemberClassCounts: () => Promise<void>;
  fetchPaymentsForMember: (memberId: string) => Promise<void>;
  fetchAttendanceForMember: (memberId: string) => Promise<void>;
  fetchAttendanceForClass: (memberId: string, classId: string) => Promise<ClassAttendance[]>;
  fetchPaymentsForClass: (memberId: string, classId: string) => Promise<Payment[]>;
  fetchCostPerClassForMember: (memberId: string) => Promise<{ [classId: string]: CostPerClass }>;
  checkOnboardingStatus: () => Promise<void>;
  addFamilyMember: (member: { name: string; avatar: string; relation: string }) => Promise<string | null>;
  updateFamilyMember: (memberId: string, member: { name: string; avatar: string; relation: string }) => Promise<boolean>;
  deleteFamilyMember: (memberId: string) => Promise<boolean>;
  addAttendance: (attendance: Omit<ClassAttendance, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
  deleteAttendance: (attendanceId: string) => Promise<boolean>;
  addPayment: (payment: Omit<Payment, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
  recordPayment: (payment: Omit<Payment, 'id' | 'created_at' | 'user_id'>) => Promise<boolean>;
  updatePayment: (paymentId: string, payment: Partial<Omit<Payment, 'id' | 'created_at'>>) => Promise<boolean>;
  deletePayment: (paymentId: string) => Promise<boolean>;
  subscribeToClass: (memberId: string, classId: string) => Promise<void>;
  addClass: (classData: Omit<Class, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => Promise<string | null>;
  updateClass: (classId: string, classData: Partial<Class>) => Promise<boolean>;
  deleteClass: (classId: string) => Promise<boolean>;
  pauseClass: (classId: string, reason?: string) => Promise<boolean>;
  resumeClass: (classId: string) => Promise<boolean>;
}

export const useRecur = create<RecurStore>((set, get) => ({
  classes: [],
  familyMembers: [],
  payments: [],
  attendance: [],
  subscriptions: [],
  memberClassCounts: {},
  loading: false,
  error: null,
  hasFamilyMembers: false,

  fetchClasses: async () => {
    try {
      set({ loading: true, error: null });

      // Get current user to ensure we have an active session
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('No authenticated user found:', userError);
        set({ classes: [] });
        return;
      }

      // Fetch classes with explicit user_id filter (defense in depth)
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      set({ classes: data || [] });
      await get().checkOnboardingStatus();
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchAllFamilyMembers: async () => {
    try {
      set({ loading: true, error: null });

      // Get current user to ensure we have an active session
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('No authenticated user found:', userError);
        set({ familyMembers: [], hasFamilyMembers: false });
        return;
      }

      // Fetch family members with explicit user_id filter (defense in depth)
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      set({ familyMembers: data || [], hasFamilyMembers: (data?.length || 0) > 0 });

      await get().fetchMemberClassCounts();
      await get().checkOnboardingStatus();
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchMemberClassCounts: async () => {
    try {
      const members = get().familyMembers;
      const counts: { [memberId: string]: number } = {};

      for (const member of members) {
        const { data, error } = await supabase
          .from('class_subscriptions')
          .select('*')
          .eq('family_member_id', member.id);

        if (!error && data) {
          counts[member.id] = data.length;
        } else {
          counts[member.id] = 0;
        }
      }

      set({ memberClassCounts: counts });
      await get().checkOnboardingStatus();
    } catch (error) {
      console.error('Error fetching member class counts:', error);
    }
  },

  checkOnboardingStatus: async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        set({ hasFamilyMembers: false });
        return;
      }

      const { data: membersData, error: membersError } = await supabase
        .from('family_members')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (membersError) throw membersError;

      const hasFamilyMembers = (membersData?.length || 0) > 0;

      set({ hasFamilyMembers });
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  },

  fetchAllAttendance: async () => {
    try {
      const { data, error } = await supabase
        .from('class_attendance')
        .select('*')
        .order('class_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all attendance:', error);
      return [];
    }
  },

  fetchAllPayments: async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all payments:', error);
      return [];
    }
  },

  fetchFamilyMemberSubscriptions: async (memberId: string) => {
    try {
      const { data, error } = await supabase
        .from('class_subscriptions')
        .select('*')
        .eq('family_member_id', memberId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }
  },

  fetchFamilyMemberClasses: async (memberId: string) => {
    try {
      const { data, error } = await supabase
        .from('class_subscriptions')
        .select('class_id, classes(*)')
        .eq('family_member_id', memberId);

      if (error) throw error;
      return (data || []).map((sub: any) => sub.classes).filter(Boolean);
    } catch (error) {
      console.error('Error fetching member classes:', error);
      return [];
    }
  },

  fetchPaymentsForMember: async (memberId: string) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('family_member_id', memberId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      set({ payments: data || [] });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchAttendanceForMember: async (memberId: string) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('class_attendance')
        .select('*')
        .eq('family_member_id', memberId)
        .order('class_date', { ascending: false });

      if (error) throw error;
      set({ attendance: data || [] });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchAttendanceForClass: async (memberId: string, classId: string) => {
    try {
      const { data, error } = await supabase
        .from('class_attendance')
        .select('*')
        .eq('family_member_id', memberId)
        .eq('class_id', classId)
        .order('class_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return [];
    }
  },

  fetchPaymentsForClass: async (memberId: string, classId: string) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('family_member_id', memberId)
        .eq('class_id', classId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payments:', error);
      return [];
    }
  },

  fetchCostPerClassForMember: async (memberId: string) => {
    try {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('class_id, amount, classes_paid, currency')
        .eq('family_member_id', memberId);

      if (paymentsError) throw paymentsError;

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('class_attendance')
        .select('class_id')
        .eq('family_member_id', memberId);

      if (attendanceError) throw attendanceError;

      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name');

      if (classesError) throw classesError;

      const classMap: { [classId: string]: { name: string } } = {};
      classesData?.forEach((cls: { id: string; name: string }) => {
        classMap[cls.id] = { name: cls.name };
      });

      const attendanceCount: { [classId: string]: number } = {};
      attendanceData?.forEach((att: { class_id: string }) => {
        attendanceCount[att.class_id] = (attendanceCount[att.class_id] || 0) + 1;
      });

      const costPerClassMap: { [classId: string]: CostPerClass } = {};
      const paymentsByClass: { [classId: string]: { totalAmount: number; totalClasses: number; currency: string } } = {};

      paymentsData?.forEach((payment: { class_id: string; amount: number; classes_paid: number; currency: string }) => {
        if (!paymentsByClass[payment.class_id]) {
          paymentsByClass[payment.class_id] = {
            totalAmount: 0,
            totalClasses: 0,
            currency: payment.currency || 'USD'
          };
        }
        paymentsByClass[payment.class_id].totalAmount += payment.amount;
        paymentsByClass[payment.class_id].totalClasses += payment.classes_paid;
      });

      Object.keys(paymentsByClass).forEach(classId => {
        const paymentInfo = paymentsByClass[classId];
        const costPerClass = paymentInfo.totalClasses > 0
          ? paymentInfo.totalAmount / paymentInfo.totalClasses
          : 0;

        costPerClassMap[classId] = {
          classId,
          className: classMap[classId]?.name || 'Unknown Class',
          totalPaid: paymentInfo.totalAmount,
          totalClassesPurchased: paymentInfo.totalClasses,
          costPerClass: Math.round(costPerClass * 100) / 100,
          classesAttended: attendanceCount[classId] || 0,
          currency: paymentInfo.currency
        };
      });

      return costPerClassMap;
    } catch (error) {
      console.error('Error fetching cost per class:', error);
      return {};
    }
  },

  addFamilyMember: async (member) => {
    set({ error: null });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ error: 'Not authenticated' });
      return null;
    }

    return createOptimisticAddition<RecurStore, FamilyMember>({
      stateKey: 'familyMembers',
      item: { ...member, user_id: user.id } as FamilyMember,
      apiCall: async () => {
        const { data, error } = await supabase
          .from('family_members')
          .insert([{ ...member, user_id: user.id }])
          .select()
          .single();
        return { data, error };
      },
      onSuccess: async () => {
        await get().fetchAllFamilyMembers();
      },
    }, set, get)();
  },

  updateFamilyMember: async (memberId: string, member: { name: string; avatar: string; relation: string }) => {
    set({ error: null });

    return createOptimisticUpdate<RecurStore, FamilyMember>({
      stateKey: 'familyMembers',
      itemId: memberId,
      updates: member,
      apiCall: async () => {
        const { error } = await supabase
          .from('family_members')
          .update(member)
          .eq('id', memberId);
        return { error };
      },
      onSuccess: async () => {
        await get().fetchAllFamilyMembers();
      },
    }, set, get)();
  },

  deleteFamilyMember: async (memberId: string) => {
    set({ error: null });

    return createOptimisticDeletion<RecurStore>({
      stateKey: 'familyMembers',
      itemId: memberId,
      apiCall: async () => {
        const { error: subscriptionError } = await supabase
          .from('class_subscriptions')
          .delete()
          .eq('family_member_id', memberId);

        if (subscriptionError) return { error: subscriptionError };

        const { error: attendanceError } = await supabase
          .from('class_attendance')
          .delete()
          .eq('family_member_id', memberId);

        if (attendanceError) return { error: attendanceError };

        const { error: paymentError } = await supabase
          .from('payments')
          .delete()
          .eq('family_member_id', memberId);

        if (paymentError) return { error: paymentError };

        const { error: memberError } = await supabase
          .from('family_members')
          .delete()
          .eq('id', memberId);

        return { error: memberError };
      },
      onSuccess: async () => {
        await get().fetchAllFamilyMembers();
      },
    }, set, get)();
  },

  addAttendance: async (attendance) => {
    set({ error: null });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ error: 'Not authenticated' });
      return;
    }

    await createOptimisticAddition<RecurStore, ClassAttendance>({
      stateKey: 'attendance',
      item: { ...attendance, user_id: user.id } as ClassAttendance,
      apiCall: async () => {
        const { data, error } = await supabase
          .from('class_attendance')
          .insert([{ ...attendance, user_id: user.id }])
          .select()
          .single();
        return { data, error };
      },
      onSuccess: async () => {
        if (attendance.family_member_id) {
          await get().fetchAttendanceForMember(attendance.family_member_id);
        }
      },
    }, set, get)();
  },

  addPayment: async (payment) => {
    set({ error: null });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ error: 'Not authenticated' });
      return;
    }

    await createOptimisticAddition<RecurStore, Payment>({
      stateKey: 'payments',
      item: { ...payment, user_id: user.id } as Payment,
      apiCall: async () => {
        const { data, error } = await supabase
          .from('payments')
          .insert([{ ...payment, user_id: user.id }])
          .select()
          .single();
        return { data, error };
      },
      onSuccess: async () => {
        if (payment.family_member_id) {
          await get().fetchPaymentsForMember(payment.family_member_id);
        }
      },
    }, set, get)();
  },

  recordPayment: async (payment) => {
    set({ error: null });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ error: 'Not authenticated' });
      return false;
    }

    const result = await createOptimisticAddition<RecurStore, Payment>({
      stateKey: 'payments',
      item: { ...payment, user_id: user.id } as Payment,
      apiCall: async () => {
        const { data, error } = await supabase
          .from('payments')
          .insert([{ ...payment, user_id: user.id }])
          .select()
          .single();
        return { data, error };
      },
      onSuccess: async () => {
        if (payment.family_member_id) {
          await get().fetchPaymentsForMember(payment.family_member_id);
        }
      },
    }, set, get)();

    return result !== null;
  },

  updatePayment: async (paymentId: string, payment: Partial<Omit<Payment, 'id' | 'created_at'>>) => {
    set({ error: null });

    return createOptimisticUpdate<RecurStore, Payment>({
      stateKey: 'payments',
      itemId: paymentId,
      updates: payment,
      apiCall: async () => {
        const { error } = await supabase
          .from('payments')
          .update(payment)
          .eq('id', paymentId);
        return { error };
      },
      onSuccess: async () => {
        if (payment.family_member_id) {
          await get().fetchPaymentsForMember(payment.family_member_id);
        }
      },
    }, set, get)();
  },

  deletePayment: async (paymentId: string) => {
    set({ error: null });

    return createOptimisticDeletion<RecurStore>({
      stateKey: 'payments',
      itemId: paymentId,
      apiCall: async () => {
        const { error } = await supabase
          .from('payments')
          .delete()
          .eq('id', paymentId);
        return { error };
      },
    }, set, get)();
  },

  subscribeToClass: async (memberId: string, classId: string) => {
    try {
      set({ loading: true, error: null });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('class_subscriptions')
        .insert([{ family_member_id: memberId, class_id: classId, user_id: user.id }]);

      if (error) throw error;
      await get().fetchMemberClassCounts();
    } catch (error) {
      set({ error: (error as Error).message });
      console.error('Error subscribing to class:', error);
    } finally {
      set({ loading: false });
    }
  },

  deleteAttendance: async (attendanceId: string) => {
    set({ error: null });

    return createOptimisticDeletion<RecurStore>({
      stateKey: 'attendance',
      itemId: attendanceId,
      apiCall: async () => {
        const { error } = await supabase
          .from('class_attendance')
          .delete()
          .eq('id', attendanceId);
        return { error };
      },
    }, set, get)();
  },

  addClass: async (classData) => {
    set({ error: null });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ error: 'Not authenticated' });
      return null;
    }

    return createOptimisticAddition<RecurStore, ClassWithDetails>({
      stateKey: 'classes',
      item: { ...classData, user_id: user.id } as ClassWithDetails,
      apiCall: async () => {
        const { data, error } = await supabase
          .from('classes')
          .insert([{ ...classData, user_id: user.id }])
          .select()
          .single();
        return { data, error };
      },
      onSuccess: async () => {
        await get().fetchClasses();
      },
    }, set, get)();
  },

  updateClass: async (classId: string, classData: Partial<Class>) => {
    set({ error: null });

    return createOptimisticUpdate<RecurStore, ClassWithDetails>({
      stateKey: 'classes',
      itemId: classId,
      updates: classData,
      apiCall: async () => {
        const { error } = await supabase
          .from('classes')
          .update(classData)
          .eq('id', classId);
        return { error };
      },
      onSuccess: async () => {
        await get().fetchClasses();
      },
    }, set, get)();
  },

  deleteClass: async (classId: string) => {
    set({ error: null });

    return createOptimisticDeletion<RecurStore>({
      stateKey: 'classes',
      itemId: classId,
      apiCall: async () => {
        const { error: subscriptionError } = await supabase
          .from('class_subscriptions')
          .delete()
          .eq('class_id', classId);

        if (subscriptionError) return { error: subscriptionError };

        const { error: attendanceError } = await supabase
          .from('class_attendance')
          .delete()
          .eq('class_id', classId);

        if (attendanceError) return { error: attendanceError };

        const { error: paymentError } = await supabase
          .from('payments')
          .delete()
          .eq('class_id', classId);

        if (paymentError) return { error: paymentError };

        const { error: classError } = await supabase
          .from('classes')
          .delete()
          .eq('id', classId);

        return { error: classError };
      },
      onSuccess: async () => {
        await get().fetchClasses();
      },
    }, set, get)();
  },

  pauseClass: async (classId: string, reason?: string) => {
    set({ error: null });

    return createOptimisticUpdate<RecurStore, ClassWithDetails>({
      stateKey: 'classes',
      itemId: classId,
      updates: {
        status: 'paused' as const,
        paused_at: new Date().toISOString(),
        paused_reason: reason || null,
      },
      apiCall: async () => {
        const { error } = await supabase
          .from('classes')
          .update({
            status: 'paused',
            paused_at: new Date().toISOString(),
            paused_reason: reason || null,
          })
          .eq('id', classId);
        return { error };
      },
      onSuccess: async () => {
        await get().fetchClasses();
      },
    }, set, get)();
  },

  resumeClass: async (classId: string) => {
    set({ error: null });

    return createOptimisticUpdate<RecurStore, ClassWithDetails>({
      stateKey: 'classes',
      itemId: classId,
      updates: {
        status: 'active' as const,
        paused_at: null,
        paused_reason: null,
      },
      apiCall: async () => {
        const { error } = await supabase
          .from('classes')
          .update({
            status: 'active',
            paused_at: null,
            paused_reason: null,
          })
          .eq('id', classId);
        return { error };
      },
      onSuccess: async () => {
        await get().fetchClasses();
      },
    }, set, get)();
  },
}));
