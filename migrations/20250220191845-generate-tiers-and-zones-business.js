'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tiers = [
      {
        id: 'c9534015-dfa0-41df-8c0c-e93812fa2c1f',
        name: 'Tier 1 - B2C',
        zones: JSON.stringify(['FR']),
        type: 'individual',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '6d06f11b-9854-49db-a38b-56ca4aab1658',
        name: 'Tier 2 - B2C',
        zones: JSON.stringify(['FR', 'DE', 'PL']),
        type: 'individual',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'cd4f81a4-6c51-4991-b24f-7219dfbbadfd',
        name: 'Tier 2 - B2B',
        zones: JSON.stringify(['FR', 'DE', 'PL']),
        type: 'business',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '8efbba36-f3a1-4cf2-8f70-29326fab54f4',
        name: 'Tier 3 - B2C',
        zones: JSON.stringify(['FR', 'DE', 'PL', 'CA', 'UK']),
        type: 'individual',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '1b3d5f0a-459b-4189-84b9-29933fba1aa0',
        name: 'Tier 3 - B2B',
        zones: JSON.stringify(['FR', 'DE', 'PL', 'CA', 'UK']),
        type: 'business',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert('tiers', tiers, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('tiers', {
      id: [
        'c9534015-dfa0-41df-8c0c-e93812fa2c1f',
        '6d06f11b-9854-49db-a38b-56ca4aab1658',
        'cd4f81a4-6c51-4991-b24f-7219dfbbadfd',
        '8efbba36-f3a1-4cf2-8f70-29326fab54f4',
        '1b3d5f0a-459b-4189-84b9-29933fba1aa0',
      ],
    });
  },
};
