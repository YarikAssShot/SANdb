const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Product = require('./Product');

const Order = sequelize.define('Order', {
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    order_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'in progress'
    }
});

// Встановлення зв'язків між таблицями
Order.belongsTo(User, { foreignKey: 'user_id' });
Order.belongsTo(Product, { foreignKey: 'product_id' });

module.exports = Order;
