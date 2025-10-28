const sample =
  '016F52000000000500000000000100050000000000040005000030111903000500003011192200050000000000240005000041326102000500000000000C0005000000000005000500000000000600050000000000B04E';
const sample2 =
  '016F7A00000000090000000000000000000100090000000000000000000400090000000000000290000300090000000000000000002200090000000000000000002400090000000000000425000200090000000000000000000C00090000000000000000000500090000000000000000000600090000000000000000006762';

function parseSasPyd(pyd) {
  const result = {};

  if (!pyd || pyd === '-1') {
    return { error: 'An error occurred: -1', pyd };
  }

  // Start after header: address(2), command(2), length(2), gameNumber(4) = 10 chars
  let idx = 10;

  // Loop through exactly 10 meters (as per SAS protocol)
  for (let i = 0; i < 10; i++) {
    // Read meter code (4 chars starting at idx)
    const code = pyd.slice(idx, idx + 4);

    // Read meter length (2 chars after code)
    const len = parseInt(pyd.slice(idx + 4, idx + 6), 16);
    const meterLength = len * 2;

    // Extract value based on meter length
    const val = pyd.slice(idx + 6, idx + 6 + meterLength);
    const value = val ? parseInt(val, 10) : 0;

    // Store in result object based on code
    switch (code) {
      case '0000':
        result.totalCoinCredits = value;
        break;
      case '0100':
        result.totalCoinOut = value;
        break;
      case '0400':
        result.totalCancelledCredits = value;
        break;
      case '0300':
        result.totalHandPaidCancelCredits = value;
        break;
      case '2200':
        result.totalWonCredits = value;
        break;
      case '2400':
        result.totalDrop = value;
        break;
      case '0200':
        result.totalAttendantPaidProgressiveWin = value;
        break;
      case '0C00':
        result.currentCredits = value;
        break;
      case '0500':
        result.total20KBillsAccepted = value;
        break;
      case '0600':
        result.total200BillsToDrop = value;
        break;
    }

    // Update idx for next meter (special handling for last meter)
    if (i !== 9) {
      idx = idx + meterLength + 6;
    } else {
      idx += meterLength;
    }
  }

  return result;
}

// Test with both samples
console.log('Sample 1:', parseSasPyd(sample));
console.log('Sample 2:', parseSasPyd(sample2));

// Test error cases
console.log('Error case:', parseSasPyd('-1'));
console.log('Empty case:', parseSasPyd(''));

module.exports = { parseSasPyd };
