package com.aiduparc.rumblyeats;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

@CapacitorPlugin(name = "GoogleSignIn")
public class GoogleSignInPlugin extends Plugin {

    @PluginMethod
    public void signIn(PluginCall call) {
        String clientId = call.getString("clientId");
        if (clientId == null || clientId.isEmpty()) {
            call.reject("clientId is required");
            return;
        }

        GoogleSignInOptions options = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(clientId)
                .requestEmail()
                .build();
        GoogleSignInClient client = GoogleSignIn.getClient(getActivity(), options);

        // Sign out first so the user always gets the account picker (matches iOS UX
        // where each tap re-presents the chooser instead of silently re-using the
        // last account).
        client.signOut().addOnCompleteListener(getActivity(), task -> {
            Intent intent = client.getSignInIntent();
            startActivityForResult(call, intent, "handleSignInResult");
        });
    }

    @ActivityCallback
    private void handleSignInResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }
        if (result.getResultCode() != Activity.RESULT_OK) {
            call.reject("canceled");
            return;
        }
        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(result.getData());
        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);
            String idToken = account.getIdToken();
            if (idToken == null) {
                call.reject("Failed to get ID token");
                return;
            }
            JSObject ret = new JSObject();
            ret.put("idToken", idToken);
            ret.put("email", account.getEmail() != null ? account.getEmail() : "");
            ret.put("displayName", account.getDisplayName() != null ? account.getDisplayName() : "");
            ret.put("givenName", account.getGivenName() != null ? account.getGivenName() : "");
            ret.put("familyName", account.getFamilyName() != null ? account.getFamilyName() : "");
            call.resolve(ret);
        } catch (ApiException e) {
            // 12501 = SIGN_IN_CANCELLED
            if (e.getStatusCode() == 12501) {
                call.reject("canceled");
            } else {
                call.reject("Google sign-in failed (" + e.getStatusCode() + ")");
            }
        }
    }
}
