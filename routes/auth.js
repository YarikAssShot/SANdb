const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

// Маршрут для реєстрації GET
router.get('/register', (req, res) => {
    res.render('register', { errors: [] });
});

// Маршрут для реєстрації POST
router.post('/register', async (req, res) => {
    const { name, email, password, password2 } = req.body;
    let errors = [];

    // Перевірка введених даних
    if (!name || !email || !password || !password2) {
        errors.push({ msg: 'Please enter all fields' });
    }

    if (password !== password2) {
        errors.push({ msg: 'Passwords do not match' });
    }

    if (errors.length > 0) {
        res.render('register', { errors, name, email });
    } else {
        try {
            const userExists = await User.findOne({ where: { email } });
            if (userExists) {
                errors.push({ msg: 'Email already registered' });
                res.render('register', { errors, name, email });
            } else {
                // Хешування паролю
                const hashedPassword = await bcrypt.hash(password, 10);
                await User.create({ name, email, password: hashedPassword });

                res.redirect('/login');
            }
        } catch (err) {
            console.error(err);
            res.redirect('/register');
        }
    }
});

// Маршрут для логіну GET
router.get('/login', (req, res) => {
    res.render('login');
});

// Маршрут для логіну POST
router.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
}));

// Маршрут для виходу
router.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/login');
    });
});

module.exports = router;
