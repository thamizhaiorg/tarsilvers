/**
 * Inventory Audit Panel Component
 * 
 * React Native component that provides a comprehensive interface for
 * managing inventory adjustments with full audit trail capabilities.
 * 
 * Features:
 * - Real-time audit trail display
 * - Session and batch management
 * - Approval workflow interface
 * - Comprehensive adjustment forms
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useInventoryAudit } from '../hooks/useInventoryAudit';
import type { AuditType, AuditReason, BatchType } from '../services/inventory-audit-service';
import { AUDIT_TYPES, AUDIT_REASONS, BATCH_TYPES } from '../lib/audit-utils';

interface InventoryAuditPanelProps {
  storeId: string;
  userId?: string;
  userName?: string;
  userRole?: 'admin' | 'manager' | 'staff' | 'system';
  deviceId?: string;
}

interface AdjustmentForm {
  itemId: string;
  locationId: string;
  quantityBefore: string;
  quantityAfter: string;
  type: AuditType;
  reason?: AuditReason;
  reference?: string;
  notes?: string;
  unitCost?: string;
}

export function InventoryAuditPanel({
  storeId,
  userId,
  userName,
  userRole = 'staff',
  deviceId,
}: InventoryAuditPanelProps) {
  const {
    currentSession,
    currentBatch,
    isLoading,
    error,
    auditRecords,
    pendingApprovals,
    startAuditSession,
    endAuditSession,
    startAuditBatch,
    completeAuditBatch,
    recordAdjustment,
    recordSale,
    recordReceiving,
    recordCycleCount,
    approveAdjustment,
    getAuditSummary,
    formatters,
    validation,
  } = useInventoryAudit({
    storeId,
    userId,
    userName,
    userRole,
    deviceId,
  });

  const [activeTab, setActiveTab] = useState<'adjustments' | 'audit' | 'approvals'>('adjustments');
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentForm>({
    itemId: '',
    locationId: '',
    quantityBefore: '',
    quantityAfter: '',
    type: 'adjustment',
    reason: undefined,
    reference: '',
    notes: '',
    unitCost: '',
  });

  const auditSummary = getAuditSummary();

  const handleStartSession = async () => {
    try {
      await startAuditSession('Manual audit session');
      Alert.alert('Success', 'Audit session started');
    } catch (err) {
      Alert.alert('Error', 'Failed to start audit session');
    }
  };

  const handleEndSession = async () => {
    try {
      await endAuditSession('Session completed');
      Alert.alert('Success', 'Audit session ended');
    } catch (err) {
      Alert.alert('Error', 'Failed to end audit session');
    }
  };

  const handleStartBatch = async (batchType: BatchType) => {
    try {
      await startAuditBatch(batchType, `${BATCH_TYPES[batchType].label} batch`);
      Alert.alert('Success', 'Audit batch started');
    } catch (err) {
      Alert.alert('Error', 'Failed to start audit batch');
    }
  };

  const handleSubmitAdjustment = async () => {
    try {
      const quantityBefore = parseFloat(adjustmentForm.quantityBefore);
      const quantityAfter = parseFloat(adjustmentForm.quantityAfter);
      const unitCost = adjustmentForm.unitCost ? parseFloat(adjustmentForm.unitCost) : undefined;

      if (isNaN(quantityBefore) || isNaN(quantityAfter)) {
        Alert.alert('Error', 'Please enter valid quantities');
        return;
      }

      const result = await recordAdjustment(
        adjustmentForm.itemId,
        adjustmentForm.locationId,
        quantityBefore,
        quantityAfter,
        adjustmentForm.type,
        {
          reason: adjustmentForm.reason,
          reference: adjustmentForm.reference,
          notes: adjustmentForm.notes,
          unitCost,
        }
      );

      const message = result.requiresApproval 
        ? 'Adjustment recorded and sent for approval'
        : 'Adjustment recorded successfully';
      
      Alert.alert('Success', message);
      setShowAdjustmentForm(false);
      setAdjustmentForm({
        itemId: '',
        locationId: '',
        quantityBefore: '',
        quantityAfter: '',
        type: 'adjustment',
        reason: undefined,
        reference: '',
        notes: '',
        unitCost: '',
      });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to record adjustment');
    }
  };

  const handleApproveAdjustment = async (adjustmentId: string) => {
    try {
      await approveAdjustment(adjustmentId, 'Approved via mobile interface');
      Alert.alert('Success', 'Adjustment approved');
    } catch (err) {
      Alert.alert('Error', 'Failed to approve adjustment');
    }
  };

  const renderSessionControls = () => (
    <View className="bg-white p-4 mb-4 rounded-lg shadow-sm">
      <Text className="text-lg font-semibold mb-3">Session Management</Text>
      
      {currentSession ? (
        <View>
          <Text className="text-sm text-gray-600 mb-2">
            Active Session: {currentSession.sessionId}
          </Text>
          <Text className="text-sm text-gray-600 mb-2">
            Adjustments: {currentSession.totalAdjustments}
          </Text>
          <Text className="text-sm text-gray-600 mb-3">
            Total Change: {formatters.formatQuantityChange(currentSession.totalQuantityChange)}
          </Text>
          <TouchableOpacity
            onPress={handleEndSession}
            className="bg-red-500 px-4 py-2 rounded"
            disabled={isLoading}
          >
            <Text className="text-white text-center">End Session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={handleStartSession}
          className="bg-blue-500 px-4 py-2 rounded"
          disabled={isLoading}
        >
          <Text className="text-white text-center">Start Session</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderBatchControls = () => (
    <View className="bg-white p-4 mb-4 rounded-lg shadow-sm">
      <Text className="text-lg font-semibold mb-3">Batch Operations</Text>
      
      {currentBatch ? (
        <View>
          <Text className="text-sm text-gray-600 mb-2">
            Active Batch: {BATCH_TYPES[currentBatch.batchType].label}
          </Text>
          <Text className="text-sm text-gray-600 mb-2">
            Progress: {currentBatch.processedItems}/{currentBatch.totalItems}
          </Text>
          <Text className="text-sm text-gray-600 mb-3">
            Status: {currentBatch.status}
          </Text>
          <TouchableOpacity
            onPress={() => completeAuditBatch('completed')}
            className="bg-green-500 px-4 py-2 rounded"
            disabled={isLoading}
          >
            <Text className="text-white text-center">Complete Batch</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {Object.entries(BATCH_TYPES).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              onPress={() => handleStartBatch(key as BatchType)}
              className="bg-blue-500 px-3 py-2 rounded"
              disabled={isLoading}
            >
              <Text className="text-white text-xs">{value.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderAdjustmentForm = () => (
    <View className="bg-white p-4 mb-4 rounded-lg shadow-sm">
      <Text className="text-lg font-semibold mb-3">Record Adjustment</Text>
      
      <TextInput
        placeholder="Item ID"
        value={adjustmentForm.itemId}
        onChangeText={(text) => setAdjustmentForm(prev => ({ ...prev, itemId: text }))}
        className="border border-gray-300 p-2 mb-2 rounded"
      />
      
      <TextInput
        placeholder="Location ID"
        value={adjustmentForm.locationId}
        onChangeText={(text) => setAdjustmentForm(prev => ({ ...prev, locationId: text }))}
        className="border border-gray-300 p-2 mb-2 rounded"
      />
      
      <View className="flex-row gap-2 mb-2">
        <TextInput
          placeholder="Qty Before"
          value={adjustmentForm.quantityBefore}
          onChangeText={(text) => setAdjustmentForm(prev => ({ ...prev, quantityBefore: text }))}
          keyboardType="numeric"
          className="flex-1 border border-gray-300 p-2 rounded"
        />
        <TextInput
          placeholder="Qty After"
          value={adjustmentForm.quantityAfter}
          onChangeText={(text) => setAdjustmentForm(prev => ({ ...prev, quantityAfter: text }))}
          keyboardType="numeric"
          className="flex-1 border border-gray-300 p-2 rounded"
        />
      </View>
      
      <TextInput
        placeholder="Unit Cost (optional)"
        value={adjustmentForm.unitCost}
        onChangeText={(text) => setAdjustmentForm(prev => ({ ...prev, unitCost: text }))}
        keyboardType="numeric"
        className="border border-gray-300 p-2 mb-2 rounded"
      />
      
      <TextInput
        placeholder="Reference (optional)"
        value={adjustmentForm.reference}
        onChangeText={(text) => setAdjustmentForm(prev => ({ ...prev, reference: text }))}
        className="border border-gray-300 p-2 mb-2 rounded"
      />
      
      <TextInput
        placeholder="Notes (optional)"
        value={adjustmentForm.notes}
        onChangeText={(text) => setAdjustmentForm(prev => ({ ...prev, notes: text }))}
        multiline
        numberOfLines={3}
        className="border border-gray-300 p-2 mb-3 rounded"
      />
      
      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={handleSubmitAdjustment}
          className="flex-1 bg-green-500 px-4 py-2 rounded"
          disabled={isLoading}
        >
          <Text className="text-white text-center">Record</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowAdjustmentForm(false)}
          className="flex-1 bg-gray-500 px-4 py-2 rounded"
        >
          <Text className="text-white text-center">Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAuditSummary = () => (
    <View className="bg-white p-4 mb-4 rounded-lg shadow-sm">
      <Text className="text-lg font-semibold mb-3">Audit Summary</Text>
      <Text className="text-sm text-gray-600 mb-1">
        Total Adjustments: {auditSummary.totalAdjustments}
      </Text>
      <Text className="text-sm text-gray-600 mb-1">
        Total Quantity Change: {formatters.formatQuantityChange(auditSummary.totalQuantityChange)}
      </Text>
      <Text className="text-sm text-gray-600 mb-1">
        Total Cost Impact: {formatters.formatCostImpact(auditSummary.totalCostImpact)}
      </Text>
      <Text className="text-sm text-gray-600">
        Pending Approvals: {auditSummary.pendingApprovals}
      </Text>
    </View>
  );

  const renderAuditRecords = () => (
    <View className="bg-white p-4 rounded-lg shadow-sm">
      <Text className="text-lg font-semibold mb-3">Recent Audit Records</Text>
      <ScrollView className="max-h-96">
        {auditRecords.slice(0, 20).map((record) => (
          <View key={record.id} className="border-b border-gray-200 py-2">
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="font-medium">
                  {formatters.getAuditTypeIcon(record.type)} {formatters.formatAuditType(record.type)}
                </Text>
                <Text className="text-sm text-gray-600">
                  Item: {record.itemId} | Location: {record.locationId}
                </Text>
                <Text className="text-sm text-gray-600">
                  Change: {formatters.formatQuantityChange(record.quantityChange || 0)}
                  {record.totalCostImpact && ` (${formatters.formatCostImpact(record.totalCostImpact)})`}
                </Text>
                {record.reason && (
                  <Text className="text-sm text-gray-600">
                    Reason: {formatters.formatAuditReason(record.reason)}
                  </Text>
                )}
                {record.notes && (
                  <Text className="text-sm text-gray-500 italic">{record.notes}</Text>
                )}
              </View>
              <View className="items-end">
                <Text className="text-xs text-gray-500">
                  {formatters.formatAuditDate(new Date(record.createdAt))}
                </Text>
                {record.userName && (
                  <Text className="text-xs text-gray-500">{record.userName}</Text>
                )}
                {record.requiresApproval && !record.approvedAt && (
                  <Text className="text-xs text-orange-600 font-medium">Pending Approval</Text>
                )}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderPendingApprovals = () => (
    <View className="bg-white p-4 rounded-lg shadow-sm">
      <Text className="text-lg font-semibold mb-3">Pending Approvals</Text>
      <ScrollView className="max-h-96">
        {pendingApprovals.map((record) => (
          <View key={record.id} className="border-b border-gray-200 py-3">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1">
                <Text className="font-medium">
                  {formatters.getAuditTypeIcon(record.type)} {formatters.formatAuditType(record.type)}
                </Text>
                <Text className="text-sm text-gray-600">
                  Item: {record.itemId} | Location: {record.locationId}
                </Text>
                <Text className="text-sm text-gray-600">
                  Change: {formatters.formatQuantityChange(record.quantityChange || 0)}
                  {record.totalCostImpact && ` (${formatters.formatCostImpact(record.totalCostImpact)})`}
                </Text>
                {record.reason && (
                  <Text className="text-sm text-gray-600">
                    Reason: {formatters.formatAuditReason(record.reason)}
                  </Text>
                )}
              </View>
              <Text className="text-xs text-gray-500">
                {formatters.formatAuditDate(new Date(record.createdAt))}
              </Text>
            </View>
            {(userRole === 'admin' || userRole === 'manager') && (
              <TouchableOpacity
                onPress={() => handleApproveAdjustment(record.id)}
                className="bg-green-500 px-3 py-1 rounded self-start"
                disabled={isLoading}
              >
                <Text className="text-white text-sm">Approve</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {pendingApprovals.length === 0 && (
          <Text className="text-gray-500 text-center py-4">No pending approvals</Text>
        )}
      </ScrollView>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-100">
      {error && (
        <View className="bg-red-100 p-3 m-4 rounded">
          <Text className="text-red-800">{error}</Text>
        </View>
      )}

      {/* Tab Navigation */}
      <View className="flex-row bg-white shadow-sm">
        {[
          { key: 'adjustments', label: 'Adjustments' },
          { key: 'audit', label: 'Audit Trail' },
          { key: 'approvals', label: `Approvals (${pendingApprovals.length})` },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-3 ${activeTab === tab.key ? 'border-b-2 border-blue-500' : ''}`}
          >
            <Text className={`text-center ${activeTab === tab.key ? 'text-blue-500 font-medium' : 'text-gray-600'}`}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView className="flex-1 p-4">
        {activeTab === 'adjustments' && (
          <>
            {renderSessionControls()}
            {renderBatchControls()}
            {renderAuditSummary()}
            
            {!showAdjustmentForm ? (
              <TouchableOpacity
                onPress={() => setShowAdjustmentForm(true)}
                className="bg-blue-500 px-4 py-3 rounded-lg mb-4"
              >
                <Text className="text-white text-center font-medium">Record New Adjustment</Text>
              </TouchableOpacity>
            ) : (
              renderAdjustmentForm()
            )}
          </>
        )}

        {activeTab === 'audit' && renderAuditRecords()}
        {activeTab === 'approvals' && renderPendingApprovals()}
      </ScrollView>
    </View>
  );
}