// https://docs.cypress.io/api/introduction/api.html

describe('Signup', () => {
	const email = Cypress.env('firstEmail');
	const password = 'Test123!';

	const backendUrl = Cypress.env('backendUrl');

	it('Signup and Login', () => {
		cy.visit('/signup');

		cy.get('[data-cy=walletEmail]')
			.type(email)
			.should('have.value', email);

		cy.get('[data-cy=walletPassword]')
			.type(password)
			.should('have.value', password);

		cy.get('[data-cy=walletPasswordRepeat]')
			.type(password)
			.should('have.value', password);

		cy.get('[data-cy=createNewWallet]').click();

		cy.wait(4000);

		cy.request('POST', `${backendUrl}/v1/test/getEmailCode`, { email }).then(response => {
			// response.body is automatically serialized into JSON
			const code = response.body.email_verification_code;

			cy.get('[data-cy=emailCode]').type(code);

			cy.get('[data-cy=unlock]').click();

			cy.get('h1').contains('Morpher Wallet');
			cy.get('h2').contains('Hello');
		});
	});

	it('Login user', () => {
		cy.visit('/');

		cy.get('[data-cy=walletEmail]')
			.type(email)
			.should('have.value', email);

		cy.get('[data-cy=walletPassword]')
			.type(password)
			.should('have.value', password);

		cy.get('[data-cy=submit]').click();

		cy.request('POST', `${backendUrl}/v1/test/getEmailCode`, { email }).then(response => {
			// response.body is automatically serialized into JSON
			const code = response.body.email_verification_code;

			cy.get('[data-cy=emailCode]').type(code);

			cy.get('[data-cy=unlock]').click();

			cy.get('h1').contains('Morpher Wallet');
			cy.get('h2').contains('Hello');
		});
	});

	it('disable twofa email', () => {
		cy.visit('/');

		cy.get('[data-cy=walletEmail]')
			.type(email)
			.should('have.value', email);

		cy.get('[data-cy=walletPassword]')
			.type(password)
			.should('have.value', password);

		cy.get('[data-cy=submit]').click();

		cy.wait(2000);

		cy.request('POST', `${backendUrl}/v1/test/getEmailCode`, { email }).then(response => {
			// response.body is automatically serialized into JSON
			const code = response.body.email_verification_code;

			cy.get('[data-cy=emailCode]').type(code);

			cy.get('[data-cy=unlock]').click();

			cy.get('h1').contains('Morpher Wallet');
			cy.get('h2').contains('Hello');

			cy.get('[data-cy=settings]').click();

			cy.get('[data-cy=openTwoFaChange]').click();

			cy.get('[data-cy=twoFaEmail]').click();

			cy.get('[data-cy=saveTwoFa]').click();

			cy.get('[data-cy=isSuccess]').contains('Saved');
		});
	});

	it('test logout', () => {
		cy.visit('/');

		cy.get('[data-cy=walletEmail]')
			.type(email)
			.should('have.value', email);

		cy.get('[data-cy=walletPassword]')
			.type(password)
			.should('have.value', password);

		cy.get('[data-cy=submit]').click();

		cy.waitUntil(() => cy.get('h1').contains('Morpher Wallet'));

		cy.get('h1').contains('Morpher Wallet');
		cy.get('h2').contains('Hello');

		cy.get('[data-cy=logout]').click();

		cy.contains('h2', 'Wallet Login');
	});
});
