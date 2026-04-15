/**
 * Data & Persistence Layer — Supabase
 */

const SUPABASE_URL = 'https://yojvclcezpdldkdbmffw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvanZjbGNlenBkbGRrZGJtZmZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMTYxOTEsImV4cCI6MjA5MTc5MjE5MX0.ocG8D3xxvKLhI-FHqfeY9BH-fKNtXoiu_Z8XDB5e7aM';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// In-memory caches for synchronous access
let _productsCache = [];
let _ordersCache = [];
let _authCache = null;

const KEYS = {
  CART: 'mivalis_cart',
  USER: 'mivalis_user'
};

const INITIAL_USER = {
  name: "Usuario", lastname: "", email: "", phone: "",
  addresses: [], payments: []
};

const DataService = {
  // === INIT ===
  preload: async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      _authCache = {
        id: session.user.id,
        name: session.user.user_metadata?.name || session.user.email.split('@')[0],
        email: session.user.email
      };
    }
    try {
      const { data } = await sb.from('productos').select('*').order('id');
      if (data) _productsCache = data;
    } catch (e) { console.warn('Preload products:', e); }
    if (_authCache) {
      try {
        const { data } = await sb.from('pedidos').select('*').order('fecha', { ascending: false });
        if (data) _ordersCache = data.map(DataService._mapOrder);
      } catch (e) { console.warn('Preload orders:', e); }
    }
  },

  _mapOrder: (o) => ({
    id: o.id, date: o.fecha, total: o.total, status: o.estado,
    customer: o.cliente_nombre, user_id: o.user_id
  }),

  // === PRODUCTS ===
  getProducts: () => _productsCache,

  getProductsAsync: async () => {
    const { data, error } = await sb.from('productos').select('*').order('id');
    if (error) { console.error(error); return _productsCache; }
    _productsCache = data;
    return data;
  },

  getStoreProductsAsync: async () => {
    const { data, error } = await sb.from('productos').select('*').eq('estado', 'listo').order('id');
    if (error) { console.error(error); return _productsCache.filter(p => p.estado === 'listo'); }
    return data;
  },

  updateProductStatusAsync: async (id, status) => {
    const { error } = await sb.from('productos').update({ estado: status }).eq('id', id);
    if (error) { console.error(error); return false; }
    const idx = _productsCache.findIndex(p => p.id === id);
    if (idx !== -1) _productsCache[idx].estado = status;
    return true;
  },

  saveProducts: (products) => { _productsCache = products; },

  saveProductAsync: async (productData) => {
    const row = {
      nombre: productData.nombre || productData.name,
      categoria: productData.categoria || productData.category,
      precio: productData.precio || productData.price,
      stock: productData.stock,
      imagen: productData.imagen || productData.image,
      descripcion: productData.descripcion || productData.description || '',
      estado: productData.estado || 'listo',
      size: productData.size || 'Universal',
      gender: productData.gender || 'Unisex'
    };
    if (productData.id) {
      const { error } = await sb.from('productos').update(row).eq('id', productData.id);
      if (error) return { success: false, error: error.message };
      return { success: true, id: productData.id };
    }
    const { data, error } = await sb.from('productos').insert(row).select('id').single();
    if (error) return { success: false, error: error.message };
    return { success: true, id: data.id };
  },

  deleteProductAsync: async (id) => {
    const { error } = await sb.from('productos').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    _productsCache = _productsCache.filter(p => p.id !== id);
    return { success: true };
  },

  // === CART (localStorage — client-side only) ===
  getCart: () => JSON.parse(localStorage.getItem(KEYS.CART) || '[]'),
  saveCart: (cart) => localStorage.setItem(KEYS.CART, JSON.stringify(cart)),
  addToCart: (product, quantity = 1) => {
    const cart = DataService.getCart();
    const existing = cart.find(item => item.id === product.id);
    if (existing) existing.quantity += quantity;
    else cart.push({ ...product, quantity });
    DataService.saveCart(cart);
  },
  removeFromCart: (productId) => {
    DataService.saveCart(DataService.getCart().filter(i => i.id !== productId));
  },
  updateCartQuantity: (productId, quantity) => {
    const cart = DataService.getCart();
    const item = cart.find(i => i.id === productId);
    if (item) item.quantity = Math.max(1, quantity);
    DataService.saveCart(cart);
  },

  // === ORDERS ===
  getOrders: () => _ordersCache,

  getOrdersAsync: async ({ allOrders = false } = {}) => {
    let query = sb.from('pedidos').select('*').order('fecha', { ascending: false });
    if (!allOrders && _authCache) {
      query = query.eq('user_id', _authCache.id);
    }
    const { data, error } = await query;
    if (error) { console.error(error); return _ordersCache; }
    const mapped = data.map(DataService._mapOrder);
    if (allOrders) _ordersCache = mapped;
    return mapped;
  },

  placeOrder: (orderData) => ({
    id: "ORD-" + Date.now(), date: new Date().toISOString(),
    status: "Pending", ...orderData
  }),

  placeOrderAsync: async (orderData) => {
    const orderId = "ORD-" + Date.now();
    const auth = DataService.getAuth();

    const { error } = await sb.from('pedidos').insert({
      id: orderId,
      user_id: auth?.id || null,
      cliente_nombre: orderData.customer,
      cliente_telefono: orderData.phone || '',
      cliente_direccion: orderData.address || '',
      notas: orderData.notes || '',
      total: orderData.total,
      estado: 'Pending'
    });

    if (error) console.error('placeOrderAsync:', error);

    if (!error && orderData.items?.length > 0) {
      await sb.from('detalles_pedido').insert(
        orderData.items.map(item => ({
          pedido_id: orderId,
          producto_id: item.id,
          nombre_producto: item.name,
          cantidad: item.quantity,
          precio: item.price
        }))
      );
    }

    const order = {
      id: orderId, date: new Date().toISOString(), status: 'Pending',
      total: orderData.total, customer: orderData.customer, items: orderData.items
    };
    _ordersCache.unshift(order);
    DataService.saveCart([]);
    return order;
  },

  updateOrder: (orderId, updates) => {
    const idx = _ordersCache.findIndex(o => o.id === orderId);
    if (idx !== -1) _ordersCache[idx] = { ..._ordersCache[idx], ...updates };
  },

  updateOrderAsync: async (orderId, updates) => {
    const dbUpdates = {};
    if (updates.status) dbUpdates.estado = updates.status;
    const { error } = await sb.from('pedidos').update(dbUpdates).eq('id', orderId);
    if (error) { console.error(error); return false; }
    DataService.updateOrder(orderId, updates);
    return true;
  },

  // === USER PROFILE (localStorage) ===
  getUser: () => {
    const data = localStorage.getItem(KEYS.USER);
    if (!data) {
      localStorage.setItem(KEYS.USER, JSON.stringify(INITIAL_USER));
      return { ...INITIAL_USER };
    }
    return JSON.parse(data);
  },
  saveUser: (userData) => localStorage.setItem(KEYS.USER, JSON.stringify(userData)),

  // === AUTH (Supabase Auth) ===
  getAuth: () => _authCache,
  saveAuth: (authData) => { _authCache = authData; },
  clearAuth: () => { sb.auth.signOut(); _authCache = null; },
  isLoggedIn: () => _authCache !== null,

  loginAsync: async (email, password) => {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    _authCache = {
      id: data.user.id,
      name: data.user.user_metadata?.name || email.split('@')[0],
      email: data.user.email
    };
    return { success: true, user: _authCache };
  },

  registerAsync: async (name, email, password) => {
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { name } }
    });
    if (error) return { error: error.message };
    if (data.session) {
      _authCache = { id: data.user.id, name, email: data.user.email };
      return { success: true, user: _authCache };
    }
    // Email confirmation required — try auto sign-in
    const login = await sb.auth.signInWithPassword({ email, password });
    if (login.error) {
      return { success: true, user: { name, email }, message: 'Cuenta creada. Revisa tu correo para confirmar.' };
    }
    _authCache = { id: login.data.user.id, name, email };
    return { success: true, user: _authCache };
  }
};

window.DataService = DataService;
