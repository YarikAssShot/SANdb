// app.js
const path = require('path');
const express = require('express');
const passport = require('passport');
const sequelize = require('../config/database');
const session = require('express-session');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
require('../config/passport')(passport);

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use(express.urlencoded({ extended: false }));

app.use(session({
    secret: 'mysecret',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, '../public')));

const authRoutes = require('../routes/auth');
app.use('/', authRoutes);

sequelize.sync()
    .then(() => console.log('Database synchronized.'))
    .catch(err => console.error('Sync error:', err));

app.get('/', async (req, res) => {
    try {
        const products = await Product.findAll();
        let orders = [];
        if (req.isAuthenticated()) {
            orders = await Order.findAll({
                where: { user_id: req.user.id },
                include: [Product]
            });
        }
        res.render('home', { products, orders });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Error');
    }
});

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

app.get('/admin/orders', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const orders = await Order.findAll({ include: [User, Product] });
        const products = await Product.findAll();
        res.render('admin_orders', { orders, products });
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).send('Error fetching orders');
    }
});

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

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
}));

app.post('/admin/login', passport.authenticate('local', {
    successRedirect: '/admin/orders',
    failureRedirect: '/login'
}));

app.post('/admin/products/create', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { product_name, price } = req.body;
        await Product.create({ product_name, price });
        res.redirect('/admin/orders');
    } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).send('Error creating product');
    }
});

app.post('/admin/products/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const productId = req.params.id;
        await Product.destroy({ where: { id: productId } });
        res.redirect('/admin/orders');
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).send('Error deleting product');
    }
});

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

function isAdmin(req, res, next) {
    if (req.user && req.user.is_admin) {
        return next();
    }
    res.status(403).send('Access denied.');
}

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
