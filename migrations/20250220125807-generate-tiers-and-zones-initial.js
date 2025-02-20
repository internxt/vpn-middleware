'use strict';

/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('tiers', [
      {
        id: 'b1a5f7c2-3d41-4f3a-84c7-8e2a2d7fbd51',
        name: 'Tier 1',
        zones: JSON.stringify(['FR']),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'd4b9a1e6-92e5-4c77-b8a8-6f28f9de5432',
        name: 'Tier 2',
        zones: JSON.stringify(['FR', 'DE', 'PL']),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'f8c3e0b7-6a49-4b2f-93d1-5d2e8fc7a9b3',
        name: 'Tier 3',
        zones: JSON.stringify(['FR', 'DE', 'PL', 'CA', 'UK']),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('tiers', {
      id: [
        'b1a5f7c2-3d41-4f3a-84c7-8e2a2d7fbd51',
        'd4b9a1e6-92e5-4c77-b8a8-6f28f9de5432',
        'f8c3e0b7-6a49-4b2f-93d1-5d2e8fc7a9b3',
      ],
    });
  },
};
