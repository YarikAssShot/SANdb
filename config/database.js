const { Sequelize } = require('sequelize');

// Підключення до бази даних з використанням явних параметрів
const sequelize = new Sequelize('online_store', 'postgres', '1234qwer', {
    host: 'localhost',
    dialect: 'postgres'
});

// Перевірка підключення до бази даних
sequelize.authenticate()
    .then(() => {
        console.log('Connection to the database has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

module.exports = sequelize;
