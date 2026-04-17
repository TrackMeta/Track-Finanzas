// =============================================
// DB – Todas las operaciones con Supabase
// =============================================

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- AUTH ----
const Auth = {
  async signInWithGoogle() {
    return sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  },
  async signInWithEmail(email) {
    return sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
  },
  async signOut() { return sb.auth.signOut(); },
  async getUser() {
    const { data: { user } } = await sb.auth.getUser();
    return user;
  },
  onAuthChange(cb) { return sb.auth.onAuthStateChange(cb); }
};

// ---- PROFILES ----
const Profiles = {
  async get(userId) {
    const { data } = await sb.from('profiles').select('*').eq('id', userId).single();
    return data;
  },
  async update(userId, updates) {
    const { data } = await sb.from('profiles').update(updates).eq('id', userId).select().single();
    return data;
  }
};

// ---- CATEGORIES ----
const Categories = {
  async getAll(type) {
    let q = sb.from('categories').select('*').order('name');
    if (type && type !== 'both') q = q.in('type', [type, 'both']);
    const { data } = await q;
    return data ?? [];
  }
};

// ---- TRANSACTIONS ----
const Transactions = {
  async getByMonth(month) {
    const [year, mon] = month.split('-');
    const start = `${year}-${mon}-01`;
    const end = new Date(year, mon, 0).toISOString().split('T')[0];
    const { data } = await sb
      .from('transactions')
      .select('*, category:categories(*)')
      .gte('date', start).lte('date', end)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    return data ?? [];
  },
  async getRecent(limit = 10) {
    const { data } = await sb
      .from('transactions')
      .select('*, category:categories(*)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);
    return data ?? [];
  },
  async add(tx) {
    const { data, error } = await sb.from('transactions').insert(tx).select('*, category:categories(*)').single();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    const { error } = await sb.from('transactions').delete().eq('id', id);
    if (error) throw error;
  }
};

// ---- GOALS ----
const Goals = {
  async getAll() {
    const { data } = await sb.from('goals').select('*').order('deadline');
    return data ?? [];
  },
  async add(goal) {
    const { data, error } = await sb.from('goals').insert(goal).select().single();
    if (error) throw error;
    return data;
  },
  async contribute(goalId, amount, userId, goalName) {
    // Obtener meta
    const { data: g } = await sb.from('goals').select('current_amount, target_amount').eq('id', goalId).single();
    const newAmount = Math.min(g.current_amount + amount, g.target_amount);
    await sb.from('goals').update({ current_amount: newAmount }).eq('id', goalId);
    // Registrar como transacción
    await Transactions.add({
      user_id: userId, type: 'expense', amount,
      date: new Date().toISOString().split('T')[0],
      note: `Aporte a meta: ${goalName}`, is_recurring: false, category_id: null
    });
  },
  async remove(id) {
    const { error } = await sb.from('goals').delete().eq('id', id);
    if (error) throw error;
  }
};

// ---- DEBTS ----
const Debts = {
  async getAll() {
    const { data } = await sb.from('debts').select('*').order('next_payment_date');
    return data ?? [];
  },
  async add(debt) {
    const { data, error } = await sb.from('debts').insert(debt).select().single();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    const { error } = await sb.from('debts').delete().eq('id', id);
    if (error) throw error;
  }
};

// ---- STREAKS ----
const Streaks = {
  async get(userId) {
    const { data } = await sb.from('streaks').select('*').eq('user_id', userId).single();
    return data;
  }
};

// ---- ACHIEVEMENTS ----
const Achievements = {
  async getAll(userId) {
    const { data } = await sb.from('achievements').select('type').eq('user_id', userId);
    return (data ?? []).map(a => a.type);
  }
};
