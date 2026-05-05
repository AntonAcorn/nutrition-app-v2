import Foundation
import Capacitor
import AuthenticationServices

@objc(SignInWithApple)
public class SignInWithApple: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SignInWithApple"
    public let jsName = "SignInWithApple"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise)
    ]

    // Swift 5 compat: bridge.savedCall(withID:) gated behind $NonescapableTypes
    private var pendingCall: CAPPluginCall?

    @objc func authorize(_ call: CAPPluginCall) {
        let appleIDProvider = ASAuthorizationAppleIDProvider()
        let request = appleIDProvider.createRequest()
        request.requestedScopes = getRequestedScopes(from: call)

        // Swift 5 compat: getString(_ key:) -> String? gated behind $NonescapableTypes
        let stateVal = call.getString("state", "")
        request.state = stateVal.isEmpty ? nil : stateVal
        let nonceVal = call.getString("nonce", "")
        request.nonce = nonceVal.isEmpty ? nil : nonceVal

        pendingCall = call
        self.bridge?.saveCall(call)

        let authorizationController = ASAuthorizationController(authorizationRequests: [request])
        authorizationController.delegate = self
        authorizationController.presentationContextProvider = self
        authorizationController.performRequests()
    }

    func getRequestedScopes(from call: CAPPluginCall) -> [ASAuthorization.Scope]? {
        var requestedScopes: [ASAuthorization.Scope] = []

        let scopesStr = call.getString("scopes", "")
        if !scopesStr.isEmpty {
            if scopesStr.contains("name") {
                requestedScopes.append(.fullName)
            }
            if scopesStr.contains("email") {
                requestedScopes.append(.email)
            }
        }

        return requestedScopes.isEmpty ? nil : requestedScopes
    }
}

extension SignInWithApple: ASAuthorizationControllerPresentationContextProviding {
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return self.bridge!.viewController!.view.window!
    }
}

extension SignInWithApple: ASAuthorizationControllerDelegate {
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential else { return }
        guard let call = pendingCall else { return }
        pendingCall = nil

        let result = [
            "response": [
                "user": appleIDCredential.user,
                "email": appleIDCredential.email,
                "givenName": appleIDCredential.fullName?.givenName,
                "familyName": appleIDCredential.fullName?.familyName,
                "identityToken": String(data: appleIDCredential.identityToken!, encoding: .utf8),
                "authorizationCode": String(data: appleIDCredential.authorizationCode!, encoding: .utf8)
            ]
        ]

        call.resolve(result)
        self.bridge?.releaseCall(call)
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let call = pendingCall else { return }
        pendingCall = nil
        // Swift 5 compat: call.reject gated behind $NonescapableTypes
        call.unimplemented(error.localizedDescription)
        self.bridge?.releaseCall(call)
    }
}
