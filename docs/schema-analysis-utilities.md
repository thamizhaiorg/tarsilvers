# Schema Analysis and Validation Utilities

This document describes the schema analysis and validation utilities created for the TAR POS database schema optimization project.

## Overview

The schema analysis utilities help identify inconsistencies, validate field naming patterns, check data types, and ensure proper relationships in the InstantDB schema. These tools are essential for maintaining a clean, consistent, and performant database schema.

## Components

### 1. SchemaAnalyzer (`src/lib/schema-analysis.ts`)

The main analysis engine that examines the current schema structure and identifies inconsistencies.

**Key Features:**
- Analyzes all entities and their fields
- Identifies field naming inconsistencies (e.g., `createdat` vs `createdAt`)
- Detects duplicate fields (e.g., `taxamt` vs `taxAmount`)
- Finds inappropriate data types (e.g., `any` instead of `json`)
- Identifies missing relationships (e.g., string fields that should be entity relationships)
- Detects duplicate entities (e.g., `stores` vs `store`)

**Usage:**
```typescript
import { SchemaAnalyzer } from './src/lib/schema-analysis';

const analyzer = new SchemaAnalyzer();
const report = analyzer.analyzeSchema();

console.log(`Found ${report.inconsistencies.length} issues`);
```

### 2. SchemaValidator (`src/lib/schema-analysis.ts`)

Static validation methods for individual fields and relationships.

**Key Features:**
- Validates field naming patterns (camelCase, timestamp conventions)
- Validates data type appropriateness
- Validates relationship field naming and entity existence

**Usage:**
```typescript
import { SchemaValidator } from './src/lib/schema-analysis';

// Validate field naming
const namingResult = SchemaValidator.validateFieldNaming('createdAt');
console.log(namingResult.isValid); // true

// Validate data type
const typeResult = SchemaValidator.validateDataType('price', 'number');
console.log(typeResult.isValid); // true

// Validate relationship
const relResult = SchemaValidator.validateRelationship('products', 'brandId', 'brands');
console.log(relResult.isValid); // true
```

### 3. SchemaComparator (`src/lib/schema-comparison.ts`)

Tools for comparing schema versions and tracking changes over time.

**Key Features:**
- Creates schema snapshots for version tracking
- Compares two schema versions and identifies changes
- Categorizes changes by impact (breaking, non-breaking, enhancement)
- Generates migration plans based on detected changes

**Usage:**
```typescript
import { SchemaSnapshotManager, SchemaComparator } from './src/lib/schema-comparison';

// Create snapshot
const snapshot = SchemaSnapshotManager.createSnapshot(schema, '1.0.0');

// Compare snapshots
const comparison = SchemaComparator.compareSchemas(oldSnapshot, newSnapshot);
console.log(`Found ${comparison.changes.length} changes`);
```

### 4. SchemaUtils (`src/lib/schema-utils.ts`)

High-level utility functions for common schema operations.

**Key Features:**
- Convenient methods for running analysis and displaying results
- Health check functionality with scoring
- Entity-specific analysis
- Critical issues reporting

**Usage:**
```typescript
import { SchemaUtils } from './src/lib/schema-utils';

// Run full analysis
const report = SchemaUtils.analyzeCurrentSchema();

// Run health check
SchemaUtils.runHealthCheck();

// Analyze specific entity
SchemaUtils.displayEntityAnalysis('products', report);
```

## Command Line Interface

### Schema Analysis Script

Run comprehensive schema analysis from the command line:

```bash
# Full analysis
npm run analyze-schema

# Health check only
npm run analyze-schema -- --health-check

# Analyze specific entity
npm run analyze-schema -- --entity products

# Show only critical issues
npm run analyze-schema -- --critical-only

# Create schema snapshot
npm run analyze-schema -- --snapshot

# Validate specific field
npm run analyze-schema -- --validate "createdAt:date"

# Show help
npm run analyze-schema -- --help
```

### Available Options

- `--help, -h`: Show help message
- `--health-check`: Run quick health check with scoring
- `--critical-only`: Show only high-severity issues
- `--entity <name>`: Analyze a specific entity in detail
- `--snapshot`: Create a timestamped schema snapshot
- `--validate <field:type>`: Validate a specific field name and type
- `--verbose, -v`: Show detailed output including entity information

## Types of Issues Detected

### 1. Field Naming Issues (Medium Severity)
- Inconsistent timestamp naming (`createdat` → `createdAt`)
- Inconsistent address naming (`billaddrs` → `billingAddress`)
- Non-camelCase field names (`user_id` → `userId`)

### 2. Duplicate Fields (High Severity)
- Multiple fields with similar purposes (`taxamt` vs `taxAmount`)
- Variant title inconsistencies (`varianttitle` vs `variantTitle`)
- Address field duplications (`billaddrs` vs `billingAddress`)

### 3. Data Type Issues (Medium Severity)
- Inappropriate use of `any` type (should be `json`)
- Wrong types for timestamps (should be `date`)
- Wrong types for monetary fields (should be `number`)

### 4. Missing Relationships (High Severity)
- String fields that should be entity relationships (`brand` → `brandId`)
- Missing foreign key relationships (`category` → `categoryId`)
- Unlinked entities that should have relationships

### 5. Duplicate Entities (High Severity)
- Multiple entities serving the same purpose (`stores` vs `store`)
- Redundant entity definitions

## Demo and Testing

### Run Demo
```bash
npx tsx src/lib/demo-schema-analysis.ts
```

The demo shows examples of:
- Field naming validation
- Data type validation  
- Relationship validation
- Common schema inconsistencies

### Run Tests
```bash
npm test -- --testPathPattern=schema-analysis.test.ts
```

Tests cover:
- Field naming pattern validation
- Data type validation logic
- Relationship validation rules
- Error message accuracy

## Integration with Schema Optimization Tasks

These utilities support the schema optimization tasks by:

1. **Task 1**: Providing the analysis tools implemented in this task
2. **Task 2**: Identifying specific field inconsistencies to standardize
3. **Task 3**: Recommending indexes for performance optimization
4. **Task 4**: Validating relationship structures before implementation
5. **Task 5**: Ensuring data validation rules are properly defined

## Health Scoring

The health check provides a score out of 100 based on:
- Critical issues: -10 points each
- Medium issues: -5 points each  
- All issues: -2 points each

**Score Ranges:**
- 90-100: Excellent (green)
- 70-89: Good (yellow) 
- 50-69: Fair (orange)
- 0-49: Poor (red)

## Best Practices

1. **Run analysis before making changes**: Always analyze the current state
2. **Create snapshots**: Take snapshots before major schema modifications
3. **Address critical issues first**: Focus on high-severity problems
4. **Validate incrementally**: Use individual validation methods during development
5. **Monitor health score**: Track improvements over time

## Example Output

```
🏥 Running Schema Health Check...
=================================

🔍 Analyzing current schema...

📊 Schema Analysis Report
========================
Total Entities: 25
Total Fields: 180
Total Relationships: 15
Total Inconsistencies: 12

🚨 Issues Summary:
- Field Naming Issues: 4
- Duplicate Fields: 3
- Data Type Issues: 2
- Missing Relationships: 2
- Duplicate Entities: 1

🎯 Schema Health Score: 76/100
🟡 Good - Minor improvements recommended

🔧 Top Recommendations:
1. Remove "stores" entity and use "store" consistently (stores)
2. Remove "taxamt" and use "taxAmount" consistently (orderitems.taxamt)
3. Convert to "brandId" relationship with brands entity (products.brand)
4. Rename "createdat" to "createdAt" for consistency (orders.createdat)
5. Change "any" type to "json" for better type safety (customers.addresses)
```

## Next Steps

After running the analysis:

1. Review the identified issues
2. Prioritize critical (high-severity) issues
3. Use the schema optimization tasks to implement fixes
4. Re-run analysis to verify improvements
5. Create new snapshots to track progress

This completes the foundation for systematic schema optimization and maintenance.