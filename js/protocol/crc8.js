// CRC-8, poly 0x07, init 0x00, no reflection, no final xor. Mirror of common/crc8.c.
export function crc8(data, len = data.length) {
  let crc = 0;
  for (let i = 0; i < len; i++) {
    crc ^= data[i];
    for (let b = 0; b < 8; b++) {
      crc = (crc & 0x80) ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
    }
  }
  return crc;
}
