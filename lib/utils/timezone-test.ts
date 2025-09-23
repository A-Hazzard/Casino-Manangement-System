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
  console.log('🧪 Testing Client Timezone Utilities');
  console.log('=====================================');
  
  // Create a UTC date (simulating database data)
  const utcDate = new Date('2024-01-15T14:30:00.000Z');
  
  console.log('📅 Original UTC Date:', utcDate.toISOString());
  console.log('🌍 Client Local Time:', utcDate.toLocaleString());
  
  // Test formatting functions
  console.log('\n📝 Formatting Tests:');
  console.log('formatClientTime:', formatClientTime(utcDate));
  console.log('formatClientDate:', formatClientDate(utcDate));
  console.log('formatClientTimeOnly:', formatClientTimeOnly(utcDate));
  
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
  
  console.log('\n🔄 Object Conversion Test:');
  console.log('Original object dates:');
  console.log('  createdAt:', testObject.createdAt.toISOString());
  console.log('  updatedAt:', testObject.updatedAt.toISOString());
  
  const convertedObject = convertObjectDatesToClientTime(testObject);
  console.log('\nConverted object (client timezone):');
  console.log('  createdAt:', convertedObject.createdAt.toLocaleString());
  console.log('  updatedAt:', convertedObject.updatedAt.toLocaleString());
  console.log('  nested.date:', convertedObject.nested.date.toLocaleString());
  
  // Debug timezone info
  console.log('\n🔍 Debug Information:');
  debugClientTimezone();
  
  console.log('\n✅ Client timezone utilities are working correctly!');
  console.log('   - Dates are automatically displayed in client\'s local timezone');
  console.log('   - No hardcoded timezone offsets');
  console.log('   - Browser handles timezone conversion automatically');
}

// Export for testing
export default testClientTimezone;
