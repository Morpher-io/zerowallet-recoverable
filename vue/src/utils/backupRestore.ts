const { getKeystore } = require('./keystore');
const Accounts = require('web3-eth-accounts');
const config = require('./../config.json');
const { cryptoEncrypt, cryptoDecrypt, sha256 } = require('./cryptoFunctions');

import { TypeEncryptedSeed } from '../types/global-types';

const changePasswordEncryptedSeed = async (encryptedSeed: TypeEncryptedSeed, oldPassword: string, newPassword: string) => {
	const seed = await cryptoDecrypt(oldPassword, encryptedSeed.ciphertext, encryptedSeed.iv, encryptedSeed.salt);
	return await cryptoEncrypt(newPassword, seed);
};

const getKeystoreFromEncryptedSeed = async (encryptedWalletObject: string, password: string) =>
	new Promise((resolve, reject) => {
		try {
			getKeystore(password, encryptedWalletObject).then((wallet: any) => {
				resolve(wallet);
			});

			
			return;
			/*
            let seed = await cryptoDecrypt(
                password,
                encryptedSeed.ciphertext,
                encryptedSeed.iv,
                encryptedSeed.salt
            );
            let keystore = await getKeystore(password, seed);
            resolve(keystore);
            */
		} catch (e) {
			reject(e);
		}
	});

const getEncryptedSeed = async (keystore: any, password: string) => {
	return await keystore.encrypt(password);
	/*
    let pwDerivedKey = await new Promise((resolve, reject) => {
        keystore.keyFromPassword(password, (err, key) => {
            if (err) {
                reject(err);
            }
            resolve(key);
        });
    });

    let encryptedSeed = await cryptoEncrypt(
        password,
        await keystore.getSeed(pwDerivedKey)
    );
    return encryptedSeed;
    */
};

const getEncryptedSeedFromMail = async (email: string) =>
	new Promise((resolve, reject) => {
		 sha256(email).then((key:string) => {
			const options: RequestInit = {
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ key }),
				mode: 'cors',
				cache: 'default'
			};
			
			fetch(config.BACKEND_ENDPOINT + '/v1/getEncryptedSeed', options).then(response => {
				response.json().then(responseBody => {
	
					/**
					 * Login /Create Wallet is in one function
					 * @todo: Separate Login and Create Wallet into separate functions so that upon failed "login" a recovery can be suggested
					 */
					if (responseBody.success) {
						/**
						 * Wallet was found on server, attempting to decrypt with the password
						 */
						resolve(JSON.parse(responseBody.encryptedSeed));
					}
					reject('seed not found');
				}
				
				);

				
			}
				)


		}
			);

	
	});

const validateInput = async (fieldName: string, inputFieldValue: string) => {
	const options: RequestInit = {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			fieldName,
			inputFieldValue
		}),
		mode: 'cors',
		cache: 'default'
	};
	const result = await fetch(config.BACKEND_ENDPOINT + '/v1/validateInput', options);

	const response = await result.json();

	if (fieldName === 'email') {
		if (response.success === false) return 'Please input a valid email.';
	}

	if (fieldName === 'password') {
		if (response.success === false) {
			let badPasswordMessage = 'Password must have';

			for (const reason of response.validationFails) {
				if (reason === 'min') badPasswordMessage += ' at least 8 characters,';
				if (reason === 'uppercase') badPasswordMessage += ' at least 1 uppercase character,';
				if (reason === 'lowercase') badPasswordMessage += ' at least 1 lowercase character,';
				if (reason === 'digits') badPasswordMessage += ' at least 1 numerical digit,';
			}

			badPasswordMessage = badPasswordMessage.slice(0, -1) + '.';
			return badPasswordMessage;
		}
	}
};

const saveWalletEmailPassword = async (userEmail: string, encryptedSeed: string) => {
	const key = await sha256(userEmail);
	const options: RequestInit = {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			key,
			encryptedSeed,
			email: userEmail
		}),
		mode: 'cors',
		cache: 'default'
	};
	const result = await fetch(config.BACKEND_ENDPOINT + '/v1/saveEmailPassword', options);

	const response = await result.json();
	return response;
};

const backupGoogleSeed = async (userEmail: string, userid: string, encryptedSeed: string) =>
	new Promise((resolve, reject) => {
		sha256(config.GOOGLE_APP_ID + userid).then((key: any) => {

			const options: RequestInit = {
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					encryptedSeed,
					key,
					email: userEmail,
					recoveryTypeId: 3
				}),
				mode: 'cors',
				cache: 'default'
			};
			try {
				fetch(config.BACKEND_ENDPOINT + '/v1/saveEmailPassword', options).then(r => {
					r.json().then(response => {
						resolve(response);
					});
				});
			} catch (e) {
				reject(e);
			}
		}

		);
		
		


	});

const backupFacebookSeed = async (userEmail: string, userid: string, encryptedSeed: string) =>
	new Promise((resolve, reject) => {
		sha256(config.FACEBOOK_APP_ID + userid).then((key: any) => {

			const options: RequestInit = {
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					encryptedSeed,
					key: key,
					email: userEmail,
					recoveryTypeId: 2
				}),
				mode: 'cors',
				cache: 'default'
			};
			try {
				fetch(config.BACKEND_ENDPOINT + '/v1/saveEmailPassword', options).then(r => {
					r.json().then(response => {
						resolve(response);
					});
				});
			} catch (e) {
				reject(e);
			}
		}

		);
		
	});

const recoverFacebookSeed = async (accessToken: string, signupEmail: string) =>
	new Promise((resolve, reject) => {
		const options: RequestInit = {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				accessToken: accessToken,
				signupEmail: signupEmail
			}),
			mode: 'cors',
			cache: 'default'
		};
		fetch(config.BACKEND_ENDPOINT + '/v1/getFacebookEncryptedSeed', options).then(r => {
			r.json().then(async responseBody => {
				if (responseBody.success) {
					//initiate recovery
					const encryptedSeed = JSON.parse(responseBody.encryptedSeed);
					resolve(encryptedSeed);
				} else {
					reject("Your account wasn't found with Facebook recovery, create one with username and password first");
				}
			});
		});
	});
const recoverGoogleSeed = async (accessToken: string, signupEmail: string) =>
	new Promise((resolve, reject) => {
		const options: RequestInit = {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				accessToken: accessToken,
				signupEmail: signupEmail
			}),
			mode: 'cors',
			cache: 'default'
		};
		fetch(config.BACKEND_ENDPOINT + '/v1/getGoogleEncryptedSeed', options).then(r => {
			r.json().then(async responseBody => {
				if (responseBody.success) {
					//initiate recovery
					const encryptedSeed = JSON.parse(responseBody.encryptedSeed);
					resolve(encryptedSeed);
				} else {
					reject("Your account wasn't found with Google recovery, create one with username and password first");
				}
			});
		});
	});

const recoverVKSeed = async (accessToken: string, signupEmail: string) =>
	new Promise((resolve, reject) => {
		const options: RequestInit = {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				accessToken: accessToken,
				signupEmail: signupEmail
			}),
			mode: 'cors',
			cache: 'default'
		};
		fetch(config.BACKEND_ENDPOINT + '/v1/getVKontakteEncryptedSeed', options).then(r => {
			r.json().then(async responseBody => {
				if (responseBody.success) {
					//initiate recovery
					const encryptedSeed = JSON.parse(responseBody.encryptedSeed);
					resolve(encryptedSeed);
				} else {
					reject("Your account wasn't found with VK recovery, create one with username and password first");
				}
			});
		});
	});

const backupVKSeed = async (userEmail: string, userid: string, encryptedSeed: string) =>
	new Promise((resolve, reject) => {
		sha256(config.VK_APP_ID + userid).then((key: any) => {

			const options: RequestInit = {
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					encryptedSeed,
					key,
					email: userEmail,
					recoveryTypeId: 5
				}),
				mode: 'cors',
				cache: 'default'
			};
			try {
				fetch(config.BACKEND_ENDPOINT + '/v1/saveEmailPassword', options).then(r => {
					r.json().then(response => {
						resolve(response);
					});
				});
			} catch (e) {
				reject(e);
			}
		}

		)
		
		
	});

const changeEmail = async (oldEmail: string, newEmail: string, encryptedSeed: string) => {
	const key = await sha256(newEmail);
	const options: RequestInit = {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			key,
			encryptedSeed,
			oldEmail,
			newEmail
		}),
		mode: 'cors',
		cache: 'default'
	};
	const result = await fetch(config.BACKEND_ENDPOINT + '/v1/changeEmail', options);

	const response = await result.json();
	return response;
};

const getPayload = async (email: string) => {
	const key = await sha256(email);
	const options: RequestInit = {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			key
		}),
		mode: 'cors',
		cache: 'default'
	};
	const result = await fetch(config.BACKEND_ENDPOINT + '/v1/getPayload', options);

	const response = await result.json();
	return response;
};

const change2FAMethods = async (email: string, signedMessage: string, toggleEmail: string, toggleAuthenticator: string) => {
	const key = await sha256(email);
	const options: RequestInit = {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			key,
			signedMessage,
			toggleEmail,
			toggleAuthenticator
		}),
		mode: 'cors',
		cache: 'default'
	};
	const result = await fetch(config.BACKEND_ENDPOINT + '/v1/change2FAMethods', options);

	const response = await result.json();
	return response;
};

const send2FAEmail = async (email: string) => {
	const key = await sha256(email);
	const options: RequestInit = {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			key
		}),
		mode: 'cors',
		cache: 'default'
	};
	const result = await fetch(config.BACKEND_ENDPOINT + '/v1/send2FAEmail', options);

	const response = await result.json();
	return response;
};

const generateQRCode = async (email: string) => {
	const key = await sha256(email);
	const options: RequestInit = {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			key
		}),
		mode: 'cors',
		cache: 'default'
	};
	const result = await fetch(config.BACKEND_ENDPOINT + '/v1/generateAuthenticatorQR', options);

	const response = await result.json();
	return response;
};

const getQRCode = async (email: string) => {
	const key = await sha256(email);
	const options: RequestInit = {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			key
		}),
		mode: 'cors',
		cache: 'default'
	};
	const result = await fetch(config.BACKEND_ENDPOINT + '/v1/getQRCode', options);

	const response = await result.json();
	return response;
};

const verifyAuthenticatorCode = async (email: string, code: string) => {
	const key = await sha256(email);
	const options: RequestInit = {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			key,
			code
		}),
		mode: 'cors',
		cache: 'default'
	};
	const result = await fetch(config.BACKEND_ENDPOINT + '/v1/verifyAuthenticatorCode', options);

	const response = await result.json();
	return response;
};

const verifyEmailCode = async (email: string, code: string) => {
	const key = await sha256(email);
	const options: RequestInit = {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			key,
			code
		}),
		mode: 'cors',
		cache: 'default'
	};
	const result = await fetch(config.BACKEND_ENDPOINT + '/v1/verifyEmailCode', options);

	const response = await result.json();
	return response;
};

export {
	getEncryptedSeed,
	validateInput,
	saveWalletEmailPassword,
	getKeystoreFromEncryptedSeed,
	changePasswordEncryptedSeed,
	backupFacebookSeed,
	recoverFacebookSeed,
	getEncryptedSeedFromMail,
	backupGoogleSeed,
	recoverGoogleSeed,
	backupVKSeed,
	recoverVKSeed,
	changeEmail,
	getPayload,
	change2FAMethods,
	send2FAEmail,
	generateQRCode,
	getQRCode,
	verifyAuthenticatorCode,
	verifyEmailCode
};