'use strict';
const tableName = 'tiers';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(tableName, 'type', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'individual',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(tableName, 'type');
  },
};
