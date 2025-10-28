// Simple JS parser for SAS pyd (for manual testing)
function hexToNumber(hex) {
  const trimmed = hex.replace(/^0+/, '');
  if (trimmed.length === 0) return 0;
  return parseInt(trimmed, 16);
}

function parseSasPyd(pyd) {
  const res = {};
  let idx = 0;
  const read = n => {
    const s = pyd.slice(idx, idx + n);
    idx += n;
    return s;
  };

  if (!pyd || pyd.length < 10) return res;

  res.address = hexToNumber(read(2));
  res.command = read(2);
  res.length = hexToNumber(read(2));
  res.gameNumber = hexToNumber(read(4));

  while (idx + 16 <= pyd.length) {
    const code = read(4);
    const size = hexToNumber(read(2));
    const valueHex = read(size * 2);
    const valueNum = hexToNumber(valueHex);

    switch (code) {
      case '0000':
        res.totalCoinCredits = valueNum;
        break;
      case '0100':
        res.totalCoinOut = valueNum;
        break;
      case '0400':
        res.totalCancelledCredits = valueNum;
        break;
      case '0300':
        res.totalHandPaidCancelCredits = valueNum;
        break;
      case '2200':
        res.totalWonCredits = valueNum;
        break;
      case '2400':
        res.totalDrop = valueNum;
        break;
      default:
        // ignore others
        break;
    }
  }

  return res;
}

// Example run
const sample =
  '016F52000000000500000000000100050000000000040005000030111903000500003011192200050000000000240005000041326102000500000000000C0005000000000005000500000000000600050000000000B04E';
console.log(parseSasPyd(sample));

module.exports = { parseSasPyd };
