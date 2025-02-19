'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('users', [
      {
        uuid: '11111111-1111-1111-1111-111111111111',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', {
      uuid: '11111111-1111-1111-1111-111111111111',
    });
  },
};
