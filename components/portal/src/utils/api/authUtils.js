/*
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/* eslint camelcase: ["off"] */

import HttpUtils from "./httpUtils";
import NotificationUtils from "../common/notificationUtils";
import {StateHolder} from "../../components/common/state";
import jwtDecode from "jwt-decode";

/**
 * Authentication/Authorization related utilities.
 */
class AuthUtils {

    static AUTHORIZATION_ENDPOINT = "/oauth2/authorize";
    static LOGOUT_ENDPOINT = "/oidc/logout";

    static USER_KEY = "user";

    /**
     * Redirect the user to IDP for Hub authentication.
     *
     * @param {StateHolder} globalState The global state provided to the current component
     */
    static initiateHubLoginFlow(globalState) {
        const clientId = globalState.get(StateHolder.CONFIG).idp.hubClientId;
        this.initiateLoginFlow(globalState, clientId, window.location.origin + window.location.pathname, true);
    }

    /**
     * Redirect the user to IDP for SDK authentication.
     *
     * @param {StateHolder} globalState The global state provided to the current component
     * @param {string} redirectUrl The URL to redirect back to
     */
    static initiateSdkLoginFlow(globalState, redirectUrl) {
        const clientId = globalState.get(StateHolder.CONFIG).idp.sdkClientId;
        this.initiateLoginFlow(globalState, clientId, redirectUrl, false);
    }

    /**
     * Redirect the user to IDP for authentication.
     *
     * @private
     * @param {StateHolder} globalState The global state provided to the current component
     * @param {string} clientId The client ID to be used
     * @param {string} redirectUrl The URL to redirect back to
     * @param {boolean} isPortalLogin Whether this is a portal login or an SDK login.
     */
    static initiateLoginFlow(globalState, clientId, redirectUrl, isPortalLogin) {
        let scope = "openid";
        if (isPortalLogin) {
            scope = `${scope} ${Math.random().toString(36).substring(7)}`;
        }

        const params = {
            response_type: "code",
            nonce: "auth",
            scope: scope,
            client_id: clientId,
            redirect_uri: redirectUrl
        };
        const authEndpoint = `${globalState.get(StateHolder.CONFIG).idp.url}${AuthUtils.AUTHORIZATION_ENDPOINT}`;
        window.location.assign(`${authEndpoint}${HttpUtils.generateQueryParamString(params)}`);
    }

    /**
     * Requests the API backend for tokens in exchange for authorization code.
     *
     * @param {string} authCode The one time Authorization code given by the IDP.
     * @param {StateHolder} globalState The global state provided to the current component
     * @param {Function} [onSuccess] The callback to be called after retrieving taokens
     */
    static retrieveTokens(authCode, globalState, onSuccess) {
        const searchParams = {
            authCode: authCode,
            callbackUrl: window.location.href.split("?")[0]
        };
        HttpUtils.callHubAPI(
            {
                url: `/auth/token${HttpUtils.generateQueryParamString(searchParams)}`,
                method: "GET"
            },
            globalState
        ).then((resp) => {
            const decodedToken = jwtDecode(resp.idToken);
            let name = decodedToken.name;
            if (!name) {
                name = decodedToken.email.split("@")[0];
            }
            let avatarUrl = decodedToken.avatar_url;
            if (!avatarUrl) {
                avatarUrl = decodedToken.google_pic_url;
            }
            const user = {
                userId: decodedToken.sub,
                username: name,
                email: decodedToken.email,
                avatarUrl: avatarUrl,
                tokens: {
                    accessToken: resp.accessToken,
                    idToken: resp.idToken,
                    expirationTime: decodedToken.exp * 1000
                }
            };
            AuthUtils.updateUser(user, globalState);
            if (onSuccess) {
                onSuccess();
            }
        }).catch(() => {
            NotificationUtils.showNotification(
                "Failed to authenticate",
                NotificationUtils.Levels.ERROR,
                globalState
            );
        });
    }

    /**
     * Sign out the current user.
     * The provided global state will be updated accordingly as well.
     *
     * @param {StateHolder} globalState The global state provided to the current component
     * @returns {Promise} A promise for the logout call
     */
    static signOut = (globalState) => new Promise((resolve) => {
        const logout = () => {
            AuthUtils.removeUserFromBrowser();
            localStorage.removeItem(AuthUtils.FEDERATED_IDP_KEY);

            const params = {
                id_token_hint: globalState.get(StateHolder.USER).tokens.idToken,
                post_logout_redirect_uri: `${window.location.origin}/`
            };
            const signOutEndpoint = `${globalState.get(StateHolder.CONFIG).idp.url}${AuthUtils.LOGOUT_ENDPOINT}`;
            window.location.assign(`${signOutEndpoint}${HttpUtils.generateQueryParamString(params)}`);
            resolve();
        };
        NotificationUtils.showLoadingOverlay("Logging Out", globalState);
        HttpUtils.callHubAPI(
            {
                url: "/auth/revoke",
                method: "GET"
            },
            globalState).then(() => {
            logout();
            NotificationUtils.hideLoadingOverlay(globalState);
        }).catch(() => {
            logout();
            NotificationUtils.hideLoadingOverlay(globalState);
        });
    });

    /**
     * Remove the stored user from the Browser.
     */
    static removeUserFromBrowser() {
        localStorage.removeItem(AuthUtils.USER_KEY);
    }

    /**
     * Update the user stored in the browser.
     *
     * @private
     * @param {Object} user The user to be signed in
     * @param {StateHolder} globalState The global state provided to the current component
     */
    static updateUser(user, globalState) {
        localStorage.setItem(AuthUtils.USER_KEY, JSON.stringify(user));
        globalState.set(StateHolder.USER, user);
    }

    /**
     * Get the currently authenticated user.
     *
     * @returns {string} The current user
     */
    static getAuthenticatedUser() {
        let user;
        try {
            user = JSON.parse(localStorage.getItem(AuthUtils.USER_KEY));
        } catch {
            user = null;
            localStorage.removeItem(AuthUtils.USER_KEY);
        }
        return user;
    }

}

export default AuthUtils;
