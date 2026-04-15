// Data Service - Gestión de datos con localStorage
const DataService = {
    KEYS: {
        PRODUCTS: 'bodega_products',
        CUSTOMERS: 'bodega_customers',
        ORDERS: 'bodega_orders',
        INVOICES: 'bodega_invoices',
        INVENTORY: 'bodega_inventory'
    },

    // Initialize with sample data
    init() {
        if (!localStorage.getItem(this.KEYS.PRODUCTS)) {
            this.setProducts(this.getSampleProducts());
        }
        if (!localStorage.getItem(this.KEYS.CUSTOMERS)) {
            this.setCustomers(this.getSampleCustomers());
        }
        if (!localStorage.getItem(this.KEYS.ORDERS)) {
            this.setOrders(this.getSampleOrders());
        }
    },

    // Generic CRUD
    getData(key) { return JSON.parse(localStorage.getItem(key) || '[]'); },
    setData(key, data) { localStorage.setItem(key, JSON.stringify(data)); },

    // Products
    getProducts() { return this.getData(this.KEYS.PRODUCTS); },
    setProducts(data) { this.setData(this.KEYS.PRODUCTS, data); },
    addProduct(product) {
        const products = this.getProducts();
        product.id = Date.now();
        product.createdAt = new Date().toISOString();
        products.push(product);
        this.setProducts(products);
        return product;
    },
    updateProduct(id, updates) {
        const products = this.getProducts();
        const index = products.findIndex(p => p.id === id);
        if (index !== -1) {
            products[index] = { ...products[index], ...updates };
            this.setProducts(products);
            return products[index];
        }
        return null;
    },
    deleteProduct(id) {
        const products = this.getProducts().filter(p => p.id !== id);
        this.setProducts(products);
    },

    // Customers
    getCustomers() { return this.getData(this.KEYS.CUSTOMERS); },
    setCustomers(data) { this.setData(this.KEYS.CUSTOMERS, data); },
    addCustomer(customer) {
        const customers = this.getCustomers();
        customer.id = Date.now();
        customer.createdAt = new Date().toISOString();
        customers.push(customer);
        this.setCustomers(customers);
        return customer;
    },
    updateCustomer(id, updates) {
        const customers = this.getCustomers();
        const index = customers.findIndex(c => c.id === id);
        if (index !== -1) {
            customers[index] = { ...customers[index], ...updates };
            this.setCustomers(customers);
            return customers[index];
        }
        return null;
    },
    deleteCustomer(id) {
        const customers = this.getCustomers().filter(c => c.id !== id);
        this.setCustomers(customers);
    },

    // Orders
    getOrders() { return this.getData(this.KEYS.ORDERS); },
    setOrders(data) { this.setData(this.KEYS.ORDERS, data); },
    addOrder(order) {
        const orders = this.getOrders();
        order.id = Date.now();
        order.createdAt = new Date().toISOString();
        order.status = 'pendiente';
        orders.push(order);
        this.setOrders(orders);
        return order;
    },
    updateOrder(id, updates) {
        const orders = this.getOrders();
        const index = orders.findIndex(o => o.id === id);
        if (index !== -1) {
            orders[index] = { ...orders[index], ...updates };
            this.setOrders(orders);
            return orders[index];
        }
        return null;
    },

    // Invoices
    getInvoices() { return this.getData(this.KEYS.INVOICES); },
    addInvoice(invoice) {
        const invoices = this.getInvoices();
        invoice.id = Date.now();
        invoice.number = `FAC-${String(invoices.length + 1).padStart(5, '0')}`;
        invoice.createdAt = new Date().toISOString();
        invoices.push(invoice);
        this.setData(this.KEYS.INVOICES, invoices);
        return invoice;
    },

    // Stats
    getStats() {
        const products = this.getProducts();
        const customers = this.getCustomers();
        const orders = this.getOrders();
        const today = new Date().toDateString();

        return {
            totalProducts: products.length,
            totalCustomers: customers.length,
            totalOrders: orders.length,
            pendingOrders: orders.filter(o => o.status === 'pendiente').length,
            lowStock: products.filter(p => p.stock < 10).length,
            todayOrders: orders.filter(o => new Date(o.createdAt).toDateString() === today).length,
            totalSales: orders.reduce((sum, o) => sum + (o.total || 0), 0)
        };
    },

    // Sample data
    getSampleProducts() {
        return [
            { id: 1, name: 'Aceite Vegetal 1L', category: 'abarrotes', price: 45.00, stock: 150, sku: 'ACE001', unit: 'unidad' },
            { id: 2, name: 'Arroz Premium 5kg', category: 'abarrotes', price: 85.00, stock: 200, sku: 'ARR001', unit: 'bulto' },
            { id: 3, name: 'Azúcar Refinada 1kg', category: 'abarrotes', price: 28.00, stock: 300, sku: 'AZU001', unit: 'unidad' },
            { id: 4, name: 'Coca-Cola 2L', category: 'bebidas', price: 32.00, stock: 8, sku: 'COC001', unit: 'paquete' },
            { id: 5, name: 'Agua Mineral 1L (12 pack)', category: 'bebidas', price: 95.00, stock: 50, sku: 'AGU001', unit: 'paquete' },
            { id: 6, name: 'Detergente 5kg', category: 'limpieza', price: 120.00, stock: 45, sku: 'DET001', unit: 'unidad' },
            { id: 7, name: 'Cloro 4L', category: 'limpieza', price: 38.00, stock: 60, sku: 'CLO001', unit: 'unidad' },
            { id: 8, name: 'Papel Higiénico (12 rollos)', category: 'limpieza', price: 85.00, stock: 5, sku: 'PAP001', unit: 'paquete' },
            { id: 9, name: 'Leche Entera 1L', category: 'lacteos', price: 25.00, stock: 100, sku: 'LEC001', unit: 'unidad' },
            { id: 10, name: 'Queso Fresco 500g', category: 'lacteos', price: 55.00, stock: 30, sku: 'QUE001', unit: 'unidad' }
        ];
    },

    getSampleCustomers() {
        return [
            { id: 1, name: 'Minimarket El Sol', contact: 'Juan Pérez', phone: '555-1234', email: 'elsol@email.com', address: 'Av. Principal 123', creditLimit: 5000, balance: 1200 },
            { id: 2, name: 'Tienda Doña Rosa', contact: 'Rosa García', phone: '555-5678', email: 'rosa@email.com', address: 'Calle Central 456', creditLimit: 3000, balance: 0 },
            { id: 3, name: 'Abarrotes La Esquina', contact: 'Carlos López', phone: '555-9012', email: 'esquina@email.com', address: 'Jr. Los Pinos 789', creditLimit: 8000, balance: 3500 }
        ];
    },

    getSampleOrders() {
        return [
            { id: 1, customerId: 1, customerName: 'Minimarket El Sol', items: [{ productId: 1, name: 'Aceite Vegetal 1L', qty: 10, price: 45 }], total: 450, status: 'completado', createdAt: '2024-01-28T10:00:00Z' },
            { id: 2, customerId: 2, customerName: 'Tienda Doña Rosa', items: [{ productId: 2, name: 'Arroz Premium 5kg', qty: 5, price: 85 }], total: 425, status: 'pendiente', createdAt: '2024-01-28T14:00:00Z' },
            { id: 3, customerId: 3, customerName: 'Abarrotes La Esquina', items: [{ productId: 4, name: 'Coca-Cola 2L', qty: 20, price: 32 }], total: 640, status: 'enviado', createdAt: '2024-01-27T09:00:00Z' }
        ];
    }
};

// Initialize data on load
DataService.init();
