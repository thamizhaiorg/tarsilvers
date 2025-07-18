/**
 * Migration Orchestrator
 * 
 * This module orchestrates the complete migration process, including
 * backup creation, migration execution, rollback capabilities, and
 * compatibility layer management.
 */

import {
  migrateStore,
  dryRunMigration,
  type MigrationProgress,
} from './entity-migrations';
import {
  checkStoreIntegrity,
  autoFixIntegrity