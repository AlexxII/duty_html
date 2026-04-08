// шифрование временных данных в sessionStorage
(function() {

  const STORAGE_KEY_NAME = "__secure_key";
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const storage = sessionStorage;

  let cryptoKey = null;

  function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // ===============================
  // Key management
  // ===============================

  async function generateAndStoreKey() {
    const raw = crypto.getRandomValues(new Uint8Array(32)); // 256 bit
    const base64Key = bufferToBase64(raw);

    storage.setItem(STORAGE_KEY_NAME, base64Key);

    cryptoKey = await crypto.subtle.importKey(
      "raw",
      raw,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function loadExistingKey(base64Key) {
    const raw = new Uint8Array(base64ToBuffer(base64Key));

    cryptoKey = await crypto.subtle.importKey(
      "raw",
      raw,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function init() {
    if (cryptoKey) return;

    const storedKey = storage.getItem(STORAGE_KEY_NAME);

    if (storedKey) {
      await loadExistingKey(storedKey);
    } else {
      await generateAndStoreKey();
    }
  }

  // ===============================
  // Core
  // ===============================

  async function setItem(key, value) {
    await init();

    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encoded = encoder.encode(JSON.stringify(value));

    const encrypted = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv
      },
      cryptoKey,
      encoded
    );

    const payload = {
      iv: bufferToBase64(iv),
      data: bufferToBase64(encrypted)
    };

    storage.setItem(key, JSON.stringify(payload));
  }

  async function getItem(key) {
    await init();

    const raw = storage.getItem(key);
    if (!raw) return null;

    let payload;

    try {
      payload = JSON.parse(raw);
    } catch {
      return null;
    }

    try {
      const decrypted = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: new Uint8Array(base64ToBuffer(payload.iv))
        },
        cryptoKey,
        base64ToBuffer(payload.data)
      );

      const decoded = decoder.decode(decrypted);
      return JSON.parse(decoded);

    } catch {
      // если данные повреждены или ключ не совпадает
      return null;
    }
  }

  function removeItem(key) {
    storage.removeItem(key);
  }

  function clear() {
    storage.clear();
  }

  window.SecureStorage = {
    setItem,
    getItem,
    removeItem,
    clear
  };

})();
