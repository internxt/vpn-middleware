'use strict';
const tableName = 'user_tiers';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(tableName, {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      user_uuid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'uuid',
        },
      },
      tier_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tiers',
          key: 'id',
        },
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.removeColumn('users', 'tier_id');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable(tableName);

    await queryInterface.addColumn('users', 'tier_id', {
      type: Sequelize.UUID,
      allowNull: false,
    });
  },
};
