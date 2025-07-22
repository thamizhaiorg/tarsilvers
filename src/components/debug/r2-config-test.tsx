import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { r2Service } from '../../lib/r2-service';
import { r2Config } from '../../lib/r2-config';

export default function R2ConfigTest() {
  const testConfiguration = () => {
    const status = r2Service.getConfigurationStatus();
    
    const configInfo = `
R2 Configuration Status:
Valid: ${status.isValid}
Missing Fields: ${status.missingFields.join(', ') || 'None'}

Configuration Values:
Account ID: ${status.config.accountId || 'Missing'}
Access Key ID: ${status.config.accessKeyId || 'Missing'}
Secret Access Key: ${status.config.secretAccessKey || 'Missing'}
Bucket Name: ${status.config.bucketName || 'Missing'}
Endpoint: ${status.config.endpoint || 'Missing'}
Region: ${status.config.region || 'Missing'}

Raw Config Check:
Account ID: ${r2Config.accountId ? 'Present' : 'Missing'}
Access Key ID: ${r2Config.accessKeyId ? 'Present' : 'Missing'}
Secret Access Key: ${r2Config.secretAccessKey ? 'Present' : 'Missing'}
Bucket Name: ${r2Config.bucketName ? 'Present' : 'Missing'}
Endpoint: ${r2Config.endpoint ? 'Present' : 'Missing'}
    `;
    
    Alert.alert('R2 Configuration', configInfo);
  };

  const testSimpleUpload = async () => {
    try {
      // Create a simple test file
      const testFile = {
        uri: 'data:text/plain;base64,SGVsbG8gV29ybGQ=', // "Hello World" in base64
        name: 'test.txt',
        type: 'text/plain',
        size: 11
      };

      const result = await r2Service.uploadFile(testFile, 'test');
      
      if (result.success) {
        Alert.alert('Upload Success', `File uploaded successfully!\nURL: ${result.url}`);
      } else {
        Alert.alert('Upload Failed', `Error: ${result.error}\nType: ${result.errorType}`);
      }
    } catch (error) {
      Alert.alert('Upload Error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <View style={{ padding: 20, gap: 10 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        R2 Configuration Test
      </Text>
      
      <TouchableOpacity
        onPress={testConfiguration}
        style={{
          backgroundColor: '#007AFF',
          padding: 15,
          borderRadius: 8,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          Check R2 Configuration
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={testSimpleUpload}
        style={{
          backgroundColor: '#34C759',
          padding: 15,
          borderRadius: 8,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          Test Simple Upload
        </Text>
      </TouchableOpacity>
    </View>
  );
}
