// app.js
const path = require('path');
const express = require('express');
const passport = require('passport');
const sequelize = require('../config/database');
const session = require('express-session');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
require('../config/passport')(passport); // Ініціалізація Passport.js

const app = express();
const PORT = 3000; // Встановимо типовий порт для веб-сервера

// Налаштування шаблонізатора EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));  // Вказуємо правильний шлях до папки views

// Налаштування для роботи з формами
app.use(express.urlencoded({ extended: false }));

// Налаштування сесій
app.use(session({
    secret: 'mysecret',  // Секрет для підписування сесій
    resave: false,
    saveUninitialized: false
}));

// Ініціалізація Passport та збереження сесії користувача
app.use(passport.initialize());
app.use(passport.session());

// Підключення маршрутів для авторизації
const authRoutes = require('../routes/auth');
app.use('/', authRoutes);

// Перевірка підключення до бази даних та створення тестових продуктів
async function createTestProducts() {
    try {
        const productsCount = await Product.count();
        if (productsCount === 0) {
            await Product.bulkCreate([
                { product_name: 'Le Parfum YSL', price: 10.0 },
                { product_name: 'Jean Paul Gaultier', price: 20.0 },
                { product_name: 'Emporio Armani Stronger', price: 30.0 }
            ]);
            console.log('Test products created successfully.');
        }
    } catch (error) {
        console.error('Error creating test products:', error);
    }
}

sequelize.sync()
    .then(async () => {
        console.log('Database synchronized successfully.');
        await createTestProducts(); // Створення тестових продуктів після синхронізації бази даних
    })
    .catch(err => {
        console.error('Error synchronizing the database:', err);
    });

// Маршрут для головної сторінки
app.get('/', isAuthenticated, async (req, res) => {
    try {
        const products = await Product.findAll();
        const orders = await Order.findAll({
            where: { user_id: req.user.id },
            include: [Product]
        });
        res.render('home', { products, orders });
    } catch (err) {
        console.error('Error fetching products or orders:', err);
        res.status(500).send('Error fetching products or orders');
    }
});

// Маршрут для оновлення замовлення (admin only)
app.post('/admin/orders/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;

        await Order.update({ status }, { where: { id: orderId } });
        res.redirect('/admin/orders');
    } catch (err) {
        console.error('Error updating order:', err);
        res.status(500).send('Error updating order');
    }
});

// Маршрут для перегляду всіх замовлень (admin only)
app.get('/admin/orders', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const orders = await Order.findAll({ include: [User, Product] });
        res.render('admin_orders', { orders });
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).send('Error fetching orders');
    }
});

// Маршрут для видалення замовлення (admin only)
app.post('/admin/orders/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const orderId = req.params.id;
        await Order.destroy({ where: { id: orderId } });
        res.redirect('/admin/orders');
    } catch (err) {
        console.error('Error deleting order:', err);
        res.status(500).send('Error deleting order');
    }
});

// Маршрут для створення замовлення
app.post('/order', isAuthenticated, async (req, res) => {
    try {
        const quantities = req.body;
        const userId = req.user.id;

        for (const [key, value] of Object.entries(quantities)) {
            if (parseInt(value) > 0) {
                const productId = key.split('_')[1];
                await Order.create({
                    user_id: userId,
                    product_id: productId,
                    quantity: parseInt(value),
                    status: 'in progress'
                });
            }
        }

        res.redirect('/');
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(500).send('Error creating order');
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

// Middleware for authentication
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/register'); // Redirect to login page if not authenticated
}

app.use(express.static(path.join(__dirname, '../public')));



// Middleware for admin check
function isAdmin(req, res, next) {
    if (req.user && req.user.is_admin) {
        return next();
    }
    res.status(403).send('Access denied. Admins only.');
}

// Маршрут для входу адміністратора
app.get('/admin/login', (req, res) => {
    res.render('admin_login'); // Шаблон admin_login.ejs у папці views
});

app.post('/admin/login', passport.authenticate('local', {
    successRedirect: '/admin/orders',
    failureRedirect: '/admin/login'
}));
