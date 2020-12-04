import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import { sha256 } from '../utils/cryptoFunctions';
import {
	getEncryptedSeedFromMail,
	verifyAuthenticatorCode,
	verifyEmailCode,
	getEncryptedSeed,
	saveWalletEmailPassword,
	send2FAEmail,
	getPayload,
	getKeystoreFromEncryptedSeed
} from '../utils/backupRestore';
import { getAccountsFromKeystore } from '../utils/utils';
import { getKeystore } from '../utils/keystore';
import { Type2FARequired, TypeSeedFoundData, TypeSeedCreatedData, TypeFetchUser, TypeUnlock2fa } from '../types/global-types';
import { WalletBase } from 'web3-core';

Vue.use(Vuex);

/*
 * Store type definition
 */
export interface RootState {
	loading: boolean;
	status: string;
	message: string;
	email: string;
	hashedPassword: string;
	encryptedSeed: string;
	encryptedWallet: string;
	keystore: WalletBase | null;
	accounts: Array<string>;
	token: string;
	twoFaRequired: Type2FARequired;
}

/**
 * initialize the store
 */
function initialState(): RootState {
	return {
		loading: false,
		status: '',
		message: '',
		email: localStorage.getItem('email') || '',
		hashedPassword: window.sessionStorage.getItem('password') || '',
		encryptedSeed: localStorage.getItem('encryptedSeed') !== null ? JSON.parse(String(localStorage.getItem('encryptedSeed'))) : '',
		encryptedWallet: '',
		keystore: null,
		accounts: [],
		twoFaRequired: {
			email: false,
			authenticator: false
		},
		token: ''
	};
}

/**
 * Store state object
 */
const store: Store<RootState> = new Vuex.Store({
	state: initialState(),
	modules: {},
	mutations: {
		authRequested(state: RootState) {
			state.status = 'loading';
		},
		seedFound(state: RootState, seedFoundData: TypeSeedFoundData) {
			state.status = 'success';
			state.email = seedFoundData.email;
			state.encryptedSeed = seedFoundData.encryptedSeed;
			state.hashedPassword = seedFoundData.hashedPassword;
		},
		updatePayload(state: RootState, payload) {
			state.twoFaRequired.email = payload.email;
			state.twoFaRequired.authenticator = payload.authenticator;
		},
		seedCreated(state: RootState, seedCreatedData: TypeSeedCreatedData) {
			state.status = 'created';
			state.email = seedCreatedData.email;
			state.encryptedSeed = seedCreatedData.encryptedSeed;
			state.keystore = seedCreatedData.unencryptedKeystore;
			state.hashedPassword = seedCreatedData.hashedPassword;
		},
		authError(state: RootState, message) {
			(state.status = 'error'), (state.message = message);
		},
		logout(state: RootState) {
			localStorage.removeItem('email');
			sessionStorage.removeItem('password');
			localStorage.removeItem('encryptedSeed');

			state.email = '';
			state.hashedPassword = '';
			state.encryptedSeed = '';
			state.keystore = null;

			state.status = '';
			state.token = '';
		},
		keystoreUnlocked(state: RootState, payload) {
			state.keystore = payload.keystore;
			state.accounts = payload.accounts;
		}
	},
	actions: {
		/**
		 * Fetch the user data from the database and attempt to unlock the wallet using the mail encrypted seed
		 */
		async fetchUser({ commit }, params: TypeFetchUser) {
			const email: string = params.email;
			const password: string = params.password;
			return new Promise((resolve, reject) => {
				commit('authRequested');

				getEncryptedSeedFromMail(email)
					.then(encryptedSeed => {
						window.localStorage.setItem('email', email);
						sha256(password)
							.then(hashedPassword => {
								sessionStorage.setItem('password', hashedPassword);
								commit('seedFound', { email, encryptedSeed, hashedPassword });
								getPayload(email)
									.then(payload => {
										commit('updatePayload', payload);
										resolve();
									})
									.catch(reject);
							})
							.catch(reject);
					})
					.catch(err => {
						commit('auth_error', "The user wasn't found: Signup first!");
						localStorage.removeItem('encryptedSeed');
						localStorage.removeItem('email');
						sessionStorage.removeItem('password');
						reject(err);
					});
			});
		},
		/**
		 * Fetch the user data from the database and attempt to unlock the wallet using the mail encrypted seed
		 */
		createWallet({ commit }, params: TypeFetchUser) {
			return new Promise((resolve, reject) => {
				console.log('trying to find keystore from mail');
				getEncryptedSeedFromMail(params.email)
					.then(keystore => {
						commit('authError', 'The user found: Login instead!');
						reject('Wallet for this mail already exists.');
					})
					.catch(async e => {
						commit('authRequested');
						console.log('keystore not found in mail, creating a new one');
						/**
						 * If no wallet was found, then create a new one (seed = false) otherwise use the decrypted seed from above
						 */
						const unlockedKeystore = await getKeystore(params.password, []);

						const encryptedKeystore = await getEncryptedSeed(unlockedKeystore, params.password);
						localStorage.setItem('encryptedSeed', JSON.stringify(encryptedKeystore));
						localStorage.setItem('email', params.email);
						sessionStorage.setItem('password', params.password);

						saveWalletEmailPassword(params.email, encryptedKeystore);
						send2FAEmail(params.email);
						resolve();
					});
			});
		},
		logoutWallet({ commit }) {
			commit('logout');
		},
		/**
		 * Unlock wallet using 2fa codes
		 */
		unlock2FA({ commit, dispatch, state, rootState }, params: TypeUnlock2fa) {
			return new Promise((resolve, reject) => {
				if (state.twoFaRequired.email == true) {
					verifyEmailCode(rootState.email, params.email2FA).then(result => {
						if (!result.verified) {
							commit('authError', '2FA Email code not correct');
							reject('2FA Mail not correct');
						} else {
							const encryptedSeed = state.encryptedSeed; //normally that would need decrypting using 2fa codes
							localStorage.setItem('encryptedSeed', JSON.stringify(encryptedSeed));

							commit('updatePayload', { email: false, authenticator: false });

							dispatch('unlockWithPassword', state.hashedPassword).then(() => {
								resolve();
							});
						}
					});
				}
				if (state.twoFaRequired.authenticator == true) {
					verifyAuthenticatorCode(rootState.email, params.authenticator2FA).then(result => {
						if (!result.verified) {
							commit('authError', '2FA Authenticator code not correct');
							reject('2FA Authenticator not correct');
						} else {
							const encryptedSeed = state.encryptedSeed; //normally that would need decrypting using 2fa codes
							localStorage.setItem('encryptedSeed', JSON.stringify(encryptedSeed));

							commit('updatePayload', { email: false, authenticator: false });

							dispatch('unlockWithPassword', state.hashedPassword).then(() => {
								resolve();
							});
						}
					});
				}
			});
		},
		/**
		 * Unlock wallet using the password stored in local state
		 */
		unlockWithStoredPassword({ dispatch, commit, state }) {
			return new Promise((resolve, reject) => {
				if (state.hashedPassword && state.encryptedSeed && state.encryptedSeed) {
					dispatch('unlockWithPassword', state.hashedPassword)
						.then(() => {
							resolve(true);
						})
						.catch(err => {
							console.log('unlockWithPassword error', err);
							resolve(false);
						});
				} else {
					resolve(false);
				}
			});
		},
		/**
		 * Unlock wallet using the password entered on the logon form
		 */
		unlockWithPassword({ commit, state }, password) {
			return new Promise((resolve, reject) => {
				getKeystoreFromEncryptedSeed(state.encryptedSeed, password)
					.then(keystore => {
						const accounts = getAccountsFromKeystore(keystore);

						commit('keystoreUnlocked', { keystore, accounts });
						resolve();
					})
					.catch(err => {
						console.log('unlockWithPassword error', err);
						commit('auth_error', "The user wasn't found: Signup first!");
						localStorage.removeItem('encryptedSeed');
						localStorage.removeItem('email');
						sessionStorage.removeItem('password');
						reject(err);
					});
			});
		}
	},
	getters: {
		isLoggedIn: state => {
			return state.keystore !== undefined && state.keystore !== null;
		},
		twoFaRequired: state => {
			return state.twoFaRequired.email || state.twoFaRequired.authenticator;
		},
		authStatus: state => state.status
	}
});

export default store;