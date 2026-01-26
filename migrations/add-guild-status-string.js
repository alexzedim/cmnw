/**
 * Migration: Add Guild Status String Column
 * 
 * Adds a new `status_string` column to the guilds table to track
 * the status of 5 guild operations (Summary, Roster, Members, Logs, Master)
 * using a 5-character string format (e.g., "SRMLG").
 * 
 * Status String Format:
 * - Position 0: SUMMARY (S=success, s=error, -=pending)
 * - Position 1: ROSTER (R=success, r=error, -=pending)
 * - Position 2: MEMBERS (M=success, m=error, -=pending)
 * - Position 3: LOGS (L=success, l=error, -=pending)
 * - Position 4: MASTER (G=success, g=error, -=pending)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Add status_string column to guilds table
      await queryInterface.addColumn(
        'guilds',
        'status_string',
        {
          type: Sequelize.STRING(5),
          allowNull: true,
          defaultValue: '-----',
          comment: 'Guild operation status string (5 chars: SRMLG)',
        },
        { transaction }
      );

      // Create index on status_string for faster queries
      await queryInterface.addIndex(
        'guilds',
        ['status_string'],
        {
          name: 'idx_guilds_status_string',
          transaction,
        }
      );

      await transaction.commit();
      console.log('✓ Added status_string column to guilds table');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Remove index
      await queryInterface.removeIndex(
        'guilds',
        'idx_guilds_status_string',
        { transaction }
      );

      // Remove column
      await queryInterface.removeColumn(
        'guilds',
        'status_string',
        { transaction }
      );

      await transaction.commit();
      console.log('✓ Removed status_string column from guilds table');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
