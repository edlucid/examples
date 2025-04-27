# Next.js OIDC Provider Sample (Logto)

This sample demonstrates using [edlucid.io](https://edlucid.io) as an OpenID Connect (OIDC) Identity Provider (IdP) for authenticating users in a Next.js application via Logto.

It uses the `@logto/next` SDK with Server Actions.

## Prerequisites

1.  **edlucid.io Running:** Ensure the edlucid.io `launch` application is running and accessible. By default, this sample assumes it's at `https://launch.lti-local.edlucid.io`.
2.  **Account and Platform Configured in edlucid.io:**
    *   You need an `Account` configured in edlucid.io with `authenticationMethod` set to `OIDC_IDP`.
    *   You need a `Platform` associated with that Account.
    *   Note the **Client ID** assigned to the Account in edlucid.io.
3.  **Node.js and pnpm:** Make sure you have Node.js and pnpm installed.

## Configuration

1.  **Copy Environment Variables:**
    ```bash
    cp .env.example .env
    ```

2.  **Edit `.env`:**
    *   `LOGTO_APP_ID`: Set this to the **Client ID** of the Application you created in your Logto tenant for this sample app.
    *   `LOGTO_APP_SECRET`: Set this to the **Client Secret** of the Application you created in your Logto tenant.
    *   `LOGTO_ENDPOINT`: Set this to the **endpoint URL of your Logto tenant** (e.g., `https://your-tenant.logto.app/`).
    *   `BASE_URL`: Adjust if you run this sample app on a different port/URL (default: `http://localhost:3001`).
    *   `LOGTO_COOKIE_SECRET`: Set this to the **Cookie Secret** value provided by Logto when you configured the Application in the Logto Console. **Do NOT generate your own.**

**Callback URL:**
The Logto SDK will automatically use `/api/logto/callback` relative to your `BASE_URL`. You need to ensure this **exact** callback URL (e.g., `http://localhost:3001/api/logto/callback`) is configured as an allowed Redirect URI in **both** the Logto Application settings **and** your edlucid.io `Account` settings.

## Configuring Logto

This sample requires edlucid.io to be configured as an **OIDC Enterprise SSO Connector** in your Logto tenant. This tells Logto to delegate authentication to edlucid.io when a user attempts to log in using credentials associated with this connector (typically triggered by the edlucid.io `clientId`).

1.  **Navigate to Logto Console:** Go to `Enterprise SSO`.
2.  **Add Enterprise Connector:** Click `Add enterprise connector` and choose `OIDC`.
3.  **Configuration:**
    *   **Connector name:** Give it a recognizable name (e.g., `edlucid-idp`).
    *   **(Connection Tab):**
        *   **Client ID:** Enter the `clientId` from the `Account` (with `authenticationMethod=OIDC_IDP`) configured in edlucid.io.
        *   **Client Secret:** Enter the corresponding client secret configured in the edlucid.io `Account`.
        *   **Issuer:** Enter the **base URL** of your edlucid.io instance (e.g., `https://launch.lti-local.edlucid.io`). Logto uses this for OIDC Discovery and will append `/.well-known/openid-configuration` automatically. Do **not** include `/oidc`.
        *   **Scope:** Ensure `openid profile email` are included (Logto adds these by default).
    *   **(SSO Experience Tab):**
        *   **Specify email domains:** This is **CRUCIAL** for automatically routing users coming from LTI to the edlucid.io connector. You **must** list the email domain(s) of users who will authenticate via LTI/edlucid.io here (e.g., `myinstitution.edu`). See [Logto Docs: Configuring Enterprise Connectors](https://docs.logto.io/connectors/enterprise-connectors/#configuring-enterprise-connectors) for details on how email domains trigger SSO.
    *   Review other tabs (`IdP-initiated SSO`) if needed, but defaults are often sufficient.
4.  **Save Connector.**
5.  **Enable Enterprise SSO:** Go to `Sign-in Experience` -> `Sign-up and Sign-in` tab and ensure `Enterprise SSO` is enabled.

For more details, see the Logto Documentation:
*   [Enterprise Connectors Overview](https://docs.logto.io/connectors/enterprise-connectors/)
*   [Set up Single Sign-On with OpenID Connect (OIDC)](https://docs.logto.io/integrations/oidc-sso/)

### Just-in-Time (JIT) Provisioning

Logto supports Just-in-Time (JIT) provisioning within its Organizations feature. This allows you to configure the edlucid.io OIDC Enterprise Connector such that users authenticating via edlucid.io for the first time are automatically created in Logto and assigned to the relevant Organization (and potentially roles).

See [Logto Docs: Just-in-time to organization](https://docs.logto.io/organizations/just-in-time-provisioning) for configuration details.

## Running the Sample

1.  **Install Dependencies:**
    ```bash
    pnpm install
    ```
2.  **Run the Development Server:**
    ```bash
    pnpm run dev
    ```

Navigate to the `BASE_URL` you configured (e.g., `http://localhost:3001`) in your browser. Accessing a protected page (like `/protected`) should automatically trigger the LTI/OIDC flow if you provide the `lti_state` parameter from an edlucid.io redirect. 