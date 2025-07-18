/**
 * Schema Utilities
 * 
 * This module provides convenient utilities and CLI-like functions
 * for analyzing and validating the schema structure.
 */

import { SchemaAnalyzer, type SchemaAnalysisReport, type SchemaInconsistency } from './schema-analysis';
import { SchemaComparator, SchemaSnapshotManager, type SchemaSnapshot, type SchemaComparison } from './schema-comparison';
import schema from '../../instant.schema';

/**
 * Main utility class for schema operations
 */
export class SchemaUtils {
  private static analyzer = new SchemaAnalyzer();

  /**
   * Runs a complete schema analysis and returns the report
   */
  public static analyzeCurrentSchema(): SchemaAnalysisReport {
    const report = this.analyzer.analyzeSchema();
    return report;
  }

  /**
   * Displays detailed inconsistencies grouped by severity
   */
  public static displayInconsistencies(inconsistencies: SchemaInconsistency[]): void {
    const groupedBySeverity = this.groupInconsistenciesBySeverity(inconsistencies);
    
    for (const [severity, issues] of Object.entries(groupedBySeverity)) {
      if (issues.length === 0) continue;
      
      for (const issue of issues) {
        // Process issues silently
      }
    }
  }

  /**
   * Groups inconsistencies by severity
   */
  private static groupInconsistenciesBySeverity(inconsistencies: SchemaInconsistency[]): Record<string, SchemaInconsistency[]> {
    return inconsistencies.reduce((groups, issue) => {
      if (!groups[issue.severity]) {
        groups[issue.severity] = [];
      }
      groups[issue.severity].push(issue);
      return groups;
    }, {} as Record<string, SchemaInconsistency[]>);
  }

  /**
   * Displays entity-specific analysis
   */
  public static displayEntityAnalysis(entityName: string, report: SchemaAnalysisReport): void {
    const entity = report.entities.find(e => e.name === entityName);
    
    if (!entity) {
      return;
    }
  }

  /**
   * Creates a snapshot of the current schema
   */
  public static createCurrentSnapshot(version: string = '1.0.0'): SchemaSnapshot {
    const snapshot = SchemaSnapshotManager.createSnapshot(schema, version);
    return snapshot;
  }

  /**
   * Compares two schema snapshots
   */
  public static compareSnapshots(oldSnapshot: SchemaSnapshot, newSnapshot: SchemaSnapshot): SchemaComparison {
    const comparison = SchemaComparator.compareSchemas(oldSnapshot, newSnapshot);
    return comparison;
  }

  /**
   * Displays detailed change information
   */
  public static displayChanges(comparison: SchemaComparison): void {
    if (!comparison.hasChanges) {
      return;
    }
    
    const groupedChanges = this.groupChangesByType(comparison.changes);
    
    for (const [changeType, changes] of Object.entries(groupedChanges)) {
      if (changes.length === 0) continue;
      
      for (const change of changes) {
        // Process changes silently
      }
    }
  }

  /**
   * Groups changes by type
   */
  private static groupChangesByType(changes: any[]): Record<string, any[]> {
    return changes.reduce((groups, change) => {
      if (!groups[change.type]) {
        groups[change.type] = [];
      }
      groups[change.type].push(change);
      return groups;
    }, {} as Record<string, any[]>);
  }

  /**
   * Validates a specific field name and type
   */
  public static validateField(fieldName: string, dataType: string): void {
    const namingValidation = SchemaAnalyzer.validateFieldNaming(fieldName);
    const typeValidation = SchemaAnalyzer.validateDataType(fieldName, dataType);
  }

  /**
   * Generates a summary report for the most critical issues
   */
  public static generateCriticalIssuesReport(report: SchemaAnalysisReport): void {
    const criticalIssues = report.inconsistencies.filter(issue => issue.severity === 'high');
    
    if (criticalIssues.length === 0) {
      return;
    }
    
    // Group by type
    const groupedIssues = criticalIssues.reduce((groups, issue) => {
      if (!groups[issue.type]) {
        groups[issue.type] = [];
      }
      groups[issue.type].push(issue);
      return groups;
    }, {} as Record<string, SchemaInconsistency[]>);
    
    for (const [issueType, issues] of Object.entries(groupedIssues)) {
      for (const issue of issues) {
        // Process issues silently
      }
    }
  }

  /**
   * Runs a quick health check on the schema
   */
  public static runHealthCheck(): void {
    const report = this.analyzeCurrentSchema();
    
    // Calculate health score
    const totalIssues = report.inconsistencies.length;
    const criticalIssues = report.inconsistencies.filter(i => i.severity === 'high').length;
    const mediumIssues = report.inconsistencies.filter(i => i.severity === 'medium').length;
    
    const healthScore = Math.max(0, 100 - (criticalIssues * 10) - (mediumIssues * 5) - (totalIssues * 2));
    
    // Show top recommendations
    if (totalIssues > 0) {
      const topIssues = report.inconsistencies
        .sort((a, b) => {
          const severityOrder = { high: 3, medium: 2, low: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        })
        .slice(0, 5);
      
      for (let i = 0; i < topIssues.length; i++) {
        const issue = topIssues[i];
        // Process recommendations silently
      }
    }
  }
}