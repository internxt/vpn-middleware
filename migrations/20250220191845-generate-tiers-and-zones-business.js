'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tiers = [
      {
        id: 'a1b2c3d4-e5f6-4789-90ab-cdef12345678',
        name: 'Tier 1 - B2C',
        zones: JSON.stringify(['FR']),
        type: 'individual',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'b2c3d4e5-f678-4890-abcd-ef1234567890',
        name: 'Tier 2 - B2C',
        zones: JSON.stringify(['FR', 'DE', 'PL']),
        type: 'individual',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'c3d4e5f6-7890-4abc-def1-234567890123',
        name: 'Tier 2 - B2B',
        zones: JSON.stringify(['FR', 'DE', 'PL']),
        type: 'business',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'd4e5f678-90ab-4cde-f123-456789012345',
        name: 'Tier 3 - B2C',
        zones: JSON.stringify(['FR', 'DE', 'PL', 'CA', 'UK']),
        type: 'individual',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'e5f67890-abcd-4ef1-2345-678901234567',
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
        'a1b2c3d4-e5f6-4789-90ab-cdef12345678',
        'b2c3d4e5-f678-4890-abcd-ef1234567890',
        'c3d4e5f6-7890-4abc-def1-234567890123',
        'd4e5f678-90ab-4cde-f123-456789012345',
        'e5f67890-abcd-4ef1-2345-678901234567',
      ],
    });
  },
};
