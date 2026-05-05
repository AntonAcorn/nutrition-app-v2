import Foundation
import Capacitor
import GoogleSignIn

@objc(GoogleSignInPlugin)
public class GoogleSignInPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GoogleSignInPlugin"
    public let jsName = "GoogleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise)
    ]

    @objc func signIn(_ call: CAPPluginCall) {
        guard let clientId = call.getString("clientId"), !clientId.isEmpty else {
            call.reject("clientId is required")
            return
        }

        let config = GIDConfiguration(clientID: clientId)
        GIDSignIn.sharedInstance.configuration = config

        DispatchQueue.main.async { [weak self] in
            guard let self,
                  let viewController = self.bridge?.viewController else {
                call.reject("No view controller available")
                return
            }

            GIDSignIn.sharedInstance.signIn(withPresenting: viewController) { result, error in
                if let error {
                    if (error as NSError).code == GIDSignInError.canceled.rawValue {
                        call.reject("canceled")
                    } else {
                        call.reject(error.localizedDescription)
                    }
                    return
                }

                guard let user = result?.user,
                      let idToken = user.idToken?.tokenString else {
                    call.reject("Failed to get ID token")
                    return
                }

                call.resolve([
                    "idToken": idToken,
                    "email": user.profile?.email ?? "",
                    "displayName": user.profile?.name ?? "",
                    "givenName": user.profile?.givenName ?? "",
                    "familyName": user.profile?.familyName ?? ""
                ])
            }
        }
    }
}
