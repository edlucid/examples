# Sample Next.js OIDC Relying Party (Customer App)

This sample demonstrates how a customer application built with Next.js (App Router) can integrate with [edlucid.io](https://edlucid.io) acting as an external OIDC Identity Provider via Auth0.

**Disclaimer:** This sample simplifies certain security aspects, particularly state and nonce management, for clarity. **Do not use this code directly in production without implementing proper server-side session handling and validation as outlined in the main [OIDC Customer Integration Guide](../../../OIDC_CUSTOMER_INTEGRATION.md).**

## Setup

1.  **Navigate to Sample Directory:**
    ```bash
    cd samples/oidc-provider-auth0/nextjs
    ```
2.  **Install Dependencies:** Run the install command *within this directory*.
    ```bash
    pnpm install 
    # or npm install / yarn install
    ```
3.  **Configure Environment Variables:**
    Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
    *   **Update the values in your `.env` file:**
        *   `AUTH0_SECRET`: **Replace the empty value** with a strong, random secret (at least 32 characters).
        *   `AUTH0_BASE_URL`: Adjust if you run this sample app on a different port/URL (default: `http://localhost:3002`).
        *   `AUTH0_ISSUER_BASE_URL`: Set this to the **base URL** of your edlucid.io instance (e.g., `https://launch.lti-local.edlucid.io`). This is used by Auth0 for OIDC discovery. Do **not** include `/oidc`.
        *   `AUTH0_CLIENT_ID`: Set this to the **Client ID** of the `Account` configured in edlucid.io for OIDC.
        *   `AUTH0_CLIENT_SECRET`: Keep or change the dummy secret.
        *   `AUTH0_CONNECTION_NAME`: Set this to the **Name** you gave the OIDC Enterprise Connection for edlucid.io in your Auth0 dashboard (e.g., `edlucid-idp`). This is required to bypass the Auth0 login page.

    *Note: The Auth0 SDK automatically constructs the callback URL (`/api/auth/callback`) based on `AUTH0_BASE_URL`. Ensure this full URL (e.g., `http://localhost:3002/api/auth/callback`) is an allowed Redirect URI in your edlucid.io `Account` settings.* 

## Configuring Auth0

This sample requires edlucid.io to be configured as an **OIDC Enterprise Connection** in your Auth0 tenant. This tells Auth0 to delegate authentication to edlucid.io when a user attempts to log in using credentials associated with this connection (typically triggered by the edlucid.io `clientId`).

1.  **Navigate to Auth0 Dashboard:** Go to `Authentication` -> `Enterprise`.
2.  **Create OIDC Connection:** Click `Create Connection`, find `OpenID Connect` and select it.
3.  **Configuration:**
    *   **Connection Name:** Give it a recognizable name (e.g., `edlucid-idp`). **Note this name** - you will need it for the `AUTH0_CONNECTION_NAME` environment variable in this sample app.
    *   **Issuer URL:** Enter the **base URL** of your edlucid.io instance (e.g., `https://launch.lti-local.edlucid.io`). Auth0 uses this for OIDC Discovery and will append `/.well-known/openid-configuration` automatically. Do **not** include `/oidc`.
    *   **Client ID:** Enter the `clientId` from the `Account` (with `authenticationMethod=OIDC_IDP`) configured in edlucid.io.
    *   **Client Secret:** Enter the corresponding client secret configured in the edlucid.io `Account`. While the edlucid.io IdP flow might not strictly *require* the secret for the authorization code grant itself, Auth0 requires it for the connection setup.
    *   **Scopes:** Ensure `openid profile email` are included.
    *   **Sync user profile attributes:** Choose `At every login` if you want Auth0 to update user profiles with data from edlucid.io each time.
    *   **(Advanced Settings):** Review other settings like Token Endpoint Authentication Method if needed, but defaults are often sufficient.
4.  **Save Connection.**
5.  **Enable Connection for your Application:** Go to the `Applications` tab for the connection you just created and toggle it **ON** for the Auth0 application that this Next.js sample app represents.

For more details, see the Auth0 Documentation:
*   [Enterprise Connections Overview](https://auth0.com/docs/authenticate/enterprise-connections)
*   [Connect to OpenID Connect Identity Provider](https://auth0.com/docs/authenticate/identity-providers/enterprise-identity-providers/oidc)

### Just-in-Time (JIT) Provisioning

Auth0 Organizations allow for Just-in-Time provisioning. When enabling the edlucid.io OIDC connection for your Auth0 Organization, you can configure the **"Membership On Authentication"** setting. If enabled, users authenticating via edlucid.io for the first time will automatically have an account created in Auth0 and be added as a member to that Organization.

See [Auth0 Docs: Enable Organization Connections](https://auth0.com/docs/manage-users/organizations/configure-organizations/enable-connections) for details.

## Running the Sample

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open the `AUTH0_BASE_URL` you configured (e.g., `http://localhost:3002`) in your browser. Accessing a protected page (like `/resource`) should automatically trigger the LTI/OIDC flow if you provide the `lti_state` parameter from an edlucid.io redirect.

## How it Works (Using @auth0/nextjs-auth0)

1.  **LTI Redirect:** A user launches from an LMS -> edlucid.io authenticates -> edlucid.io redirects to this app's `/resource` page with an `lti_state` query parameter.
2.  **Middleware Intercept:** The `middleware.ts` intercepts the request to `/resource`.
3.  **Authentication Check:** The middleware checks for an existing Auth0 session. If none exists and `lti_state` is present:
    *   It generates and stores a secure CSRF token in a cookie.
    *   It combines the CSRF token and `lti_state` into a single `state` parameter (Base64 encoded).
    *   It redirects the user directly to the Auth0 `/authorize` endpoint, passing the combined `state`.
4.  **Auth0 & edlucid.io Flow:** Auth0 uses the configured OIDC connection, redirects to edlucid.io (`/oidc/authorize`), which validates the LTI session (using `ltiState` decoded from the OIDC `state`), generates an `id_token`, and returns it to Auth0.
5.  **SDK Callback Handling (`/api/auth/callback`):**
    *   Auth0 redirects back to the SDK's callback handler (`/api/auth/callback`), including the original combined `state`.
    *   The `afterCallback` hook in `app/api/auth/[auth0]/route.ts` is triggered.
    *   **State & CSRF Validation:** It decodes the received OIDC `state`, extracts the original `csrfToken`, and validates it against the value stored in the secure cookie set by the middleware.
    *   If validation passes, the SDK establishes the user's session.
    *   The user is redirected back to the original resource page (`/resource`).

## Security Considerations (Production)

*   **Server-Side State:** The middleware uses signed cookies for CSRF state, which is generally secure.
*   **CSRF Validation:** Ensure the cookie signing secret (`AUTH0_SECRET`) is strong and kept confidential.
*   **(Nonce Validation):** Ensure Auth0 connection settings and SDK config implicitly handle nonce validation.
*   **ID Token Validation:** The SDK handles basic OIDC token validation.
*   Refer to the main [OIDC Customer Integration Guide](../../../OIDC_CUSTOMER_INTEGRATION.md) for detailed security requirements. 