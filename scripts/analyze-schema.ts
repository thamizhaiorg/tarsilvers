#!/usr/bin/env tsx
/**
 * Schema Analysis CLI Script
 * 
 * This script provides a command-line interface for analyzing the current
 * InstantDB schema and identifying inconsistencies.
 * 
 * Usage:
 *   npm run analyze-schema
 *   npm run analyze-schema -- --entity products
 *   npm run analyze-schema -- --health-check
 *   npm run analyze-schema -- --critical-only
 */

import { SchemaUtils } from '../src/lib/schema-utils';

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
  entity: args.includes('--entity') ? args[args.indexOf('--entity') + 1] : null,
  healthCheck: args.includes('--health-check'),
  criticalOnly: args.includes('--critical-only'),
  help: args.includes('--help') || args.includes('-h'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  snapshot: args.includes('--snapshot'),
  validate: args.includes('--validate') ? args[args.indexOf('--validate') + 1] : null
};

function showHelp() {
  console.log(`
🔍 Schema Analysis Tool
======================

Usage: npm run analyze-schema [options]

Options:
  --help, -h              Show this help message
  --health-check          Run a quick health check
  --critical-only         Show only critical issues
  --entity <name>         Analyze a specific entity
  --snapshot              Create a schema snapshot
  --validate <field:type> Validate a specific field (e.g., "createdAt:date")
  --verbose, -v           Show detailed output

Examples:
  npm run analyze-schema
  npm run analyze-schema -- --health-check
  npm run analyze-schema -- --entity products
  npm run analyze-schema -- --critical-only
  npm run analyze-schema -- --validate "createdAt:date"
  npm run analyze-schema -- --snapshot
`);
}

function main() {
  console.log('🚀 TAR POS Schema Analysis Tool');
  console.log('================================\n');

  if (flags.help) {
    showHelp();
    return;
  }

  try {
    if (flags.healthCheck) {
      // Run health check
      SchemaUtils.runHealthCheck();
      return;
    }

    if (flags.snapshot) {
      // Create snapshot
      const version = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      SchemaUtils.createCurrentSnapshot(version);
      return;
    }

    if (flags.validate) {
      // Validate specific field
      const [fieldName, dataType] = flags.validate.split(':');
      if (!fieldName || !dataType) {
        console.error('❌ Invalid validate format. Use: --validate "fieldName:dataType"');
        return;
      }
      SchemaUtils.validateField(fieldName, dataType);
      return;
    }

    // Run full analysis
    const report = SchemaUtils.analyzeCurrentSchema();

    if (flags.entity) {
      // Show specific entity analysis
      SchemaUtils.displayEntityAnalysis(flags.entity, report);
    } else if (flags.criticalOnly) {
      // Show only critical issues
      SchemaUtils.generateCriticalIssuesReport(report);
    } else {
      // Show all inconsistencies
      if (flags.verbose) {
        console.log('\n📋 Detailed Entity Information:');
        console.log('===============================');
        for (const entity of report.entities.slice(0, 5)) { // Show first 5 entities
          SchemaUtils.displayEntityAnalysis(entity.name, report);
        }
      }

      console.log('\n🔍 All Inconsistencies:');
      SchemaUtils.displayInconsistencies(report.inconsistencies);

      console.log('\n📊 Critical Issues Summary:');
      SchemaUtils.generateCriticalIssuesReport(report);
    }

    // Show next steps
    console.log('\n🎯 Next Steps:');
    console.log('==============');
    console.log('1. Review the critical issues above');
    console.log('2. Run: npm run analyze-schema -- --entity <entity-name> for detailed analysis');
    console.log('3. Use the schema optimization tasks to fix these issues');
    console.log('4. Create a snapshot before making changes: npm run analyze-schema -- --snapshot');

  } catch (error) {
    console.error('❌ Error running schema analysis:', error);
    process.exit(1);
  }
}

// Run the main function
main();