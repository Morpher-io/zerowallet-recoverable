<template>
	<div class="container">
		<spinner v-model="showSpinner" v-bind:status="status"></spinner>

		<h2 class="title">Login</h2>
		<h4 class="subtitle">Unlock your Morpher Wallet</h4>
		<form v-on:submit.prevent="login">
			<div class="field">
				<label class="label">Email</label>
				<div class="control">
					<input type="email" class="input" name="walletEmail" placeholder="example@example.com" v-model="walletEmail" />
				</div>
			</div>

			<div class="field">
				<label class="label">Password</label>

				<div class="control">
					<input type="password" class="input" name="walletPassword" placeholder="Strong Password!" v-model="walletPassword" />

					<div v-if="showRecovery">
						<p class="help is-danger">
							The Password you provided can't be used to de-crypt your wallet.
							<router-link to="/recovery">Do you want to restore your Account?</router-link>
						</p>
					</div>
				</div>
			</div>

			<div class="field is-grouped">
				<div class="control is-expanded">
					<button class="button is-primary is-fullwidth" type="submit">
						<span class="icon is-small">
							<i class="fas fa-unlock"></i>
						</span>
						<span> Unlock </span>
					</button>
				</div>
				<div class="control">
					<router-link to="/signup" tag="button" class="button is-light">
						<span class="icon is-small">
							<i class="far fa-file"></i>
						</span>

						<span> Create new Wallet </span>
					</router-link>
				</div>
			</div>
		</form>
		<br />
	</div>
</template>

<script lang="ts">
import Component, { mixins } from 'vue-class-component';
import { Global } from '../mixins/mixins';

@Component
export default class Login extends mixins(Global) {
	// Component properties
	walletEmail = '';
	walletPassword = '';
	showRecovery = false;

	/**
	 * Cmponent mounted lifestyle hook
	 */
	mounted() {
		// Check if the wallet can be unlocked using the local-storage stored password
		this.unlockWithStoredPassword()
			.then(result => {
				if (result) {
					this.$router.push('/');
				}
			})
			.catch(error => {
				console.log(error);
			});
	}

	/**
	 * Execute the logon
	 */
	login() {
		const email = this.walletEmail;
		const password = this.walletPassword;

		// Call the fetchUser store action to process the wallet logon
		this.fetchUser({ email, password })
			.then(() => {
				if (this.store.twoFaRequired.email || this.store.twoFaRequired.authenticator) {
					// open 2fa page if 2fa is required
					this.$router.push('/2fa');
				} else {
					// open root page after logon success
					this.$router.push('/');
				}
			})
			.catch(error => {
				// Logon failed
				console.log(error);
			});
	}
}
</script>