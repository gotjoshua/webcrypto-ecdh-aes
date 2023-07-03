// Import stylesheets
import './style.css';

// Write TypeScript code!
const appDiv: HTMLElement = document.getElementById('app');
appDiv.innerHTML = `<h1>TypeScript Starter</h1>`;

(() => {
  let iv;
  let ciphertext;

  /*
  Fetch the contents of the "message" textbox, and encode it
  in a form we can use for the encrypt operation.
  */
  function getMessageEncoding() {
    let message = document.querySelector('#ecdh-message').value;
    let enc = new TextEncoder();
    return enc.encode(message);
  }

  /*
  Encrypt the message using the secret key.
  Update the "ciphertextValue" box with a representation of part of
  the ciphertext.
  */
  async function encrypt(secretKey) {
    const ciphertextValue = document.querySelector('.ecdh .ciphertext-value');
    ciphertextValue.textContent = '';
    const decryptedValue = document.querySelector('.ecdh .decrypted-value');
    decryptedValue.textContent = '';

    iv = window.crypto.getRandomValues(new Uint8Array(12));
    let encoded = getMessageEncoding();

    ciphertext = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      secretKey,
      encoded
    );

    let buffer = new Uint8Array(ciphertext, 0, 5);
    ciphertextValue.classList.add('fade-in');
    ciphertextValue.addEventListener('animationend', () => {
      ciphertextValue.classList.remove('fade-in');
    });
    ciphertextValue.textContent = `${buffer}...[${ciphertext.byteLength} bytes total]`;
  }

  /*
  Decrypt the message using the secret key.
  If the ciphertext was decrypted successfully,
  update the "decryptedValue" box with the decrypted value.
  If there was an error decrypting,
  update the "decryptedValue" box with an error message.
  */
  async function decrypt(secretKey) {
    const decryptedValue = document.querySelector('.ecdh .decrypted-value');
    decryptedValue.textContent = '';
    decryptedValue.classList.remove('error');

    try {
      let decrypted = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        secretKey,
        ciphertext
      );

      let dec = new TextDecoder();
      decryptedValue.classList.add('fade-in');
      decryptedValue.addEventListener('animationend', () => {
        decryptedValue.classList.remove('fade-in');
      });
      decryptedValue.textContent = dec.decode(decrypted);
    } catch (e) {
      decryptedValue.classList.add('error');
      decryptedValue.textContent = '*** Decryption error ***';
    }
  }

  /*
  Derive an AES key, given:
  - our ECDH private key
  - their ECDH public key
  */
  function deriveSecretKey(privateKey, publicKey) {
    return window.crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: publicKey,
      },
      privateKey,
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  async function agreeSharedSecretKey() {
    // Generate 2 ECDH key pairs: one for Alice and one for Bob
    // In more normal usage, they would generate their key pairs
    // separately and exchange public keys securely
    let alicesKeyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-384',
      },
      true,
      ['deriveKey']
    );

    let bobsKeyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-384',
      },
      true,
      ['deriveKey']
    );

    // Alice then generates a secret key using her private key and Bob's public key.
    let alicesSecretKey = await deriveSecretKey(
      alicesKeyPair.privateKey,
      bobsKeyPair.publicKey
    );
    const alicesExportedKey = buf2hex(
      await window.crypto.subtle.exportKey('raw', alicesSecretKey)
    );

    // Bob generates the same secret key using his private key and Alice's public key.
    let bobsSecretKey = await deriveSecretKey(
      bobsKeyPair.privateKey,
      alicesKeyPair.publicKey
    );
    const bobsExportedKey = buf2hex(
      await window.crypto.subtle.exportKey('raw', bobsSecretKey)
    );

    console.log({ alicesExportedKey, bobsExportedKey });
    // Alice can then use her copy of the secret key to encrypt a message to Bob.
    let encryptButton = document.querySelector('.ecdh .encrypt-button');
    encryptButton.addEventListener('click', () => {
      encrypt(alicesSecretKey);
    });

    // Bob can use his copy to decrypt the message.
    let decryptButton = document.querySelector('.ecdh .decrypt-button');
    decryptButton.addEventListener('click', () => {
      decrypt(bobsSecretKey);
    });
  }

  agreeSharedSecretKey();
})();

const byteToHex = [];
function preComputeHex() {
  if (byteToHex.length === 0) {
    for (let n = 0; n <= 0xff; ++n) {
      const hexOctet = n.toString(16).padStart(2, '0');
      byteToHex.push(hexOctet);
    }
  }
}
export function buf2hex(arrayBuffer: ArrayBuffer) {
  if (byteToHex.length === 0) preComputeHex();
  const buff = new Uint8Array(arrayBuffer);
  const hexOctets = []; // new Array(buff.length) is even faster (preallocates necessary array size), then use hexOctets[i] instead of .push()

  for (let i = 0; i < buff.length; ++i) {
    hexOctets.push(byteToHex[buff[i]]);
  }

  return hexOctets.join('');
}
