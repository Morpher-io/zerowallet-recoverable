const WalletController = require('../../controllers/wallet.controller');
const ValidationController = require('../../controllers/validation.controller');
const secureRoutes = require('./secure');

const rateLimit = require('express-rate-limit');

const limiter = new rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    keyGenerator(req, res) {
        return req.body.key;
    }
});

// The index route file which connects all the other files.
module.exports = function(express) {
    const router = express.Router();

    if (process.env.ENVIRONMENT === 'development') {
        const testingRoutes = require('./testing')(express.Router());
        router.use('/test', testingRoutes);
    }

    router.post('/saveEmailPassword', WalletController.saveEmailPassword);
    router.post('/getEncryptedSeed', limiter, WalletController.getEncryptedSeed);

    /**
     * Recovery Methods
     */
    router.post('/recoverSeedSocialRecovery', WalletController.recoverSeedSocialRecovery);

    router.post('/getPayload', WalletController.getPayload);
    router.post('/getNonce', WalletController.getNonce);
    router.post('/send2FAEmail', WalletController.send2FAEmail);
    router.post('/verifyEmailCode', WalletController.verifyEmailCode);
    router.post('/verifyAuthenticatorCode', WalletController.verifyAuthenticatorCode);
    router.post('/validateInput', ValidationController.validateInput);

    /**
     * Secure routes checking signature matching eth_address
     */
    router.use('/auth', secureRoutes);
    router.post('/auth/resetRecovery', WalletController.resetRecovery);
    router.post('/auth/updatePassword', WalletController.updatePassword);
    router.post('/auth/updateEmail', WalletController.updateEmail);
    router.post('/auth/change2FAMethods', WalletController.change2FAMethods);
    router.post('/auth/generateAuthenticatorQR', WalletController.generateAuthenticatorQR);
    router.post('/auth/addRecoveryMethod', WalletController.addRecoveryMethod);
    router.post('/auth/getRecoveryMethods', WalletController.getRecoveryMethods);
    router.post('/auth/deleteAccount', WalletController.deleteAccount);

    return router;
};
