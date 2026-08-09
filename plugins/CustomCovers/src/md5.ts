// Minimal MD5 over raw bytes. TIDAL's artwork upload needs the image's MD5 in
// two encodings (hex for the create call, base64 for the S3 content-md5 header)
// and crypto.subtle does not implement MD5, so we compute it ourselves.
// Standard RFC 1321 algorithm; K constants derived at runtime to avoid a table.

export function md5(bytes: Uint8Array): Uint8Array {
	const K = new Uint32Array(64);
	for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
	const s = [
		7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
		4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
	];

	const origLen = bytes.length;
	const bitLen = origLen * 8;
	const padLen = (origLen + 9 + 63) & ~63; // room for 0x80 + 8-byte length, up to a multiple of 64
	const msg = new Uint8Array(padLen);
	msg.set(bytes);
	msg[origLen] = 0x80;
	const dv = new DataView(msg.buffer);
	dv.setUint32(padLen - 8, bitLen >>> 0, true);
	dv.setUint32(padLen - 4, Math.floor(bitLen / 4294967296) >>> 0, true);

	let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
	const M = new Uint32Array(16);

	for (let off = 0; off < padLen; off += 64) {
		for (let j = 0; j < 16; j++) M[j] = dv.getUint32(off + j * 4, true);
		let A = a0, B = b0, C = c0, D = d0;
		for (let i = 0; i < 64; i++) {
			let F: number;
			let g: number;
			if (i < 16) { F = (B & C) | (~B & D); g = i; }
			else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) & 15; }
			else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) & 15; }
			else { F = C ^ (B | ~D); g = (7 * i) & 15; }
			F = (F + A + K[i] + M[g]) >>> 0;
			A = D; D = C; C = B;
			B = (B + ((F << s[i]) | (F >>> (32 - s[i])))) >>> 0;
		}
		a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
	}

	const out = new Uint8Array(16);
	const odv = new DataView(out.buffer);
	odv.setUint32(0, a0, true);
	odv.setUint32(4, b0, true);
	odv.setUint32(8, c0, true);
	odv.setUint32(12, d0, true);
	return out;
}

export const toHex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
export const toBase64 = (b: Uint8Array): string => btoa(String.fromCharCode(...b));
