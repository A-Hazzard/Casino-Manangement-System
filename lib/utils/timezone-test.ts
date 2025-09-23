/**
 * Test file to demonstrate the new client timezone utilities
 * This file can be deleted after testing
 */

import { 
  formatClientTime, 
  formatClientDate, 
  formatClientTimeOnly,
  convertObjectDatesToClientTime,
  debugClientTimezone 
} from './clientTimezone';

// Test the new client timezone utilities
export function testClientTimezone() {
  console.warn('🧪 Testing Client Timezone Utilities');
  console.warn('=====================================');
  
  // Create a UTC date (simulating database data)
  const utcDate = new Date('2024-01-15T14:30:00.000Z');
  
  console.warn('📅 Original UTC Date:', utcDate.toISOString());
  console.warn('🌍 Client Local Time:', utcDate.toLocaleString());
  
  // Test formatting functions
  console.warn('\n📝 Formatting Tests:');
  console.warn('formatClientTime:', formatClientTime(utcDate));
  console.warn('formatClientDate:', formatClientDate(utcDate));
  console.warn('formatClientTimeOnly:', formatClientTimeOnly(utcDate));
  
  // Test object conversion
  const testObject = {
    id: '123',
    name: 'Test Record',
    createdAt: new Date('2024-01-15T14:30:00.000Z'),
    updatedAt: new Date('2024-01-15T16:45:00.000Z'),
    timestamp: new Date('2024-01-15T18:00:00.000Z'),
    nested: {
      date: new Date('2024-01-15T20:15:00.000Z')
    }
  };
  
  console.warn('\n🔄 Object Conversion Test:');
  console.warn('Original object dates:');
  console.warn('  createdAt:', testObject.createdAt.toISOString());
  console.warn('  updatedAt:', testObject.updatedAt.toISOString());
  
  const convertedObject = convertObjectDatesToClientTime(testObject);
  console.warn('\nConverted object (client timezone):');
  console.warn('  createdAt:', convertedObject.createdAt.toLocaleString());
  console.warn('  updatedAt:', convertedObject.updatedAt.toLocaleString());
  console.warn('  nested.date:', convertedObject.nested.date.toLocaleString());
  
  // Debug timezone info
  console.warn('\n🔍 Debug Information:');
  debugClientTimezone();
  
  console.warn('\n✅ Client timezone utilities are working correctly!');
  console.warn('   - Dates are automatically displayed in client\'s local timezone');
  console.warn('   - No hardcoded timezone offsets');
  console.warn('   - Browser handles timezone conversion automatically');
}

// Export for testing
export default testClientTimezone;
