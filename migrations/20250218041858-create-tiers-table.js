'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tiers', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      zones: {
        type: Sequelize.JSONB
      },
      created_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tiers');
  }
};