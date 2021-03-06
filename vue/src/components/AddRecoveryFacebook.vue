<template>
	<div class="field">
		<div class="control is-expanded" v-if="!hasRecoveryMethod">
			<v-facebook-login class="button is-fullwidth" :appId="clientId" @sdk-init="handleSdkInit" @login="onLogin" v-model="facebook.model"
				><span slot="login">Link to Facebook</span>
			</v-facebook-login>
		</div>
		<div class="control is-expanded has-text-centered" v-if="hasRecoveryMethod">
			<span class="icon google-icon">
				<i class="fas fa-check-circle"></i>
			</span>
			Facebook Recovery Added
			<v-facebook-login
				class="button is-fullwidth"
				:appId="clientId"
				@sdk-init="handleSdkInit"
				@login="deleteRecovery"
				v-model="facebook.model"
				><span slot="login">Delete access to Facebook</span>
			</v-facebook-login>
		</div>
		<div v-if="error">{{ error }}</div>
	</div>
</template>

<script>
import VFacebookLogin from 'vue-facebook-login-component';
import { sha256 } from './../utils/cryptoFunctions';

import Component, { mixins } from 'vue-class-component';
import { Authenticated, Global } from '../mixins/mixins';

@Component({
	components: {
		VFacebookLogin
	}
})
export default class AddRecoveryFacebook extends mixins(Global, Authenticated) {
	loggedIn = false;
	facebook = {
		FB: {},
		model: {},
		scope: {}
	};
	clientId = process.env.VUE_APP_FACEBOOK_APP_ID;
	recoveryTypeId = 2;
	hasRecoveryMethod = false;
	error = '';

	handleSdkInit({ FB, scope }) {
		this.facebook.scope = scope;
		this.facebook.FB = FB;
	}

	async mounted() {
		this.hasRecoveryMethod = await this.hasRecovery(this.recoveryTypeId);
	}

	async onLogin(data) {
		if (data == undefined) {
			// this.showSpinnerThenAutohide('Aborted Facebook Recovery');
			return;
		}
		this.showSpinner('Saving Keystore for Recovery');
		const userID = data.authResponse.userID;
		const key = await sha256(this.clientId + userID);

		this.addRecoveryMethod({ key, password: userID, recoveryTypeId: this.recoveryTypeId })
			.then(async () => {
				this.facebook.FB.api('/me/permissions', 'DELETE', async () => {
					this.facebook.scope.logout();
					this.showSpinnerThenAutohide('Saved Successfully');
					this.hasRecoveryMethod = await this.hasRecovery(this.recoveryTypeId);
				});
			})
			.catch(() => {
				this.showSpinnerThenAutohide('Error During Saving');
				this.error = 'Error during Saving.';
			});
	}

	async deleteRecovery(data) {
		if (data == undefined) {
			// this.showSpinnerThenAutohide('Aborted Facebook Recovery');
			return;
		}

		this.showSpinner('Deleting Keystore for Recovery');
		const userID = data.authResponse.userID;
		const key = await sha256(this.clientId + userID);
		this.resetRecoveryMethod({ key, recoveryTypeId: this.recoveryTypeId })
			.then(async () => {
				this.facebook.FB.api('/me/permissions', 'DELETE', () => {
					this.facebook.scope.logout();
					this.showSpinnerThenAutohide('Keystore deleted successfully');
					this.hasRecoveryMethod = false;
				});
			})
			.catch(() => {
				this.showSpinnerThenAutohide('Error finding user');
				this.error = 'Error during Saving.';
			});
	}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped></style>
