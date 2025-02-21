'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('tiers', [
      {
        id: 'f881c233-d6d0-4585-9a66-e6f7c632cfa0',
        type: 'individual',
        name: 'Tier 0 (Free)',
        zones: JSON.stringify(['FR']),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    await queryInterface.bulkInsert('user_tiers', [
      {
        id: 'aecacd5a-d876-4920-a972-bae7c490df93',
        user_uuid: '11111111-1111-1111-1111-111111111111',
        tier_id: 'f881c233-d6d0-4585-9a66-e6f7c632cfa0',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('user_tiers', {
      user_uuid: '11111111-1111-1111-1111-111111111111',
    });

    await queryInterface.bulkDelete('tiers', {
      id: 'f881c233-d6d0-4585-9a66-e6f7c632cfa0',
    });
  },
};
