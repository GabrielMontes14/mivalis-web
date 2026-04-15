/**
 * Mock Data & Persistence Layer
 * Handles "Database" operations using localStorage
 */

// Initial Data
const INITIAL_PRODUCTS = [
  // ===== SUPERHÉROES =====
  { id: 1, name: "Batman - El Caballero de la Noche", price: 59.99, category: "Superhéroes", size: "L", gender: "Hombres", image: "https://cdn.pixabay.com/photo/2019/03/27/05/09/batman-4084262_1280.jpg", description: "Traje de Batman blindado de alta calidad. Perfecto para hacer justicia en cualquier fiesta.", rating: 4.8, stock: 10, estado: "listo" },
  { id: 2, name: "Mujer Maravilla", price: 55.00, category: "Superhéroes", size: "S", gender: "Mujeres", image: "https://cdn.pixabay.com/photo/2020/05/18/08/36/woman-5185209_1280.jpg", description: "Réplica clásica de la armadura de guerrera amazona. Incluye tiara y brazaletes.", rating: 4.9, stock: 15, estado: "listo" },
  { id: 3, name: "Spider-Man Clásico", price: 49.99, category: "Superhéroes", size: "M", gender: "Hombres", image: "https://cdn.pixabay.com/photo/2016/03/07/15/04/spider-man-1242398_1280.jpg", description: "El traje del amigable vecino Spider-Man. Licra de alta calidad con máscara completa.", rating: 4.7, stock: 12, estado: "listo" },
  { id: 4, name: "Cosplay Heroína Oscura", price: 68.00, category: "Superhéroes", size: "M", gender: "Mujeres", image: "https://cdn.pixabay.com/photo/2020/05/18/08/37/woman-5185213_1280.jpg", description: "Traje de superheroína estilo oscuro con capa y detalles metálicos.", rating: 4.6, stock: 8, estado: "listo" },
  { id: 5, name: "Spiderman Urbano", price: 52.00, category: "Superhéroes", size: "L", gender: "Hombres", image: "https://cdn.pixabay.com/photo/2020/08/12/15/16/spiderman-5482921_1280.jpg", description: "Versión urbana del traje de Spider-Man. Ideal para cosplay y fiestas temáticas.", rating: 4.8, stock: 10, estado: "listo" },
  { id: 6, name: "Héroe Enmascarado", price: 42.00, category: "Superhéroes", size: "Universal", gender: "Unisex", image: "https://cdn.pixabay.com/photo/2014/11/23/02/16/man-542322_1280.jpg", description: "Disfraz de héroe enmascarado versátil. Perfecto para crear tu propio personaje.", rating: 4.5, stock: 20, estado: "listo" },
  { id: 7, name: "Guerrera Cosplay", price: 72.00, category: "Superhéroes", size: "S", gender: "Mujeres", image: "https://cdn.pixabay.com/photo/2020/05/18/08/36/woman-5185210_1280.jpg", description: "Traje de guerrera futurista con armadura ligera y detalles LED.", rating: 4.9, stock: 6, estado: "listo" },

  // ===== TERROR =====
  { id: 8, name: "Bruja Clásica", price: 34.50, category: "Terror", size: "M", gender: "Mujeres", image: "https://cdn.pixabay.com/photo/2014/11/20/19/43/the-witch-539683_1280.jpg", description: "Disfraz de bruja atemporal con sombrero puntiagudo y capa negra.", rating: 4.5, stock: 25, estado: "listo" },
  { id: 9, name: "Zombie Apocalíptico", price: 39.99, category: "Terror", size: "L", gender: "Hombres", image: "https://cdn.pixabay.com/photo/2014/10/23/01/27/zombie-499199_1280.jpg", description: "Traje de zombie con maquillaje FX incluido. Aterroriza a todos en Halloween.", rating: 4.6, stock: 15, estado: "listo" },
  { id: 10, name: "Bruja del Bosque", price: 45.00, category: "Terror", size: "M", gender: "Mujeres", image: "https://cdn.pixabay.com/photo/2015/01/03/21/52/witch-587869_1280.jpg", description: "Disfraz de bruja del bosque encantado con vestido largo y accesorios naturales.", rating: 4.7, stock: 10, estado: "listo" },
  { id: 11, name: "Esqueleto Neon", price: 32.00, category: "Terror", size: "Universal", gender: "Unisex", image: "https://cdn.pixabay.com/photo/2016/10/31/16/38/halloween-1786066_1280.jpg", description: "Traje de esqueleto con diseño fluorescente que brilla en la oscuridad.", rating: 4.4, stock: 30, estado: "listo" },
  { id: 12, name: "Hechicera Gótica", price: 58.00, category: "Terror", size: "S", gender: "Mujeres", image: "https://cdn.pixabay.com/photo/2016/10/16/10/42/halloween-1744830_1280.jpg", description: "Elegante disfraz de hechicera gótica con vestido de encaje y accesorios oscuros.", rating: 4.8, stock: 8, estado: "listo" },
  { id: 13, name: "Vampiro Sangriento", price: 41.00, category: "Terror", size: "L", gender: "Hombres", image: "https://cdn.pixabay.com/photo/2015/07/01/02/25/vampire-827119_1280.jpg", description: "Disfraz de vampiro con colmillos y sangre artificial. Terror clásico garantizado.", rating: 4.5, stock: 18, estado: "listo" },
  { id: 14, name: "Mago Oscuro", price: 48.00, category: "Terror", size: "XL", gender: "Hombres", image: "https://cdn.pixabay.com/photo/2016/09/12/03/03/wizard-1662948_1280.jpg", description: "Traje de mago oscuro con túnica, sombrero y bastón mágico.", rating: 4.6, stock: 12, estado: "listo" },

  // ===== DE ÉPOCA =====
  { id: 15, name: "Vampiro Victoriano", price: 65.00, category: "De Época", size: "XL", gender: "Hombres", image: "https://cdn.pixabay.com/photo/2021/05/24/12/45/vampire-6279069_1280.jpg", description: "Elegante traje de vampiro de terciopelo con capa y chaleco victoriano.", rating: 4.7, stock: 12, estado: "listo" },
  { id: 16, name: "Dama Victoriana", price: 70.00, category: "De Época", size: "M", gender: "Mujeres", image: "https://cdn.pixabay.com/photo/2020/09/23/16/41/gothic-5596496_1280.jpg", description: "Vestido victoriano gótico con corsé y falda larga. Elegancia oscura.", rating: 4.9, stock: 7, estado: "listo" },
  { id: 17, name: "Caballero Medieval", price: 75.00, category: "De Época", size: "L", gender: "Hombres", image: "https://cdn.pixabay.com/photo/2015/09/14/20/57/knight-940093_1280.jpg", description: "Armadura de caballero medieval con espada y escudo. Conquista la fiesta.", rating: 4.8, stock: 5, estado: "listo" },
  { id: 18, name: "Vampiresa Elegante", price: 62.00, category: "De Época", size: "S", gender: "Mujeres", image: "https://cdn.pixabay.com/photo/2021/05/24/12/56/vampire-6279187_1280.jpg", description: "Disfraz de vampiresa con vestido rojo sangre y capa de satén.", rating: 4.7, stock: 9, estado: "listo" },
  { id: 19, name: "Rey Medieval", price: 80.00, category: "De Época", size: "XL", gender: "Hombres", image: "https://cdn.pixabay.com/photo/2019/02/20/08/03/monarch-4008633_1280.jpg", description: "Traje de rey medieval con corona, capa de armiño y cetro dorado.", rating: 4.9, stock: 4, estado: "listo" },
  { id: 20, name: "Conde Drácula", price: 58.00, category: "De Época", size: "L", gender: "Hombres", image: "https://cdn.pixabay.com/photo/2021/05/24/12/45/vampire-6279072_1280.jpg", description: "Clásico disfraz de Conde Drácula con capa de cuello alto y chaleco.", rating: 4.6, stock: 14, estado: "listo" },
  { id: 21, name: "Guerrero de la Edad Media", price: 69.00, category: "De Época", size: "L", gender: "Hombres", image: "https://cdn.pixabay.com/photo/2017/08/02/17/05/horse-2572425_1280.jpg", description: "Disfraz de guerrero medieval a caballo con cota de malla y espada.", rating: 4.5, stock: 6, estado: "listo" },

  // ===== ANIMALES =====
  { id: 22, name: "Dinosaurio T-Rex", price: 45.00, category: "Animales", size: "Universal", gender: "Unisex", image: "https://cdn.pixabay.com/photo/2015/10/10/19/25/girl-981363_1280.jpg", description: "Disfraz de dinosaurio T-Rex. El favorito de los fans, ideal para cualquier evento.", rating: 5.0, stock: 5, estado: "listo" },
  { id: 23, name: "Gato Negro", price: 28.00, category: "Animales", size: "S", gender: "Mujeres", image: "https://cdn.pixabay.com/photo/2014/04/05/12/24/cat-316994_1280.jpg", description: "Adorable disfraz de gato negro con orejas, cola y bigotes.", rating: 4.6, stock: 20, estado: "listo" },
  { id: 24, name: "León Salvaje", price: 52.00, category: "Animales", size: "L", gender: "Hombres", image: "https://cdn.pixabay.com/photo/2015/03/17/06/50/show-677262_1280.jpg", description: "Disfraz de león con melena realista. Ruge con estilo en tu próxima fiesta.", rating: 4.7, stock: 8, estado: "listo" },
  { id: 25, name: "Rana Divertida", price: 35.00, category: "Animales", size: "Universal", gender: "Unisex", image: "https://cdn.pixabay.com/photo/2012/10/25/20/11/kermit-62804_1280.jpg", description: "Disfraz de rana estilo Kermit. Divertido y cómodo para toda la familia.", rating: 4.8, stock: 15, estado: "listo" },
  { id: 26, name: "Gatita Kawaii", price: 30.00, category: "Animales", size: "S", gender: "Mujeres", image: "https://cdn.pixabay.com/photo/2014/04/05/12/24/kitten-316995_1280.jpg", description: "Disfraz de gatita estilo kawaii con detalles tiernos y accesorios.", rating: 4.5, stock: 18, estado: "listo" },
  { id: 27, name: "Muñeca Animal", price: 38.00, category: "Animales", size: "Niño", gender: "Niño", image: "https://cdn.pixabay.com/photo/2016/02/07/11/44/doll-1184471_1280.jpg", description: "Disfraz de muñeca animalito para niños. Suave y confortable.", rating: 4.9, stock: 22, estado: "listo" },

  // ===== OTROS =====
  { id: 28, name: "Pequeña Calabaza", price: 25.00, category: "Otros", size: "Niño", gender: "Niño", image: "https://cdn.pixabay.com/photo/2022/10/27/16/28/halloween-7551188_1280.jpg", description: "Adorable traje de calabaza para niños pequeños. Ideal para Halloween.", rating: 4.8, stock: 30, estado: "listo" },
  { id: 29, name: "Pirata del Caribe", price: 47.00, category: "Otros", size: "L", gender: "Hombres", image: "https://cdn.pixabay.com/photo/2017/03/09/12/32/pirate-2129571_1280.jpg", description: "Disfraz completo de pirata con sombrero, parche y espada.", rating: 4.7, stock: 14, estado: "listo" },
  { id: 30, name: "Payaso Carnaval", price: 36.00, category: "Otros", size: "Universal", gender: "Unisex", image: "https://cdn.pixabay.com/photo/2015/02/18/19/25/clown-641249_1280.jpg", description: "Colorido disfraz de payaso de carnaval con peluca y nariz roja.", rating: 4.4, stock: 20, estado: "listo" },
  { id: 31, name: "Pirata Aventurera", price: 44.00, category: "Otros", size: "M", gender: "Mujeres", image: "https://cdn.pixabay.com/photo/2015/05/21/23/56/woman-778122_1280.jpg", description: "Disfraz de pirata para mujer con corsé, falda y botas altas.", rating: 4.6, stock: 11, estado: "listo" },
  { id: 32, name: "Bufón Real", price: 40.00, category: "Otros", size: "M", gender: "Hombres", image: "https://cdn.pixabay.com/photo/2015/02/18/19/33/fool-641285_1280.jpg", description: "Traje de bufón medieval con gorro de cascabeles y colores vivos.", rating: 4.3, stock: 16, estado: "listo" },
  { id: 33, name: "Capitán Pirata", price: 55.00, category: "Otros", size: "XL", gender: "Hombres", image: "https://cdn.pixabay.com/photo/2017/04/15/17/21/pirate-2232936_1280.jpg", description: "Disfraz de capitán pirata con abrigo largo, sombrero tricornio y garfio.", rating: 4.8, stock: 7, estado: "listo" },
  { id: 34, name: "Arlequín de Circo", price: 38.00, category: "Otros", size: "S", gender: "Mujeres", image: "https://cdn.pixabay.com/photo/2016/02/09/15/30/colorful-1189682_1280.jpg", description: "Disfraz de arlequín colorido con detalles diamante y maquillaje festivo.", rating: 4.5, stock: 13, estado: "listo" },
];

const INITIAL_CATEGORIES = ["Superhéroes", "Terror", "De Época", "Animales", "Otros"];

const INITIAL_USER = {
  name: "Juan",
  lastname: "Pérez",
  email: "juan.perez@example.com",
  phone: "+57 300 123 4567",
  password: "password123", // In a real app, this would be hashed
  addresses: [
    { id: 1, alias: "Casa", address: "Calle Falsa 123", city: "Montería", default: true }
  ],
  payments: [
    { id: 1, alias: "Visa terminada en 4242", last4: "4242", type: "visa" }
  ]
};

// Storage Keys
const KEYS = {
  PRODUCTS: 'costume_store_products_v2',
  CART: 'costume_store_cart',
  ORDERS: 'costume_store_orders',
  USER: 'costume_store_user',
  AUTH: 'costume_store_auth'
};

// Helper to detect file protocol
const IS_FILE_PROTOCOL = location.protocol === 'file:';

// Data Service
const DataService = {
  // Products
  getProducts: () => {
    const data = localStorage.getItem(KEYS.PRODUCTS);
    if (!data) {
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    return JSON.parse(data);
  },

  getProductsAsync: async () => {
    if (IS_FILE_PROTOCOL) {
      console.warn("Running in file:// mode. API disabled. Using LocalStorage fallback.");
      return DataService.getProducts();
    }
    try {
      const response = await fetch('api/get_products.php');
      if (!response.ok) throw new Error('API Error');
      return await response.json();
    } catch (e) {
      console.warn("API de productos falla, usando LocalStorage:", e);
      return DataService.getProducts();
    }
  },

  getStoreProductsAsync: async () => {
    if (IS_FILE_PROTOCOL) {
      console.warn("Running in file:// mode. API disabled. Using LocalStorage fallback.");
      const products = DataService.getProducts();
      return products.filter(p => p.estado === 'listo');
    }
    try {
      const response = await fetch('api/get_store_products.php');
      if (!response.ok) throw new Error('API Error');
      return await response.json();
    } catch (e) {
      console.warn("API de tienda falla, usando LocalStorage:", e);
      // Fallback: get all and filter manually
      const products = DataService.getProducts();
      // Strict filter for 'listo'
      return products.filter(p => p.estado === 'listo');
    }
  },

  updateProductStatusAsync: async (id, status) => {
    if (IS_FILE_PROTOCOL) {
      console.warn("Running in file:// mode. API disabled. Using LocalStorage fallback.");
      // Simulate DB update provided the status is valid
      const products = DataService.getProducts();
      const index = products.findIndex(p => p.id === id);
      if (index !== -1) {
        products[index].estado = status;
        DataService.saveProducts(products);
        return true;
      }
      return false;
    }
    try {
      const response = await fetch('api/update_product_status.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const result = await response.json();
      if (result.success) return true;
      throw new Error(result.error);
    } catch (e) {
      console.error("Error actualizando estado:", e);
      alert('Error al guardar en base de datos. Ver consola.');
      return false;
    }
  },

  saveProducts: (products) => {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  },

  // Cart
  getCart: () => {
    return JSON.parse(localStorage.getItem(KEYS.CART) || '[]');
  },

  saveCart: (cart) => {
    localStorage.setItem(KEYS.CART, JSON.stringify(cart));
  },

  addToCart: (product, quantity = 1) => {
    const cart = DataService.getCart();
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({ ...product, quantity });
    }
    DataService.saveCart(cart);
  },

  // Orders
  getOrders: () => {
    return JSON.parse(localStorage.getItem(KEYS.ORDERS) || '[]');
  },

  getOrdersAsync: async () => {
    if (IS_FILE_PROTOCOL) {
      console.warn("Running in file:// mode. API disabled. Using LocalStorage fallback.");
      return DataService.getOrders();
    }
    try {
      const response = await fetch('api/get_orders.php');
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch orders from API:", error);
      // Fallback to local storage if API fails (or for demo purposes if XAMPP isn't running)
      console.warn("Falling back to local storage");
      return DataService.getOrders();
    }
  },

  placeOrder: (orderData) => {
    const orders = DataService.getOrders();
    const newOrder = {
      id: "ORD-" + Date.now(),
      date: new Date().toISOString(),
      status: "Pending",
      ...orderData
    };
    orders.unshift(newOrder); // Add to top
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
    // Clear cart
    DataService.saveCart([]);
    return newOrder;
  },

  updateOrder: (orderId, updates) => {
    const orders = DataService.getOrders();
    const index = orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
      orders[index] = { ...orders[index], ...updates };
      localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
      return true;
    }
    return false;
  },

  // User Profile
  getUser: () => {
    const data = localStorage.getItem(KEYS.USER);
    if (!data) {
      localStorage.setItem(KEYS.USER, JSON.stringify(INITIAL_USER));
      return INITIAL_USER;
    }
    return JSON.parse(data);
  },

  saveUser: (userData) => {
    localStorage.setItem(KEYS.USER, JSON.stringify(userData));
  },

  // Auth
  getAuth: () => {
    const data = localStorage.getItem(KEYS.AUTH);
    return data ? JSON.parse(data) : null;
  },

  saveAuth: (authData) => {
    localStorage.setItem(KEYS.AUTH, JSON.stringify(authData));
  },

  clearAuth: () => {
    localStorage.removeItem(KEYS.AUTH);
  },

  isLoggedIn: () => {
    return DataService.getAuth() !== null;
  },

  loginAsync: async (email, password) => {
    if (IS_FILE_PROTOCOL) {
      // Modo file:// — login simulado
      if (email && password.length >= 4) {
        const user = { id: 1, name: email.split('@')[0], email };
        DataService.saveAuth(user);
        return { success: true, user };
      }
      return { error: 'Credenciales incorrectas' };
    }
    try {
      const res = await fetch('api/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        DataService.saveAuth(data.user);
      }
      return data;
    } catch (e) {
      // Fallback simulado
      if (email && password.length >= 4) {
        const user = { id: 1, name: email.split('@')[0], email };
        DataService.saveAuth(user);
        return { success: true, user };
      }
      return { error: 'Error de conexión' };
    }
  },

  registerAsync: async (name, email, password) => {
    if (IS_FILE_PROTOCOL) {
      const user = { id: Date.now(), name, email };
      DataService.saveAuth(user);
      return { success: true, user };
    }
    try {
      const res = await fetch('api/register.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (data.success) {
        DataService.saveAuth(data.user);
      }
      return data;
    } catch (e) {
      const user = { id: Date.now(), name, email };
      DataService.saveAuth(user);
      return { success: true, user };
    }
  },

  placeOrderAsync: async (orderData) => {
    // Siempre guardar en localStorage
    const localOrder = DataService.placeOrder(orderData);

    if (IS_FILE_PROTOCOL) return localOrder;

    try {
      const res = await fetch('api/place_order.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const data = await res.json();
      if (data.success) {
        localOrder.id = data.order_id;
      }
      return localOrder;
    } catch (e) {
      return localOrder;
    }
  },

  saveProductAsync: async (productData) => {
    if (IS_FILE_PROTOCOL) {
      // Guardar localmente
      let products = DataService.getProducts();
      if (productData.id) {
        const idx = products.findIndex(p => p.id === productData.id);
        if (idx !== -1) products[idx] = { ...products[idx], ...productData };
      } else {
        productData.id = Date.now();
        products.push(productData);
      }
      DataService.saveProducts(products);
      return { success: true, id: productData.id };
    }
    try {
      const res = await fetch('api/save_product.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      return await res.json();
    } catch (e) {
      // Fallback local
      let products = DataService.getProducts();
      if (productData.id) {
        const idx = products.findIndex(p => p.id === productData.id);
        if (idx !== -1) products[idx] = { ...products[idx], ...productData };
      } else {
        productData.id = Date.now();
        products.push(productData);
      }
      DataService.saveProducts(products);
      return { success: true, id: productData.id };
    }
  },

  deleteProductAsync: async (id) => {
    if (IS_FILE_PROTOCOL) {
      let products = DataService.getProducts();
      products = products.filter(p => p.id !== id);
      DataService.saveProducts(products);
      return { success: true };
    }
    try {
      const res = await fetch('api/delete_product.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      return await res.json();
    } catch (e) {
      let products = DataService.getProducts();
      products = products.filter(p => p.id !== id);
      DataService.saveProducts(products);
      return { success: true };
    }
  },

  removeFromCart: (productId) => {
    let cart = DataService.getCart();
    cart = cart.filter(item => item.id !== productId);
    DataService.saveCart(cart);
  },

  updateCartQuantity: (productId, quantity) => {
    const cart = DataService.getCart();
    const item = cart.find(i => i.id === productId);
    if (item) {
      item.quantity = Math.max(1, quantity);
    }
    DataService.saveCart(cart);
  }
};

// Expose to window for debugging and app usage
window.DataService = DataService;
