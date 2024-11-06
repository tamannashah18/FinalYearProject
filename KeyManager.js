import crypto from 'crypto';
class KeyManager {
    static generateKeyPair() {
        
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
            }
        });
        return { privateKey, publicKey };
    }
}
export default KeyManager