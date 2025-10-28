const sample2 =
  '016F7A00000000090000000000000000000100090000000000000000000400090000000000000290000300090000000000000000002200090000000000000000002400090000000000000425000200090000000000000000000C00090000000000000000000500090000000000000000000600090000000000000000006762';

let idx = 10;
for (let i = 0; i < 10; i++) {
  const code = sample2.slice(idx, idx + 4);
  const len = parseInt(sample2.slice(idx + 4, idx + 6), 16);
  const meterLength = len * 2;
  const val = sample2.slice(idx + 6, idx + 6 + meterLength);

  console.log(
    `Meter ${i}: code=${code}, len=${len}, val=${val}, parsed=${parseInt(val, 10)}`
  );

  if (i !== 9) {
    idx = idx + meterLength + 6;
  } else {
    idx += meterLength;
  }
}
