import { EncryptJWT } from 'jose';
import dotenv from 'dotenv';
dotenv.config({
    path: './.env'
});

const { SECRET_KEY }= process.env;

const common = {    
    decodeToken: async (token) => {
        try {
            // 1. Recreate the exact same 256-bit key used for encryption
            const secretKey = new TextEncoder().encode(SECRET_KEY); 

            // 2. Decrypt the token
            const data = await jwtDecrypt(token, secretKey);
 
            const { exp } = data
            return exp * 1000 >= Date.now();
        } catch(e) {
            return false;
        }
    }
}
export default common;