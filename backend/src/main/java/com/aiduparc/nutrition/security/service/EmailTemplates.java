package com.aiduparc.nutrition.security.service;

/**
 * Branded HTML email templates for transactional auth flows. Inline CSS,
 * table-based layout, web-safe fonts — kept generic so it renders the same
 * across Gmail, Outlook, Apple Mail, and mobile clients.
 *
 * Plain-text fallback returned alongside each HTML body so SimpleEmailMessage
 * clients still receive a readable copy.
 */
final class EmailTemplates {

    private EmailTemplates() {}

    private static final String PRIMARY        = "#7c3aed";
    private static final String PRIMARY_DARK   = "#6d28d9";
    private static final String TEXT_PRIMARY   = "#14213d";
    private static final String TEXT_SECONDARY = "#5b6b8c";
    private static final String BG_PAGE        = "#f5f1ea";
    private static final String BG_CARD        = "#ffffff";
    private static final String BORDER         = "#e7dccd";

    record Rendered(String html, String text) {}

    static Rendered verification(String displayName, String link, String baseUrl) {
        String mascot = baseUrl + "/mascot/cheer.png";
        String greeting = "Hi " + escape(displayName) + ",";
        String html = wrap(
            "Welcome to Rumbly Eats",
            mascot,
            greeting,
            "Tap the button below to confirm your email and finish setting up your account.",
            "Confirm email",
            link,
            "The link is valid for 24 hours.",
            "If you didn't sign up, you can safely ignore this email — no account will be created.",
            baseUrl
        );
        String text = "Hi " + displayName + ",\n\n"
                + "Welcome to Rumbly Eats! Confirm your email by opening the link below:\n\n"
                + link + "\n\n"
                + "The link is valid for 24 hours.\n\n"
                + "If you didn't sign up, you can ignore this email.";
        return new Rendered(html, text);
    }

    static Rendered passwordReset(String displayName, String link, String baseUrl) {
        String mascot = baseUrl + "/mascot/happy.png";
        String greeting = "Hi " + escape(displayName) + ",";
        String html = wrap(
            "Reset your password",
            mascot,
            greeting,
            "Tap the button below to choose a new password for your Rumbly Eats account.",
            "Reset password",
            link,
            "The link is valid for 1 hour.",
            "If you didn't request a password reset, you can safely ignore this email — your current password stays the same.",
            baseUrl
        );
        String text = "Hi " + displayName + ",\n\n"
                + "Tap the link below to reset your password:\n\n"
                + link + "\n\n"
                + "The link is valid for 1 hour.\n\n"
                + "If you didn't request a password reset, ignore this email.";
        return new Rendered(html, text);
    }

    private static String wrap(
            String preheader,
            String mascotUrl,
            String greeting,
            String body,
            String ctaLabel,
            String ctaHref,
            String expiryNote,
            String disclaimer,
            String baseUrl
    ) {
        // Pre-formatted HTML kept on a single line per logical row to play
        // nice with Gmail (collapses long lines may otherwise wrap).
        return ""
            + "<!DOCTYPE html>"
            + "<html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            + "<title>Rumbly Eats</title></head>"
            + "<body style=\"margin:0;padding:0;background:" + BG_PAGE + ";font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:" + TEXT_PRIMARY + ";\">"
            + "<span style=\"display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;\">" + escape(preheader) + "</span>"
            + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:" + BG_PAGE + ";padding:32px 16px;\">"
            +   "<tr><td align=\"center\">"
            +     "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:520px;background:" + BG_CARD + ";border:1px solid " + BORDER + ";border-radius:24px;overflow:hidden;\">"
            +       "<tr><td align=\"center\" style=\"padding:32px 24px 8px 24px;\">"
            +         "<img src=\"" + mascotUrl + "\" alt=\"\" width=\"96\" height=\"96\" style=\"display:block;border:0;outline:none;text-decoration:none;width:96px;height:auto;\">"
            +       "</td></tr>"
            +       "<tr><td align=\"center\" style=\"padding:8px 24px 0 24px;\">"
            +         "<div style=\"font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:" + TEXT_SECONDARY + ";margin-bottom:8px;\">Rumbly Eats</div>"
            +         "<h1 style=\"font-size:24px;line-height:1.2;font-weight:700;margin:0 0 12px 0;color:" + TEXT_PRIMARY + ";\">" + escape(preheader) + "</h1>"
            +       "</td></tr>"
            +       "<tr><td style=\"padding:8px 32px 0 32px;\">"
            +         "<p style=\"font-size:16px;line-height:1.5;margin:0 0 8px 0;color:" + TEXT_PRIMARY + ";\">" + greeting + "</p>"
            +         "<p style=\"font-size:15px;line-height:1.6;margin:0 0 24px 0;color:" + TEXT_SECONDARY + ";\">" + escape(body) + "</p>"
            +       "</td></tr>"
            +       "<tr><td align=\"center\" style=\"padding:0 32px 8px 32px;\">"
            +         "<a href=\"" + ctaHref + "\" style=\"display:inline-block;background:" + PRIMARY + ";color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:14px;\">" + escape(ctaLabel) + "</a>"
            +       "</td></tr>"
            +       "<tr><td style=\"padding:16px 32px 8px 32px;\">"
            +         "<p style=\"font-size:13px;line-height:1.5;margin:0 0 4px 0;color:" + TEXT_SECONDARY + ";text-align:center;\">" + escape(expiryNote) + "</p>"
            +         "<p style=\"font-size:12px;line-height:1.5;margin:16px 0 0 0;color:" + TEXT_SECONDARY + ";text-align:center;word-break:break-all;\">Or copy this link:<br><a href=\"" + ctaHref + "\" style=\"color:" + PRIMARY_DARK + ";text-decoration:underline;\">" + escape(ctaHref) + "</a></p>"
            +       "</td></tr>"
            +       "<tr><td style=\"padding:24px 32px 32px 32px;border-top:1px solid " + BORDER + ";margin-top:16px;\">"
            +         "<p style=\"font-size:12px;line-height:1.5;margin:0;color:" + TEXT_SECONDARY + ";\">" + escape(disclaimer) + "</p>"
            +       "</td></tr>"
            +     "</table>"
            +     "<div style=\"max-width:520px;margin:16px auto 0 auto;text-align:center;\">"
            +       "<p style=\"font-size:11px;line-height:1.5;margin:0;color:" + TEXT_SECONDARY + ";\">Rumbly Eats · <a href=\"" + baseUrl + "\" style=\"color:" + TEXT_SECONDARY + ";text-decoration:underline;\">rumblyeats.org</a></p>"
            +     "</div>"
            +   "</td></tr>"
            + "</table>"
            + "</body></html>";
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
