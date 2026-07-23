describe("Travel Diary critical path", () => {
  it("lets a user register, log in, create a place and diary entry, then log out", () => {
    const email = `cypress-${Date.now()}@test.com`;
    const password = "Password123";
    const city = `Cypress City ${Date.now()}`;
    const country = "Testland";
    const entryTitle = `First memory ${Date.now()}`;
    const entryDescription = "Created through the Cypress critical path test.";

    cy.viewport(1440, 900);
    cy.visit("/register");

    cy.get('[data-cy="register-form"]').should("be.visible");
    cy.get('[data-cy="email-input"]').first().type(email);
    cy.get('[data-cy="password-input"]').first().type(password);
    cy.get('[data-cy="register-submit"]').click();

    cy.url().should("include", "/login");
    cy.get('[data-cy="login-form"]').should("be.visible");
    cy.get('[data-cy="email-input"]').type(email);
    cy.get('[data-cy="password-input"]').type(password);
    cy.get('[data-cy="login-submit"]').click();

    cy.url().should("eq", `${Cypress.config().baseUrl}/`);
    cy.get('[data-cy="add-place-button"]').click();
    cy.get('[data-cy="place-form"]').should("be.visible");
    cy.get('[data-cy="city-input"]').type(city);
    cy.get('[data-cy="country-input"]').type(country);
    cy.get('[data-cy="place-submit"]').click();

    cy.get('[data-cy="add-entry-button"]').scrollIntoView().should("be.visible").click();
    cy.get('[data-cy="entry-form"]').should("be.visible");
    cy.get('[data-cy="entry-title-input"]').type(entryTitle);
    cy.get('[data-cy="entry-description-input"]').type(entryDescription);
    cy.get('[data-cy="entry-category-input"]').select("General");
    cy.get('[data-cy="entry-rating-input"]').select("5");
    cy.get('[data-cy="entry-submit"]').click();

    cy.get('[data-cy="entry-list"]').should("contain", entryTitle);

    cy.get('[data-cy="avatar-button"]').click();
    cy.get('[data-cy="logout-button"]').click();
    cy.url().should("include", "/login");
  });
});