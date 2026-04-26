window.CryptoService = (function () {
  const ITERATIONS = 100_000;
  const KEY_LENGTH = 256;
  const SALT_LENGTH = 16;
  const IV_LENGTH = 12;

  function toBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  function fromBase64(str) {
    return Uint8Array.from(atob(str), c => c.charCodeAt(0));
  }

  function textToBuffer(text) {
    return new TextEncoder().encode(text);
  }

  function bufferToText(buffer) {
    return new TextDecoder().decode(buffer);
  }

  function randomBytes(length) {
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    return arr;
  }

  // --- key derivation ---
  async function deriveKey(password, salt) {
    const baseKey = await crypto.subtle.importKey(
      "raw",
      textToBuffer(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: ITERATIONS,
        hash: "SHA-256"
      },
      baseKey,
      {
        name: "AES-GCM",
        length: KEY_LENGTH
      },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encrypt(data, password) {
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);

    const key = await deriveKey(password, salt);

    const encoded = textToBuffer(JSON.stringify(data));

    const encrypted = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      encoded
    );

    return {
      salt: toBase64(salt),
      iv: toBase64(iv),
      data: toBase64(encrypted)
    };
  }

  async function decrypt(payload, password) {
    try {
      const salt = fromBase64(payload.salt);
      const iv = fromBase64(payload.iv);
      const data = fromBase64(payload.data);

      const key = await deriveKey(password, salt);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        key,
        data
      );

      const text = bufferToText(decrypted);
      return JSON.parse(text);
    } catch (e) {
      throw new Error("Invalid password or corrupted data");
    }
  }

  return {
    encrypt,
    decrypt
  };
})();
