<template>
	<div class="card">
		<form v-on:submit.prevent="formSubmitChange2FA">
			<div class="collapse">
				<span v-show="collapsed" class="icon collapseIcon collapseIcon" @click="collapsed = !collapsed">
					<i class="fas fa-chevron-right"></i>
				</span>
				<span v-show="!collapsed" class="icon collapseIcon collapseIcon" @click="collapsed = !collapsed">
					<i class="fas fa-chevron-down"></i>
				</span>

				<span class="header" @click="collapsed = !collapsed" data-cy="openTwoFaChange">
					Change 2-Factor authentication (2FA)
					<span class="help is-success" v-if="success" data-cy="isSuccess">Saved!</span>
				</span>
				<div :class="collapsed ? 'hidden' : 'visible'">
					<div class="card-content">
						<div class="field">
							<label class="label">
								<input type="checkbox" class="checkbox" id="email" v-model="email" data-cy="twoFaEmail" />
								2FA with Email Codes enabled
							</label>
						</div>

						<div class="field">
							<label class="label">
								<input type="checkbox" class="checkbox" id="authenticator" v-model="authenticator" data-cy="twoFaAuthenticator" />
								2FA with Authenticator Codes enabled
							</label>
						</div>
						<figure
							class="image"
							v-if="!this.authenticatorConfirmed && this.authenticator && (this.qrCode !== '' || this.qrCode !== undefined)"
						>
							<img v-bind:src="this.qrCode" />
						</figure>

						<div class="field" v-if="this.authenticator && !this.qrCode && !this.authenticatorConfirmed">
							<div class="control">
								<button type="button" class="button is-light" value="Generate QR Code" data-cy="generateQR" v-on:click="generateQR">
									Generate QR Code for Authenticator
								</button>
							</div>
						</div>

						<div class="field" v-if="this.authenticator && !this.authenticatorConfirmed && this.qrCode">
							<label class="label">Enter the Authenticator Code to Verify Successful Setup!</label>
							<div class="control">
								<input
									type="text"
									placeholder="Authenticator Code"
									data-cy="authenticatorCode"
									class="textbox"
									v-model="authenticatorCode"
								/>
								<p class="help is-danger" v-if="invalidAuthenticator" data-cy="authenticatorMessage">
									{{ invalidAuthenticator }}
								</p>
							</div>
						</div>

						<div class="field" v-if="this.authenticator && !this.authenticatorConfirmed && this.qrCode">
							<div class="control">
								<button
									v-if="this.authenticator && !this.authenticatorConfirmed && this.qrCode"
									class="button is-light"
									type="button"
									data-cy="confirmAuthenticator"
									v-on:click="confirmAuthenticator"
								>
									Confirm Authenticator Code
								</button>
							</div>
						</div>
					</div>

					<div class="field is-grouped">
						<button class="button is-green" type="submit" data-cy="saveTwoFa">
							<span class="icon is-small">
								<i class="fas fa-save"></i>
							</span>
							<span> Save 2FA Settings </span>
						</button>
					</div>
				</div>
			</div>
		</form>
	</div>
</template>

<script>
import Component, { mixins } from 'vue-class-component';
import { Authenticated, Global } from '../mixins/mixins';
import { verifyAuthenticatorCode } from '../utils/backupRestore';

@Component({})
export default class ChangeEmail extends mixins(Global, Authenticated) {
	email = false;
	authenticator = false;
	authenticatorConfirmed = false;
	authenticatorCode = '';
	invalidAuthenticator = '';
	qrCode = '';
	collapsed = true;
	success = false;

	async formSubmitChange2FA() {
		if (this.authenticator && !this.authenticatorConfirmed) {
			this.invalidAuthenticator = 'Please click Confirm Authenticator first before saving 2FA settings.';
			return;
		}

		//user unselected authenticator
		if (!this.authenticator && this.authenticatorConfirmed) {
			this.authenticatorConfirmed = false;
			this.qrCode = '';
			this.authenticatorCode = '';
		}

		try {
			this.showSpinner('Loading');
			await this.change2FAMethods({
				email: this.email,
				authenticator: this.authenticator,
				authenticatorConfirmed: this.authenticatorConfirmed
			});
			this.success = true;
			this.collapsed = true;
		} catch (e) {
			// console.log(e);
		}

		this.hideSpinner();
	}

	async confirmAuthenticator() {
		this.authenticatorConfirmed = await verifyAuthenticatorCode(this.store.email, this.authenticatorCode);

		if (this.authenticatorConfirmed) {
			this.success = true;
			this.collapsed = true;
			this.invalidAuthenticator = '';
		} else {
			this.invalidAuthenticator = 'Authenticator code seems to be incorrect.';
		}
	}

	async generateQR() {
		this.authenticatorConfirmed = false;
		this.authenticatorCode = '';

		this.qrCode = (await this.generateQRCode()).image;
		return false;
	}

	async mounted() {
		this.email = this.store.twoFaRequired.email;
		this.authenticator = this.store.twoFaRequired.authenticator;
		this.authenticatorConfirmed = this.store.twoFaRequired.authenticatorConfirmed;
	}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped></style>
